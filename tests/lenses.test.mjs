// Lens data: distance to winning per tile, a shortest way, and every tile a beam or a piece
// can ever cover, read off every position the room can reach.
import { lensData } from '../src/solve/lenses.js';
import { readFileSync } from 'node:fs';
import { splitRoom } from '../src/level/room.js';
import { room, suite } from './lib.mjs';

const { check, done } = suite('lenses');
const run = it => { for (;;) { const r = it.next(); if (r.done) return r.value; } };
const goal = (l, x, y) => { l.cells[y * l.w + x] = 'goal'; return l; };
const OFF = { boomerang: false, dive: false, laser: false, cycle: false };

// Past the one-way the goal is gone for good.
const oneWay = goal(room(['########', '#...P>.#', '########'], { powers: OFF }), 1, 1);
const d = run(lensData(oneWay));
check('the start is one move from winning', d.distance.get(1 * 8 + 4) === 1, JSON.stringify([...d.distance]));
check('a stop past the one-way is hopeless', d.hopeless.includes(1 * 8 + 6) && !d.distance.has(1 * 8 + 6), JSON.stringify(d.hopeless));
check('the shortest way runs from the start to the goal', d.solution.join() === [1 * 8 + 4, 1 * 8 + 1].join(), d.solution.join());

// Two moves: right, then down onto the goal.
const two = goal(room(['#####', '#P..#', '###.#', '#####'], { powers: OFF }), 3, 2);
const t2 = run(lensData(two));
check('a longer way lists every stop on it', t2.solution.join() === [6, 8, 13].join(), t2.solution.join());
check('and each stop knows how far it is', t2.distance.get(6) === 2 && t2.distance.get(8) === 1, JSON.stringify([...t2.distance]));

// A turret firing right covers the row up to the wall; a box can be pushed along its lane.
const lit = room(['#######', '#T....#', '#P.B..#', '#######'], { powers: OFF });
const l = run(lensData(lit));
check('a beam covers the tiles it crosses', [2, 3, 4, 5].every(x => l.beams.has(1 * 7 + x)) && !l.beams.has(1 * 7 + 1), JSON.stringify([...l.beams]));
check('a box covers every tile it can be pushed to', l.pieces.has(2 * 7 + 3) && l.pieces.has(2 * 7 + 5), JSON.stringify([...l.pieces]));
check('a room with no goal still maps beams and pieces', l.solution.length === 0 && l.distance.size === 0 && l.beams.size > 0);

// A tile reads the best of every stop on it. In the old First room, tile 13 is a stop in
// positions 4 and 6 moves from winning; the last one the search meets is the 6.
const old = splitRoom(JSON.parse(readFileSync('tests/fixtures/first-room-v1.wee', 'utf8'))).level;
check('a tile shows the fewest moves from any stop on it', run(lensData(old)).distance.get(13) === 4);
const his = splitRoom(JSON.parse(readFileSync('rooms/first-room.wee', 'utf8'))).level;
check('the solution in his room is its 21 moves', run(lensData(his)).solution.length - 1 === 21);
// Passes: the tiles a move crosses without ending on them, only for moves that work.
const hall = room(['######', '#P..#', '######'].map(r => r.slice(0, 5)), { powers: OFF });
const hp = run(lensData(hall));
check('a slide passes the tiles between its stops', [...hp.passes].join() === '7' && [...hp.stops].sort().join() === '6,8', JSON.stringify([[...hp.passes], [...hp.stops]]));
const pit = room(['######', '#P..X#', '######'], { powers: OFF });
check('a move that kills you passes nothing', run(lensData(pit)).passes.size === 0);
check('a search past its cap says so', run(lensData(oneWay, 1)).capped === true);
const rt = room(['#####', '#P.E#', '#####'], { mode: 'realtime' });
check('a room with real-time pieces gives no answer', run(lensData(rt)) === null);
done();
