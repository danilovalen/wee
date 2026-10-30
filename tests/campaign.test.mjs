// The campaign: a level's room and palette, the robot's every shortest path, and the verdict
// on a room you built. Requirements are judged on every shortest path, not just one.
import { scoreText, underLimits, colouringsOf, stuckText, nameOf, roomOf, placed, placementErrors, overLimits, check, ELEMENTS, areaOf, stepsText } from '../src/campaign/rules.js';
import { REQUIREMENTS, trailOf } from '../src/campaign/requirements.js';
import { boxMoves } from '../src/campaign/pushes.js';
import { allShortest, replayPath } from '../src/campaign/robot.js';
import { LEVELS } from '../src/level/campaign.js';
import * as LEVELDATA from '../src/level/campaign.js';
import { emptyLevel } from '../src/level/format.js';
import { starterLevel } from '../src/editor/state.js';
import { moveAt } from '../src/editor/edit.js';
import { room, suite } from './lib.mjs';
import { CELL, PIECE, LASER, pushableLaser } from '../tools/legend.mjs';
import { KNOWN } from './knownRooms.mjs';

const { check: ok, done } = suite('campaign');
const level = id => LEVELS.find(l => l.id === id);
// His three-push room (2026-10-17): the robot starts boxed in on three sides.
// Level 5's known win, found by tools/levelSearch.mjs: two pushes and a hit on one box.
const WIN5 = ['....', '....', '....', '....', '.BB.', 'PB..', '..G.', '....'];
const boxCounts = (rows, moves) => boxMoves(room(rows), moves);
const HIS = ['.#..#.....', '....#.....', '....#.....', '....#.....', '.#.BP#....', '....#.....', '..........', '..........', '........G.', '###.......', '..........', '..........'];
// A room in the one legend (tools/legend.mjs), shaped by the level: a one-way takes its first colour
// when it names colours, and what it offers only pushable comes pushable.
// Full rows (all one length) set the room's size; otherwise the level's size is used. With no
// P or G the start goes top left and the goal bottom right, one tile in.
const build = (def, rows) => {
  const full = rows.length >= 2 && rows.every(r => r.length === rows[0].length && r.length >= 2);
  const r = full ? emptyLevel(rows[0].length, rows.length) : roomOf(def);
  r.powers = roomOf(def).powers; r.start = null; r.cells.fill('');
  const only = el => def.pushable && def.pushable[el] === 'only';
  let goal = false;
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    const i = y * r.w + x, cell = CELL[c];
    if (c === 'P') r.start = { x, y };
    else if (cell) {
      r.cells[i] = cell.startsWith('gate:') && def.colours ? cell + '@' + def.colours[0] : cell;
      if (cell === 'goal') goal = true;
      const el = cell.startsWith('gate:') ? 'gate' : cell.startsWith('sensor:') ? 'relay' : cell.split(':')[0];
      if (['gate', 'door', 'idoor', 'relay'].includes(el) && only(el)) (r.crates ||= []).push({ x, y });
    } else if (PIECE[c]) r.entities.push({ ...PIECE[c], x, y, dir: 1, mode: 'input' });
    else if (LASER[c]) r.entities.push({ kind: 'turret', x, y, ...(pushableLaser(c) ? { crate: true } : {}), turret: { dirs: [LASER[c]], mode: 'input' } });
  }));
  if (!r.start) r.start = { x: 1, y: 1 };
  if (!goal) r.cells[(r.h - 2) * r.w + r.w - 2] = 'goal';
  return r;
};

