// Two or more berries (register 702): stopping on one eats it, sliding over one does not, and the last one
// eaten wins. Reset brings them back, and the solver counts the moves to eat them all.
import { createGame } from '../src/rules/game.js';
import { move, search } from '../src/solve/solve.js';
import { respawn } from '../src/rules/life.js';
import { room, suite } from './lib.mjs';

const { check, done } = suite('berries');
const solve = l => { const it = search(l); for (;;) { const r = it.next(); if (r.done) return r.value; } };
const two = room(['#######', '#G.P.G#', '#######']);
let s = createGame(two);
s = move(s, 'right');
check('stopping on one of two berries eats it, and the room is not won yet', !!s && !s.won && s.eaten.length === 1 && s.events.some(e => e.type === 'eat'), JSON.stringify(s && s.eaten));
const after = move(s, 'left');
check('stopping on the last one wins', !!after && after.won, JSON.stringify(after && after.eaten));
respawn(s);
check('Reset brings the eaten berries back', s.eaten.length === 0);
// Sliding over a berry does not eat it: here the blob slides over the middle berry to the wall.
const over = room(['#######', '#P.G.G#', '#######']);
const o = move(createGame(over), 'right');
check('sliding over a berry does not eat it', !!o && o.eaten.length === 1 && o.eaten[0] === 1 * over.w + 5, JSON.stringify(o && o.eaten));
check('the solver eats them all: 2 moves where one berry took 1', solve(two).moves.length === 2 && solve(room(['#######', '#..P.G#', '#######'])).moves.length === 1, JSON.stringify(solve(two).moves));
// Stopping again on a berry already eaten eats nothing.
let back = createGame(room(['#######', '#G.P.G#', '#.###.#', '#G....#', '#######']));
for (const k of ['right', 'down', 'up']) back = back && move(back, k);
check('stopping again where a berry was eaten eats nothing more', !!back && !back.won && back.eaten.length === 1, JSON.stringify(back && back.eaten));
// The solver tells a position apart by what is eaten: here the blob must come back to where it started.
const loop = solve(room(['#######', '#G.P..#', '###.###', '###G###', '#######']));
check('the solver comes back through a position once a berry is eaten', loop.status === 'solved' && loop.moves.join() === 'down,up,left', JSON.stringify(loop));
const one = move(createGame(room(['#####', '#P.G#', '#####'])), 'right');
check('one berry is as before: stopping on it wins', !!one && one.won && one.eaten.length === 0);
done();
