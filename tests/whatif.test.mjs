// The What if lens (registers 755, 756): what each tile's change does to the answer, for placing the piece in
// hand and for taking out what is there.
import { whatIf } from '../src/editor/whatif.js';
import { variants } from '../src/editor/variants.js';
import { place as put } from '../src/editor/edit.js';
import { search } from '../src/solve/solve.js';
import { room, suite } from './lib.mjs';

const { check, done } = suite('whatif');
const run = it => { for (;;) { const r = it.next(); if (r.done) return r.value; } };
const OFF = { boomerang: false, dive: false, laser: false, cycle: false };
// The berry sits at the end of a lane: a block in the lane lengthens the way, one beside the berry can cut it off.
const lane = room(['#######', '#.....#', '#P...G#', '#######'], { powers: OFF });
const place = new Map(), base = run(whatIf(lane, { tool: 'wall' }, place));
check('the room\'s own answer is measured first', base === 1, String(base));
check('every empty tile is tried', place.size === 8, String(place.size));
const longer = [...place.values()].filter(r => r.moves > base);
check('a block in the lane makes the answer longer there', place.get(2 * 7 + 3).moves > base, JSON.stringify(place.get(2 * 7 + 3)));
check('and a tile that leaves the way alone keeps it the same', [...place.values()].some(r => r.moves === base), JSON.stringify([...place].map(([i, r]) => [i, r.moves])));
check('each result keeps the room it would make, to show and apply', longer.every(r => r.level && r.level.cells.filter(c => c === 'wall').length === lane.cells.filter(c => c === 'wall').length + 1));
// Erase: taking out the wall that stops the blob on the berry's row breaks nothing; the outer ring is tried too.
const shut = room(['#####', '#P.G#', '#####'], { powers: OFF });
const gone = new Map(); run(whatIf(shut, { tool: 'erase' }, gone));
check('with Erase every wall and piece is tried, never the berry', gone.size === shut.cells.filter(c => c && c !== 'goal').length && !gone.has(1 * 5 + 3), String(gone.size));
check('taking out the wall behind the berry lets Wee slide past it, so the room can\'t be won', gone.get(1 * 5 + 4).moves == null, JSON.stringify(gone.get(1 * 5 + 4)));
// A box stands in the lane: placing never tries its tile, and Erase tries taking the box out.
const boxed = room(['#######', '#.....#', '#P.B.G#', '#######'], { powers: OFF });
const onBox = new Map(); run(whatIf(boxed, { tool: 'wall' }, onBox));
check('a tile a piece stands on is not offered for placing', !onBox.has(2 * 7 + 3) && onBox.size > 0);
const outBox = new Map(); run(whatIf(boxed, { tool: 'erase' }, outBox));
check('with Erase, the box is tried too', outBox.has(2 * 7 + 3) && outBox.get(2 * 7 + 3).what === 'box', JSON.stringify(outBox.get(2 * 7 + 3)));
// A one-way is tried every way round, and each tile keeps the way that makes the answer longest.
const ui = { tool: 'gate', pass: ['right'] }, gates = new Map(); run(whatIf(lane, ui, gates));
const most = (x, y) => Math.max(0, ...variants(ui).map(u => { const l = JSON.parse(JSON.stringify(lane)); if (!put(l, u, x, y, 'place').length) return 0; const r = run(search(l, 20000)); return r.status === 'solved' ? r.moves.length : 0; }));
check('each tile keeps the way round that makes the answer longest', [[2, 2], [3, 2], [4, 1]].every(([x, y]) => (gates.get(y * 7 + x).moves || 0) === most(x, y)), JSON.stringify([[2, 2], [3, 2], [4, 1]].map(([x, y]) => [gates.get(y * 7 + x).moves, most(x, y)])));
done();
