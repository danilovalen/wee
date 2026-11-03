// The good feels drawn on the room (register 647): sparks, dust, the hit flash, the blob's squash, and what a
// tick reports for them. Every square lands on a whole art pixel.
import { drawJuice, squashOf, motionFx, JUICE_MS } from '../src/view/juice.js';
import { createGame, step } from '../src/rules/game.js';
import { room, suite } from './lib.mjs';

const { check, done } = suite('juice');
const pen = () => { const rects = []; return { rects, fillStyle: '', globalAlpha: 1, fillRect(x, y, w, h) { rects.push([x, y, w, h]); } }; };
const drawn = (type, extra = {}) => { const g = pen(); drawJuice(g, [{ type, x: 2, y: 3, at: 0, ...extra }], JUICE_MS[type] / 3); return g.rects; };
const whole = rs => rs.every(([x, y]) => x % 2 === 0 && y % 2 === 0);
check('a placed piece throws four sparks, on whole pixels', drawn('place').length === 4 && whole(drawn('place')), JSON.stringify(drawn('place')));
check('an erased piece breaks into six dust squares, on whole pixels', drawn('erase').length === 6 && whole(drawn('erase')));
check('a stop kicks up two dust squares', drawn('land', { dir: 'right' }).length === 2);
check('what the blob hits flashes over its tile', drawn('hit').length === 1);
check('nothing is drawn once an effect is over', (() => { const g = pen(); drawJuice(g, [{ type: 'place', x: 0, y: 0, at: 0 }], 1000); return g.rects.length === 0; })());
const launch = squashOf([{ type: 'launch', dir: 'up', at: 0 }], 10), land = squashOf([{ type: 'land', dir: 'up', at: 0 }], JUICE_MS.land / 2);
check('setting off stretches the blob along its way', launch && launch.along > 1 && launch.across < 1, JSON.stringify(launch));
check('stopping squashes it against what stopped it', land && land.along < 1 && land.across > 1, JSON.stringify(land));
check('no squash once it has settled', squashOf([{ type: 'land', dir: 'up', at: 0 }], 1000) === null);
// A tick reports setting off, then coming to rest against the wall.
const s = createGame(room(['#####', '#P.G#', '#####'].map(r => r.replace('G', '.')))), fx = [];
let wasDir = null, open = JSON.stringify(s.open);
for (let i = 0; i < 30; i++) { const before = { x: s.player.x, y: s.player.y }; step(s, i === 0 ? ['right'] : []); motionFx(s, before, wasDir, open, i, fx); wasDir = s.player.dir; open = JSON.stringify(s.open); }
const types = fx.map(f => f.type);
check('a slide reports setting off, then a stop and a hit on the wall', types[0] === 'launch' && types.includes('land') && types.includes('hit'), JSON.stringify(fx));
check('the hit is on the wall tile it stopped against', (f => f && f.x === 4 && f.y === 1)(fx.find(f => f.type === 'hit')), JSON.stringify(fx.find(f => f.type === 'hit')));
done();
