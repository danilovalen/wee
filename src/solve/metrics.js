// Room metrics for the Sandbox (register 650, docs/ROOM_METRICS_PLAN.md): how deadly a room is, how much
// choice its moves give, and how many ways it wins. All from one map: every position the blob can reach
// with plain moves, and where each move from it goes. A generator, so the page can run it a slice at a
// time; null when the room has more positions than max. Moves are the solver's own, mid-slide powers
// included, plus the plain moves that kill (the solver drops those).
import { createGame, step, cloneGame } from '../rules/game.js';
import { stateKey, settled, successors } from './solve.js';
import { flowUndos, wrongTurns } from './flow.js';

const KEYS = ['up', 'right', 'down', 'left'], NEAR = 2;
const limit = s => 4 * s.w * s.h + 40;
function outcome(s, k) {
  const t = cloneGame(s), d = t.deaths;
  step(t, [k]);
  for (let i = 1; i <= limit(t) && !settled(t); i++) step(t, []);
  if (t.deaths !== d || !settled(t)) return { die: true };
  return {};
}

// { ruin, hazard, lock (shares of moves, 0-1), firstRuin (moves, or null for never), places, choices,
//   forced (share), shortest, near (wins within NEAR moves of the shortest), par }
export function* roomMetrics(level, max = 5000) {
  const start = createGame(level), keys = [...KEYS, ...(start.powers.cycle || start.powers.swim ? ['hide'] : [])];
  const at = s => ({ x: s.player.x, y: s.player.y });
  const first = stateKey(start), nodes = new Map([[first, { out: [], dist: 0, at: at(start) }]]), queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const s = queue[i], k = stateKey(s), n = nodes.get(k);
    const died = new Set(keys.filter(m => outcome(s, m).die));
    for (const m of died) n.out.push({ die: true });
    // Each place a move can lead counts once, however many moves (or powers mid-slide) lead there.
    const to = new Set();
    for (const pair of successors(s, keys)) {
      if (!pair) continue;
      const t = pair[1], key = t.won ? 'win' : stateKey(t);
      if (to.has(key)) continue;
      to.add(key); n.out.push(t.won ? { win: true } : { key });
      if (!t.won && !nodes.has(key)) { if (nodes.size >= max) return null; nodes.set(key, { out: [], dist: n.dist + 1, at: at(t) }); queue.push(t); }
    }
    yield nodes.size;
  }
  // How far each position is from the berry, grown backwards; a position with no distance can never win.
  const toWin = new Map();
  let ring = [...nodes].filter(([, n]) => n.out.some(o => o.win)).map(([k]) => k);
  for (const k of ring) toWin.set(k, 1);
  for (let d = 2; ring.length; d++) {
    const at = new Set(ring), next = [];
    for (const [k, n] of nodes) if (!toWin.has(k) && n.out.some(o => o.key && at.has(o.key))) { toWin.set(k, d); next.push(k); }
    ring = next; yield nodes.size;
  }
  const alive = k => toWin.has(k), safe = o => o.win || (o.key && alive(o.key));
  let moves = 0, hazard = 0, lock = 0, firstRuin = null;
  for (const [k, n] of nodes) {
    if (!alive(k)) continue;
    let ruins = false;
    for (const o of n.out) { moves++; if (o.die) { hazard++; ruins = true; } else if (o.key && !alive(o.key)) { lock++; ruins = true; } }
    if (ruins) firstRuin = Math.min(firstRuin ?? Infinity, n.dist);
  }
  // Along one shortest path: how many moves at each step keep the berry in reach, and how many steps had one.
  const par = toWin.get(first) ?? null, steps = [], path = [];
  // Going straight back the way you came is not a choice.
  for (let k = first, prev = null; par && k;) {
    const n = nodes.get(k), d = toWin.get(k);
    path.push(k);
    steps.push(n.out.filter(o => safe(o) && o.key !== prev).length);
    if (d === 1) break;
    prev = k; k = n.out.find(o => o.key && toWin.get(o.key) === d - 1).key;
  }
  // Ways to win: move sequences that end on the berry, counted by length, up to NEAR past the shortest.
  let shortest = 0, near = 0;
  if (par) {
    let here = new Map([[first, 1]]);
    for (let len = 1; len <= par + NEAR; len++) {
      const next = new Map();
      for (const [k, w] of here) for (const o of nodes.get(k).out) {
        if (o.win) { if (len === par) shortest += w; near += w; } else if (o.key && alive(o.key) && toWin.get(o.key) <= par + NEAR - len) next.set(o.key, (next.get(o.key) || 0) + w);
      }
      here = next;
    }
  }
  // Going with the flow (registers 708-710) and the wrong turns along the way (709).
  const undos = par ? yield* flowUndos(nodes, first) : null, wrong = par ? wrongTurns(nodes, path, toWin) : null;
  const share = n => moves ? n / moves : 0;
  return { ruin: share(hazard + lock), hazard: share(hazard), lock: share(lock), firstRuin, places: nodes.size, par,
    choices: steps.length ? steps.reduce((a, b) => a + b, 0) / steps.length : 0, forced: steps.length ? steps.filter(c => c === 1).length / steps.length : 0, shortest, near,
    undos, wrong };
}
export const runMetrics = (level, max) => { const it = roomMetrics(level, max); for (;;) { const r = it.next(); if (r.done) return r.value; } };
