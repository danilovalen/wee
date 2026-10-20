// The laser clock (register 342): a laser through an inverted door into a relay of its colour flips
// the colour every tick, with no input. Usage: node tools/laserClock.mjs
import { createGame, step } from '../src/rules/game.js';
import { room } from '../tests/lib.mjs';
for (const mode of ['realtime', 'input']) {
  const l = room(['#######', '#P....#', '#T.N.s#', '#######'], { mode });
  const s = createGame(l), seq = [];
  for (let t = 0; t < 14; t++) { step(s); seq.push(s.open.red ? 1 : 0); }
  console.log(mode, seq.join(''));
}
