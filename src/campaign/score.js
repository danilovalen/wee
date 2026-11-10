// The global score (register 839): every builder star is worth 20, less the fewest tiles placed in a win
// that earned it, and never less than 1. Worked out from the save alone, so a board elsewhere only posts
// the number. A save from before bests per side goal falls back to the win's.
import { builders } from './progression.js';
import { optionalGoals } from './rules.js';

export const STAR_POINTS = 20;
export const SCORE_STEPS = [250, 500, 1000, 1500, 1750];
export const pointsFor = tiles => Math.max(1, STAR_POINTS - (tiles || 0));
// Each earned star of a level: its id, the fewest tiles and its points.
export function levelStars(def, rec) {
  if (!rec || !rec.beaten) return [];
  const best = rec.best || {}, at = (id, n) => ({ id, tiles: n ?? null, points: pointsFor(n) });
  return [at('win', best.win), ...optionalGoals(def).filter(o => rec.goals && rec.goals[o.id]).map(o => at(o.id, best[o.id] ?? best.win))];
}
export const levelScore = (def, rec) => levelStars(def, rec).reduce((n, s) => n + s.points, 0);
export const globalScore = (levels = {}) => builders().reduce((n, def) => n + levelScore(def, levels[def.id]), 0);
