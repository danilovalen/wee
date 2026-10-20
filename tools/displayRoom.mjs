// A 3-bit counter driving a 7-segment display made of doors (register 355). A lit segment is a
// strip of closed grey inverted doors on its own wire; an unlit one is open.
//   Clock and pulse: as in tools/counterRoom.mjs (an 8-stage ring, a one-tick pulse on yellow).
//   Counter: b0 red, b1 blue, b2 green; "b0 and b1" is a teal wire under their relays.
//   Decoder: each segment is a wire whose relay is lit by up to three lines (left, top, right; a wall
//   below stops the beams). A line is a laser and its doors, so it passes only when every door is open:
//   an AND of bits. A relay lit by any line is an OR; a wire with two relays (segment d) is their AND.
//   Wires from the decoder to the display are laid by a small router: three colours, and two wires of
//   one colour never touch, or they would join.
// Usage: node tools/displayRoom.mjs [--out rooms/7-segment-counter.wee] [--ticks N]
import { writeFileSync } from 'node:fs';
import { createGame, step } from '../src/rules/game.js';
import { parseLevel, emptyLevel } from '../src/level/format.js';
import { solidCell } from '../src/rules/grid.js';

const W = 40, H = 30;
// Segment layout on the display, from its top-left corner: each is three tiles.
const SEG = {
  a: [[1, 0], [2, 0], [3, 0]], b: [[4, 1], [4, 2], [4, 3]], c: [[4, 5], [4, 6], [4, 7]], d: [[1, 8], [2, 8], [3, 8]],
  e: [[0, 5], [0, 6], [0, 7]], f: [[0, 1], [0, 2], [0, 3]], g: [[1, 4], [2, 4], [3, 4]],
};
const DIGITS = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc' };
const DX = 34, DY = 13;
// The decoder: per relay, its segment and its lines; a literal is [bit, wanted].
const B = ['red', 'blue', 'green'], L = (bit, on = true) => [bit, on];
const GATES = [
  { seg: 'a', lines: [[L(1)], [L(2), L(0)], [L(2, false), L(0, false)]] },
  { seg: 'b', lines: [[L(2, false)], [L(1), L(0)], [L(1, false), L(0, false)]] },
  { seg: 'c', lines: [[L(2)], [L(1, false)], [L(0)]] },
  { seg: 'd', lines: [[L(1)], [L(0, false), L(2, false)], [L(0), L(2)]] },
  { seg: 'd', lines: [[L(1, false)], [L(0, false)], [L(2, false)]] },
  { seg: 'e', lines: [[L(0, false), L(2, false)], [L(0, false), L(1)]] },
  { seg: 'f', lines: [[L(1, false), L(0, false)], [L(2), L(1, false)], [L(2), L(0, false)]] },
  { seg: 'g', lines: [[L(1), L(2, false)], [L(2), L(1, false)], [L(2), L(0, false)]] },
];
const SLOTS = [[9, 16], [16, 16], [23, 16], [30, 16], [9, 22], [16, 22], [23, 22], [30, 22]];

