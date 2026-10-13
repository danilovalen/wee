// Judging a generated room: solved, par inside the range, every Must-use ingredient changing
// the answer, nothing set to Off in the room. The score orders the rooms that fail, so the
// search can climb toward one that fits.
import { search, move, stateKey } from '../solve/solve.js';
import { createGame } from '../rules/game.js';
import { elementCheck, idleElements, NOTES_MAX } from '../solve/design.js';
import { contains } from '../solve/tags.js';
import { ING, variants } from './ingredients.js';

// The Off ingredients whose tags the room holds.
export const offFound = (level, recipe) => {
  const have = new Set(contains(level));
  return Object.keys(ING).filter(id => !recipe.ing[id] && ING[id].tags.some(t => have.has(t)));
};

// Must-use ingredients that do not change the answer: the room without them, or with their
// plain stand-in (a wall where they are), has the same number of moves. A search that hits its
// cap proves nothing, so it counts as missing.
export function* missing(level, recipe, par, max) {
  const out = [];
  for (const id of Object.keys(recipe.ing)) {
    if (recipe.ing[id] !== 'must') continue;
    for (const v of variants(ING[id], level)) {
      const r = yield* search(v, max);
      if (r.status === 'unsolvable' || (r.status === 'solved' && r.moves.length !== par)) continue;
      out.push(id);
      break;
    }
  }
  return out;
}

// How many moves of an answer, before its last, come after the last one that changed the room
// itself: a walk to the goal once everything has happened. A move counts when a piece, a door, a
// broken block or a fuse changes, when it acts (a hide, a spring, a power), or when you cross
// anything but plain floor on the way (through a door, over a one-way or a triangle).
export const TAIL_MAX = 2;
const ACTS = new Set(['spring', 'hide', 'swim', 'laser', 'boomerang', 'dive', 'checkpoint', 'stick', 'glue', 'pushed', 'cross']);
const world = s => stateKey(s).slice(stateKey(s).indexOf('|'));
export function dullTail(level, moves) {
  let s = createGame(level), last = -1;
  moves.forEach((m, i) => {
    const before = world(s), acts = [];
    const next = move(s, m, t => { acts.push(...t.events.map(e => e.type)); const c = t.cells[t.player.y * t.w + t.player.x]; if (c && c !== 'goal') acts.push('cross'); });
    if (!next) return;
    if (world(next) !== before || acts.some(a => ACTS.has(a))) last = i;
    s = next;
  });
  return Math.max(0, moves.length - 2 - last);
}

// A generator: runs the solver a slice at a time, then returns the verdict.
export function* judge(level, recipe, max = 3000) {
  const off = offFound(level, recipe);
  if (off.length) return { fit: false, score: -Infinity, status: 'off', off };
  const r = yield* search(level, max);
  if (r.status !== 'solved') return { fit: false, score: -1000, status: r.status };
  const par = r.moves.length, miss = yield* missing(level, recipe, par, max);
  const out = par < recipe.min ? recipe.min - par : par > recipe.max ? par - recipe.max : 0;
  const mid = (recipe.min + recipe.max) / 2;
  const score = -100 * miss.length - 10 * out - Math.abs(par - mid) / 10;
  if (miss.length || out) return { fit: false, score, status: 'solved', par, moves: r.moves, missing: miss };
  // Last, and only for a room that fits otherwise (it is the costly part): every piece and tile
  // must change the answer, as the editor's design notes would judge it.
  const { unused, plain } = idleElements(yield* elementCheck(level, NOTES_MAX), par);
  const idle = [...unused, ...plain];
  // How far the answer walks on after everything has happened; generate() looks on for a fit
  // that does not.
  const tail = idle.length ? 0 : Math.max(0, dullTail(level, r.moves) - TAIL_MAX);
  return { fit: !idle.length, score: score - 30 * idle.length, status: 'solved', par, moves: r.moves, missing: miss, unused, plain, tail };
}
