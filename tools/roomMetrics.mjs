// Prototype (register 650): candidate Sandbox metrics for how deadly a room is, how branching its moves
// are, and how many ways it wins, measured on the campaign's known rooms. Run: node tools/roomMetrics.mjs
import { createGame, step, cloneGame } from '../src/rules/game.js';
import { stateKey, settled } from '../src/solve/solve.js';
import { room } from '../tests/lib.mjs';
import { KNOWN } from '../tests/knownRooms.mjs';

const KEYS = ['up', 'right', 'down', 'left'], limit = s => 4 * s.w * s.h + 40;
function outcome(s, k, before) {
  const t = cloneGame(s), d = t.deaths; step(t, [k]);
  for (let i = 1; i <= limit(t) && !settled(t); i++) step(t, []);
  if (t.deaths !== d) return { die: true };
  if (!settled(t)) return { die: true };
  if (t.won) return { win: true };
  const key = stateKey(t); return key === before ? { noop: true } : { key, t };
}
export function metrics(level, max = 5000) {
  const start = createGame(level), nodes = new Map([[stateKey(start), { out: [], dist: 0 }]]), q = [start];
  while (q.length) {
    const s = q.shift(), k = stateKey(s), n = nodes.get(k);
    for (const m of KEYS) { const o = outcome(s, m, k); n.out.push(o.key ? { key: o.key } : o); if (o.key && !nodes.has(o.key)) { if (nodes.size >= max) return null; nodes.set(o.key, { out: [], dist: n.dist + 1 }); q.push(o.t); } }
  }
  const good = new Set([...nodes].filter(([, n]) => n.out.some(o => o.win)).map(([k]) => k));
  for (let g = true; g;) { g = false; for (const [k, n] of nodes) if (!good.has(k) && n.out.some(o => o.key && good.has(o.key))) { good.add(k); g = true; } }
  // Moves that do something, from positions that can still win: how many kill, how many lock.
  let moves = 0, die = 0, lock = 0;
  for (const [k, n] of nodes) if (good.has(k)) for (const o of n.out) { if (o.noop) continue; moves++; if (o.die) die++; else if (o.key && !good.has(o.key)) lock++; }
  // Shortest win distance from every position (backwards), and the number of shortest ways.
  const toWin = new Map(); let frontier = [...nodes].filter(([, n]) => n.out.some(o => o.win)).map(([k]) => k); frontier.forEach(k => toWin.set(k, 1));
  for (let d = 1; frontier.length; d++) { const next = []; for (const [k, n] of nodes) if (!toWin.has(k) && n.out.some(o => o.key && frontier.includes(o.key))) { toWin.set(k, d + 1); next.push(k); } frontier = next; }
  const first = stateKey(start), par = toWin.get(first);
  const ways = k => { const n = nodes.get(k), d = toWin.get(k); if (d === 1) return n.out.filter(o => o.win).length; return n.out.filter(o => o.key && toWin.get(o.key) === d - 1).reduce((a, o) => a + ways(o.key), 0); };
  // Along one shortest path: how many moves keep you able to win, and how many steps had only one.
  let k = first, choices = [], forced = 0;
  while (k && toWin.get(k) > 0) {
    const n = nodes.get(k), keep = n.out.filter(o => o.win || (o.key && good.has(o.key)));
    choices.push(keep.length); if (keep.length === 1) forced++;
    if (toWin.get(k) === 1) break;
    k = n.out.find(o => o.key && toWin.get(o.key) === toWin.get(k) - 1).key;
  }
  // The fewest moves from the start to a move that kills or locks.
  let ruinAt = null; for (const [kk, n] of nodes) if (good.has(kk) && n.out.some(o => o.die || (o.key && !good.has(o.key)))) ruinAt = Math.min(ruinAt ?? Infinity, n.dist);
  const onShortest = [...nodes.keys()].filter(kk => toWin.has(kk) && nodes.get(kk).dist + toWin.get(kk) === par).length;
  return { par, ways: par ? ways(first) : 0, positions: nodes.size, ruin: Math.round(100 * (die + lock) / moves), die: Math.round(100 * die / moves), lock: Math.round(100 * lock / moves), ruinAt,
    choices: +(choices.reduce((a, b) => a + b, 0) / choices.length).toFixed(1), forced: Math.round(100 * forced / choices.length), detour: Math.round(100 * (good.size - onShortest) / good.size) };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('level par ways positions ruin% (die/lock) ruinAt choices forced% detour%');
  for (const [id, rows] of Object.entries(KNOWN.small)) { const m = metrics(room(rows)); if (m) console.log(id.padEnd(5), m.par, m.ways, m.positions, `${m.ruin} (${m.die}/${m.lock})`, m.ruinAt, m.choices, m.forced, m.detour); }
}
