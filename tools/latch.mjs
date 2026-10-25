// A one-bit memory from today's pieces (register 348): two NOR gates feeding each other, four colours.
// Q (blue) = laser through idoor:red|green into a blue catcher; not-Q (green) = laser through
// idoor:yellow|blue into a green catcher. A box on the yellow button sets it, on the red one resets it.
// Usage: node tools/latch.mjs
import { createGame, step } from '../src/rules/game.js';
import { room } from '../tests/lib.mjs';

const l = room(['#########', '#e.I.r..#', '#.......#', '#e.I.r..#', '#.......#', '#..B.B.P#', '#.......#', '#########']);
l.cells[1 * 9 + 3] = 'idoor:red|green'; l.cells[1 * 9 + 5] = 'sensor:blue'; l.cells[1 * 9 + 6] = 'wall';
l.cells[3 * 9 + 3] = 'idoor:yellow|blue'; l.cells[3 * 9 + 5] = 'sensor:green'; l.cells[3 * 9 + 6] = 'wall';
l.cells[6 * 9 + 1] = 'button:yellow'; l.cells[6 * 9 + 7] = 'button:red';
const s = createGame(l), [setBox, resetBox] = s.entities.filter(e => e.kind === 'box');
const run = (label, n = 6) => {
  const q = [];
  for (let i = 0; i < n; i++) { step(s); q.push(s.open.blue ? 1 : 0); }
  console.log(`${label.padEnd(30)} Q over ${n} ticks: ${q.join('')}  (not-Q ${s.open.green ? 1 : 0})`);
};
const put = (box, at) => { box.x = at[0]; box.y = at[1]; };
run('start, no buttons');
put(setBox, [1, 6]); run('box on Set');
put(setBox, [3, 5]); run('Set released');
put(resetBox, [7, 6]); run('box on Reset');
put(resetBox, [5, 5]); run('Reset released');
put(setBox, [1, 6]); run('Set again');
put(setBox, [3, 5]); run('Set released again');
