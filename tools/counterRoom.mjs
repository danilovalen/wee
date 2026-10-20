// A room that counts in binary, 0 to 15 and round again, built from lasers, doors, relays and
// wires (register 349). Every gate takes one tick, so the whole room moves in lockstep.
//   Clock: a ring of 8 one-door stages (each passes the one before, the first inverts the last),
//   so the ring turns over every 16 ticks; a gate reading two neighbours makes a one-tick pulse, E (yellow).
//   Bits: b0 red, b1 blue, b2 green, b3 the charcoal wire. Each bit's relay is lit from up to three
//   lines (a relay is lit by any beam crossing it; walls and the next gate's laser stop the beams): "keep my 1 while no pulse", and "flip on a pulse when every
//   lower bit is 1". "Every lower bit is 1" is a wire laid under those bits' relays (a wire is on
//   only while every switch on it is): teal under b0 and b1, violet under b0, b1 and b2.
// Usage: node tools/counterRoom.mjs [--out rooms/counter.wee] [--ticks N]
import { writeFileSync } from 'node:fs';
import { createGame, step } from '../src/rules/game.js';
import { parseLevel, emptyLevel } from '../src/level/format.js';

export function counterRoom() {
  const W = 31, H = 19, l = emptyLevel(W, H);
  for (const k of Object.keys(l.powers)) l.powers[k] = false;
  const cell = (x, y, c) => { l.cells[y * W + x] = c; };
  const laser = (x, y, d) => l.entities.push({ kind: 'turret', x, y, turret: { dirs: [d], mode: 'input' } });
  const wire = (w, ...pts) => { for (const [x, y] of pts) l.wires.push({ x, y, w }); };
  l.wires = [];
  // The clock ring, down the left: stage i on row 2i, laser, door, relay and a wall; its wire runs to the next door.
  const ys = [2, 4, 6, 8, 10, 12, 14, 16];
  ys.forEach((y, i) => { laser(1, y, 'right'); cell(2, y, i ? 'door:wire' : 'idoor:wire'); cell(3, y, 'sensor:wire'); cell(4, y, 'wall'); });
  ys.slice(0, 7).forEach((y, i) => wire(i % 2 ? 'violet' : 'teal', [3, y], [3, y + 1], [2, y + 1], [2, y + 2]));
  // The last stage's wire goes back round the left edge to the first, inverted, door.
  wire('charcoal', [3, 16], [3, 17], [2, 17], [1, 17], ...Array.from({ length: 17 }, (_, k) => [0, 17 - k]), [1, 1], [2, 1], [2, 2]);
  // The pulse: on the tick stage 1 has turned on and stage 2 has not yet.
  laser(4, 3, 'right'); cell(5, 3, 'door:wire'); cell(6, 3, 'idoor:wire'); cell(7, 3, 'sensor:yellow'); cell(8, 3, 'wall');
  wire('teal', [4, 3], [5, 3]); wire('violet', [4, 4], [5, 4], [6, 4], [6, 3]);
  // The counter, laid out with its lines coming from the left and then mirrored, so it reads b3 b2 b1 b0.
  const X0 = 10, Y = 9, mx = u => X0 + 19 - u, md = d => ({ right: 'left', left: 'right' }[d] || d);
  const c = (u, v, s) => cell(mx(u), v, s), L = (u, v, d) => laser(mx(u), v, md(d)), w = (col, ...pts) => wire(col, ...pts.map(([u, v]) => [mx(u), v]));
  // b0 at u 3: left line not-b0 and E; top line b0 and not-E.
  L(0, Y, 'right'); c(1, Y, 'idoor:red'); c(2, Y, 'door:yellow'); c(3, Y, 'sensor:red');
  c(3, Y - 1, 'door:red'); c(3, Y - 2, 'idoor:yellow'); L(3, Y - 3, 'down'); c(3, Y + 1, 'wall');
  // b1 at u 8: not-b1, E, b0 | b1, not-E | b1, not-b0.
  L(4, Y, 'right'); c(5, Y, 'idoor:blue'); c(6, Y, 'door:yellow'); c(7, Y, 'door:red'); c(8, Y, 'sensor:blue');
  c(8, Y - 1, 'door:blue'); c(8, Y - 2, 'idoor:yellow'); L(8, Y - 3, 'down');
  c(8, Y + 1, 'door:blue'); c(8, Y + 2, 'idoor:red'); L(8, Y + 3, 'up');
  // b2 at u 14: not-b2, E, b0, b1 | b2, not-E | b2, not-(b0 and b1).
  L(9, Y, 'right'); c(10, Y, 'idoor:green'); c(11, Y, 'door:yellow'); c(12, Y, 'door:red'); c(13, Y, 'door:blue'); c(14, Y, 'sensor:green');
  c(14, Y - 1, 'door:green'); c(14, Y - 2, 'idoor:yellow'); L(14, Y - 3, 'down');
  c(14, Y + 1, 'door:green'); c(14, Y + 2, 'idoor:wire'); L(14, Y + 3, 'up');
  // b3 at u 19, on the charcoal wire: not-b3, E, b0 b1 b2 | b3, not-E | b3, not-(b0 b1 b2).
  L(15, Y, 'right'); c(16, Y, 'door:wire'); c(17, Y, 'door:yellow'); c(18, Y, 'idoor:wire'); c(19, Y, 'sensor:wire'); c(20, Y, 'wall');
  c(19, Y - 1, 'door:wire'); c(19, Y - 2, 'idoor:yellow'); L(19, Y - 3, 'down');
  c(19, Y + 1, 'door:wire'); c(19, Y + 2, 'idoor:wire'); L(19, Y + 3, 'up');
  // Teal: b0 and b1, read by b2's bottom line. Violet: b0, b1 and b2, read by b3's left and bottom lines.
  w('teal', ...Array.from({ length: 11 }, (_, k) => [3 + k, Y]), [13, Y + 1], [13, Y + 2], [14, Y + 2]);
  w('violet', ...Array.from({ length: 14 }, (_, k) => [3 + k, Y]), [16, Y + 1], [16, Y + 2], [17, Y + 2], [18, Y + 2], [19, Y + 2]);
  w('charcoal', [19, Y], [19, Y - 1], [19, Y + 1], [18, Y]);
  l.start = { x: 8, y: 18 };
  return parseLevel(JSON.stringify(l));
}

// The count the room shows: each bit's relay lit or not.
export function countOf(s) {
  const Y = 9, at = u => Y * s.w + 10 + 19 - u;
  return [3, 8, 14, 19].reduce((n, u, b) => n + (s.lit.has(at(u)) ? 1 << b : 0), 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const l = counterRoom(), s = createGame(l), seen = [];
  for (let t = 0; t < +arg('--ticks', 600); t++) { step(s); const n = countOf(s); if (seen.at(-1)?.n !== n) seen.push({ t, n }); }
  console.log(seen.map(e => `${e.n}@${e.t}`).join(' '));
  if (arg('--out')) writeFileSync(arg('--out'), JSON.stringify({ ...l, name: '4-bit counter' }, null, 1));
}
