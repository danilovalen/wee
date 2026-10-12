// The solver copies a run before trying each move. cloneGame shares what a run never changes
// and copies the rest, so it must behave exactly like a full copy: stepped the same way,
// both copies read the same, and stepping a copy never touches the run it came from.
import { createGame, step, gameText, cloneGame } from '../src/rules/game.js';
import { stateKey } from '../src/solve/solve.js';
import { build, normalize } from '../src/gen/generate.js';
import { INGREDIENTS } from '../src/gen/ingredients.js';
import { rng } from '../src/gen/random.js';
import { TEMPLATES } from '../src/level/templates.js';
import { switchesOf } from '../src/rules/life.js';
import { room, suite } from './lib.mjs';

const { check, done } = suite('clone');
const KEYS = ['up', 'right', 'down', 'left', 'hide', 'respawn'];
// Rooms with every ingredient: each one on its own (Must), then all of them at once.
const rooms = TEMPLATES.map(t => t.level);
for (const g of INGREDIENTS) for (const seed of [1, 2]) { const r = rng(seed); rooms.push(build(normalize({ ing: { [g.id]: 'must' }, seed, w: 10, h: 8 }), r)); }
for (const seed of [3, 4, 5]) rooms.push(build(normalize({ ing: Object.fromEntries(INGREDIENTS.filter(g => !g.allowedOnly).map(g => [g.id, 'allowed'])), seed, w: 12, h: 10 }), rng(seed)));

const read = s => gameText(s) + stateKey(s);
let compared = 0, differ = [], leaked = [];
rooms.forEach((level, n) => {
  const r = rng(100 + n), s = createGame(level);
  for (let t = 0; t < 120; t++) {
    step(s, r.next() < 0.3 ? [KEYS[r.int(KEYS.length)]] : []);
    if (t % 15 !== 7) continue;
    const before = read(s), a = cloneGame(s), b = structuredClone(s);
    for (let u = 0; u < 25; u++) { const k = r.next() < 0.4 ? [KEYS[r.int(KEYS.length)]] : []; step(a, k); step(b, k); }
    compared++;
    if (read(a) !== read(b)) differ.push(`room ${n} tick ${t}`);
    if (read(s) !== before) leaked.push(`room ${n} tick ${t}`);
  }
});
check(`a lean copy behaves like a full copy (${compared} comparisons over ${rooms.length} rooms)`, compared > 300 && !differ.length, differ.slice(0, 5).join(', '));
check('stepping a copy never changes the run it came from', !leaked.length, leaked.slice(0, 5).join(', '));
// Riding a sliding box edits the ride in place when the box stops: a copy must not share it.
const rb = createGame(room(['#######', '#.....#', '#.....#', '#P....#', '#.....#', '#..B..#', '#######']));
rb.player.sticky = true; rb.entities[0].slide = 'up'; rb.player.dir = 'right';
for (let i = 0; i < 20 && !(rb.player.stuck && rb.player.stuck.ride); i++) step(rb);
const riding = !!(rb.player.stuck && rb.player.stuck.ride), copy = cloneGame(rb);
for (let i = 0; i < 12; i++) step(copy);
check('a copy that rides to a stop leaves the original still riding', riding && copy.player.stuck && !copy.player.stuck.ride && rb.player.stuck.ride, JSON.stringify([riding, copy.player.stuck, rb.player.stuck]));
// Where the switches are is worked out once per room, not on every tick.
const sw = createGame(TEMPLATES[1].level);
check('the switch list is worked out once per room and reused', switchesOf(sw) === switchesOf(cloneGame(sw)) && switchesOf(sw).length > 3);
// The position key tells apart every difference it is meant to: change any one field the
// solver treats as part of a position, and the key changes.
const base = createGame(TEMPLATES[1].level), k0 = stateKey(base);
const FIELDS = {
  'player x': g => { g.player.x++; }, 'player y': g => { g.player.y++; }, swimming: g => { g.player.swimming = true; }, sticky: g => { g.player.sticky = true; },
  stuck: g => { g.player.stuck = { id: g.entities[1].id, ride: false }; }, riding: g => { g.player.stuck = { id: g.entities[1].id, ride: true }; },
  checkpoint: g => { g.checkpoint = { x: 3, y: 3 }; }, 'piece x': g => { g.entities[1].x++; }, 'piece y': g => { g.entities[1].y++; },
  'piece dir': g => { g.entities[4].dir = -g.entities[4].dir; }, 'piece axis': g => { g.entities[4].axis = 'v'; }, 'piece sticky': g => { g.entities[1].sticky = true; },
  glue: g => { g.entities[1].glue = 99; }, 'turret aim': g => { g.entities[5].turret.aim++; }, 'a piece gone': g => { g.entities[1].dead = true; }, 'a door open': g => { g.open.blue = !g.open.blue; }, 'a block broken': g => { g.broken = [g.w + 1]; },
};
const same = Object.entries(FIELDS).filter(([, f]) => { const g = cloneGame(base); f(g); return stateKey(g) === k0; }).map(([n]) => n);
check('the position key changes with every field it covers', !same.length, same.join(', '));
done();
