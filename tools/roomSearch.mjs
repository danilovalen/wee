// The room search shared by tools/levelSearch.mjs and tools/tilesArea.mjs. A genome is what a
// player can vary: the room's size, where the start and the goal stand, and what goes in.
// searcher(def, seed) returns its moves: random(), mutate(g), penalty(g), make(g), show(room).
import { roomOf, placementErrors, bounds } from '../src/campaign/rules.js';
import { REQUIREMENTS } from '../src/campaign/requirements.js';
import { allShortest } from '../src/campaign/robot.js';

const CELL = { block: 'wall', toggle: 'toggle:red', door: 'door:red', button: 'button:red' };
const D4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export function searcher(def, seed = 1) {
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = a => a[Math.floor(rnd() * a.length)];
  function make(g) {
    const r = roomOf({ ...def, size: [g.w, g.h] });
    r.cells.fill(''); r.start = { ...g.start };
    r.cells[g.goal.y * g.w + g.goal.x] = 'goal';
    for (const [el, x, y] of g.items) {
      if (el === 'box') r.entities.push({ kind: 'box', x, y, dir: 1, mode: 'input' });
      else r.cells[y * g.w + x] = CELL[el];
    }
    return r;
  }
  const taken = (g, x, y) => (g.start.x === x && g.start.y === y) || (g.goal.x === x && g.goal.y === y) || g.items.some(i => i[1] === x && i[2] === y);
  function freeTile(g) {
    for (let t = 0; t < 50; t++) { const x = Math.floor(rnd() * g.w), y = Math.floor(rnd() * g.h); if (!taken(g, x, y)) return [x, y]; }
    return null;
  }
  const add = (g, el) => { const f = freeTile(g); if (f) g.items.push([el, ...f]); };
  function random() {
    const w = 4 + Math.floor(rnd() * 5), h = 4 + Math.floor(rnd() * 5);
    const g = { w, h, start: { x: Math.floor(rnd() * w), y: Math.floor(rnd() * h) }, goal: null, items: [] };
    do g.goal = { x: Math.floor(rnd() * w), y: Math.floor(rnd() * h) }; while (g.goal.x === g.start.x && g.goal.y === g.start.y);
    // Half the starts box the robot in on two or three sides, leaving the rest to the search.
    if (rnd() < 0.5) for (const [dx, dy] of D4) {
      const x = g.start.x + dx, y = g.start.y + dy;
      if (x >= 0 && y >= 0 && x < w && y < h && !taken(g, x, y) && rnd() < 0.7) g.items.push(['block', x, y]);
    }
    for (const [el, [min]] of Object.entries(def.palette)) for (let k = 0; k < min; k++) add(g, el);
    const walls = Math.floor(rnd() * w * h * 0.3);
    for (let k = 0; k < walls; k++) add(g, 'block');
    return g;
  }
  function mutate(g0) {
    const g = structuredClone(g0), r = rnd(), els = Object.keys(def.palette);
    if (r < 0.35 && g.items.length) { const f = freeTile(g), it = pick(g.items); if (f) [it[1], it[2]] = f; }
    else if (r < 0.5) add(g, pick(els));
    else if (r < 0.65 && g.items.length) {
      const i = Math.floor(rnd() * g.items.length), [el] = g.items[i];
      if (g.items.filter(t => t[0] === el).length > (def.palette[el] || [0])[0]) g.items.splice(i, 1);
    }
    else if (r < 0.8) { const f = freeTile(g); if (f) g[rnd() < 0.5 ? 'start' : 'goal'] = { x: f[0], y: f[1] }; }
    else {
      // Grow or shrink one side by a line; anything past the new edge goes.
      const dw = rnd() < 0.5 ? (rnd() < 0.5 ? 1 : -1) : 0, dh = dw ? 0 : (rnd() < 0.5 ? 1 : -1);
      g.w = Math.max(3, Math.min(10, g.w + dw)); g.h = Math.max(3, Math.min(10, g.h + dh));
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
    if (a.status !== 'solved') return 1000;
    const { min, max } = bounds(def.steps);
    let p = Math.max(0, min - a.length, a.length - max) * 10 + (a.capped ? 5 : 0);
    for (const path of a.paths.slice(0, 60)) for (const id of def.require || []) if (!REQUIREMENTS[id].judge(r, path)) p += 1;
    return p;
  }
  const show = r => Array.from({ length: r.h }, (_, y) => Array.from({ length: r.w }, (_, x) => {
    const c = r.cells[y * r.w + x];
    if (r.start.x === x && r.start.y === y) return 'P';
    if (r.entities.some(e => e.x === x && e.y === y)) return 'B';
    return c === 'wall' ? '#' : c === 'goal' ? 'G' : c.startsWith('toggle') ? 't' : c.startsWith('door') ? 'D' : c.startsWith('button') ? 'o' : '.';
  }).join('')).join(' ');
  return { random, mutate, penalty, make, show };
}
