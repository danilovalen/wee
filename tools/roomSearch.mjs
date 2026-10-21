// The room search shared by tools/levelSearch.mjs and tools/tilesArea.mjs. A genome is what a
// player can vary: the room's size, where the start and the goal stand, and what goes in.
// searcher(def, seed) returns its moves: random(), mutate(g), penalty(g), make(g), show(room).
import { roomOf, placementErrors, check, bounds, coloursOf, colouringsOf, pushingsOf } from '../src/campaign/rules.js';
import { REQUIREMENTS } from '../src/campaign/requirements.js';
import { allShortest, replayPath } from '../src/campaign/robot.js';
import { miss } from './searchScores.mjs';

const CELL = { block: 'wall', toggle: 'toggle', door: 'door', button: 'button', idoor: 'idoor', relay: 'sensor' };
const TINTS = ['toggle', 'door', 'button', 'gate', 'idoor', 'relay'];
// A laser in the legend: n, e, s or w, the way it fires.
const LASER = { up: 'n', right: 'e', down: 's', left: 'w' }, FROM_LASER = { n: 'up', e: 'right', s: 'down', w: 'left' };
const DIRS = ['up', 'right', 'down', 'left'];
const D4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
// Rooms up to 16 on a side, 120 tiles (register 272): long thin rooms, like his 6x11 level 5 win, need it.
export const MAX_SIDE = 16, MAX_AREA = 120;

// What the last scoring of a genome saw: whether it was solved and its first shortest path. The
// edits that aim (register 364) read it, so they put pieces where the robot goes and the beam runs.
const seen = new WeakMap();

