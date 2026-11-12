// The crayon look's rules (docs/THEME.md), held on every sprite the game can draw: one pass inks them all,
// the line is a tint and whole, no piece is one fill, and a fitted room lands on whole screen pixels.
import { suite } from './lib.mjs';
import { ink, sheet, dk, lt, resolve, RING, N2, wholeScale, TAP, wobble, sway, WOBBLE_FRAMES } from '../src/view/crayon.js';
import { SPRITES, spriteSheet, wobbles, sways } from '../src/view/sprites.js';
import { handSize, HAND_CELLS, iconSize } from '../src/app/hand.js';

const { check, done } = suite('crayon');
// A key each keyed sprite accepts, so every builder is drawn once.
const KEY = { doorShut: '#ff6188', doorOpen: '#ff6188', switchOff: '#ff6188', switchOn: '#ff6188', buttonUp: '#ff6188', buttonDown: '#ff6188', laser: 'right|right', spring: 'right|', springArm: 'right', gate: 'right||0', sensor: '#ff6188|0', checkpoint: '0', idoor: '#ff6188|0', mover: 'h', enemy: 'h|1', strong: 'h|1', bomb: '2', crack: '' };
const keyOf = n => KEY[n.replace(/Alt$/, '')];
const sheets = SPRITES.map(n => [n, spriteSheet(n, keyOf(n))]);
const PLAIN = ['doorOpen', 'crateFrame', 'doorOpenAlt'];

