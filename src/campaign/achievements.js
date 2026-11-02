// Achievements (register 558): each gives stars toward Looks. Worked out from the saved progress and the
// pieces used, so there is nothing more to save. levels: the save's records; used: the tools used.
import { builders } from './progression.js';
import { CHALLENGES } from '../level/challenges.js';
import { optionalGoals } from './rules.js';

const beaten = (levels, id) => !!(levels[id] && levels[id].beaten);
const allSide = (levels, def) => optionalGoals(def).length > 0 && optionalGoals(def).every(o => levels[def.id] && levels[def.id].goals && levels[def.id].goals[o.id]);
// taught: the tools the campaign has a piece for. extra: feats (achievement id to the level it was earned
// on), peak (the best count toward a goal so far) and spent (stars spent on Looks), registers 629-639.
export const SPEND = 10;
export const LONG = 12;
export const SMALL = 5;
export const DOORS = 5;
export const SAFE = 8;
export const SIDE = 4;
export function achievements(levels, used, taught, extra = {}) {
  const b = builders(), won = b.filter(d => beaten(levels, d.id)).length, half = Math.ceil(b.length / 2);
  const feats = extra.feats || {}, peak = extra.peak || {}, spent = extra.spent || 0;
  const feat = (id, icon, name, text, of, at) => ({ id, icon, name, text, stars: 1, done: id in feats, where: feats[id] ?? null, ...(of ? { of, at: Math.min(of, at || 0) } : {}) });
  return [
    { id: 'first', icon: 'ach-first', name: 'First berry', text: 'Beat Level 1.', stars: 1, done: b.length > 0 && beaten(levels, b[0].id) },
    { id: 'half', icon: 'ach-half', name: 'Halfway', text: `Beat ${half} levels.`, stars: 2, done: won >= half, of: half, at: Math.min(half, won) },
    { id: 'all', icon: 'ach-all', name: 'Every room', text: `Beat all ${b.length} levels.`, stars: 3, done: won === b.length, of: b.length, at: won },
    { id: 'shelf', icon: 'ach-shelf', name: 'Full shelf', text: 'Earn every side star on one level.', stars: 1, done: b.some(d => allSide(levels, d)) },
    { id: 'lab', icon: 'ach-lab', name: 'Whole lab', text: 'Earn every side star on every level.', stars: 5, done: b.every(d => !optionalGoals(d).length || allSide(levels, d)) && b.some(d => optionalGoals(d).length) },
    { id: 'challenge', icon: 'ach-challenge', name: 'Challenger', text: 'Solve a challenge.', stars: 1, done: CHALLENGES.some(c => beaten(levels, c.id)) },
    { id: 'pieces', icon: 'ach-pieces', name: 'Full kit', text: 'Beat a level with every kind of piece.', stars: 2, done: taught.every(t => used.has(t)), of: taught.length, at: taught.filter(t => used.has(t)).length },
    { id: 'cashback', icon: 'ach-cashback', name: 'Cashback', text: `Spend ${SPEND} stars on Looks.`, stars: 1, done: spent >= SPEND, of: SPEND, at: spent },
    feat('moveit', 'ach-moveit', 'Move it move it', `Win in ${LONG} moves or more in a room ${SMALL}x${SMALL} or smaller.`, LONG, peak.moveit),
    feat('oneshot', 'ach-oneshot', 'One shot', 'Reach the berry in 1 move with every other main goal met.'),
    feat('gateway', 'ach-gateway', 'Gateway', `Win with ${DOORS} doors or more.`, DOORS, peak.gateway),
    feat('guardrails', 'ach-guardrails', 'Guardrails', `Win in ${SAFE} moves or more in a room where no move can lose.`),
    feat('deadly', 'ach-deadly', 'Deadly', `Win in ${SAFE} moves or more in a room where every other move loses.`),
    feat('silver', 'ach-silver', 'Silver bullet', `Meet ${SIDE} side goals in one win.`, SIDE, peak.silver),
  ];
}
export const achievementStars = (levels, used, taught, extra) => achievements(levels, used, taught, extra).reduce((n, a) => n + (a.done ? a.stars : 0), 0);
