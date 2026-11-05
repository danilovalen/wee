// The robot: every shortest way to the goal, not just one. A breadth-first search by layers
// that keeps every parent of a state reached at its first depth, so two equal-length routes
// into one position both survive, then walks back from each winning move.
import { createGame, cloneGame } from '../rules/game.js';
import { stateKey, successors, unsearchable, move, MAX_STATES } from '../solve/solve.js';

const KEYS = ['up', 'right', 'down', 'left'];

// Returns { status: 'solved', length, paths, capped } or { status } ('unsolvable', 'capped',
// or why the room cannot be searched). capped on a solved result means more than maxPaths
// shortest paths exist and only the first maxPaths came back. With maxDepth, a goal not
// reached in that many moves stops the search early: { status: 'longer' }.
export function* shortestPaths(level, { max = MAX_STATES, maxPaths = 2000, maxDepth = Infinity } = {}) {
  const why = unsearchable(level);
  if (why) return { status: why };
  const start = createGame(level), keys = [...KEYS, ...(start.powers.cycle || start.powers.swim ? ['hide'] : [])];
  const startKey = stateKey(start), depth = new Map([[startKey, 0]]), parents = new Map([[startKey, []]]);
  let frontier = [[startKey, start]], d = 0;
  while (frontier.length) {
    const next = new Map(), wins = [];
    for (const [key, s] of frontier) {
      for (const pair of successors(s, keys)) {
        if (!pair) { yield depth.size; continue; }
        const [m, t] = pair;
        if (t.won) { wins.push([key, m]); continue; }
        const k = stateKey(t), seen = depth.get(k);
        if (seen === undefined) { depth.set(k, d + 1); parents.set(k, [[key, m]]); next.set(k, t); }
        else if (seen === d + 1) parents.get(k).push([key, m]);
        if (depth.size >= max) return { status: 'capped' };
      }
      yield depth.size;
    }
    if (wins.length) return { status: 'solved', length: d + 1, ...walkBack(wins, parents, startKey, maxPaths) };
    if (d + 1 >= maxDepth) return { status: 'longer' };
    frontier = [...next]; d++;
  }
  return { status: 'unsolvable' };
}

function walkBack(wins, parents, startKey, maxPaths) {
  const paths = [];
  const back = (key, tail) => {
    if (paths.length >= maxPaths) return;
    if (key === startKey) { paths.push(tail); return; }
    for (const [pk, m] of parents.get(key)) back(pk, [m, ...tail]);
  };
  for (const [key, m] of wins) back(key, [m]);
  return { paths, capped: paths.length >= maxPaths };
}

export function allShortest(level, opts) {
  const it = shortestPaths(level, opts);
  for (;;) { const r = it.next(); if (r.done) return r.value; }
}

// One path replayed tick by tick with the solver's own move(), so it is the path it found:
// see(state) runs on the start and after every tick. Returns the end state.
// Each path is replayed once per room and its ticks kept, so every goal judged on it reads the same
// frames (register 462).
const replays = new WeakMap(), KEEP_PATHS = 4000;
export function replayPath(level, moves, see) {
  const byRoom = replays.get(level) || new Map(), key = moves.join(' ');
  if (!replays.has(level)) replays.set(level, byRoom);
  let r = byRoom.get(key);
  if (!r) {
    const frames = [], keep = t => frames.push(cloneGame(t));
    let s = createGame(level);
    keep(s);
    for (const m of moves) s = move(s, m, keep) || s;
    r = { frames, end: s };
    if (byRoom.size >= KEEP_PATHS) byRoom.clear();
    byRoom.set(key, r);
  }
  for (const f of r.frames) see(f);
  return r.end;
}
