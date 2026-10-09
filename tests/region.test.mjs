// Copy, clear, rotate and paste a box of the room.
import { copyRegion, clearRegion, rotateClip, pasteRegion, norm } from '../src/level/region.js';
import { room, suite } from './lib.mjs';

const { check, done } = suite('region');
const l = room(['######', '#P.B.#', '#.o..#', '######']);
const r = { x0: 3, y0: 2, x1: 2, y1: 1 };
check('a box can be drawn from any corner', JSON.stringify(norm(r)) === JSON.stringify({ x0: 2, y0: 1, x1: 3, y1: 2 }));
const c = copyRegion(l, r);
check('copy takes the cells and pieces, relative to the box', c.w === 2 && c.h === 2 && c.cells[2] === 'button:red' && c.entities.length === 1 && c.entities[0].x === 1 && c.entities[0].y === 0);
c.entities[0].x = 9;
check('a copy does not share pieces with the room', l.entities[0].x === 3);
const cl = clearRegion(l, r);
check('clear empties the box and removes its pieces', cl.cells[2 * 6 + 2] === '' && cl.entities.length === 0 && cl.cells[0] === 'wall');
const p = pasteRegion(cl, copyRegion(l, r), 3, 1);
check('paste puts the copy at its top-left', p.cells[2 * 6 + 3] === 'button:red' && p.entities[0].x === 4 && p.entities[0].y === 1);
const off = pasteRegion(cl, copyRegion(l, r), 5, 2);
check('what falls outside the room is dropped', off.cells.length === cl.cells.length && off.entities.every(e => e.x < 6 && e.y < 4));
const onStart = pasteRegion(l, { w: 1, h: 1, cells: ['wall'], entities: [] }, 1, 1);
check('the start tile stays free', onStart.cells[7] === '');
const replace = pasteRegion(l, { w: 1, h: 1, cells: [''], entities: [{ kind: 'heavy', x: 0, y: 0 }] }, 3, 1);
check('a pasted piece replaces the one there', replace.entities.length === 1 && replace.entities[0].kind === 'heavy');

const clip = { w: 3, h: 2, cells: ['spring:up', 'tri:nw', 'gate:right', 'wall', '', 'door:red'], entities: [
  { kind: 'mover', x: 0, y: 1, axis: 'h', dir: 1 }, { kind: 'enemy', x: 2, y: 0, axis: 'v', dir: 1 }, { kind: 'turret', x: 1, y: 1, turret: { dirs: ['up', 'left'], mode: 'input' } }] };
const t = rotateClip(clip);
check('a quarter turn swaps width and height', t.w === 2 && t.h === 3);
check('the top-left cell goes to the top-right', t.cells[1] === 'spring:right');
check('a triangle turns its corner', t.cells[3] === 'tri:ne');
check('a one-way turns its directions', t.cells[5] === 'gate:down');
check('a door is a door', t.cells.includes('door:red') && t.cells.includes('wall'));
const mv = t.entities.find(e => e.kind === 'mover'), en = t.entities.find(e => e.kind === 'enemy'), tu = t.entities.find(e => e.kind === 'turret');
check('a piece moves with its cell', mv.x === 0 && mv.y === 0 && en.x === 1 && en.y === 2);
check('a patrol going right now goes down', mv.axis === 'v' && mv.dir === 1);
check('a patrol going down now goes left', en.axis === 'h' && en.dir === -1);
check('a turret turns its barrels', tu.turret.dirs.join() === 'up,right');
const four = rotateClip(rotateClip(rotateClip(rotateClip(clip))));
check('four turns come back to the start', JSON.stringify(four) === JSON.stringify(clip));
done();