// opts.aim: false turns the aiming edits off, for measuring the search as it was (tools/searchBench.mjs).
export function searcher(def, seed = 1, opts = {}) {
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = a => a[Math.floor(rnd() * a.length)];
  // An item is [element, x, y, direction, colour]; a level's colours tint its buttons, doors,
  // switches and (in a level that names its colours) one-ways.
  const cols = coloursOf(def), choices = el => colouringsOf(def, el);
  function make(g) {
    const r = roomOf({ ...def, size: [g.w, g.h] });
    r.cells.fill(''); r.start = { ...g.start };
    r.cells[g.goal.y * g.w + g.goal.x] = 'goal';
    for (const [el, x, y, d, c] of g.items) {
      const col = choices(el).includes(c) ? c : choices(el)[0];
      if (el === 'gate') r.cells[y * g.w + x] = 'gate:' + (d || 'right') + (def.colours ? '@' + col : '');
      else if (el === 'box') r.entities.push({ kind: 'box', x, y, dir: 1, mode: 'input' });
      else if (el === 'laser') r.entities.push({ kind: 'turret', x, y, ...(pushingsOf(def, 'laser')[0] ? { crate: true } : {}), turret: { dirs: [d || 'right'], mode: 'input' } });
      else r.cells[y * g.w + x] = el === 'block' ? 'wall' : CELL[el] + ':' + col;
      if (['gate', 'door', 'idoor', 'relay'].includes(el) && pushingsOf(def, el)[0]) (r.crates ||= []).push({ x, y });
    }
    return r;
  }
  const taken = (g, x, y) => (g.start.x === x && g.start.y === y) || (g.goal.x === x && g.goal.y === y) || g.items.some(i => i[1] === x && i[2] === y);
  function freeTile(g) {
    for (let t = 0; t < 50; t++) { const x = Math.floor(rnd() * g.w), y = Math.floor(rnd() * g.h); if (!taken(g, x, y)) return [x, y]; }
    return null;
  }
  const add = (g, el) => { const f = freeTile(g); if (f) g.items.push([el, ...f, el === 'gate' || el === 'laser' ? pick(DIRS) : null, TINTS.includes(el) ? pick(choices(el)) : null]); };
  function random() {
    const w = 4 + Math.floor(rnd() * 5), h = 4 + Math.floor(rnd() * 5);
    const g = { w, h, start: { x: Math.floor(rnd() * w), y: Math.floor(rnd() * h) }, goal: null, items: [] };
    do g.goal = { x: Math.floor(rnd() * w), y: Math.floor(rnd() * h) }; while (g.goal.x === g.start.x && g.goal.y === g.start.y);
    // Half the starts box the robot in on two or three sides, leaving the rest to the search.
    if (rnd() < 0.5) for (const [dx, dy] of D4) {
      const x = g.start.x + dx, y = g.start.y + dy;
      if (x >= 0 && y >= 0 && x < w && y < h && !taken(g, x, y) && rnd() < 0.7) g.items.push(['block', x, y, null, null]);
    }
    for (const [el, [min]] of Object.entries(def.palette)) for (let k = 0; k < min; k++) add(g, el);
    const walls = Math.floor(rnd() * w * h * 0.3);
    for (let k = 0; k < walls; k++) add(g, 'block');
    return g;
  }
  // Copies one row or column of the room, pieces and all, over another (register 272): a lane that
  // works once can be tried twice, as his level 5 room uses one column for both boxes.
  function copyStrip(g, across = rnd() < 0.5, s = null, t = null) {
    const n = across ? g.h : g.w;
    s ??= Math.floor(rnd() * n); t ??= Math.floor(rnd() * n);
    if (s === t) return false;
    const on = (i, k) => (across ? i[2] : i[1]) === k;
    const free = (x, y) => !(g.start.x === x && g.start.y === y) && !(g.goal.x === x && g.goal.y === y);
    const copies = g.items.filter(i => on(i, s)).map(i => across ? [i[0], i[1], t, i[3], i[4]] : [i[0], t, i[2], i[3], i[4]]);
    g.items = [...g.items.filter(i => !on(i, t)), ...copies.filter(i => free(i[1], i[2]))];
    return true;
  }
  const robotTiles = (g, path) => { const at = new Map(); replayPath(make(g), path, s => at.set(s.player.x + ',' + s.player.y, [s.player.x, s.player.y])); return [...at.values()]; };
  // The tiles a laser item's beam crosses, up to the room's edge or a block.
  function beamTiles(g, [, x, y, d]) {
    const [dx, dy] = D4[DIRS.indexOf(d || 'right')], out = [];
    for (let cx = x + dx, cy = y + dy; cx >= 0 && cy >= 0 && cx < g.w && cy < g.h; cx += dx, cy += dy) {
      if (g.items.some(i => i[0] === 'block' && i[1] === cx && i[2] === cy)) break;
      out.push([cx, cy]);
    }
    return out;
  }
  // Puts an element on a tile: moves one already in the room there, or adds one.
  function placeAt(g, el, [x, y]) {
    if ((g.start.x === x && g.start.y === y) || (g.goal.x === x && g.goal.y === y)) return false;
    g.items = g.items.filter(i => i[1] !== x || i[2] !== y);
    const have = g.items.filter(i => i[0] === el);
    if (have.length && rnd() < 0.6) { const it = pick(have); [it[1], it[2]] = [x, y]; }
    else g.items.push([el, x, y, el === 'gate' || el === 'laser' ? pick(DIRS) : null, TINTS.includes(el) ? pick(choices(el)) : null]);
    return true;
  }
  // Edits that aim (register 364): a piece on the robot's path, a piece or the goal on a beam, an
  // unsolvable room opened up, the room cropped to what is in it. Null when there is nothing to aim at.
  function aim(g) {
    const info = seen.get(g), els = Object.keys(def.palette).filter(e => e !== 'block'), r = rnd();
    if (info && info.status !== 'solved') {
      const blocks = g.items.filter(i => i[0] === 'block');
      if (!blocks.length) return null;
      g.items.splice(g.items.indexOf(pick(blocks)), 1); return g;
    }
    if (r < 0.4 && info && info.path && els.length) {
      const tiles = robotTiles(g, info.path);
      return tiles.length && placeAt(g, pick(els), pick(tiles)) ? g : null;
    }
    const lasers = g.items.filter(i => i[0] === 'laser');
    if (r < 0.8 && lasers.length) {
      const line = beamTiles(g, pick(lasers));
      if (!line.length) return null;
      const t = pick(line);
      if (rnd() < 0.15 && !taken(g, ...t)) { g.goal = { x: t[0], y: t[1] }; return g; }
      const on = els.filter(e => e !== 'laser');
      return on.length && placeAt(g, pick(on), t) ? g : null;
    }
    // Crop to the pieces, the start and the goal: an empty margin only adds tiles to cross.
    const xs = [g.start.x, g.goal.x, ...g.items.map(i => i[1])], ys = [g.start.y, g.goal.y, ...g.items.map(i => i[2])];
    const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(3, Math.max(...xs) - x0 + 1), h = Math.max(3, Math.max(...ys) - y0 + 1);
    if (w === g.w && h === g.h && !x0 && !y0) return null;
    if (x0 + w > g.w || y0 + h > g.h) return null;
    g.w = w; g.h = h; g.start = { x: g.start.x - x0, y: g.start.y - y0 }; g.goal = { x: g.goal.x - x0, y: g.goal.y - y0 };
    g.items = g.items.map(i => [i[0], i[1] - x0, i[2] - y0, i[3], i[4]]);
    return g;
  }
  function mutate(g0) {
    if (opts.aim !== false && rnd() < 0.3) { const a = aim(structuredClone(g0)); if (a) { seen.delete(a); return a; } }
    const g = structuredClone(g0), r = rnd(), els = Object.keys(def.palette);
    if (r < 0.35 && g.items.length) { const f = freeTile(g), it = pick(g.items); if (f) [it[1], it[2]] = f; if ((it[0] === 'gate' || it[0] === 'laser') && rnd() < 0.5) it[3] = pick(DIRS); if (TINTS.includes(it[0]) && rnd() < 0.3) it[4] = pick(choices(it[0])); }
    else if (r < 0.5) add(g, pick(els));
    else if (r < 0.65 && g.items.length) {
      const i = Math.floor(rnd() * g.items.length), [el] = g.items[i];
      if (g.items.filter(t => t[0] === el).length > (def.palette[el] || [0])[0]) g.items.splice(i, 1);
    }
    else if (r < 0.72) { if (!copyStrip(g)) return g0; }
    else if (r < 0.85) { const f = freeTile(g); if (f) g[rnd() < 0.5 ? 'start' : 'goal'] = { x: f[0], y: f[1] }; }
    else {
      // Grow or shrink one side by a line; anything past the new edge goes.
      const dw = rnd() < 0.5 ? (rnd() < 0.5 ? 1 : -1) : 0, dh = dw ? 0 : (rnd() < 0.5 ? 1 : -1);
      g.w = Math.max(3, Math.min(MAX_SIDE, g.w + dw)); g.h = Math.max(3, Math.min(MAX_SIDE, g.h + dh));
      if (g.w * g.h > MAX_AREA) return g0;
      const inside = p => p.x < g.w && p.y < g.h;
      if (!inside(g.start) || !inside(g.goal)) return g0;
      g.items = g.items.filter(i => i[1] < g.w && i[2] < g.h);
    }
    return g;
  }
  // How far a room is from winning: 0 is a win. Each failed requirement on each path counts.
  function penalty(g) {
    const r = make(g);
    if (placementErrors(def, r).length) return 1e9;
    const a = allShortest(r, { maxPaths: 300 });
    seen.set(g, { status: a.status, path: a.paths && a.paths[0] });
    if (a.status !== 'solved') return 1000;
    const { min, max } = bounds(def.steps);
    let p = Math.max(0, min - a.length, a.length - max) * 10 + (a.capped ? 5 : 0);
    for (const path of a.paths.slice(0, 60)) for (const id of def.require || []) if (!REQUIREMENTS[id].judge(r, path)) p += miss(id, r, path);
    // A climb stops at 0, so 0 is only for a room the game itself calls a win: one off the palette's
    // counts scores 1 and the climb goes on (register 335). Refusing such rooms outright cost wins.
    return p === 0 && !check(def, r).won ? 1 : p;
  }
  const show = r => Array.from({ length: r.h }, (_, y) => Array.from({ length: r.w }, (_, x) => {
    const c = r.cells[y * r.w + x];
    if (r.start.x === x && r.start.y === y) return 'P';
    const ent = r.entities.find(e => e.x === x && e.y === y);
    if (ent) return ent.turret ? (ent.crate ? LASER[ent.turret.dirs[0]].toUpperCase() : LASER[ent.turret.dirs[0]]) : 'B';
    // Blue in the tests' legend: Q door, q button, T switch, J inverted door, R relay; X a two-colour door.
    const blue = /:blue$/.test(c);
    if (c.includes('|')) return 'X';
    if (c.startsWith('idoor')) return blue ? 'J' : 'I';
    if (c.startsWith('sensor')) return blue ? 'R' : 'r';
    return c === 'wall' ? '#' : c.startsWith('gate:') ? { up: '^', right: '>', down: 'v', left: '<' }[c.slice(5).split('@')[0]] : c === 'goal' ? 'G' : c.startsWith('toggle') ? (blue ? 'T' : 't') : c.startsWith('door') ? (blue ? 'Q' : 'D') : c.startsWith('button') ? (blue ? 'q' : 'o') : '.';
  }).join('')).join(' ');
  // A genome from rows in show()'s legend, so a climb can start from a known room.
  function parse(rows) {
    const g = { w: rows[0].length, h: rows.length, start: null, goal: null, items: [] };
    const EL = { '#': ['block'], t: ['toggle', 'red'], T: ['toggle', 'blue'], D: ['door', 'red'], Q: ['door', 'blue'], o: ['button', 'red'], q: ['button', 'blue'], B: ['box'], I: ['idoor', 'red'], J: ['idoor', 'blue'], r: ['relay', 'red'], R: ['relay', 'blue'], X: ['door', 'red|blue'] };
    rows.forEach((row, y) => [...row].forEach((c, x) => {
      if (c === 'P') g.start = { x, y }; else if (c === 'G') g.goal = { x, y };
      else if (EL[c]) g.items.push([EL[c][0], x, y, null, EL[c][1] || null]);
      else if ('^>v<'.includes(c)) g.items.push(['gate', x, y, { '^': 'up', '>': 'right', v: 'down', '<': 'left' }[c], cols[0]]);
      else if ('nesw'.includes(c) || 'NESW'.includes(c)) g.items.push(['laser', x, y, FROM_LASER[c.toLowerCase()], null]);
    }));
    return g;
  }
  return { random, mutate, penalty, make, show, parse, copyStrip };
}
