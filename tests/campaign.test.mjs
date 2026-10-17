// The campaign: a level's room and palette, the robot's every shortest path, and the verdict
// on a room you built. Requirements are judged on every shortest path, not just one.
import { boxMoves, stuckText, nameOf, roomOf, placed, placementErrors, check, REQUIREMENTS, ELEMENTS, areaOf, stepsText } from '../src/campaign/rules.js';
import { allShortest } from '../src/campaign/robot.js';
import { LEVELS } from '../src/level/campaign.js';
import * as LEVELDATA from '../src/level/campaign.js';
import { emptyLevel } from '../src/level/format.js';
import { moveAt } from '../src/editor/edit.js';
import { room, suite } from './lib.mjs';

const { check: ok, done } = suite('campaign');
const level = id => LEVELS.find(l => l.id === id);
// His three-push room (2026-10-17): the robot starts boxed in on three sides.
// Level 5's known win, found by tools/levelSearch.mjs: two pushes and a hit on one box.
const WIN5 = ['....', '....', '....', '....', '.BB.', 'PB..', '..G.', '....'];
const boxCounts = (rows, moves) => boxMoves(room(rows), moves);
const HIS = ['.#..#.....', '....#.....', '....#.....', '....#.....', '.#.BP#....', '....#.....', '..........', '..........', '........G.', '###.......', '..........', '..........'];
// A room in the level's legend: # block, t switch, D door, o button, B box, P start, G goal.
// Full rows (all one length) set the room's size; otherwise the level's size is used. With no
// P or G the start goes top left and the goal bottom right, one tile in.
const build = (def, rows) => {
  const full = rows.length >= 2 && rows.every(r => r.length === rows[0].length && r.length >= 2);
  const r = full ? emptyLevel(rows[0].length, rows.length) : roomOf(def);
  r.powers = roomOf(def).powers; r.start = null; r.cells.fill('');
  let goal = false;
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    const i = y * r.w + x;
    if (c === '#') r.cells[i] = 'wall';
    if (c === 't') r.cells[i] = 'toggle:red';
    if (c === 'D') r.cells[i] = 'door:red';
    if (c === 'o') r.cells[i] = 'button:red';
    if (c === 'G') { r.cells[i] = 'goal'; goal = true; }
    if (c === 'P') r.start = { x, y };
    if (c === 'B') r.entities.push({ kind: 'box', x, y, dir: 1, mode: 'input' });
  }));
  if (!r.start) r.start = { x: 1, y: 1 };
  if (!goal) r.cells[(r.h - 2) * r.w + r.w - 2] = 'goal';
  return r;
};

