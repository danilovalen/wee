// No achievement comes on its own from a plain run of the first two levels (register 958).
import { suite } from './lib.mjs';
import { achievements } from '../src/campaign/achievements.js';
import { builders } from '../src/campaign/progression.js';

const { check, done } = suite('firstach');
const b = builders(), win = { beaten: true, best: { win: 4 }, goals: {} };
const two = { [b[0].id]: win, [b[1].id]: win };
const got = achievements(two, new Set(['wall']), ['wall', 'box'], { score: 34 }).filter(a => a.done).map(a => a.id);
check('beating levels 1 and 2 plainly earns no achievement', got.length === 0, got.join());
const three = { ...two, [b[2].id]: win };
check('beating Level 3 earns the first one', achievements(three, new Set(), ['wall'], {}).find(a => a.id === 'first').done);
done();