// A new Sandbox room is open floor, upright or wide (register 380).
ok('a new room has no wall border', [false, true].every(tall => !starterLevel(tall).cells.some(c => c === 'wall')));
ok('a new room is 7x7, upright or wide (register 430)', [false, true].every(tall => starterLevel(tall).w === 7 && starterLevel(tall).h === 7));

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
  const NUMBERED = LEVELS.filter(l => !l.tutorial);
  ok('the tutorial comes first, then levels numbered from 1 in order, a hidden one after them (register 512)', LEVELS[0].id === 'tutorial' && NUMBERED.filter(l => !l.hidden).map(l => l.id).join() === NUMBERED.filter(l => !l.hidden).map((_, i) => String(i + 1)).join());
  ok('every level but the tutorial starts 7x7', LEVELS.every(l => l.tutorial || l.size.join() === '7,7'));
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
  // Onto a tile that holds something, the two swap.
  const sw = moveAt(r, { x: 1, y: 0 }, { x: 2, y: 0 });
  ok('a block onto a switch swaps them', sw && at(sw, 2, 0) === 'wall' && at(sw, 1, 0) === 'toggle:red');
  const sb = moveAt(r, { x: 1, y: 0 }, { x: 0, y: 0 });
  ok('a block onto the start swaps them', sb && sb.start.x === 1 && sb.start.y === 0 && at(sb, 0, 0) === 'wall');
  const sx = moveAt(r, { x: 1, y: 1 }, { x: 0, y: 0 });
  ok('a box onto the start swaps them', sx && sx.start.x === 1 && sx.start.y === 1 && sx.entities[0].x === 0 && sx.entities[0].y === 0);
  const sg = moveAt(r, { x: 0, y: 0 }, { x: 4, y: 4 });
  ok('the start onto the goal swaps them', sg && sg.start.x === 4 && sg.start.y === 4 && at(sg, 0, 0) === 'goal' && at(sg, 4, 4) === '');
  const onSwitch = structuredClone(r); onSwitch.cells[1 * 5 + 1] = 'toggle:red';
  ok('a swap that would put a block under a box is refused', moveAt(onSwitch, { x: 1, y: 0 }, { x: 1, y: 1 }) === null);
  ok('a box on a switch swaps with the start, leaving the switch', (() => { const m = moveAt(onSwitch, { x: 1, y: 1 }, { x: 0, y: 0 }); return m && m.start.x === 1 && m.start.y === 1 && at(m, 1, 1) === 'toggle:red' && m.entities[0].x === 0; })());
  ok('an empty tile has nothing to move', moveAt(r, { x: 3, y: 3 }, { x: 2, y: 3 }) === null);
  ok('the original room is untouched', r.start.x === 0 && at(r, 4, 4) === 'goal' && r.entities[0].x === 1);
}
{ // what you may place
  const d = level('1'), r = build(d, ['', '', '..#']);
  ok('a placed block is counted', placed(d, r).by.block.length === 1);
  const many = roomOf(d); for (let i = 0; i < 11; i++) many.cells[15 + i + Math.floor(i / 5) * 2] = 'wall';
  // A maximum is a goal judged at Run, not a rule that stops building (register 306).
  ok('more than a maximum may be placed', !placementErrors({ ...d, palette: { block: [0, 10] } }, many).some(e => /at most 10/.test(e.msg)));
  { const l = level('16'), two = build(l, ['B.#P#', 'G..B.', 'D....', 'ne.o.']), v = check(l, two);
    ok('a second box in level 16 is built and run, then missed at Run', v.ok && !v.won && /at most 1 box/.test(v.fail.why), JSON.stringify(v.fail || v.errors)); }
  ok('more than a maximum is a missed goal at Run', overLimits({ ...d, palette: { block: [0, 10] } }, many).some(e => /at most 10/.test(e.msg)));
  ok('only levels 15, 16, 17 and 20 set a maximum: one one-way, one box, one inverted door, one door (registers 287, 294, 325, 386)', LEVELS.every(l => Object.entries(l.palette).every(([k, [, max]]) => max === null || (max === 1 && ((l.id === '15' && k === 'gate') || (l.id === '16' && k === 'box') || (l.id === '17' && k === 'idoor') || (l.id === '20' && k === 'door'))))));
  const alien = build(d, ['', '', '..D']);
  ok('an element outside the palette is refused', placementErrors(d, alien).some(e => /no doors/.test(e.msg)));
  const odd = build(d, ['', '', '..k']); odd.cells[2 * 7 + 2] = 'crack';
  ok('a sandbox tile is refused', placementErrors(d, odd).some(e => e.msg === 'This level does not have that.'));
  ok('names take the right plural', nameOf('toggle', 2) === 'switches' && nameOf('toggle', 1) === 'switch' && nameOf('box', 2) === 'boxes' && nameOf('door', 2) === 'doors');
  const d3 = level('3');
  // Too few is judged at Run, never a reason not to run (register 321).
  ok('too few of a required element does not stop a run', !placementErrors(d3, roomOf(d3)).some(e => /at least/.test(e.msg)));
  // The score is tiles (register 328): the fewest in any win, then per optional goal met.
  ok('the record names the fewest tiles, then per optional goal', scoreText(level('16'), { win: 3, best: 5, small: 4, boxPushedTwiceHitOnce: 6 }) === ', fewest tiles 3; exactly 4: 5; 3×4 or smaller: 4; one box pushed in at least 2 moves, and hit once by the robot without moving: 6', scoreText(level('16'), { win: 3, best: 5, small: 4, boxPushedTwiceHitOnce: 6 }));
  ok('level 16 offers no pushable laser and its side goal is the box pushed twice and hit once (register 426)', !level('16').pushable && level('16').optional.join() === 'boxPushedTwiceHitOnce,throughOpenDoor');
  ok('no win, no score', scoreText(level('16'), {}) === '' && scoreText(level('16'), undefined) === '');
  ok('too few of a required element is missed at Run', underLimits(d3, roomOf(d3)).some(e => e.msg === 'Place at least 1 switch.'));
  const few = check(d3, build(d3, ['P#...', '.#.#.', '.#.#.', '...#G']));
  ok('a run with too few of an element runs and says what is missing', few.ok && !few.won && few.length >= 4 && /^Not met: Place at least 1 (door|switch)\./.test(few.fail.why), JSON.stringify(few.fail));
  const lots = build(d3, ['']); for (let x = 1; x <= 5; x++) { lots.cells[2 * 7 + x] = 'toggle:red'; lots.cells[3 * 7 + x] = 'door:red'; }
  ok('a level with no maximum takes any number', placementErrors(d3, lots).length === 0, JSON.stringify(placementErrors(d3, lots)));
  const d4 = level('7'), onButton = build(d4, ['', '', '..o']); onButton.entities.push({ kind: 'box', x: 2, y: 2, dir: 1, mode: 'input' });
  ok('a box cannot start on a button', placementErrors(d4, onButton).some(e => /Nothing can start on a button, a switch/.test(e.msg)));
  const d6 = level('6'), onSwitch = build(d6, ['', '', '..t']); onSwitch.entities.push({ kind: 'box', x: 2, y: 2, dir: 1, mode: 'input' });
  ok('a box cannot start on a switch, in any level', placementErrors(d6, onSwitch).some(e => /Nothing can start on a button, a switch/.test(e.msg)));
  const robotOn = build(d6, ['', '', '..t']); robotOn.start = { x: 2, y: 2 };
  ok('nor can the robot', placementErrors(d6, robotOn).some(e => /Nothing can start/.test(e.msg)));
  const end7 = REQUIREMENTS.boxOffButtonAtEnd;
  ok('box off the button at the end: met when the box has moved on', end7.judge(room(['#######', '#PBo..#', '#######']), ['right']) === true);
  ok('box off the button at the end: not met when it rests there', end7.judge(room(['#####', '#PBo#', '#####']), ['right']) === false);
  ok('no level carries the old box-on-button rule', LEVELS.every(l => !(l.rules || []).includes('noBoxOnButton')));
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
  ok('a run too short keeps its path for the moves row', empty.missed && empty.missed.steps.length === 2);
  ok('an empty 5x5 is too short', empty.ok && !empty.won && empty.length === 2 && /must take at least 4/.test(empty.fail.why), JSON.stringify(empty.fail));
  ok('a failure hands the robot a path to play', Array.isArray(empty.fail.path) && empty.fail.path.length === 2);
  ok('the room\'s edge stops the robot like a wall', allShortest(build(d, open)).length === 2);
  const win = build(d, ['P.#.#', '.....', '.###.', '.#...', '.#..G']);
  const v = check(d, win);
  ok('a room in range wins', v.ok && v.won && v.length === 4, JSON.stringify(v.fail));
  // No level has a range any more: at least 4 moves for every level, and no most.
  ok('no level sets a range; every level but the tutorial needs at least 4 moves', LEVELS.every(l => l.tutorial || (l.steps.range === undefined && l.steps.min === undefined && l.steps.max === undefined)));
  { const t = level('tutorial'), r = roomOf(t), empty = check(t, r); r.cells[1 * r.w + 4] = 'wall'; const one = check(t, r);
    ok('the tutorial room: empty it cannot be won; one block at its ringed tile wins it in 2 moves (register 512)', !empty.won && one.won && one.length === 2 && one.paths === 1, JSON.stringify([empty.won, one.length])); }
  const his11 = build(d, ['..##P#.', '.#.G...', '....#..', '#.....#', '...#...', '.#...#.', '.......']);
  const long = check(d, his11);
  ok('a long path wins: his 11-move level 1 room, once refused for passing 8', long.won && long.length === 11, JSON.stringify(long.fail));
  // Level 1's own goal: the same block touched 4 times, on every shortest path.
  ok('his room: one shortest path touches a block 4 times, the other 3, so the goal is not met', long.paths === 2 && !long.optional.find(o => o.id === 'touchBlockFourTimes').met);
  const touch4 = check(d, build(d, ['..##P#.', '.#.G...', '....#..', '#.....#', '...#..#', '.#...#.', '.......']));
  ok('one more block and every shortest path touches it 4 times: met', touch4.won && touch4.optional.find(o => o.id === 'touchBlockFourTimes').met, JSON.stringify(touch4.optional));
  ok('touching: three times is not four', !REQUIREMENTS.touchBlockFourTimes.judge(his11, ['down', 'left', 'down', 'right', 'up', 'left', 'up', 'left', 'up', 'right', 'up']));
  ok('a win reports its area', v.area === 25 && areaOf(win) === 25 && areaOf(roomOf(d)) === 49);
  ok('there is no cost score any more', !('cost' in v) && !('COSTS' in LEVELDATA));
  ok('a win hands the robot its path', v.path && v.path.length === 4);
  ok('a win scores the exact count, the room size, the level\'s own goal and mix', v.optional.map(o => o.id).join() === 'best,small,touchBlockFourTimes,robotTwoDirections,mix' && v.optional[4].met === (v.optional.slice(0, 4).filter(o => o.met).length >= 2) && v.optional[0].met === (v.length === d.steps.best) && v.optional[1].met === (v.tiles <= d.tiles) && v.met === v.optional.filter(o => o.met).length);
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
  ok('through an open door twice: met going there and back', req('throughOpenDoorTwice', ['#######', '#Pt.D.#', '#######'], ['right', 'left']));
  ok('through an open door twice: not met with one pass', !req('throughOpenDoorTwice', ['#######', '#Pt.D.#', '#######'], ['right']));
  ok('its row counts passes, not doors (register 257)', REQUIREMENTS.throughOpenDoorTwice.short.join(' ').includes('2 passes') && /same door or another/.test(REQUIREMENTS.throughOpenDoorTwice.text));
  ok('through an open door twice: one slide across two doors side by side is one pass', !req('throughOpenDoorTwice', ['#######', '#PtDD.#', '#######'], ['right']));
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
{ // a palette minimum a required goal already needs is not set (register 280): it would show twice
  const twice = LEVELS.flatMap(l => Object.entries(l.palette).filter(([el, [min]]) => min >= 2 && (l.require || []).some(id => (REQUIREMENTS[id].needs || {})[el] >= min)).map(([el]) => l.id + ':' + el));
  ok('no level asks for a minimum its required goals already need', twice.length === 0, twice.join());
  ok('a goal that needs two of something says so', REQUIREMENTS.twoTogglesOffAtEnd.needs.toggle === 2 && REQUIREMENTS.boxHitsBox.needs.box === 2);
}
{ // why the robot cannot finish (copy is a draft)
  const why = rows => stuckText(room(rows));
  const at = (r, x, y) => r.at.some(t => t.x === x && t.y === y);
  // The only way to the goal runs along a laser's beam (register 286).
  const beam = why(['#######', '#eP..G#', '#######']);
  ok('a laser in the way is named, and the laser shown', /a laser hits it/.test(beam.why) && at(beam, 1, 1), JSON.stringify(beam));
  ok('a room with no laser is not blamed on one', !/laser/.test(why(['#######', '#P.#.G#', '#######']).why));
  // Spikes in the way are not blamed on a laser (register 437).
  const bare = why(['#######', '#P.x.G#', '#######']);
  ok('bare spikes in the way are named, and the spikes shown', /bare spikes/.test(bare.why) && !/laser/.test(bare.why) && at(bare, 3, 1), JSON.stringify(bare));
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
  ok('level 4 needs a door, and its goal needs two switches (no minimum of its own, register 280)', d.palette.toggle[0] === 1 && d.palette.door[0] === 1 && d.require.join() === 'throughOpenDoor,twoTogglesOffAtEnd' && d.optional.join() === 'thirdToggleOnAtEnd,robotThroughFourDoors');
  ok('a one-switch room cannot meet level 4', !REQUIREMENTS.twoTogglesOffAtEnd.judge(build(d, ['#######', '#P.#D.#', '#....##', '#...t.#', '#..#.##', '##...G#', '#######']), ['right']));
}
{ // level 5: one box pushed in two moves and run into once without moving
  const d = level('5');
  ok('level 5 has blocks and a box, nothing else', Object.keys(d.palette).join() === 'block,box' && d.palette.box[0] === 1 && d.require.join() === 'everyBoxPushedTwice,everyBoxHitOnce' && d.optional.join() === 'boxHitsBox,everyBoxHitsBlockTwice' && d.steps.range === undefined);
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
  const d = { ...level('1'), require: ['throughOpenDoor'], steps: { best: 2, min: 2, max: 2 }, palette: { block: [0, 30], toggle: [0, 1], door: [0, 1] } };
  const both = build(d, ['P.t..', '.....', '....D', '.....', '....G']);
  const v = check(d, both);
  ok('one path missing the door fails the room', v.ok && !v.won && /Not met/.test(v.fail.why) && v.fail.path.map(m => m.split('@')[0]).join() === 'down,right', JSON.stringify(v.fail));
  // An optional path goal is judged like a requirement: met only when every shortest path meets it.
  const og = check({ ...d, require: [], optional: ['throughOpenDoor'] }, both);
  ok('a path goal one shortest path misses is not met', og.paths === 2 && og.optional.find(o => o.id === 'throughOpenDoor').met === false, JSON.stringify(og.optional));
  ok('a failed goal keeps a shortest path that missed it', v.missed && v.missed.throughOpenDoor && !REQUIREMENTS.throughOpenDoor.judge(both, v.missed.throughOpenDoor), JSON.stringify(v.missed));
  ok('a path goal one path misses keeps that path too', og.missed && og.missed.throughOpenDoor && !REQUIREMENTS.throughOpenDoor.judge(both, og.missed.throughOpenDoor));
  const tr = trailOf(room(['#######', '#PB...#', '#######']), ['right']);
  ok('a trail has the robot after each move and each box that moved', JSON.stringify(tr.robot) === '[{"x":1,"y":1},{"x":4,"y":1}]' && tr.boxes.length === 1 && tr.boxes[0].at(-1).x === 5, JSON.stringify(tr));
  ok('the verdict marks each requirement for the goal card', v.reqs && v.reqs.throughOpenDoor === false && v.inRange === true, JSON.stringify(v.reqs));
  ok('every requirement has a short row, with at least one word', Object.values(REQUIREMENTS).every(r => Array.isArray(r.short) && r.short.some(p => typeof p === 'string')));
  ok('a short row names objects only as elements the card can draw', Object.values(REQUIREMENTS).every(r => r.short.every(p => typeof p === 'string' || p.el === 'start' || p.el === 'goal' || ELEMENTS[p.el])));
  // Doors of two colours (register 243): two switches open a red and a blue door the robot slides through.
  const doors = (cells) => { const r = room(['#P......#']); for (const k of Object.keys(r.powers)) r.powers[k] = false; cells.forEach(([x, c]) => { r.cells[x] = c; }); return r; };
  ok('through doors of two colours: met by a red door and a blue one', REQUIREMENTS.throughDoorsOfTwoColours.judge(doors([[2, 'toggle:red'], [3, 'toggle:blue'], [4, 'door:red'], [6, 'door:blue']]), ['right']));
  ok('through doors of two colours: not met by two red doors', !REQUIREMENTS.throughDoorsOfTwoColours.judge(doors([[2, 'toggle:red'], [4, 'door:red'], [6, 'door:red']]), ['right']));
  ok('collides, not runs into', /collides with/.test(REQUIREMENTS.hitsClosedDoor.text) && !/runs into/.test(REQUIREMENTS.hitsClosedDoor.text));
}
{ // level 8's door goals: crossing is in through the open door and off the far side; a crush is a
  // door closing on the box in its doorway
  const off = rows => { const r = room(rows); for (const k of Object.keys(r.powers)) r.powers[k] = false; return r; };
  const req = (id, rows, moves) => REQUIREMENTS[id].judge(off(rows), moves);
  ok('a box crosses an open door: met when it is pushed through and out', req('boxCrossesOpenDoor', ['##########', '#Pt.B.D..#', '##########'], ['right']));
  ok('a box crosses an open door: not met when it stops on the door tile', !req('boxCrossesOpenDoor', ['######', '#PtBD#', '######'], ['right']));
  // The robot holds the button, pushes the box onto the door, steps off: the door closes on it.
  const crush = ['.....', 'B..P.', '..D.D', '.....', 'o...G', 'D....'];
  ok('a box crushed by a door: met when a door closes on it', req('boxCrushedByDoor', crush, ['up', 'left', 'down', 'right']));
  ok('a box crushed by a door: not met when the box only crosses', !req('boxCrushedByDoor', ['##########', '#Pt.B.D..#', '##########'], ['right']));
  ok('and a box left on a door that then closes has not crossed it', !req('boxCrossesOpenDoor', crush, ['up', 'left', 'down', 'right']));
  // His ruling (register 237): a box crushed in the doorway went into it, so the crush run wins level 8 and meets its optional goal.
  const l8 = LEVELS.find(l => l.id === '8'), crushWin = check(l8, Object.assign(off(crush), { clock: roomOf(l8).clock }));
  ok('level 8: a box crushed in the doorway wins the level and leaves no box (register 266)', crushWin.won && crushWin.optional.find(o => o.id === 'noBoxAtEnd').met, JSON.stringify(crushWin.fail || crushWin.optional));
}
{ // one-ways: through is in along the arrow and out the far side; colliding is a slide stopped by
  // one from any direction it does not let through
  const req = (id, rows, moves) => REQUIREMENTS[id].judge(room(rows), moves);
  ok('robot through every one-way: met when it slides across', req('robotThroughEveryOneWay', ['#######', '#P.>..#', '#######'], ['right']));
  ok('robot through every one-way: not met when it stops on one', !req('robotThroughEveryOneWay', ['######', '#P.>#', '######'].map(r => r.slice(0, 5)), ['right']));
  ok('robot through every one-way: not met when one is never crossed', !req('robotThroughEveryOneWay', ['#######', '#P.>..#', '#.....#', '#..v..#', '#######'], ['right']));
  ok('robot collides with every one-way: met head on, against the arrow', req('robotHitsEveryOneWay', ['#######', '#..<.P#', '#######'].map(r => r.replace('<', '>')), ['left']));
  ok('robot collides with every one-way: met from the side', req('robotHitsEveryOneWay', ['#####', '#.P.#', '#...#', '#.>.#', '#####'], ['down']));
  ok('robot collides with every one-way: not met when it lets the robot through', !req('robotHitsEveryOneWay', ['#######', '#P.>..#', '#######'], ['right']));
  ok('robot collides with every one-way: not met when a block stops it first', !req('robotHitsEveryOneWay', ['########', '#..>#.P#', '########'], ['left']));
  ok('a box through a one-way: met when a pushed box crosses it', req('boxThroughOneWay', ['########', '#PB.>..#', '########'], ['right']));
  ok('a box through a one-way: not met when only the robot crosses', !req('boxThroughOneWay', ['#######', '#P.>..#', '#B....#', '#######'], ['right']));
  ok('a box collides with a one-way: one hit is enough', req('boxHitsOneWay', ['#######', '#.>.BP#', '#######'], ['left']));
  ok('a box collides with a one-way: not when nothing stops it', !req('boxHitsOneWay', ['#######', '#...BP#', '#######'], ['left']));
  ok('a box collides with a one-way twice: one hit is not enough', !req('boxHitsOneWayTwice', ['#######', '#.<.BP#', '#######'].map(r => r.replace('<', '>')), ['left']));
  // From a level 10 win the search found: the same box is pushed into a one-way twice, moving each time.
  const twice = '....P. #.B#.. .B>.B. ....G. ....v. ...<.. .B.B.. ..B... ....^. .B....'.split(' ');
  ok('a box collides with a one-way twice: the same box, moving into it each time', req('boxHitsOneWayTwice', twice, ['down@5:up', 'left', 'down', 'right', 'up@2:down', 'left', 'up@1:down', 'left', 'up', 'right']));
  ok('a box collides with a one-way: not when the box is already against it and does not move', !req('boxHitsOneWayTwice', ['########', '#.>..BP#', '########'], ['left', 'right', 'left']));
  // Both ways (registers 241, 242): the same one-way left in two opposite directions.
  ok('robot through a one-way both ways: met going over and back', req('robotThroughOneWayBothWays', ['#######', '#P.=..#', '#######'], ['right', 'left']));
  ok('robot through a one-way both ways: not met going one way', !req('robotThroughOneWayBothWays', ['#######', '#P.=..#', '#######'], ['right']));
  ok('a box through a one-way both ways: not met by one crossing', !req('boxThroughOneWayBothWays', ['########', '#PB.>..#', '########'], ['right']));
  ok('a box ends on a one-way: met when it stops on one', req('boxStuckOnOneWay', ['#######', '#PB.>#', '#######'].map(r => r.slice(0, 6)), ['right']));
}
{ // the extra goals of registers 262-269, each met and missed on a small room
  const off = rows => { const r = room(rows); for (const k of Object.keys(r.powers)) r.powers[k] = false; return r; };
  const req = (id, rows, moves) => REQUIREMENTS[id].judge(off(rows), moves);
  ok('2 switches off at the end: met with two untouched', req('twoTogglesOffAtEnd', ['#######', '#P...##', '#t.t.##', '#######'], ['right']));
  ok('2 switches off at the end: not met when one of two is on', !req('twoTogglesOffAtEnd', ['#######', '#Pt.t.#', '#######'], ['right']));
  ok('a switch off at the end: met when one of two is still off', req('aToggleOffAtEnd', ['#######', '#Pt...#', '#.t...#', '#######'], ['right']));
  ok('a switch off at the end: not met when the only switch is on', !req('aToggleOffAtEnd', ['#######', '#Pt...#', '#######'], ['right']));
  const turning = gate => { const r = off(['#######', '##..B.#', '#o#####', '#P#####', '#######']); r.cells[1 * 7 + 4] = gate; return REQUIREMENTS.boxLaunched.judge(r, ['up']); };
  ok('a box thrown out by a turning one-way: met when the button turns the red one-way under it', turning('gate:right@red'));
  ok('a box thrown out by a turning one-way: not met by a plain one-way', !turning('gate:left'));
  // The robot steps off the button onto the red one-way: letting go turns it, and it throws the robot, not a box.
  const thrown = off(['######', '#P...#', '#....#', '######']); thrown.cells[1 * 6 + 1] = 'button:red'; thrown.cells[1 * 6 + 2] = 'gate:left@red';
  const end = replayPath(thrown, ['right'], () => {});
  ok('a box thrown out by a turning one-way: not met when only the robot is thrown', !REQUIREMENTS.boxLaunched.judge(thrown, ['right']) && end.player.x === 1, JSON.stringify(end.player));
  // Lasers (registers 255, 256): T is a laser firing right.
  const D = ['##########', '#e.D.D...#', '#Pt......#', '##########'];
  ok('a laser through 2 open doors: met once the switch opens both', req('laserThroughTwoDoors', D, ['right']));
  ok('a laser through 2 open doors: not met while they are closed', !req('laserThroughTwoDoors', D, []));
  ok('a laser through 2 open doors: not met through one', !req('laserThroughTwoDoors', ['##########', '#e.D.....#', '#Pt......#', '##########'], ['right']));
  ok('a laser through an open door: met once the switch opens it', req('laserThroughOpenDoor', ['##########', '#e.D.....#', '#Pt......#', '##########'], ['right']));
  ok('a laser through an open door: not met while it is closed', !req('laserThroughOpenDoor', D, []));
  // Two lasers firing right; only the top one's door opens with the switch.
  const two = ['##########', '#e.D.....#', '#Pt......#', '#e.Q.....#', '##########'];
  ok('every laser through an open door: not met when one laser never gets through', !req('laserThroughOpenDoor', two, ['right']));
  ok('a laser through a button: met over an empty one', req('laserThroughButton', ['########', '#e.o...#', '#P.....#', '########'], []));
  const boxed = off(['########', '#e.....#', '#P.....#', '########']); boxed.cells[1 * 8 + 3] = 'button:red'; boxed.entities.push({ kind: 'box', x: 3, y: 1, dir: 1, mode: 'input' });
  ok('a laser through a button: not met when a box on it stops the beam', !REQUIREMENTS.laserThroughButton.judge(boxed, []));
  ok('the robot steps on a button: met when it slides over one', req('robotOnButton', ['#######', '#P.o..#', '#######'], ['right']));
  ok('the robot steps on a button: not met when it passes beside it', !req('robotOnButton', ['#######', '#P....#', '#..o..#', '#######'], ['right']));
  // Inverted doors, relays and the two-colour door (registers 311-313).
  ok('robot through an inverted door: met while it is open', req('robotThroughIdoor', ['#######', '#P.I.G#', '#######'], ['right']));
  ok('robot through an inverted door: not met with none', !req('robotThroughIdoor', ['#######', '#P...G#', '#######'], ['right']));
  // Register 341: a pushable laser pushed in 3 moves.
  ok('a laser through the goal: met when the beam crosses it', req('laserThroughGoal', ['#######', '#e.G..#', '#P....#', '#######'], []));
  ok('a laser through the goal: not met when the beam misses it', !req('laserThroughGoal', ['#######', '#e....#', '#P..G.#', '#######'], []));
  ok('laser pushed ×3: met by three pushes', req('laserPushedThrice', ['###########', '#PN.g.g.g.#', '###########'], ['right', 'right', 'right']));
  ok('laser pushed ×3: not met by two', !req('laserPushedThrice', ['###########', '#PN.g.g.g.#', '###########'], ['right', 'right']));
  ok('laser pushed ×3: a box pushed three times is not a laser', !req('laserPushedThrice', ['###########', '#PB.g.g.g.#', '###########'], ['right', 'right', 'right']));
  // Register 329: every relay lit when the run ends.
  ok('every relay lit at the end: met while the beam reaches it', req('allRelaysLitAtEnd', ['#######', '#e.r..#', '#P...G#', '#######'], ['right']));
  ok('every relay lit at the end: not met when one relay is dark', !req('allRelaysLitAtEnd', ['#######', '#e.r..#', '#P..rG#', '#######'], ['right']));
  ok('every relay lit at the end: not met when a box blocks the beam by the end', !req('allRelaysLitAtEnd', ['#######', '#e.r..#', '#.B...#', '#.P#..#', '#######'], ['left', 'right', 'up']));
  ok('laser stopped by an inverted door: met once a button closes it', req('laserStoppedByIdoor', ['#######', '#e.I..#', '#Po####', '#######'], ['right']));
  ok('laser stopped by an inverted door: not met while it is open', !req('laserStoppedByIdoor', ['#######', '#e.I..#', '#Po####', '#######'], []));
  ok('box hits an inverted door: met when a lit relay closes it', req('boxHitsIdoor', ['########', '#e.r...#', '#PB.I..#', '########'], ['right']));
  ok('box hits an inverted door: not met while it is open', !req('boxHitsIdoor', ['########', '#..r...#', '#PB.I..#', '########'], ['right']));
  ok('a laser holds its own door: met when a blue press opens it and the red relay past it holds it', req('laserHoldsOwnDoor', ['#########', '#e.X.r..#', '#Pq.....#', '#########'], ['right']));
  ok('a laser holds its own door: not met when the relay comes first and opens the door for any beam', !req('laserHoldsOwnDoor', ['#########', '#e.r.D..#', '#P......#', '#########'], ['right']));
  ok('a laser holds its own door: not met by a one-colour door, which needs the button too', !req('laserHoldsOwnDoor', ['#########', '#e.D.r..#', '#Po.....#', '#########'], ['right']));
  ok('a closed door stops every laser: met by both', req('laserBlockedByDoor', two, []));
  ok('a closed door stops every laser: not met when one hits a wall', !req('laserBlockedByDoor', ['##########', '#e.D.....#', '#P.......#', '#e.......#', '##########'], []));
  const ways = (a, b) => { const r = off(['######', '#P...#', '#....#', '######']); r.entities.push({ kind: 'turret', x: 2, y: 2, turret: { dirs: [a], mode: 'input' } }, { kind: 'turret', x: 4, y: 2, turret: { dirs: [b], mode: 'input' } }); return REQUIREMENTS.lasersTwoWays.judge(r, []); };
  ok('lasers pointing 2 ways: met by right and down', ways('right', 'down'));
  ok('lasers pointing 2 ways: not met when both point right', !ways('right', 'right'));
  ok('a closed door stops a laser: met', req('laserBlockedByDoor', D, []));
  ok('a closed door stops a laser: not met by a wall', !req('laserBlockedByDoor', ['########', '#e.....#', '#P.....#', '########'], []));
  ok('a laser through a one-way: met along its arrow', req('laserThroughOneWay', ['########', '#e.>...#', '#P.....#', '########'], []));
  ok('a laser through a one-way: not met against it', !req('laserThroughOneWay', ['########', '#e.<...#', '#P.....#', '########'], []));
  ok('a one-way stops a laser: met against its arrow', req('laserBlockedByOneWay', ['########', '#e.<...#', '#P.....#', '########'], []));
  ok('a one-way stops a laser: not met along it', !req('laserBlockedByOneWay', ['########', '#e.>...#', '#P.....#', '########'], []));
  ok('the robot through a one-way: met', req('robotThroughOneWay', ['#######', '#P.>..#', '#######'], ['right']));
  ok('the robot through a one-way: not met when it stops on it', !req('robotThroughOneWay', ['######', '#P.>#', '######'].map(r => r.slice(0, 5)), ['right']));
  ok('a 3rd switch on at the end: met with three, one on', req('thirdToggleOnAtEnd', ['########', '#Pt....#', '#t.t...#', '########'], ['right']));
  ok('a 3rd switch on at the end: not met with only two', !req('thirdToggleOnAtEnd', ['#######', '#Pt...#', '#.t...#', '#######'], ['right']));
  ok('every box pushed 2 times: not met by one push', !req('everyBoxPushedTwice', ['#######', '#PB...#', '#######'], ['right']));
  ok('the robot collides with every box: not met by a push', !req('everyBoxHitOnce', ['#######', '#PB...#', '#######'], ['right']));
  // The old level 5 win: one of its three boxes is pushed twice and hit, the others are not (register 263).
  const v5 = check(level('5'), build(level('5'), WIN5));
  ok('every box, not one: the old three-box win of level 5 meets neither box row now', v5.reqs && v5.reqs.everyBoxPushedTwice === false && v5.reqs.everyBoxHitOnce === false, JSON.stringify(v5.reqs || v5.errors));
  const trainMoves = boxMoves(off(['#######', '#PBB..#', '#######']), ['right']).map(x => x.pushes).join();
  ok('in a train only the box the robot touches is pushed (register 278)', trainMoves === '1,0', trainMoves);
  ok('a box collides with a box: met when a pushed box stops against another', req('boxHitsBox', ['#######', '#PB..B#', '#######'], ['right']));
  ok('a box collides with a box: not met when the box ahead never moved', !req('boxHitsBox', ['#######', '#P..BB#', '#######'], ['right']));
  ok('a box collides with a box: not met against a wall', !req('boxHitsBox', ['#######', '#PB...#', '#######'], ['right']));
  ok('a box on a button at the end: met', req('boxOnButtonAtEnd', ['######', '#PB.o#', '######'], ['right']));
  ok('a box on a button at the end: not met with no button under it', !req('boxOnButtonAtEnd', ['######', '#PB..#', '######'], ['right']));
  ok('no box at the end: met when the door crushes the only box', req('noBoxAtEnd', ['.....', 'B..P.', '..D.D', '.....', 'o...G', 'D....'], ['up', 'left', 'down', 'right']));
  ok('no box at the end: not met while a box is left', !req('noBoxAtEnd', ['#######', '#PB...#', '#######'], ['right']));
  ok('one-ways pointing 3 ways: met by up, right and down', req('oneWaysThreeWays', ['#####', '#P^>#', '#v..#', '#####'], []));
  ok('one-ways pointing 3 ways: not met by two ways', !req('oneWaysThreeWays', ['#####', '#P^>#', '#^..#', '#####'], []));
  const doors = ['########', '#...#..#', '#PB.D..#', '#......#', '#..D...#', '########'];
  ok('a box collides with 2 closed doors: met by two different doors', req('boxHitsTwoDoors', doors, ['right', 'up', 'right', 'down']));
  ok('a box collides with 2 closed doors: not met by one', !req('boxHitsTwoDoors', doors, ['right']));
}
{ // a level's colours (registers 241-245): pieces in other colours are not the level's, and a one-way
  // carries a colour only in a level that names its colours
  const stray = (id, cell) => { const r = roomOf(level(id)); r.cells[10] = cell; return placed(level(id), r).stray.length; };
  ok('a blue door is not in a red level', stray('4', 'door:blue') === 1 && stray('4', 'door:red') === 0);
  ok('a two-colour level takes red and blue doors and buttons', stray('11', 'door:blue') === 0 && stray('11', 'button:red') === 0 && stray('11', 'door:green') === 1);
  ok('a level naming red takes a red one-way and not a plain one', stray('12', 'gate:up@red') === 0 && stray('12', 'gate:up') === 1);
  ok('a level naming no colours takes a plain one-way and not a red one', stray('9', 'gate:up') === 0 && stray('9', 'gate:up@red') === 1);
  // Pushable lasers are offered per level (register 336): level 19's only pushable, level 14's only plain.
  const strayLaser = (id, crate) => { const d = level(id), r = roomOf(d); r.entities.push({ kind: 'turret', x: 3, y: 3, ...(crate ? { crate: true } : {}), turret: { dirs: ['up'], mode: 'input' } }); return placed(d, r).stray.length; };
  ok('a level offering a laser only pushable refuses a plain one', strayLaser('19', true) === 0 && strayLaser('19', false) === 1);
  const strayRelay = crate => { const d = { ...level('18'), pushable: { relay: 'also' } }, d2 = level('18'), r = roomOf(d); r.cells[3 * r.w + 3] = 'sensor:red'; if (crate) r.crates = [{ x: 3, y: 3 }]; return [placed(d, r).stray.length, placed(d2, r).stray.length]; };
  ok('a pushable relay counts where the level offers one, and is stray where it does not', strayRelay(true).join() === '0,1' && strayRelay(false).join() === '0,0', JSON.stringify([strayRelay(true), strayRelay(false)]));
  ok('a level not offering a pushable laser refuses one', strayLaser('14', false) === 0 && strayLaser('14', true) === 1);
  // Two colours are offered per piece (register 316): the two-colour level's door only in red+blue, its buttons and relays never.
  ok('a level offering a piece only in two colours refuses it in one', stray('twocolour', 'door:red|blue') === 0 && stray('twocolour', 'door:red') === 1 && stray('twocolour', 'door:blue') === 1);
  ok('a piece the level does not offer in two colours is refused in two', stray('twocolour', 'button:red|blue') === 1 && stray('twocolour', 'sensor:red|blue') === 1 && stray('11', 'door:red|blue') === 1);
  const also = { ...level('11'), twoColour: { button: 'also' } }, r = roomOf(also);
  r.cells[10] = 'button:red|blue'; r.cells[12] = 'button:red';
  ok('a piece offered "also" comes in one colour or two', placed(also, r).stray.length === 0);
  ok('one colour offers no pair', colouringsOf({ ...level('4'), twoColour: { door: 'only' } }, 'door').join() === 'red');
}
{ // every level's room-size goal is reachable: the smallest winning room tools/tilesArea.mjs found
  // (levels 11 and 12: his rooms, 2026-10-19, registers 249 and 250)
  const SMALL = KNOWN.small;
  for (const l of LEVELS.filter(l => l.small)) {
    const v = check(l, build(l, SMALL[l.id]));
    // Mix holds where one room meets two goals at once: level 5's smallest room also takes exactly 8.
    if (l.id === '2') {
      // Level 2's own path goal, met on every shortest path of a room the search found.
      const w2 = check(l, build(l, ['....D.', 'DP.D.#', '#.....', '..t.G.']));
      ok('level 2 has its own optional goal: through an open door twice', l.optional.join() === 'throughOpenDoorTwice,robotFlipsSwitchTwice' && w2.won && w2.optional.find(o => o.id === 'throughOpenDoorTwice').met, JSON.stringify(w2.fail || w2.optional));
      ok('a path goal is not met when a shortest path misses it', !v.optional.find(o => o.id === 'throughOpenDoorTwice').met, JSON.stringify(v.optional));
    }
    if (l.id === '3') {
      // His extra goal (register 259), met on every shortest path of a room the search found (9 moves).
      const w3 = check(l, build(l, ['.D.t#', '.....', '.....', '....D', '#G...', '...D#', '....P', '.....']));
      ok('level 3 has an optional goal: the robot collides with a closed door', l.optional.join() === 'hitsClosedDoor,atMostOneDoor' && w3.won && w3.optional.find(o => o.id === 'hitsClosedDoor').met, JSON.stringify(w3.fail || w3.optional));
    }
    if (l.id === '4') { const w = check(l, build(l, KNOWN.pair['4'])); ok('mix: met when one run meets two optional goals', w.optional.find(o => o.id === 'mix').met && w.optional.filter(o => o.id !== 'mix' && o.met).length >= 2, JSON.stringify(w.optional)); }
    if (l.id === '1') ok('mix: not met by one goal alone', !v.optional.find(o => o.id === 'mix').met && v.optional.filter(o => o.met).length === 1, JSON.stringify(v.optional));
    ok(`level ${l.id}'s ${l.small}-room goal is met by a win (register 327)`, Array.isArray(l.small) && v.won && v.optional.find(o => o.id === 'small').met, JSON.stringify(v.fail || v.optional));
  }
}
{ // the goals a level gives its rooms (register 366)
  const req = (id, rows, moves) => REQUIREMENTS[id].judge(room(rows), moves);
  ok('a laser through every relay: met when one beam lights them all, not when one is dark', req('laserThroughEveryRelay', ['########', '#Pe.r.r#', '########'], []) && !req('laserThroughEveryRelay', ['########', '#Pe.r#r#', '########'], []));
  ok('a laser through no relay: met at a moment with every relay dark', req('laserThroughNoRelay', ['########', '#Pe#r..#', '########'], []) && !req('laserThroughNoRelay', ['########', '#Pe.r..#', '########'], []));
  const l20 = level('20'), hit = (rows, moves) => REQUIREMENTS.relayHitsRelay.judge(build(l20, rows), moves);
  ok('a relay collides with a relay: a pushed relay meets another in its line, not one off its line', hit(['#######', '#Pr..r#', '#.....#', '#######'], ['right']) && !hit(['#######', '#Pr...#', '#....r#', '#######'], ['right']));
  ok('at least 3 relays counts the room', REQUIREMENTS.threeRelays.judge(room(['#######', '#Pr.r.r#', '#######']), []) && !REQUIREMENTS.threeRelays.judge(room(['######', '#Pr.r#', '######']), []));
  ok('box touches a laser and a pushable laser: one kind alone is not enough', !req('boxTouchesBothLasers', ['#######', '#PB.e.#', '#######'], ['right']) && !req('boxTouchesBothLasers', ['#######', '#PB.N.#', '#######'], ['right']));
  // Register 435: leaving means having been there; nothing starts on spikes.
  ok('every box leaves spikes: met when a box crosses them, not when it stops on them', req('everyBoxLeavesSpikes', ['#######', '#PB.x.#', '#######'], ['right']) && !req('everyBoxLeavesSpikes', ['######', '#PB.x#', '######'], ['right']));
  ok('every box goes onto spikes: met when it crosses them, not when one never reaches them', req('everyBoxEntersSpikes', ['#######', '#PB.x.#', '#######'], ['right']) && !req('everyBoxEntersSpikes', ['#######', '#PB.x.#', '#.....#', '#B....#', '#######'], ['right']));
  ok('every box leaves spikes: not met when a second box never does', !req('everyBoxLeavesSpikes', ['#######', '#PB.x.#', '#.....#', '#B....#', '#######'], ['right']));
  ok('every box leaves the goal: met when a box crosses the goal, not when it never reaches it', req('everyBoxLeavesGoal', ['#######', '#PBG..#', '#######'], ['right']) && !req('everyBoxLeavesGoal', ['#######', '#PB#G.#', '#######'], ['right']));
  ok('every box leaves the goal: not met when a second box never does', !req('everyBoxLeavesGoal', ['#######', '#PBG..#', '#.....#', '#B....#', '#######'], ['right']));
  { // Registers 448-454: pushable one-ways and doors cover spikes and are followed as they move.
    const g = { ...level('1'), palette: { block: [0, null], box: [0, null], gate: [0, null], spikes: [0, null] }, pushable: { gate: 'only' } };
    const d = { ...level('1'), palette: { block: [0, null], box: [0, null], door: [0, null], button: [0, null], spikes: [0, null] }, pushable: { door: 'only' } };
    const greq = (id, rows, moves) => REQUIREMENTS[id].judge(build(g, rows), moves), dreq = (id, rows, moves) => REQUIREMENTS[id].judge(build(d, rows), moves);
    // The box pushes the one-way onto the spikes and stops against the block; the one-way covers them.
    const over = replayPath(build(g, ['#######', '#PB>x#G', '#######']), ['right'], () => {});
    ok('a box pushes a one-way onto spikes, and it covers them', over.cells[1 * 7 + 4].startsWith('gate:') && over.ground[1 * 7 + 4] === 'death' && over.tiles[0].x === 4, over.cells.join());
    // The robot pushes a one-way across spikes: once it leaves them they are bare, and the robot following it dies.
    let died = false; replayPath(build(g, ['########', '#P>x..#G', '########']), ['right'], t => { if (t.deaths) died = true; });
    ok('pushed off the spikes, the one-way leaves them bare again', died);
    // Register 455: a one-way that cannot move is entered by the box; pushing that box moves only the box.
    const onIt = replayPath(build(g, ['#######', '#PB>#.G', '#######']), ['right'], () => {});
    ok('a box enters a one-way that cannot move', onIt.cells[1 * 7 + 3].startsWith('gate:') && onIt.entities.some(e => e.kind === 'box' && e.x === 3 && e.y === 1), JSON.stringify(onIt.entities));
    // Pushed into the far wall's row: the one-way goes until it is stuck, then the box steps onto it.
    const off = replayPath(build(g, ['#########', '#.PB>...#', '#.#######', '#.......G', '#########']), ['right'], () => {});
    ok('a box pushes a one-way until it cannot move, then stands on it', off.cells[1 * 9 + 7].startsWith('gate:') && off.entities.some(e => e.kind === 'box' && e.x === 7 && e.y === 1), off.cells.slice(9, 18).join() + JSON.stringify(off.entities));
    // The one-way is stuck against the goal, so the box steps onto it and then off it alone.
    const combo = replayPath(build(g, ['#######', '#PB>G.#', '#######']), ['right'], () => {});
    ok('a box on a one-way is pushed off alone, the one-way stays', combo.cells[1 * 7 + 3].startsWith('gate:') && combo.entities.some(e => e.kind === 'box' && e.x === 5), combo.cells.slice(7, 14).join() + JSON.stringify(combo.entities));
    // Register 457: beams and pushable lasers over spikes.
    const lz = { ...level('1'), palette: { block: [0, null], laser: [0, null], gate: [0, null], spikes: [0, null] }, pushable: { laser: 'only' } };
    const lreq = (id, rows, moves) => REQUIREMENTS[id].judge(build(lz, rows), moves);
    ok('a laser goes over every spike: met when the beam crosses them all', lreq('laserOverEverySpike', ['#######', '#ex.x.#', '#P...G#', '#######'], []) && !lreq('laserOverEverySpike', ['#######', '#e#.x.#', '#P...G#', '#######'], []));
    ok('a pushable laser crosses every spike: met when pushed over them', lreq('laserCrossesEverySpike', ['########', '#PNx..##', '#.....G#', '########'], ['right']) && !lreq('laserCrossesEverySpike', ['########', '#PN.x.##', '#x....G#', '########'], ['right']));
    ok('a laser goes over every one-way', lreq('laserOverEveryOneWay', ['#######', '#e>.>.#', '#P...G#', '#######'], []) && !lreq('laserOverEveryOneWay', ['#######', '#e>#>.#', '#P...G#', '#######'], []));
    ok('at least 3 spikes counts the room', lreq('threeSpikes', ['#######', '#xxx..#', '#P...G#', '#######'], []) && !lreq('threeSpikes', ['#######', '#xx...#', '#P...G#', '#######'], []));
    const stepOn = replayPath(build(g, ['#######', '#P>#.G#', '#######']), ['right'], () => {});
    ok('the robot steps onto a one-way that cannot move (register 460)', stepOn.player.x === 2 && stepOn.cells[1 * 7 + 2].startsWith('gate:'), JSON.stringify(stepOn.player));
    ok('a box pushes every one-way: met when the box pushes it, not when the robot does', greq('boxPushesEveryOneWay', ['########', '#PB>.x#G', '########'], ['right']) && !greq('boxPushesEveryOneWay', ['########', '#P>..x#G', '########'], ['right']));
    ok('every one-way goes over spikes: met when pushed onto them', greq('everyOneWayOverSpikes', ['#######', '#PB>x#G', '#######'], ['right']) && !greq('everyOneWayOverSpikes', ['#######', '#PB>.#G', '#######'], ['right']));
    ok('at least 2 one-ways counts the room', greq('twoOneWays', ['######', '#P>>.G', '######'], []) && !greq('twoOneWays', ['######', '#P>..G', '######'], []));
    ok('every door goes over spikes: met when pushed onto them', dreq('everyDoorOverSpikes', ['#######', '#PBDx#G', '#######'], ['right']) && !dreq('everyDoorOverSpikes', ['#######', '#PBD.#G', '#######'], ['right']));
    ok('at least 2 doors counts the room', dreq('twoDoors', ['######', '#PDD.G', '######'], []) && !dreq('twoDoors', ['######', '#PD..G', '######'], []));
  }
  ok('a box cannot start on spikes', placementErrors({ ...level('1'), palette: { block: [0, null], box: [0, null], spikes: [0, null] } }, (() => { const r = room(['P.x', '...', '..G']); r.entities.push({ kind: 'box', x: 2, y: 0, dir: 1, mode: 'input' }); return r; })()).some(e => e.msg === 'Nothing can start on a button, a switch or spikes.'));
  ok('robot and box collide with a relay: met when both stop against one', req('robotAndBoxHitRelay', ['#######', '#PB.r.#', '#.....#', '#....r#', '#######'], ['right', 'down', 'right']) && !req('robotAndBoxHitRelay', ['#######', '#PB.r.#', '#######'], ['right']));
}
{ // every level's own optional goal can be met: a winning room that meets it, found by tools/levelSearch.mjs (registers 262-269)
  const OPT = KNOWN.optional;
  for (const [id, rows] of Object.entries(OPT)) {
    const l = level(id), v = check(l, build(l, rows)), goal = l.optional[0];
    ok(`level ${id}'s optional ${goal} can be met by a win`, v.won && v.optional.find(o => o.id === goal).met, JSON.stringify(v.fail || v.errors || v.optional));
  }
}
{ // every level can be won: one known room each (5x5 unless noted), found by search, so a rule change that
  // makes a level impossible goes red
  const WINS = KNOWN.wins;
  ok('there is a known winning room for every level', LEVELS.every(l => WINS[l.id]), LEVELS.map(l => l.id).join());
  for (const l of LEVELS) {
    const v = WINS[l.id] && check(l, build(l, WINS[l.id]));
    ok(`level ${l.id} can be won`, v && v.ok && v.won, JSON.stringify(v && (v.errors || v.fail)));
    if (['5', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', 'twocolour'].includes(l.id)) ok(`level ${l.id}'s exact count is reachable: its known win takes exactly ${l.steps.best}`, v && v.length === l.steps.best, String(v && v.length));
    if (l.id === '7') { const six = check(l, build(l, ['#B.....o..', '........D.', '.#...#....', '.#B.#..B..', '....DP..D.', '#..G##..#.'])); ok('level 7\'s exact count is reachable: a found room wins in exactly 6', six.won && six.length === l.steps.best, String(six.length)); }
    ok(`level ${l.id}'s win marks every row of its goal card met`, v && v.inRange && (l.require || []).every(id => v.reqs[id] === true), JSON.stringify(v && v.reqs));
  }
}
{ // registers 472-504: the batch's new goals, each judged met and not met on a hand-drawn room
  const off = rows => { const r = room(rows); for (const k of Object.keys(r.powers)) r.powers[k] = false; return r; };
  const T = [
   ['robotTwoDirections', true, ['#####', '#P..#', '#..G#', '#####'], ['right', 'down']],
   ['robotTwoDirections', false, ['#####', '#P..#', '#...#', '#####'], ['right', 'down', 'left']],
   ['robotFlipsSwitchTwice', true, ['#######', '#Pt...#', '#.#####', '#######'], ['right', 'left']],
   ['robotFlipsSwitchTwice', false, ['#######', '#Pt...#', '#######'], ['right']],
   ['atMostOneDoor', true, ['#P.D.#'], []], ['atMostOneDoor', false, ['#PDD.#'], []],
   ['robotThroughFourDoors', true, ['#P.DDDD.#', '#o......#'], ['right'], null, r => { r.entities.push({ kind: 'box', x: 1, y: 1, dir: 1, mode: 'input' }); }],
   ['everyBoxHitsBlockTwice', true, ['######', '#....#', '#PB..#', '#....#', '######'], ['right', 'up', 'right', 'down']],
   ['everyBoxHitsBlockTwice', false, ['#########', '#P.B....#', '#########'], ['right']],
   ['twoBoxes', true, ['#PBB#'], []], ['noBlocks', true, ['P..G'], []], ['noBlocks', false, ['P.#G'], []],
   ['twoSwitches', true, ['#Ptt#'], []], ['threeSwitches', false, ['#Ptt#'], []], ['twoButtons', true, ['#Poo#'], []],
   ['threeOneWays', true, ['#P>>>#'], []], ['oneWaysTwoWays', true, ['#P><#'], []], ['oneWaysTwoWays', false, ['#P>>#'], []],
   ['noRelayAtEnd', false, ['#P.r.#'], []],
  
   ['robotHitsDoorsOfTwoColours', true, ['#######', '#.....#', '#P...D#', '#.....#', '#....Q#', '#######'], ['right', 'down', 'left', 'right']],
   ['robotHitsDoorsOfTwoColours', false, ['#######', '#P...D#', '#######'], ['right']],
   ['everyBoxThroughOpenDoor', false, ['#######', '#PB.D.#', '#######'], ['right']],
   ['everyBoxThroughOneWay', true, ['#######', '#PB>..#', '#######'], ['right']],
   ['everyBoxThroughOneWay', false, ['#######', '#PB>.B#', '#.....#', '#######'], ['right']],
   ['everyBoxHitsOneWay', true, ['#######', '#PB.<.#', '#######'], ['right']],
   ['everyBoxStuckOnOneWay', false, ['#######', '#PB>..#', '#######'], ['right']],
   ['boxHitsOneWayThreeWays', false, ['#######', '#PB.<.#', '#######'], ['right']],
   ['robotHitsEveryLaserTwice', true, ['#######', '#P..n.#', '#######'], ['right', 'left', 'right']],
   ['robotHitsEveryLaserTwice', false, ['#######', '#P..n.#', '#######'], ['right']],
   ['boxBetweenTwoRelays', true, ['########', '#..r...#', '#PB....#', '#..r...#', '########'], ['right']],
   ['boxBetweenTwoRelays', false, ['########', '#..r...#', '#PB....#', '#......#', '########'], ['right']],
   ['laserThroughAndStoppedByDoor', false, ['#######', '#Pe.D.#', '#######'], []],
  ];
  for (const [id, want, rows, moves, , edit] of T) {
    const r = off(rows); if (edit) edit(r);
    ok(`${id}: ${want ? 'met' : 'not met'} on ${rows.join(' ')}`, REQUIREMENTS[id].judge(r, moves) === want);
  }
}
{ // register 506: every level has a winning room that meets two side goals at once, so its mix goal can be met
  for (const [id, rows] of Object.entries(KNOWN.pair)) {
    const l = level(id), v = check(l, build(l, rows));
    ok(`level ${id} has a room meeting two side goals at once`, v.won && v.optional.find(o => o.id === 'mix').met, JSON.stringify(v.fail || v.optional));
  }
  ok('every level the list shows has such a room (the tutorial has no side goals)', LEVELS.filter(l => !l.hidden && !l.tutorial).every(l => KNOWN.pair[l.id]));
}
done();
