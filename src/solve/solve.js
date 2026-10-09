// The solver: a breadth-first search over the room's states, one move of yours per
// edge, using the real rules. A move is a slide you start from rest (or a hide), run
// until you and every piece have stopped. Mid-slide powers (Boomerang, Dive, Laser)
// are not tried, so a room that needs one reads as unsolved; the result says so.
import { createGame, step } from '../rules/game.js';
import { MOVES } from '../rules/base.js';

export const MAX_STATES = 20000;
const KEYS = ['up', 'right', 'down', 'left'];

// What makes two states the same for the search: everything the next move depends on.
export function stateKey(s) {
  const p = s.player;
  return JSON.stringify([p.x, p.y, p.swimming, p.sticky, p.stuck && [p.stuck.id, p.stuck.ride], s.checkpoint.x, s.checkpoint.y,
    s.entities.filter(e => !e.dead).map(e => [e.id, e.x, e.y, e.dir, e.axis, e.sticky ? 1 : 0, e.glue || 0, e.turret ? e.turret.aim : -1]),
    Object.keys(s.open).filter(c => s.open[c]).sort()]);
}

const settled = s => !s.player.dir && !s.player.hidden && !s.entities.some(e => !e.dead && (e.rush || e.slide));

// One move from state s: a fresh copy, the key, then ticks until everything stops.
// Null when the move changes nothing, kills you, or never settles.
export function move(s, k) {
  const t = structuredClone(s), deaths = t.deaths, before = stateKey(s);
  step(t, [k]);
  for (let i = 0; i < 4 * t.w * t.h + 40 && !settled(t); i++) step(t);
  if (t.deaths !== deaths || !settled(t)) return null;
  if (!t.won && stateKey(t) === before) return null;
  return t;
}

// Why a room cannot be searched, or null when it can.
export function unsearchable(level) {
  if (!level.cells.includes('goal')) return 'nogoal';
  if (level.entities.some(e => (MOVES.includes(e.kind) && e.mode === 'realtime') || (e.turret && e.turret.mode === 'realtime'))) return 'realtime';
  return null;
}

// A generator, so the page can run it a slice at a time and stay responsive. Yields the
// number of states seen so far; returns { status, moves, states }.
export function* search(level, max = MAX_STATES) {
  const why = unsearchable(level);
  if (why) return { status: why, moves: null, states: 0 };
  const start = createGame(level);
  const keys = [...KEYS, ...(level.powers.cycle || level.powers.swim ? ['hide'] : [])];
  const seen = new Map([[stateKey(start), null]]);
  let frontier = [{ s: start, path: [] }];
  while (frontier.length) {
    const next = [];
    for (const { s, path } of frontier) {
      for (const k of keys) {
        const t = move(s, k);
        if (!t) continue;
        if (t.won) return { status: 'solved', moves: [...path, k], states: seen.size };
        const key = stateKey(t);
        if (seen.has(key)) continue;
        seen.set(key, true);
        if (seen.size >= max) return { status: 'capped', moves: null, states: seen.size };
        next.push({ s: t, path: [...path, k] });
      }
      yield seen.size;
    }
    frontier = next;
  }
  return { status: 'unsolvable', moves: null, states: seen.size };
}

// The whole search at once, for tests and tools.
export function solve(level, max) {
  const it = search(level, max);
  for (;;) { const r = it.next(); if (r.done) return r.value; }
}
