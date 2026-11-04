// Puzzle 5 from one-ways only (register 729): a climb over rooms holding the blob, the berry and one-ways,
// nothing else inside the ring. Score (register 727): the answer leaning on the same one-ways again and
// again, crossing its own ground, and passing choke points; a few moves of length on top. Every one-way must
// be needed: one the answer can do without is taken out before a room is scored. A proposal, not a level.
// Usage: node tools/p5Search.mjs [--w 9] [--h 7] [--seconds 300] [--seed 1] [--out FILE]
import { writeFileSync } from 'node:fs';
import { emptyLevel } from '../src/level/format.js';
import { search } from '../src/solve/solve.js';
import { reuse, chokePoints } from '../src/solve/flow.js';
import { roomMetrics } from '../src/solve/metrics.js';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const W = +arg('--w', 9), H = +arg('--h', 7), SECONDS = +arg('--seconds', 300), MAX = 20000;
let seed = +arg('--seed', 1);
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648), pick = a => a[Math.floor(rnd() * a.length)];
const DIRS = ['up', 'right', 'down', 'left'], run = it => { for (;;) { const r = it.next(); if (r.done) return r.value; } };
const OFF = { boomerang: false, dive: false, laser: false, cycle: false, swim: false, light: false, armored: false };

function make(g) {
  const l = emptyLevel(W, H);
  l.powers = { ...OFF }; l.start = { ...g.start };
  l.cells[g.goal.y * W + g.goal.x] = 'goal';
  for (const o of g.gates) l.cells[o.y * W + o.x] = 'gate:' + o.dir;
  return l;
}
const par = l => { const r = run(search(l, MAX)); return r.status === 'solved' ? r.moves.length : null; };
const taken = (g, x, y) => (g.start.x === x && g.start.y === y) || (g.goal.x === x && g.goal.y === y) || g.gates.some(o => o.x === x && o.y === y);
const free = g => { for (let t = 0; t < 60; t++) { const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H); if (!taken(g, x, y)) return { x, y }; } return null; };
function mutate(g0) {
  const g = structuredClone(g0), r = rnd();
  if (r < 0.35 || !g.gates.length) { const f = free(g); if (f) g.gates.push({ ...f, dir: pick(DIRS) }); }
  else if (r < 0.5) g.gates.splice(Math.floor(rnd() * g.gates.length), 1);
  else if (r < 0.7) { const o = pick(g.gates), f = free(g); if (f) Object.assign(o, f); }
  else if (r < 0.85) pick(g.gates).dir = pick(DIRS);
  else { const f = free(g); if (f) g[rnd() < 0.5 ? 'start' : 'goal'] = f; }
  return g;
}
// Takes out every one-way the answer does not need, then scores; null when the room cannot be won.
function score(g) {
  let l = make(g), p = par(l);
  if (p == null) return null;
  for (let i = g.gates.length - 1; i >= 0; i--) {
    const h = { ...g, gates: g.gates.filter((_, k) => k !== i) }, q = par(make(h));
    if (q === p) { g = h; l = make(g); }
  }
  const ru = run(reuse(l, MAX));
  if (!ru) return null;
  const m = run(roomMetrics(l, MAX)), chokes = m && m.par ? m.chokes.length : 0;
  // Reuse counts the one-ways only: the room's edge stops many moves and says nothing about the puzzle.
  const gateUses = [...ru.stops].filter(([id]) => id[0] === 't' && l.cells[+id.slice(1)].startsWith('gate:')).map(([, n]) => n);
  const busiest = Math.max(0, ...gateUses), leaned = gateUses.reduce((a, b) => a + b, 0);
  return { g, l, p, ru, chokes, busiest, leaned, s: 3 * busiest + 2 * leaned + 2 * ru.overlap + chokes + p };
}
const random = () => { const g = { start: { x: 0, y: 0 }, goal: { x: W - 1, y: H - 1 }, gates: [] }; g.start = free({ ...g, start: { x: -1, y: -1 } }) || g.start; for (let k = 0; k < 8; k++) { const f = free(g); if (f) g.gates.push({ ...f, dir: pick(DIRS) }); } return g; };

let best = null, climbs = 0;
const end = Date.now() + SECONDS * 1000;
while (Date.now() < end) {
  climbs++;
  let cur = best && rnd() < 0.5 ? mutate(best.g) : random(), cs = score(cur);
  for (let stall = 0; stall < 120 && Date.now() < end; stall++) {
    const n = mutate(cs ? cs.g : cur), ns = score(n);
    if (ns && (!cs || ns.s >= cs.s)) { if (!cs || ns.s > cs.s) stall = 0; cur = ns.g; cs = ns; } else if (!cs) cur = n;
  }
  if (cs && (!best || cs.s > best.s)) { best = cs; console.log(`climb ${climbs}: score ${cs.s}, ${cs.p} moves, ${cs.g.gates.length} one-ways, moves against one-ways ${cs.leaned}, busiest one-way ${cs.busiest}, path reuse ${cs.ru.overlap}, chokes ${cs.chokes}`); }
}
if (!best) { console.log(`No winnable room in ${climbs} climbs.`); process.exit(0); }
const rows = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => { const c = best.l.cells[y * W + x]; return best.l.start.x === x && best.l.start.y === y ? 'P' : c === 'goal' ? 'G' : c.startsWith('gate:') ? { up: '^', right: '>', down: 'v', left: '<' }[c.slice(5)] : '.'; }).join(''));
console.log(rows.join('\n'));
if (arg('--out')) writeFileSync(arg('--out'), JSON.stringify({ ...best.l, name: 'Puzzle 5 (proposal)' }, null, 1) + '\n');
