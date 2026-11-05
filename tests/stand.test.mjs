// What may stand on what (registers 768, 772): a piece or the blob starts only on floor-like tiles; placing
// one on the other takes the one underneath off, and a move or swap onto such a tile is refused.
import { place, moveAt } from '../src/editor/edit.js';
import { canStand } from '../src/level/stand.js';
import { room, suite } from './lib.mjs';

const { check, done } = suite('stand');
check('floor-like tiles take a piece', ['', 'water', 'sticky', 'gravel', 'checkpoint', 'button:red', 'toggle:blue:on'].every(canStand));
check('berry, relay, crack, one-way, spikes, spring, corner, wall and door do not', ['goal', 'sensor:red', 'crack', 'gate:up', 'death', 'spring:up', 'tri:nw', 'wall', 'door:red', 'idoor:red'].every(c => !canStand(c)));
const fresh = () => room(['#######', '#P....#', '#######']);
let l = fresh(); l.cells[9] = 'goal';
place(l, { tool: 'turret', aim: ['left'], mode: 'input', start: 'left' }, 2, 1, 'place');
check('a laser placed on a berry takes its place', l.cells[9] === '' && l.entities.some(e => e.kind === 'turret' && e.x === 2));
l = fresh(); l.entities.push({ kind: 'box', x: 3, y: 1 });
place(l, { tool: 'goal' }, 3, 1, 'place');
check('a berry placed under a box takes its place', l.cells[10] === 'goal' && !l.entities.length);
for (const c of ['sensor:red', 'crack', 'gate:up', 'death']) {
  l = fresh(); l.cells[10] = c;
  place(l, { tool: 'box' }, 3, 1, 'place');
  check(`a box placed on ${c} takes its place`, l.cells[10] === '' && l.entities.length === 1, l.cells[10]);
}
for (const c of ['water', 'button:red']) {
  l = fresh(); l.cells[10] = c;
  place(l, { tool: 'box' }, 3, 1, 'place');
  check(`a box placed on ${c} stands on it`, l.cells[10] === c && l.entities.length === 1);
}
l = fresh(); l.cells[10] = 'goal';
place(l, { tool: 'start' }, 3, 1, 'place');
check('the blob placed on a berry takes its place', l.cells[10] === '' && l.start.x === 3);
l = fresh(); place(l, { tool: 'box' }, 1, 1, 'place');
check('a box placed on the blob takes its place (register 768)', !l.start && l.entities.length === 1);
l = fresh(); place(l, { tool: 'water' }, 1, 1, 'place');
check('water placed under the blob keeps it', !!l.start && l.cells[8] === 'water');
l = fresh(); l.cells[10] = 'sensor:red'; l.entities.push({ kind: 'box', x: 4, y: 1 });
{ const m = moveAt(l, { x: 4, y: 1 }, { x: 3, y: 1 });
  check('moving a box onto a relay swaps them, so neither stands on the other', !!m && m.cells[10] === '' && m.cells[11] === 'sensor:red' && m.entities[0].x === 3); }
l = fresh(); l.cells[10] = 'sensor:red'; l.cells[11] = 'water'; l.entities.push({ kind: 'box', x: 4, y: 1 });
check('a box on water swapped with a relay is refused: the relay would land under it', moveAt(l, { x: 4, y: 1 }, { x: 3, y: 1 }) === null);
done();