export function displayRoom() {
  const l = emptyLevel(W, H);
  for (const k of Object.keys(l.powers)) l.powers[k] = false;
  l.wires = [];
  const cell = (x, y, c) => { l.cells[y * W + x] = c; };
  const laser = (x, y, d) => l.entities.push({ kind: 'turret', x, y, turret: { dirs: [d], mode: 'input' } });
  const wire = (w, ...pts) => { for (const [x, y] of pts) l.wires.push({ x, y, w }); };
  // Clock ring and pulse, as in the 4-bit counter.
  const ys = [2, 4, 6, 8, 10, 12, 14, 16];
  ys.forEach((y, i) => { laser(1, y, 'right'); cell(2, y, i ? 'door:wire' : 'idoor:wire'); cell(3, y, 'sensor:wire'); cell(4, y, 'wall'); });
  ys.slice(0, 7).forEach((y, i) => wire(i % 2 ? 'violet' : 'teal', [3, y], [3, y + 1], [2, y + 1], [2, y + 2]));
  wire('charcoal', [3, 16], [3, 17], [2, 17], [1, 17], ...Array.from({ length: 17 }, (_, k) => [0, 17 - k]), [1, 1], [2, 1], [2, 2]);
  laser(4, 3, 'right'); cell(5, 3, 'door:wire'); cell(6, 3, 'idoor:wire'); cell(7, 3, 'sensor:yellow'); cell(8, 3, 'wall');
  wire('teal', [4, 3], [5, 3]); wire('violet', [4, 4], [5, 4], [6, 4], [6, 3]);
  // The 3-bit counter on row 9, mirrored so its lines come from the right.
  const X0 = 10, Y = 9, mx = u => X0 + 14 - u, md = d => ({ right: 'left', left: 'right' }[d] || d);
  const c = (u, v, s) => cell(mx(u), v, s), Lz = (u, v, d) => laser(mx(u), v, md(d));
  Lz(0, Y, 'right'); c(1, Y, 'idoor:red'); c(2, Y, 'door:yellow'); c(3, Y, 'sensor:red');
  c(3, Y - 1, 'door:red'); c(3, Y - 2, 'idoor:yellow'); Lz(3, Y - 3, 'down'); c(3, Y + 1, 'wall');
  Lz(4, Y, 'right'); c(5, Y, 'idoor:blue'); c(6, Y, 'door:yellow'); c(7, Y, 'door:red'); c(8, Y, 'sensor:blue');
  c(8, Y - 1, 'door:blue'); c(8, Y - 2, 'idoor:yellow'); Lz(8, Y - 3, 'down');
  c(8, Y + 1, 'door:blue'); c(8, Y + 2, 'idoor:red'); Lz(8, Y + 3, 'up');
  Lz(9, Y, 'right'); c(10, Y, 'idoor:green'); c(11, Y, 'door:yellow'); c(12, Y, 'door:red'); c(13, Y, 'door:blue'); c(14, Y, 'sensor:green'); c(15, Y, 'wall');
  c(14, Y - 1, 'door:green'); c(14, Y - 2, 'idoor:yellow'); Lz(14, Y - 3, 'down');
  c(14, Y + 1, 'door:green'); c(14, Y + 2, 'idoor:wire'); Lz(14, Y + 3, 'up');
  wire('teal', ...[...Array.from({ length: 11 }, (_, k) => [3 + k, Y]), [13, Y + 1], [13, Y + 2], [14, Y + 2]].map(([u, v]) => [mx(u), v]));
  // The display: each segment's tiles are grey inverted doors on one wire.
  const segTiles = {};
  for (const [s, pts] of Object.entries(SEG)) segTiles[s] = pts.map(([x, y]) => [DX + x, DY + y]);
  for (const pts of Object.values(segTiles)) for (const [x, y] of pts) cell(x, y, 'idoor:wire');
  // The decoder gates: relay, a wall below, lines from left, top and right.
  const relays = {};
  GATES.forEach((g, k) => {
    const [gx, gy] = SLOTS[k], arms = [[-1, 0, 'right'], [0, -1, 'down'], [1, 0, 'left']];
    cell(gx, gy, 'sensor:wire'); cell(gx, gy + 1, 'wall');
    g.lines.forEach((lits, j) => {
      const [dx, dy, fire] = arms[j];
      lits.forEach(([bit, on], i) => cell(gx + dx * (i + 1), gy + dy * (i + 1), (on ? 'door:' : 'idoor:') + B[bit]));
      laser(gx + dx * (lits.length + 1), gy + dy * (lits.length + 1), fire);
    });
    (relays[g.seg] ||= []).push([gx, gy]);
  });
  // Route each segment's wire from its display tiles to its relays.
  const nets = Object.keys(SEG).map(s => ({ s, tiles: segTiles[s], to: relays[s] }));
  // A net routed early can wall in a later one: try orders until every net gets through.
  const base = l.wires;
  for (let seed = 1; ; seed++) {
    if (seed > 400) throw new Error('No order routes every segment');
    const order = [...nets].sort((p, q) => ((seed * 7919 + p.s.charCodeAt(0) * 104729) % 97) - ((seed * 7919 + q.s.charCodeAt(0) * 104729) % 97));
    l.wires = [...base];
    try { route(l, order); break; } catch { /* try the next order */ }
  }
  l.start = { x: 38, y: 28 };
  return parseLevel(JSON.stringify(l));
}