{ // the level's own room
  const d = level('1'), r = roomOf(d);
  ok('a level room starts 7x7 with no border', r.w === 7 && r.h === 7 && r.cells.filter(c => c).length === 1);
  ok('the start and the goal sit one diagonal step in from their corners', r.start.x === 1 && r.start.y === 1 && r.cells[40] === 'goal');
  ok('the untouched room can run', placementErrors(d, r).length === 0);
  const none = { ...r, start: null, cells: r.cells.map(() => '') };
  ok('a room needs its start and goal', placementErrors(d, none).map(e => e.msg).join() === 'Place the start.,Place the goal.');
  const two = build(d, ['', '', '', '', '', 'G', 'G']);
  ok('only one goal', placementErrors(d, two).some(e => e.msg === 'Place only one goal.'));
  ok('a level has no powers', Object.values(r.powers).every(p => !p));
  ok('levels are numbered from 1 in order', LEVELS.map(l => l.id).join() === LEVELS.map((_, i) => String(i + 1)).join());
  ok('every level starts 7x7', LEVELS.every(l => l.size.join() === '7,7'));
  // Through an open door already turns every switch on: every switch and door in a level is red.
  ok('level 3 does not ask for what the open door already implies', level('3').require.join() === 'throughOpenDoor,doorClosedAtEnd', level('3').require.join());
}
{ // Move: anything placed goes to another tile that can take it
  const r = build(level('1'), ['P#t..', '.B...', '.....', '.....', '....G']);
  const at = (l, x, y) => l.cells[y * l.w + x];
  const s1 = moveAt(r, { x: 0, y: 0 }, { x: 0, y: 3 });
  ok('the start moves', s1 && s1.start.x === 0 && s1.start.y === 3);
  const g = moveAt(r, { x: 4, y: 4 }, { x: 3, y: 2 });
  ok('the goal moves and leaves floor', g && at(g, 3, 2) === 'goal' && at(g, 4, 4) === '');
  const b = moveAt(r, { x: 1, y: 1 }, { x: 2, y: 0 });
  ok('a box moves onto a switch', b && b.entities[0].x === 2 && b.entities[0].y === 0 && at(b, 2, 0) === 'toggle:red');
  ok('a block does not land on a switch', moveAt(r, { x: 1, y: 0 }, { x: 2, y: 0 }) === null);
  ok('nothing lands on the start', moveAt(r, { x: 1, y: 0 }, { x: 0, y: 0 }) === null && moveAt(r, { x: 1, y: 1 }, { x: 0, y: 0 }) === null);
  ok('the start does not go onto a block', moveAt(r, { x: 0, y: 0 }, { x: 1, y: 0 }) === null);
  ok('an empty tile has nothing to move', moveAt(r, { x: 3, y: 3 }, { x: 2, y: 3 }) === null);
  ok('the original room is untouched', r.start.x === 0 && at(r, 4, 4) === 'goal' && r.entities[0].x === 1);
}
{ // what you may place
  const d = level('1'), r = build(d, ['', '', '..#']);
  ok('a placed block is counted', placed(d, r).by.block.length === 1);
  const many = roomOf(d); for (let i = 0; i < 11; i++) many.cells[15 + i + Math.floor(i / 5) * 2] = 'wall';
  ok('more than a maximum is refused', placementErrors({ ...d, palette: { block: [0, 10] } }, many).some(e => /at most 10/.test(e.msg)));
  ok('no level sets a maximum for now', LEVELS.every(l => Object.values(l.palette).every(([, max]) => max === null)));
  const alien = build(d, ['', '', '..D']);
  ok('an element outside the palette is refused', placementErrors(d, alien).some(e => /no doors/.test(e.msg)));
  const odd = build(d, ['', '', '..k']); odd.cells[2 * 7 + 2] = 'crack';
  ok('a sandbox tile is refused', placementErrors(d, odd).some(e => e.msg === 'This level does not have that.'));
  ok('names take the right plural', nameOf('toggle', 2) === 'switches' && nameOf('toggle', 1) === 'switch' && nameOf('box', 2) === 'boxes' && nameOf('door', 2) === 'doors');
  const d3 = level('3');
  ok('too few of a required element is refused', placementErrors(d3, roomOf(d3)).some(e => /at least 1 switch\./.test(e.msg)));
  const lots = build(d3, ['']); for (let x = 1; x <= 5; x++) { lots.cells[2 * 7 + x] = 'toggle:red'; lots.cells[3 * 7 + x] = 'door:red'; }
  ok('a level with no maximum takes any number', placementErrors(d3, lots).length === 0, JSON.stringify(placementErrors(d3, lots)));
  const d4 = level('7'), onButton = build(d4, ['', '', '..o']); onButton.entities.push({ kind: 'box', x: 2, y: 2, dir: 1, mode: 'input' });
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
  // The old level 1: a 5x5 room, start top left, goal bottom right, nothing in it.
  const open = ['P....', '.....', '.....', '.....', '....G'];
  const empty = check(d, build(d, open));
  ok('an empty 5x5 is too short', empty.ok && !empty.won && empty.length === 2 && empty.fail.why.startsWith(stepsText(d.steps)), JSON.stringify(empty.fail));
  ok('a failure hands the robot a path to play', Array.isArray(empty.fail.path) && empty.fail.path.length === 2);
  ok('the room\'s edge stops the robot like a wall', allShortest(build(d, open)).length === 2);
  const win = build(d, ['P.#.#', '.....', '.###.', '.#...', '.#..G']);
  const v = check(d, win);
  ok('a room in range wins', v.ok && v.won && v.length === 4, JSON.stringify(v.fail));
  ok('a win reports its area', v.area === 25 && areaOf(win) === 25 && areaOf(roomOf(d)) === 49);
  ok('there is no cost score any more', !('cost' in v) && !('COSTS' in LEVELDATA));
  ok('a win hands the robot its path', v.path && v.path.length === 4);
  ok('a win scores two optional goals: the exact count and the room size', v.optional.map(o => o.id).join() === 'best,small' && v.optional[0].met === (v.length === d.steps.best) && v.optional[1].met === (v.area <= d.small[0] * d.small[1]) && v.met === v.optional.filter(o => o.met).length);
  const bad = check(d, { ...roomOf(d), start: null, cells: roomOf(d).cells.map(() => '') });
  ok('a room without its start and goal cannot run', bad.ok === false && bad.errors.length === 2);
  const walled = build(d, ['P....', '.....', '#####', '.....', '....G']);
  const u = check(d, walled);
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
  ok('collides with a closed door: met when a slide stops against it', req('hitsClosedDoor', ['#######', '#P..D.#', '#######'], ['right']));
  ok('collides with a closed door: not met when the door is open', !req('hitsClosedDoor', ['#######', '#Pt.D.#', '#######'], ['right']));
  ok('collides with a closed door: not met when gravel stops it before an open one', !req('hitsClosedDoor', ['#######', '#PtgD.#', '#######'], ['right']));
  ok('collides with a closed door: not met when a wall stops it', !req('hitsClosedDoor', ['#######', '#P..#D#', '#######'], ['right']));
  ok('collides with a closed door: not met when it slides elsewhere', !req('hitsClosedDoor', ['#####', '#P..#', '#D..#', '#####'], ['right']));
  ok('every switch off at the end: met once both are off again', req('everyToggleOffAtEnd', ['######', '#Pt..#', '######'], ['right', 'left']));
  ok('every switch off at the end: not met while one is on', !req('everyToggleOffAtEnd', ['######', '#Pt..#', '######'], ['right']));
  ok('every switch off at the end: not met with no switch at all', !req('everyToggleOffAtEnd', ['#####', '#P..#', '#####'], ['right']));
  ok('a requirement with no toggles is not met', !req('everyToggleOn', ['#####', '#P..#', '#####'], ['right']));
}
{ // why the robot cannot finish (copy is a draft)
  const why = rows => stuckText(room(rows));
  const at = (r, x, y) => r.at.some(t => t.x === x && t.y === y);
  const behind = why(['########', '#Pt.D.tG', '########']);
  ok('a switch behind its own door is named', behind.why === 'The robot cannot reach the goal: the red door never opens, because 1 of its 2 switches never turns on.', behind.why);
  ok('it points at the door and that switch, not the one that turns on', at(behind, 4, 1) && at(behind, 6, 1) && !at(behind, 2, 1));
  ok('none of several', why(['#########', '#P.D.t.tG', '#########']).why.endsWith('none of its 2 switches ever turns on.'));
  ok('a lone button', why(['#######', '#Po.D.G', '#######']).why.endsWith('its button is never pressed.'));
  ok('a mixed door names only the kind that fails', why(['#######', '#Pot.DG', '#######']).why.endsWith('its button is never pressed.'));
  ok('a door with no switch', why(['#######', '#P..D.G', '#######']).why.endsWith('because nothing red opens it.'));
  const apart = why(['#######', '#o.P.o#', '###D###', '###G###', '#######']);
  ok('switches each held but never together are said apart', apart.why.endsWith('It needs everything red held at once, and that never happens.') && at(apart, 1, 1) && at(apart, 5, 1) && at(apart, 3, 2), apart.why);
  const walls = why(['######', '#P##.G', '######']);
  ok('with no door to blame, it says so plainly', walls.why === 'The robot cannot reach the goal from anywhere it can get to.' && walls.at.length === 0);
  const v = check({ ...level('1'), palette: { block: [0, 30], toggle: [0, 2], door: [0, 1] } }, build(level('1'), ['', '', '', '#######', '#.t..D#', '#....G#']));
  ok('an unsolvable verdict carries the reason and the tiles', v.ok && !v.won && v.fail.path === null && /door never opens/.test(v.fail.why) && v.fail.at.length > 0, JSON.stringify(v.fail));
}
{ // level 4: two switches at least, through the door, every switch off at the end
  const d = level('4');
  ok('level 4 needs two switches and a door', d.palette.toggle[0] === 2 && d.palette.door[0] === 1 && d.require.join() === 'throughOpenDoor,everyToggleOffAtEnd');
  ok('a one-switch room no longer fits level 4', placementErrors(d, build(d, ['#######', '#P.#..#', '#....##', '#...t.#', '#..#.##', '##...G#', '#######'].map((r, y) => y === 1 ? '#P.#D.#' : r))).some(e => /at least 2 switches/.test(e.msg)));
}
{ // level 5: one box pushed in two moves and run into once without moving
  const d = level('5');
  ok('level 5 has blocks and a box, nothing else', Object.keys(d.palette).join() === 'block,box' && d.palette.box[0] === 1 && d.require.join() === 'boxPushedTwiceHitOnce' && d.steps.best === 8 && d.steps.range === 2);
  const req = (id, rows, moves) => REQUIREMENTS[id].judge(room(rows), moves);
  ok('a hit: the robot stops against a box that cannot move', req('boxPushedTwiceHitOnce', ['########', '#P.B..#', '#.....#', '########'], ['right', 'right']) === false);
  const one = ['#######', '#.....#', '#P..B.#', '#.....#', '#######'];
  ok('a push slides the box; a slide that ends against a box that cannot move is a hit; a press that goes nowhere is neither', JSON.stringify(boxCounts(one, ['right', 'right'])) === '[{"pushes":1,"hits":0}]' && JSON.stringify(boxCounts(['######', '#P.B#', '######'], ['right'])) === '[{"pushes":0,"hits":1}]' && JSON.stringify(boxCounts(['#####', '#PB#', '#####'].map(r => r.slice(0, 4)), ['right'])) === '[{"pushes":0,"hits":0}]', JSON.stringify([boxCounts(one, ['right', 'right']), boxCounts(['######', '#P.B#', '######'], ['right'])]));
  ok('three pushes: not met with one push', !req('boxPushedThrice', ['#######', '#PB...#', '#######'], ['right']));
  const his = build(d, HIS), a = allShortest(his);
  ok('his boxed-in room: one shortest path of 7, and it pushes the box 3 times', a.length === 7 && a.paths.length === 1 && REQUIREMENTS.boxPushedThrice.judge(his, a.paths[0]), JSON.stringify([a.length, a.paths]));
  ok('two pushes are not enough for three', !REQUIREMENTS.boxPushedThrice.judge(his, a.paths[0].slice(0, 4)));
  ok('two pushes with no hit do not meet level 5', !REQUIREMENTS.boxPushedTwiceHitOnce.judge(his, a.paths[0].slice(0, 4)) && JSON.stringify(boxMoves(his, a.paths[0].slice(0, 4))) === '[{"pushes":2,"hits":0}]');
  const win = build(d, WIN5), w = allShortest(win);
  ok('the known level 5 room pushes one box twice and hits it once', w.paths.every(p => REQUIREMENTS.boxPushedTwiceHitOnce.judge(win, p)) && !w.paths.every(p => REQUIREMENTS.boxPushedThrice.judge(win, p)));
}
{ // level 6: a box flips the switch, a box and the robot go through the door
  const d = level('6');
  ok('level 6 needs a door, a switch and a box', ['door', 'toggle', 'box'].every(el => d.palette[el][0] === 1) && d.require.join() === 'boxThroughOpenDoor,throughOpenDoor,onlyBoxesFlipSwitches');
  const req = (id, rows, moves) => REQUIREMENTS[id].judge(room(rows), moves);
  ok('a box through an open door: met', req('boxThroughOpenDoor', ['##########', '#Pt.B.D..#', '##########'], ['right']));
  ok('a box through an open door: not met when only the robot goes through', !req('boxThroughOpenDoor', ['#######', '#Pt.D.#', '#B....#', '#######'], ['right']));
  ok('only boxes flip switches: met when a box flips it', req('onlyBoxesFlipSwitches', ['######', '#PB.t#', '######'], ['right']));
  ok('only boxes flip switches: not met when the robot crosses one', !req('onlyBoxesFlipSwitches', ['######', '#Pt..#', '######'], ['right']));
  ok('only boxes flip switches: not met when nothing flips', !req('onlyBoxesFlipSwitches', ['######', '#P..t#', '#....#', '######'], ['down']));
}
{ // level 2: a toggle, a door, run into it closed, then go through it open
  const d = level('2');
  ok('level 2 asks for both door requirements', d.require.join() === 'hitsClosedDoor,throughOpenDoor' && d.palette.toggle[0] === 1 && d.palette.door[0] === 1);
  const v = check(d, build(d, ['#######', '#P..#.#', '#.t...#', '###D.##', '#.....#', '#....G#', '#######']));
  ok('level 2 can be won', v.ok && v.won && v.length >= 5 && v.length <= 9, JSON.stringify(v.fail || v.length));
  const lazy = check(d, build(d, ['', '#P...t#', '', '', '', '#...D.#']));
  ok('a door the robot never meets closed fails level 2', lazy.ok && !lazy.won, JSON.stringify(lazy.fail));
}
{ // every shortest path must meet a requirement, not just one
  const d = { ...level('1'), require: ['throughOpenDoor'], steps: { best: 2, range: 0 }, palette: { block: [0, 30], toggle: [0, 1], door: [0, 1] } };
  const both = build(d, ['P.t..', '.....', '....D', '.....', '....G']);
  const v = check(d, both);
  ok('one path missing the door fails the room', v.ok && !v.won && /Not met/.test(v.fail.why) && v.fail.path.map(m => m.split('@')[0]).join() === 'down,right', JSON.stringify(v.fail));
  ok('the verdict marks each requirement for the goal card', v.reqs && v.reqs.throughOpenDoor === false && v.inRange === true, JSON.stringify(v.reqs));
  ok('every requirement has a short row, with at least one word', Object.values(REQUIREMENTS).every(r => Array.isArray(r.short) && r.short.some(p => typeof p === 'string')));
  ok('a short row names objects only as elements the card can draw', Object.values(REQUIREMENTS).every(r => r.short.every(p => typeof p === 'string' || p.el === 'start' || ELEMENTS[p.el])));
  ok('collides, not runs into', /collides with/.test(REQUIREMENTS.hitsClosedDoor.text) && !/runs into/.test(REQUIREMENTS.hitsClosedDoor.text));
}
{ // every level's room-size goal is reachable: the smallest winning room tools/tilesArea.mjs found
  const SMALL = { 1: ['.GP', '...', '..#'], 2: ['.tD', '...', '.GP'], 3: ['D..', 't.G', '..P'], 4: ['Pt.', 'D..', 'G.t', '...'],
    5: ['....', '..BP', '.#..', '.G..'], 6: ['...', '.P.', '.D.', 'GB.', 'tB.'], 7: ['..P', 'GD.', 'oB.'], 8: ['.G.oP', '....D', '.....', '...B.', '....#'] };
  for (const l of LEVELS) {
    const v = check(l, build(l, SMALL[l.id]));
    ok(`level ${l.id}'s ${l.small.join('x')} goal is met by a win`, Array.isArray(l.small) && v.won && v.optional.find(o => o.id === 'small').met, JSON.stringify(v.fail || v.optional));
  }
}
{ // every level can be won: one known room each (5x5 unless noted), found by search, so a rule change that
  // makes a level impossible goes red
  const WINS = {
    1: ['P.#.#', '.....', '.###.', '.#...', '.#..G'],
    2: ['P..D#', '..t..', '.##.#', '.#...', '#...G'],
    3: ['P.#.#', '..###', '#..#.', 'Dt...', '..t#G'],
    4: ['Pt.tD', '.#...', '.....', '###.#', '.#..G'],
    5: WIN5,
    6: ['P....', '....B', 'B..#t', 'D.#.#', '....G'],
    7: ['P.#.B', '...#.', '..B.o', '.#..D', '#..#G'],
    8: ['P.o..', '..B.D', '...##', '#.###', '#...G'],
  };
  ok('there is a known winning room for every level', LEVELS.every(l => WINS[l.id]), LEVELS.map(l => l.id).join());
  for (const l of LEVELS) {
    const v = WINS[l.id] && check(l, build(l, WINS[l.id]));
    ok(`level ${l.id} can be won`, v && v.ok && v.won, JSON.stringify(v && (v.errors || v.fail)));
    ok(`level ${l.id}'s win marks every row of its goal card met`, v && v.inRange && (l.require || []).every(id => v.reqs[id] === true), JSON.stringify(v && v.reqs));
  }
}
done();
