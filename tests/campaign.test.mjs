// The campaign: a level's room and palette, the robot's every shortest path, and the verdict
// on a room you built. Requirements are judged on every shortest path, not just one.
import { roomOf, placed, placementErrors, check, REQUIREMENTS, costOf, tilesOf, stepsText } from '../src/campaign/rules.js';
import { allShortest } from '../src/campaign/robot.js';
import { LEVELS, COSTS } from '../src/level/campaign.js';
import { room, suite } from './lib.mjs';

const { check: ok, done } = suite('campaign');
const level = id => LEVELS.find(l => l.id === id);
// A room in the level's legend, plus a box at any B: # block, t toggle, D door, o button.
const build = (def, rows) => {
  const r = roomOf(def);
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    const i = y * r.w + x;
    if (c === '#' && !r.cells[i]) r.cells[i] = 'wall';
    if (c === 't') r.cells[i] = 'toggle:red';
    if (c === 'D') r.cells[i] = 'door:red';
    if (c === 'o') r.cells[i] = 'button:red';
    if (c === 'B') r.entities.push({ kind: 'box', x, y, dir: 1, mode: 'input' });
  }));
  return r;
};

{ // the level's own room
  const d = level('1'), r = roomOf(d);
  ok('a level room is 7x7', r.w === 7 && r.h === 7);
  ok('the robot starts top left', r.start.x === 1 && r.start.y === 1);
  ok('the goal is bottom right', r.cells[5 * 7 + 5] === 'goal');
  ok('the untouched room can run', placementErrors(d, r).length === 0);
  ok('a level has no powers', Object.values(r.powers).every(p => !p));
  ok('levels are numbered from 1 in order', LEVELS.map(l => l.id).join() === LEVELS.map((_, i) => String(i + 1)).join());
}
{ // what you may place
  const d = level('1'), r = build(d, ['', '', '..#']);
  ok('a placed block is counted', placed(d, r).by.block.length === 1);
  const many = roomOf(d); for (let i = 0; i < 11; i++) many.cells[8 + i + Math.floor(i / 5) * 2] = 'wall';
  ok('more than the maximum is refused', placementErrors(d, many).some(e => /at most 10/.test(e.msg)));
  const start = roomOf(d); start.cells[8] = 'wall';
  ok('the start must stay empty', placementErrors(d, start).some(e => /start empty/.test(e.msg)));
  const fixed = roomOf(d); fixed.cells[0] = '';
  ok('a fixed tile cannot change', placementErrors(d, fixed).some(e => /does not let you change/.test(e.msg)));
  const alien = roomOf(d); alien.cells[10] = 'door:red';
  ok('an element outside the palette is refused', placementErrors(d, alien).some(e => /no doors/.test(e.msg)));
  const d3 = level('3');
  ok('too few of a required element is refused', placementErrors(d3, roomOf(d3)).some(e => /at least 2 toggles/.test(e.msg)));
  const d4 = level('5'), onButton = build(d4, ['', '', '..o']); onButton.entities.push({ kind: 'box', x: 2, y: 2, dir: 1, mode: 'input' });
  ok('a box cannot start on a button', placementErrors(d4, onButton).some(e => /box cannot start on a button/.test(e.msg)));
}
{ // the robot finds every shortest path
  const open = room(['#####', '#P..#', '#...#', '#..G#', '#####']);
  const a = allShortest(open);
  ok('an open room is two moves', a.status === 'solved' && a.length === 2, JSON.stringify(a.status));
  // A key pressed again mid-slide is its own path to the robot (right@1:right), so routes are
  // compared by their plain directions.
  const routes = new Set(a.paths.map(p => p.map(m => m.split('@')[0]).join()));
  ok('both two-move routes are found', routes.size === 2 && routes.has('right,down') && routes.has('down,right'), JSON.stringify([...routes]));
  // Each move can be pressed on any of the 3 ticks of the slide before it ends, so each route
  // comes in 3 x 3 timings. Paths that meet in one position are all kept, not just the first.
  ok('every timing of every route is kept', a.paths.length === 18 && new Set(a.paths.map(p => p.join())).size === 18, String(a.paths.length));
  const shut = room(['#####', '#P#G#', '###.#', '#####']);
  ok('a goal it cannot reach is unsolvable', allShortest(shut).status === 'unsolvable');
  ok('a cap on paths is reported', allShortest(open, { maxPaths: 1 }).capped === true);
}
{ // the verdict
  const d = level('1');
  const empty = check(d, roomOf(d), COSTS);
  ok('an empty level 1 is too short', empty.ok && !empty.won && empty.length === 2 && empty.fail.why.startsWith(stepsText(d.steps)), JSON.stringify(empty.fail));
  ok('a failure hands the robot a path to play', Array.isArray(empty.fail.path) && empty.fail.path.length === 2);
  const win = build(d, ['#######', '#P.#.##', '#.....#', '#.###.#', '#.#...#', '#.#..G#', '#######']);
  const v = check(d, win, COSTS);
  ok('a room in range wins', v.ok && v.won && v.length === 4, JSON.stringify(v.fail));
  ok('a win reports its cost', v.cost === placed(d, win).by.block.length * COSTS.block && v.cost === costOf(d, win, COSTS));
  ok('tiles count everything but floor, the start included', v.tiles === tilesOf(win) && tilesOf(roomOf(d)) === 24 + 1 + 1, `${tilesOf(roomOf(d))}`);
  ok('a win hands the robot its path', v.path && v.path.length === 4);
  ok('a win scores the optional exact count', v.optional.length === 1 && v.met === (v.length === d.steps.best ? 1 : 0));
  const bad = check(d, Object.assign(roomOf(d), { w: 6 }), COSTS);
  ok('a broken room cannot run', bad.ok === false && bad.errors.length > 0);
  const walled = build(d, ['', '', '', '#######']);
  const u = check(d, walled, COSTS);
  ok('a room with no way through fails with no path', u.ok && !u.won && u.fail.path === null, JSON.stringify(u.fail));
}
{ // each requirement, judged on a replay of a path
  const req = (id, rows, moves) => REQUIREMENTS[id].judge(Object.assign(room(rows), {}), moves);
  ok('through an open door: met', req('throughOpenDoor', ['#######', '#Pt.D.#', '#######'], ['right']));
  ok('through an open door: not met', !req('throughOpenDoor', ['#######', '#P....#', '#######'], ['right']));
  ok('door closed at the end: not met while a toggle holds it', !req('doorClosedAtEnd', ['#######', '#Pt.D.#', '#######'], ['right']));
  ok('door closed at the end: met once the toggle is off again', req('doorClosedAtEnd', ['#######', '#Pt.D.#', '#######'], ['right', 'left']));
  ok('every toggle on: not met with one left off', !req('everyToggleOn', ['######', '#Pt..#', '#...t#', '######'], ['right']));
  ok('every toggle on: met', req('everyToggleOn', ['######', '#Pt..#', '#...t#', '######'], ['right', 'down']));
  ok('on then off: not met when it stays on', !req('everyToggleOnThenOff', ['######', '#Pt..#', '######'], ['right']));
  ok('on then off: met', req('everyToggleOnThenOff', ['######', '#Pt..#', '######'], ['right', 'left']));
  ok('runs into a closed door: met when a slide stops against it', req('hitsClosedDoor', ['#######', '#P..D.#', '#######'], ['right']));
  ok('runs into a closed door: not met when the door is open', !req('hitsClosedDoor', ['#######', '#Pt.D.#', '#######'], ['right']));
  ok('runs into a closed door: not met when gravel stops it before an open one', !req('hitsClosedDoor', ['#######', '#PtgD.#', '#######'], ['right']));
  ok('runs into a closed door: not met when a wall stops it', !req('hitsClosedDoor', ['#######', '#P..#D#', '#######'], ['right']));
  ok('runs into a closed door: not met when it slides elsewhere', !req('hitsClosedDoor', ['#####', '#P..#', '#D..#', '#####'], ['right']));
  ok('a requirement with no toggles is not met', !req('everyToggleOn', ['#####', '#P..#', '#####'], ['right']));
}
{ // level 2: a toggle, a door, run into it closed, then go through it open
  const d = level('2');
  ok('level 2 asks for both door requirements', d.require.join() === 'hitsClosedDoor,throughOpenDoor' && d.palette.toggle.join() === '1,1' && d.palette.door.join() === '1,1');
  const v = check(d, build(d, ['#######', '#P..#.#', '#.t...#', '###D.##', '#.....#', '#....G#', '#######']), COSTS);
  ok('level 2 can be won', v.ok && v.won && v.length >= 5 && v.length <= 9, JSON.stringify(v.fail || v.length));
  const lazy = check(d, build(d, ['', '#P...t#', '', '', '', '#...D.#']), COSTS);
  ok('a door the robot never meets closed fails level 2', lazy.ok && !lazy.won, JSON.stringify(lazy.fail));
}
{ // every shortest path must meet a requirement, not just one
  const d = { ...level('1'), require: ['throughOpenDoor'], steps: { best: 2, range: 0 }, palette: { block: [0, 30], toggle: [0, 1], door: [0, 1] } };
  const both = build(d, ['', '#P.t..#', '', '#....D#']);
  const v = check(d, both, COSTS);
  ok('one path missing the door fails the room', v.ok && !v.won && /Not met/.test(v.fail.why) && v.fail.path.map(m => m.split('@')[0]).join() === 'down,right', JSON.stringify(v.fail));
}
done();
