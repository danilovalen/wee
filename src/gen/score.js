// Judging a generated room: solved, par inside the range, every Must-use ingredient changing
// the answer, nothing set to Off in the room. The score orders the rooms that fail, so the
// search can climb toward one that fits.
import { search } from '../solve/solve.js';
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
  return { fit: !miss.length && !out, score, status: 'solved', par, moves: r.moves, missing: miss };
}
