// Room metrics for the Sandbox (register 650, docs/ROOM_METRICS_PLAN.md): how deadly a room is, how much
// choice its moves give, and how many ways it wins. All from one map: every position the blob can reach
// with plain moves, and where each move from it goes. A generator, so the page can run it a slice at a
// time; null when the room has more positions than max. Moves are the solver's own, mid-slide powers
// included, plus the plain moves that kill (the solver drops those).
import { createGame, step, cloneGame } from '../rules/game.js';
import { stateKey, settled, successors } from './solve.js';

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
  const first = stateKey(start), nodes = new Map([[first, { out: [], dist: 0 }]]), queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const s = queue[i], k = stateKey(s), n = nodes.get(k);
    const died = new Set(keys.filter(m => outcome(s, m).die));
    for (const m of died) n.out.push({ die: true });
    // Where each arrow alone leads, for mashing (register 685): the berry, a place, a death, or nowhere.
    n.arrows = KEYS.map(m => died.has(m) ? 'die' : 'stay');
    // Each place a move can lead counts once, however many moves (or powers mid-slide) lead there.
    const to = new Set();
    let at = -1;
    for (const pair of successors(s, keys)) {
      at++;
      if (!pair) continue;
      const t = pair[1], key = t.won ? 'win' : stateKey(t);
      if (at < KEYS.length && n.arrows[at] !== 'die') n.arrows[at] = key;
      if (to.has(key)) continue;
      to.add(key); n.out.push(t.won ? { win: true } : { key });
      if (!t.won && !nodes.has(key)) { if (nodes.size >= max) return null; nodes.set(key, { out: [], dist: n.dist + 1 }); queue.push(t); }
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
  const par = toWin.get(first) ?? null, steps = [];
  // Going straight back the way you came is not a choice.
  for (let k = first, prev = null; par && k;) {
    const n = nodes.get(k), d = toWin.get(k);
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
  const mash = par ? yield* mashing(nodes, first, par) : { chance: 0, half: null };
  const share = n => moves ? n / moves : 0;
  return { ruin: share(hazard + lock), hazard: share(hazard), lock: share(lock), firstRuin, places: nodes.size, par,
    choices: steps.length ? steps.reduce((a, b) => a + b, 0) / steps.length : 0, forced: steps.length ? steps.filter(c => c === 1).length / steps.length : 0, shortest, near,
    mash: mash.chance, mashBudget: par ? 2 * par : null, mashHalf: mash.half };
}
// Button mashing (register 685): a player pressing one of the four arrows at random, each press one move.
// Exact, over the map: the chance of reaching the berry within twice the shortest path, and the press by
// which half of all such players have won (null when half never do within MASH_CAP presses). A death ends
// the try; an arrow that goes nowhere still costs a press.
export const MASH_CAP = 400;
function* mashing(nodes, first, par) {
  let here = new Map([[first, 1]]), won = 0, chance = 0, half = null;
  for (let press = 1; press <= MASH_CAP && here.size; press++) {
    const next = new Map();
    for (const [k, p] of here) for (const a of nodes.get(k).arrows) {
      const q = p / 4;
      if (a === 'win') won += q; else if (a === 'stay') next.set(k, (next.get(k) || 0) + q); else if (a !== 'die') next.set(a, (next.get(a) || 0) + q);
    }
    here = next;
    if (press === 2 * par) chance = won;
    if (half == null && won >= 0.5) half = press;
    if (half != null && press >= 2 * par) break;
    yield press;
  }
  return { chance: 2 * par > MASH_CAP ? won : chance, half };
}
export const runMetrics = (level, max) => { const it = roomMetrics(level, max); for (;;) { const r = it.next(); if (r.done) return r.value; } };
