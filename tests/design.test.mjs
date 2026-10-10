// Design notes: each power and each piece or tile tested by taking it out, every position
// mapped for dead ends, and shortest routes counted.
import { readFileSync } from 'node:fs';
import { powerCheck, elementCheck, routes } from '../src/solve/design.js';
import { solve } from '../src/solve/solve.js';
import { splitRoom } from '../src/level/room.js';
import { room, suite } from './lib.mjs';

const { check, done } = suite('design');
const run = it => { for (;;) { const r = it.next(); if (r.done) return r.value; } };
const OFF = { boomerang: false, dive: false, laser: false, cycle: false };
const goal = (l, x, y) => { l.cells[y * l.w + x] = 'goal'; l.powers = { ...l.powers, ...OFF }; return l; };

const first = splitRoom(JSON.parse(readFileSync('tests/fixtures/first-room-v1.wee', 'utf8'))).level;
const ps = Object.fromEntries(run(powerCheck(first)).map(p => [p.power, p.without]));
check('a power is tested with only it switched off', ps.boomerang === 19 && ps.dive === 9 && ps.laser === 9 && ps.cycle === 9, JSON.stringify(ps));
check('a power that is off, or needs a block that does not exist, is not tested', !('swim' in ps) && !('hook' in ps) && !('light' in ps));

// Two corners, two ways round: right then down, or down then right.
const square = goal(room(['#####', '#P..#', '#...#', '#...#', '#####']), 3, 3);
const sq = run(routes(square));
check('two equal ways to the goal are two routes', sq.routes === 2 && sq.par === 2 && sq.par === solve(square).moves.length, JSON.stringify(sq));

// Past the one-way there is no way back: both tiles there are traps.
const pocket = goal(room(['######', '#P>..#', '#.####', '#.####', '######']), 1, 3);
const pk = run(routes(pocket));
check('positions the goal can no longer be reached from are counted', pk.positions === 3 && pk.dead === 2, JSON.stringify(pk));
check('a tile where every stop is a dead end is a trap', [...pk.traps].sort((a, b) => a - b).join() === '9,10', pk.traps.join());
check('the start is no trap', !pk.traps.includes(1 * 6 + 1));
check('a room too big to map whole gives no answer', run(routes(first, 10)) === null);
const rt = goal(room(['#####', '#P.M#', '#####'], { mode: 'realtime' }), 2, 1);
check('a room with real-time pieces gives no answer', run(routes(rt)) === null);

// A box in the pocket changes nothing; a box in the lane to the goal blocks it, so the
// room has no solution with it and a one-move solution without it.
const boxed = structuredClone(pocket);
boxed.entities.push({ kind: 'box', x: 4, y: 1, dir: 1, mode: 'input' }, { kind: 'box', x: 1, y: 2, dir: 1, mode: 'input' });
const es = run(elementCheck(boxed)), at = (x, y) => es.find(e => e.x === x && e.y === y);
check('a piece the answer does not depend on keeps the same answer without it', solve(boxed).status === 'unsolvable' && at(4, 1).without === 'unsolvable', JSON.stringify(es));
check('a piece in the way changes the answer without it', at(1, 2).without === 1, JSON.stringify(es));
check('tiles are tested too, but never walls or the goal', at(2, 1) && at(2, 1).what === 'gate' && !es.some(e => e.what === 'wall' || e.what === 'goal'), JSON.stringify(es));
// A box you only stop against does a wall's job: needed, but not as a box.
const stop = goal(room(['#######', '#P...B#', '#.....#', '#######']), 4, 2);
const sb = run(elementCheck(stop)).find(e => e.what === 'box');
check('a piece that only acts as a wall has the same answer as a wall', sb.without !== solve(stop).moves.length && sb.standIn === solve(stop).moves.length && sb.as === 'wall', JSON.stringify(sb));
const mt = structuredClone(stop); mt.entities.push({ kind: 'box', x: 1, y: 2, dir: 1, mode: 'input', turret: { dirs: ['up'], mode: 'input' } });
check('a turret riding a box stands in as a fixed turret', run(elementCheck(mt)).find(e => e.x === 1 && e.y === 2).as === 'turret');
const held = goal(room(['######', '#P...#', '######']), 4, 1);
held.cells[1 * held.w + 3] = 'button:red'; held.entities.push({ kind: 'box', x: 3, y: 1, dir: 1, mode: 'input' });
check('a tile with a piece on it gets no wall stand-in', run(elementCheck(held)).find(e => e.what === 'button').standIn === null);
const lone = goal(room(['######', '#P...#', '#....#', '######']), 4, 1);
lone.entities.push({ kind: 'turret', x: 2, y: 2, turret: { dirs: ['down'], mode: 'input' } });
const lt = run(elementCheck(lone)).find(e => e.what === 'turret');
check('a lone turret whose beam does nothing stands in as a wall', lt.as === 'wall' && lt.standIn === lt.without, JSON.stringify(lt));

// The example room (owner, 2026-10-10): what makes it good must survive any rule change.
const example = splitRoom(JSON.parse(readFileSync('rooms/first-room.wee', 'utf8'))).level;
const ex = run(routes(example)), exs = run(elementCheck(example));
check('the example room takes 21 moves, by one route', ex.par === 21 && ex.routes === 1, JSON.stringify(ex));
check('every piece and tile in it changes the answer, and none could be a plain wall', exs.every(e => e.without !== 21 && e.standIn !== 21), JSON.stringify(exs));
check('and it has a tile that traps you for good', ex.traps.length > 0, JSON.stringify(ex));
done();
