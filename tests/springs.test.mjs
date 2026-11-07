// Springs (register 822): one push per move, out until everything stops, and a crusher when what
// they face cannot move. Plus a bomb in a closing door (register 823).
import { createGame, step } from '../src/rules/game.js';
import { calm } from '../src/rules/springs.js';
import { room, suite } from './lib.mjs';
import { readFileSync } from 'node:fs';

const { check, done } = suite('springs');
// One move: the key, then ticks until everything has stopped.
const move = (s, key) => { step(s, [key]); for (let i = 0; i < 80 && !calm(s); i++) step(s); return s; };
const at = (o, x, y) => o.x === x && o.y === y;

{ // Two springs facing each other: the blob is sent back once, then stops at the spent one.
  const s = move(createGame(room(['#########', '#6.....4#', '#.P.....#', '#########'])), 'up');
  check('two springs facing each other bounce the blob once each, and the first one, spent, stops it in front (register 822)', at(s.player, 2, 1) && !s.deaths, JSON.stringify([s.player.x, s.player.y, s.deaths]));
  check('once everything has stopped the springs are armed again', s.sprung.length === 0, JSON.stringify(s.sprung));
}

{ // A box resting in front waits for the next move, then goes.
  const s = createGame(room(['#######', '#6B...#', '#.....#', '#P....#', '#######']));
  for (let i = 0; i < 5; i++) step(s);
  check('a box resting in front of a spring stays put while nothing moves', at(s.entities[0], 2, 1), JSON.stringify(s.entities[0]));
  move(s, 'right');
  check('and is launched on your next move, whichever way you go', at(s.entities[0], 5, 1), JSON.stringify(s.entities[0]));
}

{ // Something that cannot move its way is crushed.
  const box = move(createGame(room(['######', '#6B#.#', '#....#', '#P...#', '######'])), 'right');
  check('a spring crushes a box it cannot move (register 822)', box.entities[0].dead, JSON.stringify(box.entities[0]));
  const you = move(createGame(room(['#####', '#.#.#', '#..P#', '#.8.#', '#####'])), 'left');
  check('a spring facing a wall crushes the blob crossing in front of it', you.deaths === 1, String(you.deaths));
  const armored = move(createGame(room(['#####', '#.#.#', '#..P#', '#.8.#', '#####'], { powers: { armored: true } })), 'left');
  check('armored, the blob jams it and lives', armored.deaths === 0, String(armored.deaths));
  const heavy = move(createGame(room(['######', '#6H#.#', '#....#', '#P...#', '######'])), 'right');
  check('a heavy box jams it and is not crushed', !heavy.entities[0].dead && at(heavy.entities[0], 2, 1) && !heavy.sprung.length, JSON.stringify(heavy.entities[0]));
  const bomb = move(createGame(room(['######', '#6O#.#', '#....#', '#P...#', '######'])), 'right');
  check('a bomb it cannot move goes off', bomb.entities[0].dead && bomb.deaths === 0, JSON.stringify(bomb.entities[0]));
}

{ // The blob passing a spent spring goes straight on; the spring pushed one thing this move.
  const b = move(createGame(room(['#######', '#.....#', '#.....#', '#PB...#', '#..8..#', '#######'])), 'right');
  check('a spring that launched the box lets the blob behind it slide past (register 822)', at(b.player, 5, 3) && at(b.entities[0], 3, 1), JSON.stringify([b.player, b.entities[0]]));
}

{ // An enemy reaching it first spends it.
  const e = createGame(room(['#######', '#P....#', '#.....#', '#.Z...#', '#..8..#', '#######']));
  step(e, ['down']); for (let i = 0; i < 80 && !calm(e); i++) step(e);
  check('an enemy reaching a spring is launched by it', e.entities[0].y < 3, JSON.stringify(e.entities[0]));
}

{ // Register 823: a bomb a closing door shuts on goes off, far enough from the blob to leave it be.
  const s = createGame(room(['#########', '#Po.....#', '#.......#', '#.....D.#', '#########']));
  s.entities.push({ id: 99, kind: 'bomb', x: 6, y: 3, axis: 'h', dir: 1, mode: 'input', slide: null, dead: false, rush: false, turret: null });
  const seen = []; step(s, ['right']); seen.push(...s.events); for (let i = 0; i < 80 && !calm(s); i++) { step(s); seen.push(...s.events); }
  check('a bomb caught in a closing door goes off (register 823)', s.entities.find(e => e.id === 99).dead && seen.some(e => e.type === 'blast') && !s.deaths, JSON.stringify(seen.map(e => e.type)));
}

// Register 824: the simple Sandbox offers the spring, so it can be tried out.
check('the simple Sandbox offers the spring (register 824)', /export const SIMPLE = \[[^\]]*'spring'/.test(readFileSync(new URL('../src/app/panels.js', import.meta.url), 'utf8')));

done();