// A wire of one colour may not touch another wire of that colour, and a wire may not pass under a
// switch or a grey piece that is not its own. Breadth-first from what the net has to each relay.
function route(l, nets) {
  const key = (x, y) => y * W + x, used = new Map();
  for (const r of l.wires) (used.get(key(r.x, r.y)) || used.set(key(r.x, r.y), []).get(key(r.x, r.y))).push({ w: r.w, net: 'old' + r.w });
  const piece = (x, y) => l.cells[key(x, y)];
  const forbidden = (x, y, own) => { const c = piece(x, y); return (/^(button|toggle|sensor):/.test(c) || /:wire$/.test(c)) && !own.has(key(x, y)); };
  const clash = (x, y, w, net) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (used.get(key(x + dx, y + dy)) || []).some(u => u.w === w && u.net !== net));
  for (const n of nets) {
    let done = false;
    for (const w of ['teal', 'violet', 'charcoal']) {
      const own = new Set([...n.tiles, ...n.to, ...n.to.map(([x, y]) => [x, y + 1])].map(([x, y]) => key(x, y)));
      if (n.tiles.some(([x, y]) => clash(x, y, w, n.s))) continue;
      const have = new Set(n.tiles.map(([x, y]) => key(x, y))), lay = [...n.tiles];
      let ok = true;
      for (const [tx, ty] of n.to) {
        const prev = new Map(), q = [...have];
        for (const k of q) prev.set(k, -1);
        let hit = -1;
        while (q.length) {
          const k = q.shift(), x = k % W, y = Math.floor(k / W);
          if (x === tx && y === ty) { hit = k; break; }
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy, nk = key(nx, ny);
            if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev.has(nk) || forbidden(nx, ny, own) || clash(nx, ny, w, n.s)) continue;
            prev.set(nk, k); q.push(nk);
          }
        }
        if (hit < 0) { ok = false; break; }
        for (let k = hit; prev.get(k) !== -1; k = prev.get(k)) if (!have.has(k)) { have.add(k); lay.push([k % W, Math.floor(k / W)]); }
      }
      if (!ok) continue;
      for (const [x, y] of lay) { l.wires.push({ x, y, w }); (used.get(key(x, y)) || used.set(key(x, y), []).get(key(x, y))).push({ w, net: n.s }); }
      done = true; break;
    }
    if (!done) throw new Error('No route for segment ' + n.s);
  }
}

// The digit the display shows, or '?' for a pattern that is none of 0 to 7.
export function digitOf(s) {
  const on = Object.keys(SEG).filter(k => SEG[k].every(([x, y]) => solidCell(s, DX + x, DY + y))).join('');
  return Object.keys(DIGITS).find(d => DIGITS[d] === on) ?? '?';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const l = displayRoom(), s = createGame(l), seen = [];
  for (let t = 0; t < +arg('--ticks', 300); t++) { step(s); const d = digitOf(s); if (seen.at(-1)?.d !== d) seen.push({ t, d }); }
  console.log(seen.map(e => `${e.d}@${e.t}`).join(' '));
  if (arg('--out')) writeFileSync(arg('--out'), JSON.stringify({ ...l, name: '7-segment counter' }, null, 1));
}
