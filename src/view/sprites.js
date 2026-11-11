// The room's sprites (docs/THEME.md): each is drawn on 32 art pixels to a tile by crayonSprites.js or
// crayonSkins.js, inked by crayon.js, kept as runs of one colour per row, and drawn with whole-unit
// rectangles so it stays sharp at any whole zoom.
import { INK } from './ink.js';
import { skinned, look, current } from './look.js';
import { ink, doubled, wobble, WOBBLE_FRAMES } from './crayon.js';
import { CRAYON_SPRITES } from './crayonSprites.js';
import { CRAYON_SKINS } from './crayonSkins.js';
import { CRAYON_MOMENTS } from './crayonMoments.js';

const BUILD = { ...CRAYON_SPRITES, ...CRAYON_SKINS, ...CRAYON_MOMENTS };

// Each sprite inked (crayon.js) and kept as rows of [x, y, length, colour] runs, built on first use for the
// palette it is drawn in. A builder returns a 32-pixel sheet, or an old 16-pixel grid, which is doubled.
const U = 1, runs = new Map();
// Drawn as they are, with no line round them: an open door is only its dashes, a frame is only a frame.
const PLAIN = new Set(['doorOpen', 'doorOpenAlt', 'crateFrame']);
// Drawn the same every frame: a wall's face and what is set in it, a mark on the floor, the dead.
const STILL = new Set(['wallFace', 'wallFaceAlt', 'crack', 'spring', 'springAlt', 'stain', 'blobDead']);
const sheetOf = (name, param) => { const b = BUILD[name](param); return b.g || doubled(b); };
function runsOf(name, param, exact, f = 0) {
  if (!exact) name = skinned(name);
  const key = [current().id, name, param, f].join('\u0001');
  if (runs.has(key)) return runs.get(key);
  const plain = PLAIN.has(name) || /(^|\|)bare(\||$)/.test(String(param)) || (name === 'idoor' && /\|1$/.test(String(param)));
  // A mark on the floor is a stain, not a thing: its edge darkens and no line goes round it.
  // What is part of a wall or lies on the floor holds still; everything else wobbles (register 871).
  const sheet = plain || STILL.has(name) ? sheetOf(name, param) : wobble(sheetOf(name, param), name, f);
  const out = ink(sheet, plain ? { ring: 0, edge: 0 } : name === 'stain' ? { ring: 0 } : {});
  runs.set(key, out);
  return out;
}
export const SPRITES = Object.keys(BUILD);
// The sprite's sheet, 32 by 32 or wider, for a test or a tool that reads its pixels.
export const spriteSheet = (name, param) => sheetOf(name, param);

// Boil (register 647, as in Baba Is You): every few frames a still sprite is one of three drawings of
// itself. Off under reduced motion, when turned off on the Looks page, and for a test driving the page
// unless it asks (window.__boil).
const BOIL_MS = 200;
export function boilOn() {
  if (typeof window === 'undefined' || look.boil === false) return false;
  if (navigator.webdriver && !window.__boil) return false;
  return !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

// Draws a sprite with its top-left at (x, y) in room units; outline draws only its edge pixels (a hidden blob).
// colour: a hex for the colour-keyed pieces (doors, switches, buttons).
// exact: draw this very sprite, not the skin its object wears (the Looks page's previews).
export function drawSprite(g, name, x, y, { outline = false, colour = null, exact = false } = {}) {
  if (outline) {
    const grid = sheetOf(exact ? name : skinned(name));
    g.fillStyle = INK.player;
    grid.forEach((row, yy) => row.forEach((c, xx) => {
      if (!c) return;
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !(grid[yy + dy] || [])[xx + dx]);
      if (edge && ((xx >> 1) + (yy >> 1)) % 2 === 0) g.fillRect(x + xx * U, y + yy * U, U, U);
    }));
    return;
  }
  const list = runsOf(name, colour, exact, !exact && boilOn() ? Math.floor(performance.now() / BOIL_MS) % WOBBLE_FRAMES : 0);
  // Every run is rounded to whole pixels of whatever it is drawn on, so a sprite stays crisp at any position
  // or scale and its runs meet with no seams (registers 607, 621).
  const m = g.getTransform ? g.getTransform() : null;
  if (m && !m.b && !m.c) {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const X = u => Math.round(m.a * u + m.e), Y = u => Math.round(m.d * u + m.f);
    for (const [rx, ry, n, c] of list) { const x0 = X(x + rx * U), y0 = Y(y + ry * U); g.fillStyle = c; g.fillRect(x0, y0, Math.max(1, X(x + (rx + n) * U) - x0), Math.max(1, Y(y + (ry + 1) * U) - y0)); }
    g.restore(); return;
  }
  for (const [rx, ry, n, c] of list) { g.fillStyle = c; g.fillRect(x + rx * U, y + ry * U, n * U, U); }
}
