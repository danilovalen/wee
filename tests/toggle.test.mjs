// The toggle: a floor switch that flips each time something enters it, robot or piece,
// and holds its colour's doors like any other switch.
import { createGame, step } from '../src/rules/game.js';
import { respawn } from '../src/rules/life.js';
import { stateKey } from '../src/solve/solve.js';
import { TOOLS } from '../src/editor/palette.js';
import { MECHANISMS } from '../src/solve/tags.js';
import { ELEMENTS, REQUIREMENTS } from '../src/campaign/rules.js';
import { readFileSync } from 'node:fs';
import { room, suite } from './lib.mjs';

const { check, done } = suite('toggle');
const slide = (s, key) => { step(s, [key]); for (let i = 0; i < 50 && s.player.dir; i++) step(s); return s; };
const idx = (s, x, y) => y * s.w + x;

{ // sliding across flips it, and back across flips it again
  const s = createGame(room(['######', '#Pt..#', '######']));
  check('a toggle starts off', s.toggled.length === 0);
  slide(s, 'right');
  check('sliding across a toggle turns it on', s.toggled.includes(idx(s, 2, 1)), JSON.stringify(s.toggled));
  check('the slide does not stop on the toggle', s.player.x === 4);
  slide(s, 'left');
  check('crossing it again turns it off', s.toggled.length === 0, JSON.stringify(s.toggled));
}
{ // a toggle holds its door open after the robot has left it
  const s = createGame(room(['#######', '#Pt.D.#', '#######']));
  slide(s, 'right');
  check('a toggle that is on opens its door', s.open.red);
  check('the robot slides through the open door', s.player.x === 5, `x=${s.player.x}`);
}
{ // a door needs every toggle of its colour
  const s = createGame(room(['#######', '#Pt.D.#', '#.....#', '#t....#', '#######']));
  slide(s, 'right');
  check('one of two toggles does not open the door', !s.open.red);
  check('so the closed door stops the slide', s.player.x === 3, `x=${s.player.x}`);
}
{ // standing on a toggle at the start does not flip it, and a reset turns it off
  const l = room(['#####', '#P..#', '#####']);
  l.cells[idx(l, 1, 1)] = 'toggle:red';
  const s = createGame(l);
  check('starting on a toggle leaves it off', s.toggled.length === 0);
  slide(s, 'right');
  check('leaving a toggle does not flip it', s.toggled.length === 0);
  slide(s, 'left');
  check('entering it does', s.toggled.length === 1);
  const key = stateKey(s);
  respawn(s);
  check('a reset turns every toggle off', s.toggled.length === 0);
  slide(s, 'right'); slide(s, 'left');
  void key;
  // With two toggles on one door, one toggle on leaves every door shut, so only the key's
  // toggle part tells that run from a fresh one.
  const two = room(['######', '#P.tt#', '######']);
  const a = createGame(two), b = createGame(two);
  b.toggled = [idx(b, 3, 1)];
  check('the solver tells apart runs that differ only in a toggle', stateKey(a) !== stateKey(b) && !b.open.red);
}
{ // a pushed box flips it too, and the robot following it in flips it back
  const s = createGame(room(['######', '#PB.t#', '######']));
  slide(s, 'right');
  check('a box pushed onto a toggle turns it on', s.toggled.includes(idx(s, 4, 1)), JSON.stringify(s.toggled));
  const t = createGame(room(['######', '#PBt.#', '######']));
  slide(t, 'right');
  check('the box and then the robot entering flips it twice', t.toggled.length === 0, JSON.stringify(t.toggled));
}
{ // the player calls it a Switch; "toggle" survives only as the internal id
  const said = [...TOOLS.map(t => t.label), ...MECHANISMS.map(m => m[1]), ...Object.values(ELEMENTS).map(e => e.label), ...Object.values(REQUIREMENTS).map(r => r.text)];
  const html = readFileSync('index.html', 'utf8').replace(/<[^>]*>/g, ' ');
  check('no player-facing word says toggle', !said.some(t => /toggle/i.test(t)) && !/toggle/i.test(html), said.filter(t => /toggle/i.test(t)).join(' | '));
  check('the tile is named Switch', TOOLS.find(t => t.id === 'toggle').label === 'Switch' && ELEMENTS.toggle.label === 'Switch');
}
done();
