// The solver: what it can search, the answers it gives, and that every solution it
// returns actually wins when replayed through the plain rules, key by key.
import { readFileSync } from 'node:fs';
import { createGame, step } from '../src/rules/game.js';
import { solve, move, stateKey, unsearchable } from '../src/solve/solve.js';
import { room, suite } from './lib.mjs';

const { check, done } = suite('solve');
const goal = (l, x, y) => { l.cells[y * l.w + x] = 'goal'; return l; };

// Replays a solution without the solver: press, then tick until at rest.
function replays(level, keys) {
  const s = createGame(level);
  for (const k of keys) {
    step(s, [k]);
    for (let i = 0; i < 500 && (s.player.dir || s.player.hidden || s.entities.some(e => !e.dead && (e.rush || e.slide))); i++) step(s);
  }
  return s.won;
}

const one = goal(room(['######', '#P..#', '######'].map(r => r.slice(0, 5))), 3, 1);
const r1 = solve(one);
check('a one-slide room is solved in one move', r1.status === 'solved' && r1.moves.join() === 'right', JSON.stringify(r1));

// the goal sits mid-corridor: you must come back to it against a wall you place by box
const two = goal(room(['#######', '#P....#', '#.#####', '#######']), 3, 1);
check('a goal you can only slide over is unsolvable', solve(two).status === 'unsolvable');

const turn = goal(room(['#####', '#P..#', '###.#', '###.#', '#####']), 3, 3);
const r2 = solve(turn);
check('a turn takes two moves and the solution is the shortest', r2.status === 'solved' && r2.moves.length === 2, JSON.stringify(r2));

const push = goal(room(['#######', '#P.B..#', '#.....#', '#######']), 4, 1);
const r3 = solve(push);
check('a box can be the stopper', r3.status === 'solved' && replays(push, r3.moves), JSON.stringify(r3));

const first = JSON.parse(readFileSync('rooms/first-room.wee', 'utf8'));
const rf = solve(first);
check('his first room is solvable', rf.status === 'solved', JSON.stringify(rf));
check('and its solution wins when replayed by the plain rules', replays(first, rf.moves));

check('a room without a goal is not searched', solve(room(['#####', '#P..#', '#####'])).status === 'nogoal');
const rt = goal(room(['#######', '#P..M.#', '#.....#', '#######'], { mode: 'realtime' }), 5, 2);
check('a room with real-time pieces is not searched', unsearchable(rt) === 'realtime' && solve(rt).status === 'realtime');
const rtt = goal(room(['#######', '#P....#', '#T....#', '#######'], { mode: 'realtime' }), 5, 2);
check('real-time turrets count too', unsearchable(rtt) === 'realtime');
check('the search stops at its cap and says so', solve(first, 5).status === 'capped');

const s = createGame(goal(room(['#####', '#P..#', '#####']), 3, 1));
check('a move into a wall changes nothing and is skipped', move(s, 'left') === null);
check('a move leaves the original state alone', move(s, 'right') && s.player.x === 1);
const death = room(['#####', '#P.X#', '#####']); death.cells[8] = 'death';
check('a move that kills you is skipped', move(createGame(goal(death, 1, 1)), 'right') === null);
const a = createGame(one), b = createGame(one);
check('two fresh games have one key', stateKey(a) === stateKey(b));
b.player.x = 2;
check('moving you changes the key', stateKey(a) !== stateKey(b));
done();
