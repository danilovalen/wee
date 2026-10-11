// The room's grips: adding or cutting lines on a side, keeping a wall border whole.
import { moveSide } from '../src/level/format.js';
import { room, suite } from './lib.mjs';

const { check, done } = suite('size');
const rows = l => [...Array(l.h).keys()].map(y => l.cells.slice(y * l.w, (y + 1) * l.w).map(c => c === 'wall' ? '#' : c === 'goal' ? 'G' : c ? '?' : '.').join(''));
const box = room(['#####', '#P..#', '#...#', '#...#', '#####']);
const cut = moveSide(box, 'bottom', -2);
check('a cut inside a border keeps the border', cut && rows(cut).join('/') === '#####/#...#/#####', cut && rows(cut).join('/'));
const grow = moveSide(box, 'right', 2);
check('a grow inside a border keeps it closed', grow && rows(grow).join('/') === '#######/#.....#/#.....#/#.....#/#######', grow && rows(grow).join('/'));
const goal = room(['#####', '#P..#', '#..w#', '#####']);
check('a cut that would take something you placed changes nothing', moveSide(goal, 'bottom', -1) === null);
check('nor one that takes the start', moveSide(box, 'top', -1) === null);
const open = room(['.....', '.P...', '.....', '.....']);
const o = moveSide(open, 'bottom', -1);
check('an open edge is cut at the edge', o && o.h === 3 && o.start.y === 1);
check('the start and pieces follow a line added before them', moveSide(box, 'top', 1).start.y === 2);
done();
