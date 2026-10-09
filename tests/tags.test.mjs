// The mechanism index: tags come from the room and from replaying its solution.
import { readFileSync } from 'node:fs';
import { contains, uses, MECHANISMS, LABEL } from '../src/solve/tags.js';
import { solve } from '../src/solve/solve.js';
import { room, suite } from './lib.mjs';

const { check, done } = suite('tags');
check('every tag has one label', new Set(MECHANISMS.map(m => m[0])).size === MECHANISMS.length);

const l = room(['########', '#P.B.oD#', '#M...H.#', '#T.....#', '########']);
l.cells[3 * 8 + 6] = 'goal';
l.cells[2 * 8 + 6] = 'sticky';
const c = contains(l);
check('tiles are read off the cells', c.includes('tile:goal') && c.includes('tile:door') && c.includes('tile:button') && c.includes('tile:sticky'), c.join());
check('pieces are read off the pieces', ['piece:box', 'piece:heavy', 'piece:mover', 'piece:turret'].every(t => c.includes(t)), c.join());
check('a moving piece gives its clock', c.includes('clock:input') && !c.includes('clock:realtime'));
check('powers that are on are tags', c.includes('power:boomerang') && !c.includes('power:swim'));
check('one switch of one colour is not AND wiring', !c.includes('wiring:and') && !c.includes('wiring:colours'));
const w = room(['#######', '#Poou.#', '#######']);
check('two switches of one colour is AND wiring, two colours is colours', contains(w).includes('wiring:and') && contains(w).includes('wiring:colours'));
const m = room(['#####', '#PB.#', '#####']); m.entities[0].turret = { dirs: ['right'], mode: 'realtime' };
check('a turret on a box is a mounted turret, with its clock', contains(m).includes('piece:mounted') && contains(m).includes('clock:realtime'));
check('every tag contains() gives is a known mechanism', [c, contains(w), contains(m)].flat().every(t => LABEL[t]));

const push = room(['#######', '#P.B..#', '#.....#', '#######']); push.cells[11] = 'goal';
const sp = solve(push);
const u = uses(push, sp.moves);
check('replaying a solution that pushes a box says so', u.includes('use:push'), u.join());
const first = JSON.parse(readFileSync('rooms/first-room.wee', 'utf8'));
const uf = uses(first, solve(first).moves);
check('his first room: you push a box and a door opens', uf.includes('use:push') && uf.includes('use:door-opens'), uf.join());
check('every tag uses() gives is a known mechanism', uf.every(t => LABEL[t]));
const hide = room(['#####', '#P..#', '#####'], { powers: { cycle: true } });
check('what happens on the key press itself counts (a hide)', uses(hide, ['hide']).includes('use:hide'));
check('no moves, no uses', uses(push, []).length === 0);
done();