check('every sprite is drawn, on 32 pixels to a tile', sheets.every(([, g]) => g.length === N2 && g[0].length >= N2), sheets.filter(([, g]) => g.length !== N2).map(([n]) => n).join());
// The line: each cell of a piece that borders bare floor has line there, never nothing.
const holes = [];
for (const [n, g] of sheets) {
  if (PLAIN.includes(n)) continue;
  const painted = new Set(); for (const [x, y, len] of ink(g)) for (let i = 0; i < len; i++) painted.add((x + i) + ',' + y);
  g.forEach((row, y) => row.forEach((c, x) => { if (c) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!painted.has((x + dx) + ',' + (y + dy))) holes.push(`${n}@${x},${y}`); }));
}
check('the line is whole: no cell of a piece touches bare floor', !holes.length, holes.slice(0, 5).join(' '));
const ringOf = g => ink(g).filter(([x, y]) => y < 0 || y >= g.length || x < 0);
check('the line is two pixels wide', RING === 2 && sheets.every(([n, g]) => PLAIN.includes(n) || ink(g).some(([x, y]) => y === -2 || x === -2 || y === g.length + 1) || !g[0].some(Boolean)));
const black = sheets.filter(([n, g]) => !PLAIN.includes(n) && ringOf(g).some(r => /^#(0{6}|1a1020)/i.test(r[3]))).map(([n]) => n);
check('the line is a tint of the piece, never black', !black.length, black.join());
const one = s => { const d = sheet(4, 4); d.rect(0, 0, 3, 3, s); return ink(d.g); };
check('a red piece and a blue one get different lines', one('#ff6188').find(r => r[1] === -1)[3] !== one('#78dce8').find(r => r[1] === -1)[3]);
// Never one fill: a shade, a shine or a feature inside.
const flat = sheets.filter(([n, g]) => !PLAIN.includes(n) && new Set(g.flat().filter(Boolean)).size < 3).map(([n]) => n);
check('no piece is a single fill', !flat.length, flat.join());
check('a tone is worked out from the colour: darker and lighter, the same in any palette', resolve(dk('#ff6188', 0.5)) < resolve('#ff6188') && resolve(lt('#404040', 0.5)) > resolve('#404040') && resolve('!#ffffff') === '#ffffff');
// A joined side gets no line and no dark edge.
const slab = sheet(4, 4); slab.rect(0, 0, 3, 3, '#ff6188');
check('a side that joins a neighbour is not inked', !ink(slab.g, { sides: 'nsw' }).some(r => r[0] + r[2] > 4) && ink(slab.g, { sides: 'nesw' }).some(r => r[0] + r[2] > 4));
// The wobble (register 871, after Baba Is You): at rest a piece is three whole drawings. The whole sheet
// bends by a pixel in broad bands, outline and inside together; it never tears row from row, and a piece
// that fills its tile keeps its footprint.
const blob = sheets.find(([n]) => n === 'blob')[1], box = sheets.find(([n]) => n === 'box')[1];
const frames = g => [1, 2].map(f => wobble(g, 'blob', f));
check('a piece at rest is three drawings, the first as drawn', WOBBLE_FRAMES === 3 && wobble(blob, 'blob', 0) === blob && new Set([blob, ...frames(blob)].map(g => JSON.stringify(g))).size === 3);
const count = g => g.flat().filter(Boolean).length;
check('a bent drawing is the same piece: about as many cells, and its inside moves too', frames(blob).every(g => Math.abs(count(g) - count(blob)) < count(blob) * 0.08 && g.some((row, y) => row.some((c, x) => c && blob[y][x] && c !== blob[y][x]))));
// Only what is alive wobbles (register 875): a made thing is the same drawing every frame.
const moving = SPRITES.filter(wobbles).sort().join();
check('only Wee and the creatures wobble; a berry, a box, a door and every other thing hold still', moving === 'blob,blobAlt,enemy,mover,strong' && !wobbles('berry') && !wobbles('box') && !wobbles('doorShut') && !wobbles('laser'), moving);
// The hand is set so a cell of its grid is a whole number of the screen's pixels (register 892): then a letter
// is the same drawing wherever it falls.
{
  const off = [1.25, 1.5, 2, 2.5, 2.625, 2.75, 3, 3.5, 4].filter(d => { const cell = handSize(d, false) * d / HAND_CELLS; return Math.abs(cell - Math.round(cell)) > 1e-9 || handSize(d, false) < 14 || handSize(d, false) > 24; });
  check('on every screen sharper than one pixel, a cell of the hand is whole device pixels and the text 14 to 24 px', !off.length && handSize(1, false) === 18 && handSize(1, true) === 24, off.join());
}
// An icon's cell is a whole number of the screen's pixels too (register 914).
check('on every screen an icon\'s cell is whole device pixels, near 24 px on a phone', [1, 1.25, 2, 2.625, 2.75, 3, 3.5].every(d => { const c = iconSize(d) * d / 16; return Math.abs(c - Math.round(c)) < 1e-9; }) && iconSize(1) === 16 && iconSize(2) === 24);
// A fruit's body holds still and only its stem and leaves lean (registers 886, 906): the outline of the fruit
// itself is the same in every drawing.
{
  const b = spriteSheet('berry'), body = g => JSON.stringify(g.slice(8)), topOf = g => g.slice(0, 8).map(r => r.findIndex(Boolean)).filter(v => v >= 0)[0];
  check('a berry\'s body never changes; its leaves lean a pixel left, then right', sways('berry') && !sways('box') && body(sway(b, 1)) === body(b) && body(sway(b, 2)) === body(b) && topOf(sway(b, 1)) === topOf(b) - 1 && topOf(sway(b, 2)) === topOf(b) + 1 && sway(b, 0) === b);
}
// Every cell of a bent drawing is a cell of the piece moved by a pixel at most.
check('a bend never tears: every cell moves by a pixel at most', frames(blob).every(g => g.every((row, y) => row.every((c, x) => !c || [-1, 0, 1].some(dy => [-1, 0, 1].some(dx => (blob[y + dy] || [])[x + dx]))))));
check('a piece that fills its tile keeps its footprint', frames(box).every(g => g.length === N2 && g[0].length === N2 && [0, N2 - 1].every(e => (box[16][e] ? g[16][e] : true))));
check('the line goes round a bent drawing whole', frames(blob).every(g => { const painted = new Set(); for (const [x, y, len] of ink(g)) for (let k = 0; k < len; k++) painted.add((x + k) + ',' + y); return g.every((row, y) => row.every((c, x) => !c || [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => painted.has((x + dx) + ',' + (y + dy))))); }));

// The interface's icons wear the look too (register 866): a colour of the page's own, a line round every
// cell of the icon, a lit top edge and a shaded foot.
import { PIXEL_ICONS, pixelBitmap, pixelGlyph, layers, ICON_COLOUR } from '../src/app/pixelIcons.js';
const area = d => [...d.matchAll(/h(\d+)v1/g)].reduce((n, m) => n + +m[1], 0);
const bare = PIXEL_ICONS.filter(k => { const g = pixelBitmap(k), l = layers(g); return !(area(l.l) >= 12 && area(l.h) > 0 && area(l.s) > 0 && area(l.o) > area(l.h)); });
check('every icon has a line round it, a lit edge and a shaded foot', PIXEL_ICONS.length > 40 && !bare.length, bare.join());
const open_ = PIXEL_ICONS.filter(k => { const g = pixelBitmap(k), l = layers(g), on = new Set(); for (const m of l.l.matchAll(/M(-?\d+) (-?\d+)h(\d+)/g)) for (let i = 0; i < +m[3]; i++) on.add((+m[1] + i) + ',' + m[2]); return g.some((row, y) => row.some((v, x) => v && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !(g[y + dy] || [])[x + dx] && !on.has((x + dx) + ',' + (y + dy))))); });
check('an icon\'s line is whole: no cell of it touches bare paper', !open_.length, open_.join());
const uncoloured = PIXEL_ICONS.filter(k => k !== 'star' && !/--glyph-c:var\(--[a-z-]+\)/.test(pixelGlyph(k)));
check('every icon but the star has a colour of the page\'s own', !uncoloured.length && Object.keys(ICON_COLOUR).every(k => PIXEL_ICONS.includes(k)), uncoloured.join());
check('the palette icon wears three dabs of other colours', (pixelGlyph('looks').match(/style="fill:var\(--/g) || []).length === 3);

// Pixel perfect: a fitted scale is a whole number of screen pixels to an art pixel, or a half step.
const kd = k => wholeScale(k, 3) * 3;
check('a fitted room is a whole number of screen pixels to an art pixel when that costs a fifth or less', kd(1.2) === 3 && kd(1.02) === 3 && Number.isInteger(kd(0.7)));
check('else it is a half step, never an odd fraction', kd(0.95) === 2.5 && kd(0.6) === 1.5 && [0.5, 0.9, 1.2, 1.9].every(k => Number.isInteger(kd(k) * 2)));
check('a fitted scale never grows the room, and a room too big for a pixel each is left as it is', [0.4, 0.77, 1, 1.5, 2.3].every(k => wholeScale(k, 3) <= k + 1e-9) && wholeScale(0.2, 3) === 0.2);
check('a finger comes first: no rounding takes a tile under 24 px that fitted at 24 or more', TAP === 24 && [0.76, 0.77, 0.8, 0.82, 0.9, 1, 1.1].every(k => wholeScale(k, 3) * 32 >= 24 && wholeScale(k, 2) * 32 >= 24 && wholeScale(k, 1) * 32 >= 24) && wholeScale(0.77, 3) === 0.77);
done();
