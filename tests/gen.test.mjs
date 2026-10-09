// The generator: a recipe always rebuilds the same room, every room it calls a fit is one
// (checked with the solver and the index, not with the generator's own score), and nothing
// set to Off ever reaches a room.
import { parseLevel } from '../src/level/format.js';
import { solve } from '../src/solve/solve.js';
import { contains, uses, MECHANISMS } from '../src/solve/tags.js';
import { rng } from '../src/gen/random.js';
import { INGREDIENTS, ING } from '../src/gen/ingredients.js';
import { touches, without, offFound, judge } from '../src/gen/score.js';
import { normalize, recipeLabel, build, mutate, generateNow } from '../src/gen/generate.js';
import { room, suite } from './lib.mjs';

const { check, done } = suite('gen');
const run = it => { for (;;) { const r = it.next(); if (r.done) return r.value; } };
const OFF = { boomerang: false, dive: false, laser: false, cycle: false };
const goal = (l, x, y) => { l.cells[y * l.w + x] = 'goal'; l.powers = { ...l.powers, ...OFF }; return l; };

const a = rng(7), b = rng(7), xs = Array.from({ length: 50 }, () => a.next());
check('one seed gives one sequence', xs.every(x => x === b.next()));
check('numbers fall in [0, 1)', xs.every(x => x >= 0 && x < 1) && new Set(xs).size > 45);
check('another seed gives other numbers', rng(8).next() !== xs[0]);

const n = normalize({ w: 99, h: 1, min: 20, max: 3, ing: { receiver: 'must', box: 'nope', ghost: 'must' }, seed: '12' });
check('sizes stay in range', n.w === 14 && n.h === 5, JSON.stringify(n));
check('max is never below min', n.min === 20 && n.max === 20);
check('unknown ingredients and values are dropped', !n.ing.box && !n.ing.ghost);
check('an ingredient brings what it needs, as Allowed', n.ing.receiver === 'must' && n.ing.turret === 'allowed' && n.ing.door === 'allowed', JSON.stringify(n.ing));
check('the seed is a number', n.seed === 12);
check('the label is size, moves and Must, in the panel\'s order', recipeLabel(normalize({ w: 8, h: 7, min: 6, max: 12, ing: { door: 'must', box: 'must', tri: 'allowed' } })) === '8x7 · 6-12 moves · Box, Door and button', recipeLabel(normalize({ w: 8, h: 7, min: 6, max: 12, ing: { door: 'must', box: 'must' } })));

const tags = new Set(MECHANISMS.map(m => m[0]));
const bad = INGREDIENTS.flatMap(g => [...g.tags, ...(g.needs || [])].filter(t => !tags.has(t) && !/^touch:/.test(t) && t !== 'shapes').map(t => g.id + ':' + t));
check('every ingredient tag and need is a real index tag', !bad.length, bad.join());
check('every ingredient either places something or turns on a power', INGREDIENTS.every(g => !!g.place !== !!g.power));
check('every brought-along ingredient exists', INGREDIENTS.every(g => (g.with || []).every(w => ING[w])));

// Each ingredient on its own: the built room holds it, holds nothing Off, and loads.
const unplaced = [], leaks = [], unloadable = [];
for (const g of INGREDIENTS) {
  const rec = normalize({ ing: { [g.id]: 'must' }, seed: 3 }), l = build(rec, rng(3)), c = contains(l);
  if (!c.includes(g.tags[0])) unplaced.push(g.id);
  if (offFound(l, rec).length) leaks.push(g.id + ':' + offFound(l, rec));
  try { parseLevel(JSON.stringify(l)); } catch (e) { unloadable.push(g.id + ' ' + e.message); }
}
check('build places every Must ingredient', !unplaced.length, unplaced.join());
check('build places nothing set to Off', !leaks.length, leaks.join());
check('every built room is a valid level', !unloadable.length, unloadable.join());

const one = normalize({ ing: { box: 'must' }, seed: 5 }), base = build(one, rng(5));
let fine = true;
const mr = rng(9);
for (let k = 0, cur = base; k < 300; k++) {
  cur = mutate(cur, one, mr);
  const edge = cur.cells.every((c, i) => { const x = i % cur.w, y = (i - x) / cur.w; return !(x === 0 || y === 0 || x === cur.w - 1 || y === cur.h - 1) || c === 'wall'; });
  const inner = p => p.x > 0 && p.y > 0 && p.x < cur.w - 1 && p.y < cur.h - 1;
  if (!edge || cur.cells.filter(c => c === 'goal').length !== 1 || !inner(cur.start) || !cur.entities.every(inner) || cur.cells[cur.start.y * cur.w + cur.start.x] !== '') { fine = false; break; }
}
check('a change keeps the walls, one goal, and the start and pieces inside on floor', fine);
check('a change returns a new room and leaves the old one alone', JSON.stringify(mutate(base, one, rng(1))) !== JSON.stringify(base) && JSON.stringify(base) === JSON.stringify(build(one, rng(5))));

// What a solution touches.
const wet = goal(room(['#######', '#P..w.#', '#.....#', '#######']), 1, 2);
check('stopping against water touches it', touches(wet, ['right']).includes('touch:water'));
const box = goal(room(['#######', '#PB...#', '#######']), 4, 1);
check('pushing a box touches it', touches(box, ['right']).includes('touch:box'));
check('a plain slide touches nothing', !touches(goal(room(['#####', '#P..#', '#####']), 3, 1), ['right']).length);
const shot = room(['#######', '#P..E.#', '#.....#', '#######'], { powers: { laser: true } });
check('without() takes away every piece of the kind', without(shot, 'enemy').entities.length === 0 && without(wet, 'water').cells.every(c => c !== 'water'));

