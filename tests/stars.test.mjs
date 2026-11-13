// Looks cost every star the campaign gives (register 959), so owning them all takes every level, side goal,
// room and achievement. A new level or goal turns this red until the prices are rebalanced.
import { suite } from './lib.mjs';
import { PALETTES, SKINS } from '../src/view/look.js';
import { maxStars } from '../src/campaign/achievements.js';

const { check, done } = suite('stars');
const cost = [...PALETTES, ...SKINS].reduce((n, l) => n + l.cost, 0);
check('every look together costs every star the campaign gives', cost === maxStars(), `${cost} vs ${maxStars()}`);
check('the cheapest look costs 2 stars or more', Math.min(...[...PALETTES, ...SKINS].filter(l => l.cost).map(l => l.cost)) >= 2);
done();
