// Trim (register 693): rows and columns come out while the room still plays the same, and no further.
import { trimRoom, cutLine, same } from '../src/solve/shape.js';
import { routes } from '../src/solve/design.js';
import { room, suite } from './lib.mjs';

const { check, done } = suite('shape');
const run = it => { for (;;) { const r = it.next(); if (r.done) return r.value; } };
const OFF = { boomerang: false, dive: false, laser: false, cycle: false };

// A column of wall at the edge does what the room's edge already does, and the second row is never used.
const padded = room(['P.G#', '...#', '####'], { powers: OFF });
const t = run(trimRoom(padded, 5000));
const par = l => run(routes(l, 5000)).par;
check('trim takes out the lines the room does not need', !!t && t.level.w < padded.w && par(t.level) === par(padded), JSON.stringify(t && [t.level.w, t.level.h, t.cut]));
check('and the trimmed room still solves in the same moves', !!t && par(t.level) === 1, String(t && par(t.level)));
// Nothing to take out: every line is used.
check('a room with nothing to spare is left alone', run(trimRoom(room(['PG'], { powers: OFF }), 5000)) === null);
check('a line holding the start, the goal or a piece is never cut', cutLine(padded, 'col', 0) === null && cutLine(padded, 'col', 2) === null && cutLine(room(['P.B.G'], { powers: OFF }), 'col', 2) === null);
check('a cut moves what is past it over by one', (c => c && c.w === 3 && c.cells[2] === 'goal' && c.start.x === 0)(cutLine(room(['P..G'], { powers: OFF }), 'col', 1)));
const m = (par, traps, dead) => ({ par, traps: Array(traps).fill(0), dead });
check('plays the same: same length, same trap tiles, dead ends kept (owner: moves and traps)', same(m(5, 2, 9), m(5, 2, 4)) && !same(m(5, 2, 9), m(6, 2, 9)) && !same(m(5, 2, 9), m(5, 1, 9)) && !same(m(5, 0, 3), m(5, 0, 0)));
done();
