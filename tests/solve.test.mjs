// The solver: what it can search, the answers it gives, and that every solution it
// returns actually wins when replayed through the plain rules, key by key.
import { readFileSync } from 'node:fs';
import { createGame, step } from '../src/rules/game.js';
import { solve, canWin, move, stateKey, unsearchable, powerMoves, parseMove, reach, successors } from '../src/solve/solve.js';
import { room, suite } from './lib.mjs';

const { check, done } = suite('solve');
const goal = (l, x, y) => { l.cells[y * l.w + x] = 'goal'; return l; };

// Replays a solution without the solver: press, then tick until at rest.
function replays(level, keys) {
  const s = createGame(level);
  for (const m of keys) {
    const [k, rest] = m.split('@'), [at, then] = rest ? rest.split(':') : [0, null];
    step(s, [k]);
    for (let i = 1; i < 500 && (s.player.dir || s.player.hidden || s.entities.some(e => !e.dead && (e.rush || e.slide))); i++) step(s, i === +at ? [then] : []);
  }
  return s.won;
}

const one = goal(room(['######', '#P..#', '######'].map(r => r.slice(0, 5))), 3, 1);
const r1 = solve(one);
check('a one-slide room is solved in one move', r1.status === 'solved' && r1.moves.join() === 'right', JSON.stringify(r1));

// the goal sits mid-corridor: you must come back to it against a wall you place by box
const two = goal(room(['#######', '#P....#', '#.#####', '#######']), 3, 1);
check('a goal you can only slide over is unsolvable', solve(two).status === 'unsolvable');

// A turret's aim counts up forever; two states a whole turn apart are the same state.
const aimed = room(['#######', '#P....#', '#.....#', '#T....#', '#######']);
aimed.entities[0].turret.dirs = ['up', 'right'];
const ar = solve(goal(aimed, 5, 2));
check('a turret room is searched to the end, not to the cap', ar.status !== 'capped' && ar.states < 200, JSON.stringify({ status: ar.status, states: ar.states }));

const turn = goal(room(['#####', '#P..#', '###.#', '###.#', '#####']), 3, 3);
const r2 = solve(turn);
check('a turn takes two moves and the solution is the shortest', r2.status === 'solved' && r2.moves.length === 2, JSON.stringify(r2));

const push = goal(room(['#######', '#P.B..#', '#.....#', '#######']), 4, 1);
const r3 = solve(push);
check('a box can be the stopper', r3.status === 'solved' && replays(push, r3.moves), JSON.stringify(r3));

const first = JSON.parse(readFileSync('tests/fixtures/first-room-v1.wee', 'utf8'));
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
const dive = goal(room(['#######', '#P.H..#', '#######']), 4, 1);
const rd = solve(dive);
check('a room that needs a dive is solved with one', rd.status === 'solved' && rd.moves.join() === 'right@1:right,right' && replays(dive, rd.moves), JSON.stringify(rd));
check('and is unsolvable with Dive off', solve({ ...dive, powers: { ...dive.powers, dive: false } }).status === 'unsolvable');
check('with no powers on, no mid-slide moves are tried', powerMoves(createGame({ ...dive, powers: { ...dive.powers, boomerang: false, dive: false, laser: false } })).length === 0);
const pm = powerMoves(createGame(dive));
check('mid-slide moves name the slide, the tick and the key', pm.includes('right@1:right') && pm.includes('right@1:left') && pm.includes('right@1:up'));
check('a move string reads back', JSON.stringify(parseMove('right@3:left')) === JSON.stringify({ k: 'right', at: 3, then: 'left' }) && parseMove('up').then === null);
const run = it => { for (;;) { const r = it.next(); if (r.done) return r.value; } };
const corner = room(['######', '#P...#', '#....#', '######']);
corner.powers = { ...corner.powers, boomerang: false, dive: false, laser: false };
const st = run(reach(corner));
check('the stop map of an open box is its four corners', st.stops.sort((a, b) => a - b).join() === [7, 10, 13, 16].join() && !st.capped, st.stops.join());
const blocked = room(['######', '#P.#.#', '#....#', '######']);
blocked.powers = corner.powers;
check('a wall makes a new stop beside it', run(reach(blocked)).stops.includes(8));
check('a room with real-time pieces has no stop map', run(reach(room(['#####', '#PM.#', '#####'], { mode: 'realtime' }))).why === 'realtime');
check('the stop map stops at its cap', run(reach(corner, { max: 2 })).capped);
check('and at its time budget', run(reach(corner, { budgetMs: 0 })).capped);
const live = {}; const it = reach(corner, { out: live }); it.next();
check('stops fill in while the search runs', live.stops instanceof Set && live.stops.size >= 1);
const pushy = room(['#######', '#P.B..#', '#.....#', '#######']);
pushy.powers = corner.powers;
const fast = run(reach(pushy, { budgetMs: 30 })), full = run(reach(pushy));
check('the first pass alone already finds stops', fast.stops.length >= 2 && fast.stops.length <= full.stops.length);
const s0 = createGame(JSON.parse(readFileSync('tests/fixtures/first-room-v1.wee', 'utf8')));
const succ = [...successors(s0, ['up', 'right', 'down', 'left', 'hide'])].filter(Boolean);
check('every generated move leads where replaying it from scratch does', succ.length > 5 && succ.every(([k, t]) => { const m = move(s0, k); return m && stateKey(m) === stateKey(t); }));
check('mid-slide moves are generated', succ.some(([k]) => k.includes('@')));
check('and can be left out', [...successors(s0, ['right'], false)].filter(Boolean).every(([k]) => !k.includes('@')));
const noLaser = goal(room(['#######', '#P....#', '#######']), 5, 1);
check('a laser is not tried where it cannot change anything', [...successors(createGame(noLaser), [])].filter(Boolean).every(([k]) => !/:(up|down)$/.test(k)));
// Softlock: past a one-way, the goal behind you is out of reach for good.
const oneWay = goal(room(['########', '#...P>.#', '########']), 1, 1);
const runIt = it => { for (;;) { const r = it.next(); if (r.done) return r.value; } };
const lock = createGame(oneWay);
check('from the start the goal can still be reached', runIt(canWin(lock)) === true);
const past = move(lock, 'right');
check('past the one-way it cannot, and the check says so', past && past.player.x === 6 && runIt(canWin(past)) === false, past && JSON.stringify(past.player));
check('a search that hits its cap does not call it a softlock', runIt(canWin(lock, 1)) === null);
// In play the game keeps moving while the check runs in slices; the check answers for the
// position it was asked about.
const moving = createGame(oneWay), asked = canWin(moving);
asked.next();
step(moving, ["right"]); for (let i = 0; i < 20; i++) step(moving, []);
check("a check answers for the position it was asked about, while the game moves on", moving.player.x === 6 && runIt(asked) === true);
done();
