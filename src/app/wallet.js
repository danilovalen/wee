// Stars (registers 558, 638): earned from levels, side goals and achievements, and spent on Looks. What a
// player has bought and spent lives in the campaign save, so a reset or a progress code carries it.
import { progress, write } from './progress.js';
import { usedPieces } from './known.js';
import { allOpen } from './unlock.js';
import { TOOL } from './goalCard.js';
import { achievements } from '../campaign/achievements.js';

const TAUGHT = Object.values(TOOL);
export const owned = (p = progress()) => p.owned || [];
export const spent = (p = progress()) => p.spent || 0;
export const earnedList = (p = progress()) => achievements(p.levels || {}, usedPieces(), TAUGHT, { feats: p.feats || {}, peak: p.peak || {}, spent: spent(p) });
// Every star the campaign has given: one per beaten level, one per side goal met, and each achievement's.
export const earned = (p = progress()) => Object.values(p.levels || {}).reduce((n, r) => n + (r && r.beaten ? 1 : 0) + Object.values((r && r.goals) || {}).filter(Boolean).length, 0) + earnedList(p).reduce((n, a) => n + (a.done ? a.stars : 0), 0);
export const available = (p = progress()) => earned(p) - spent(p);
// A look is worn freely once bought, when it costs nothing, or while everything is unlocked.
export const owns = (key, cost, p = progress()) => cost === 0 || allOpen() || owned(p).includes(key);
export const affords = (cost, p = progress()) => available(p) >= cost;
export function buy(key, cost) {
  const p = progress();
  if (owns(key, cost, p) || !affords(cost, p)) return false;
  p.owned = [...owned(p), key]; p.spent = spent(p) + cost;
  write(p);
  dispatchEvent(new CustomEvent('wee:stars'));
  return true;
}
