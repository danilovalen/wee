// The crayon look's rules (docs/THEME.md), held on every sprite the game can draw: one pass inks them all,
// the line is a tint and whole, no piece is one fill, and a fitted room lands on whole screen pixels.
import { suite } from './lib.mjs';
import { ink, sheet, dk, lt, resolve, RING, N2, wholeScale, TAP, glintAt, GLINT_EVERY, GLINT_MS, pulseAt, PULSE_EVERY, PULSE_MS } from '../src/view/crayon.js';
import { SPRITES, spriteSheet } from '../src/view/sprites.js';

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
// The scribble (register 859): at rest a piece moves between three drawings of its line. The line swells a
// pixel in short stretches; it never thins or drops a pixel, and the piece itself does not change.
const blob = sheets.find(([n]) => n === 'blob')[1];
const cellsOf = runs => { const s = new Map(); for (const [x, y, len, c] of runs) for (let i = 0; i < len; i++) s.set((x + i) + ',' + y, c); return s; };
const plain = cellsOf(ink(blob)), scr = [1, 2, 3].map(f => cellsOf(ink(blob, { scribble: f })));
check('a scribbled line never loses a pixel of the plain one, and the piece is unchanged', scr.every(m => [...plain].every(([k, c]) => m.get(k) === c)));
check('the three drawings differ, each only by a swollen line', new Set(scr.map(m => [...m.keys()].sort().join())).size === 3 && scr.every(m => m.size > plain.size && m.size < plain.size * 1.2));

// The glint, a shining thing's idle: brief, rare, inside its tile, and never two seeds at once.
const lit = (seed) => { let n = 0; for (let t = 0; t < GLINT_EVERY; t += 20) if (glintAt(t, seed)) n++; return n * 20; };
check('a glint is brief and rare: under a tenth of the time', lit(0) > 0 && lit(0) <= GLINT_MS + 20 && GLINT_MS * 10 <= GLINT_EVERY, String(lit(0)));
check('a glint stays inside its tile and crosses it', [0, 100, 200, 400].every(t => { const a = glintAt(t, 0); return a && a.x - a.arm >= 0 && a.x + a.arm < N2 && a.y + a.arm < N2; }) && glintAt(400, 0).x > glintAt(0, 0).x);
check('two things do not wink together', [1, 2, 3, 4].every(seed => !(glintAt(100, 0) && glintAt(100, seed))) && glintAt(-50, 0) === null);

// The pulse, a working thing's idle (register 865): a one-way's arrow and a laser's muzzle brighten briefly.
const on = seed => { let n = 0; for (let t = 0; t < PULSE_EVERY; t += 10) if (pulseAt(t, seed)) n++; return n * 10; };
check('a pulse is brief: under a tenth of the time, and seeds differ', on(0) === PULSE_MS && PULSE_MS * 10 <= PULSE_EVERY && pulseAt(0, 0) && !pulseAt(0, 1) && !pulseAt(-PULSE_EVERY + PULSE_MS, 0));
const differs = (n, a, b) => JSON.stringify(spriteSheet(n, a)) !== JSON.stringify(spriteSheet(n, b));
check('a pulsing one-way and a pulsing laser are their own drawings', differs('gate', 'right||0|0', 'right||0|1') && differs('laser', 'right||0', 'right||1') && !differs('laser', 'right|right|0', 'right|right|1'));

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
