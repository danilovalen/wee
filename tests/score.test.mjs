// The global score (register 839): 20 a star, less the fewest tiles that earned it, never under 1; the
// local board, the score achievements and the times kept for a later speedrun.
import { suite } from './lib.mjs';
import { pointsFor, levelStars, globalScore, STAR_POINTS, SCORE_STEPS } from '../src/campaign/score.js';
import { builders } from '../src/campaign/progression.js';
import { optionalGoals } from '../src/campaign/rules.js';
import { achievements } from '../src/campaign/achievements.js';

const store = new Map();
globalThis.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), key: i => [...store.keys()][i], get length() { return store.size; } };
const { postScore, topScores, board, tick } = await import('../src/app/board.js');

const { check, done } = suite('score');
const [d1, d2] = builders(), side = optionalGoals(d1)[0];
check('a star is worth 20, less its fewest tiles', STAR_POINTS === 20 && pointsFor(3) === 17 && pointsFor(0) === 20);
check('a star never falls under 1 point', pointsFor(19) === 1 && pointsFor(25) === 1);
check('a level not beaten scores nothing', globalScore({ [d1.id]: { beaten: false, best: { win: 2 } } }) === 0);
const rec = { beaten: true, best: { win: 2, [side.id]: 5 }, goals: { [side.id]: true } };
check('the win star and a met side star each score from their own best', globalScore({ [d1.id]: rec }) === 18 + 15, String(globalScore({ [d1.id]: rec })));
check('a side star with no best of its own falls back to the win', levelStars(d1, { beaten: true, best: { win: 4 }, goals: { [side.id]: true } }).find(s => s.id === side.id).points === 16);
check('a side goal not met scores nothing', levelStars(d1, { beaten: true, best: { win: 4 }, goals: { [side.id]: false } }).length === 1);
check('only builder levels count', globalScore({ notALevel: rec }) === 0 && globalScore({ [d1.id]: rec, [d2.id]: { beaten: true, best: { win: 1 } } }) === 33 + 19);
check('the score achievements are fixed steps, the last one under the best known score', JSON.stringify(SCORE_STEPS) === '[250,500,1000,1500,1750]');
const ach = s => achievements({}, new Set(), [], { score: s }).filter(a => a.id.startsWith('score'));
check('a score achievement is done once the score reaches its step', ach(499).filter(a => a.done).length === 1 && ach(500).filter(a => a.done).length === 2 && ach(1750).every(a => a.done));
const p = { levels: { [d1.id]: rec } };
check('the dev save never posts a score', postScore(p, 'all') === null && board().length === 0);
postScore(p, 'me'); postScore({ levels: {} }, 'me');
check('Me keeps one line, at its latest score', board().length === 1 && board()[0].score === 0);
postScore(p, 'guest'); store.delete('wee.guestRun'); postScore({ levels: { [d2.id]: { beaten: true, best: { win: 0 } } } }, 'guest');
check('each guest keeps its own line after a fresh start', board().filter(r => r.slot === 'guest').length === 2, JSON.stringify(board()));
check('the board lists the highest score first', topScores()[0].score === 33 && topScores().at(-1).score === 0);
const save = {};
const t0 = tick(save, null, 1000), t1 = tick(save, t0, 61000), t2 = tick(save, t1, 61000 + 3600000);
check('the clock keeps when the save started and the time in levels, an hour away counted as five minutes', save.clock.started === 1000 && save.clock.ms === 60000 + 300000 && t2 === 3661000, JSON.stringify(save.clock));
done();