// Must use is checked by what the solution does.
const doorRoom = goal(room(['#######', '#PB.o##', '#.....#', '#####D#', '#######']), 5, 3);
doorRoom.cells[3 * 7 + 5] = 'door:red'; doorRoom.cells[4 * 7 + 5] = 'goal';
doorRoom.cells.push(...'wall,wall,wall,wall,wall,wall,wall'.split(',')); doorRoom.h = 6;
const rec = normalize({ ing: { door: 'must', box: 'allowed' }, min: 1, max: 5 });
const v = run(judge(doorRoom, rec));
check('a door the solution opens counts', v.status === 'solved' && !v.missing.length, JSON.stringify(v));
const noUse = goal(room(['#######', '#P..o.#', '#.#####', '#######']), 1, 2);
noUse.cells[3 * 7 - 2] = 'door:red';
const v2 = run(judge(noUse, normalize({ ing: { door: 'must' }, min: 1, max: 5 })));
check('a door the solution never opens is missing', v2.status === 'solved' && v2.missing.includes('door'), JSON.stringify(v2));
check('a room holding an Off ingredient is refused', run(judge(doorRoom, normalize({ ing: {}, min: 1, max: 5 }))).status === 'off');
check('par outside the range is not a fit', !run(judge(doorRoom, normalize({ ing: { door: 'must' }, min: 4, max: 9 }))).fit);

// Water shapes the solution when the room without it has a shorter one, even untouched.
const pond = goal(room(['#########', '#P......#', '#w#####.#', '#.......#', '#########']), 1, 3);
const used = run(judge(pond, normalize({ ing: { water: 'must' }, min: 1, max: 9 })));
const idle = goal(room(['#########', '#P......#', '#.#w###.#', '#.......#', '#########']), 1, 3);
idle.cells[2 * 9 + 1] = 'wall';
const unused = run(judge(idle, normalize({ ing: { water: 'must' }, min: 1, max: 9 })));
check('water in the way is used though never touched', used.status === 'solved' && used.par === 3 && !touches(pond, used.moves).length && !used.missing.length, JSON.stringify(used));
// Water that stops a box you push, which then stops you on the goal: without it, no solution.
const stopper = goal(room(['#########', '#PB...w.#', '#########']), 4, 1);
const held = run(judge(stopper, normalize({ ing: { water: 'must', box: 'allowed' }, min: 1, max: 9 })));
check('water the room cannot be solved without is used', held.status === 'solved' && !touches(stopper, held.moves).includes('touch:water') && !held.missing.length, JSON.stringify(held));
check('water out of the way is not', unused.status === 'solved' && unused.missing.includes('water'), JSON.stringify(unused));

// The walk: same recipe, same room; each fit verified on its own.
const easy = [{ box: 'must' }, { door: 'must' }, { tri: 'must', box: 'allowed' }, { spring: 'must' }, { water: 'must', sticky: 'must' }, { receiver: 'must' }, { enemy: 'must' }, { laser: 'must' }];
const fails = [], unfit = [], again = [];
for (const ing of easy) for (const seed of [1, 2]) {
  const recipe = { ing, min: 3, max: 12, seed };
  const r = generateNow(recipe, { maxTries: 800 });
  if (!r.fit) { unfit.push(Object.keys(ing).join('+') + '/' + seed); continue; }
  if (seed === 1 && JSON.stringify(generateNow(recipe, { maxTries: 800 }).level) !== JSON.stringify(r.level)) again.push(Object.keys(ing).join());
  const nr = normalize(recipe), s = solve(r.level);
  const have = new Set([...uses(r.level, s.moves), ...touches(r.level, s.moves), ...contains(r.level)]);
  const notUsed = Object.keys(ing).filter(id => ing[id] === 'must' && !(ING[id].needs || ING[id].tags).some(t => have.has(t)) && !(ING[id].needs || []).includes('shapes'));
  const off = MECHANISMS.map(m => m[0]).filter(t => contains(r.level).includes(t) && INGREDIENTS.some(g => !nr.ing[g.id] && g.tags.includes(t)));
  if (s.status !== 'solved' || s.moves.length < 3 || s.moves.length > 12 || notUsed.length || off.length) fails.push(`${Object.keys(ing)}/${seed}: ${s.status} ${s.moves?.length} ${notUsed} ${off}`);
}
check('these recipes find a room within 800 tries', !unfit.length, unfit.join());
check('every room called a fit solves in range, uses its Must and holds nothing Off', !fails.length, fails.join(' | '));
check('the same recipe gives the same room', !again.length, again.join());
check('another seed gives another room', JSON.stringify(generateNow({ ing: { box: 'must' }, seed: 1 }, { maxTries: 800 }).level) !== JSON.stringify(generateNow({ ing: { box: 'must' }, seed: 2 }, { maxTries: 800 }).level));
const hopeless = generateNow({ w: 5, h: 5, min: 40, max: 40, seed: 1 }, { maxTries: 30 });
check('when nothing fits, the closest room comes back with its verdict', !hopeless.fit && hopeless.tries === 30 && hopeless.level && hopeless.verdict, JSON.stringify(hopeless.verdict));
done();
