// The robot: every shortest way to the goal, not just one. A breadth-first search by layers
// that keeps every parent of a state reached at its first depth, so two equal-length routes
// into one position both survive, then walks back from each winning move.
import { createGame } from '../rules/game.js';
import { entAt, playerAt } from '../rules/grid.js';
import { stateKey, successors, unsearchable, move, MAX_STATES } from '../solve/solve.js';

const KEYS = ['up', 'right', 'down', 'left'];

// Returns { status: 'solved', length, paths, capped } or { status } ('unsolvable', 'capped',
// or why the room cannot be searched). capped on a solved result means more than maxPaths
// shortest paths exist and only the first maxPaths came back.
export function* shortestPaths(level, { max = MAX_STATES, maxPaths = 2000 } = {}) {
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
export function replayPath(level, moves, see) {
  let s = createGame(level);
  see(s);
  for (const m of moves) s = move(s, m, see) || s;
  return s;
}

// Why the robot cannot finish: every position it can reach, and what never happens there.
// Returns { capped } when the search ran out, else { door, stuck, apart }: door is the first
// colour whose doors never open (null if every door opens at some point), stuck the cells of
// its switches that never hold, apart true when each holds at some point but never all at once.
export function whyStuck(level, { max = MAX_STATES } = {}) {
  const start = createGame(level), keys = [...KEYS, ...(start.powers.cycle || start.powers.swim ? ['hide'] : [])];
  const seen = new Set([stateKey(start)]), opened = new Set(), held = new Set();
  const note = s => {
    for (const [c, on] of Object.entries(s.open)) if (on) opened.add(c);
    s.cells.forEach((c, i) => {
      const x = i % s.w, y = Math.floor(i / s.w);
      if (c.startsWith('toggle:') ? s.toggled.includes(i) : c.startsWith('button:') ? playerAt(s, x, y) || !!entAt(s, x, y) : /^(receiver|sensor):/.test(c) && s.lit.has(i)) held.add(i);
    });
  };
  note(start);
  let frontier = [start];
  while (frontier.length) {
    const next = [];
    for (const s of frontier) for (const pair of successors(s, keys)) {
      if (!pair || pair[1].won) continue;
      const t = pair[1], k = stateKey(t);
      if (seen.has(k)) continue;
      seen.add(k); note(t); next.push(t);
      if (seen.size >= max) return { capped: true };
    }
    frontier = next;
  }
  const colours = [...new Set(start.cells.filter(c => /^door:/.test(c)).map(c => c.slice(5)))];
  const door = colours.find(c => !opened.has(c)) ?? null;
  if (door === null) return { door, stuck: [], apart: false };
  const own = start.cells.flatMap((c, i) => /^(button|toggle|receiver|sensor):/.test(c) && c.endsWith(':' + door) ? [i] : []);
  const stuck = own.filter(i => !held.has(i));
  return { door, stuck, apart: own.length > 0 && stuck.length === 0 };
}
