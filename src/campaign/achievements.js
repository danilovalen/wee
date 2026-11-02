// Achievements (register 558): each gives stars toward Looks. Worked out from the saved progress and the
// pieces used, so there is nothing more to save. levels: the save's records; used: the tools used.
import { builders } from './progression.js';
import { CHALLENGES } from '../level/challenges.js';
import { optionalGoals } from './rules.js';

const beaten = (levels, id) => !!(levels[id] && levels[id].beaten);
const allSide = (levels, def) => optionalGoals(def).length > 0 && optionalGoals(def).every(o => levels[def.id] && levels[def.id].goals && levels[def.id].goals[o.id]);
// taught: the tools the campaign has a piece for.
export function achievements(levels, used, taught) {
  const b = builders(), won = b.filter(d => beaten(levels, d.id)).length;
  return [
    { id: 'first', name: 'First berry', text: 'Beat Level 1.', stars: 1, done: b.length > 0 && beaten(levels, b[0].id) },
    { id: 'half', name: 'Halfway', text: `Beat ${Math.ceil(b.length / 2)} levels.`, stars: 2, done: won >= Math.ceil(b.length / 2) },
    { id: 'all', name: 'Every room', text: `Beat all ${b.length} levels.`, stars: 3, done: won === b.length },
    { id: 'shelf', name: 'Full shelf', text: 'Earn every side star on one level.', stars: 1, done: b.some(d => allSide(levels, d)) },
    { id: 'lab', name: 'Whole lab', text: 'Earn every side star on every level.', stars: 5, done: b.every(d => !optionalGoals(d).length || allSide(levels, d)) && b.some(d => optionalGoals(d).length) },
    { id: 'challenge', name: 'Challenger', text: 'Solve a challenge.', stars: 1, done: CHALLENGES.some(c => beaten(levels, c.id)) },
    { id: 'pieces', name: 'Full kit', text: 'Beat a level with every kind of piece.', stars: 2, done: taught.every(t => used.has(t)) },
  ];
}
export const achievementStars = (levels, used, taught) => achievements(levels, used, taught).reduce((n, a) => n + (a.done ? a.stars : 0), 0);
