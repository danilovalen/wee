// Pixel sprites of the neon lab look (register 602, docs/lab-neon-sketch.html): 16x16 art pixels on a
// 32-unit tile, so one art pixel is 2 units. Each sprite is built once from simple shapes, kept as runs
// of one colour per row, and drawn with whole-unit rectangles so it stays sharp at any zoom.
import { INK } from './ink.js';
import { skinned, look } from './look.js';

import { N, PX, grid, ellipse, box, line, steps, mixHex } from './pixel.js';
import { PIECE_SPRITES } from './pieceSprites.js';
import { SKIN_SPRITES } from './skinSprites.js';

const C = {
  blobH: '#e6f8d0', blobM: '#c3eb9a', blob: '#a9dc76', blobS: '#6f9e45', blobD: '#4f7432', eye: '#221f22', white: '#fcfcfa',
  berryH: '#c9f4fa', berry: '#78dce8', berryS: '#3f9aa6', berryD: '#2b6f78', leaf: '#6f9e45',
  boxL: '#a59f85', box: '#857f6a', boxD: '#5e5a4a',
};

const BUILD = {
  // Hero, the other look (register 777): a gel drop, dark rim, body, lighter belly, a shine, two eyes, a squashed base.
  blobAlt() {
    const g = grid();
    ellipse(g, 8, 9.5, 7.5, 6.5, C.blobD); ellipse(g, 8, 9.2, 6.6, 5.7, C.blob); ellipse(g, 8, 10.4, 4.5, 3.4, C.blobM);
    ellipse(g, 5, 6.5, 1.8, 1.3, C.blobH); g[5][4] = C.white; box(g, 2, 14, 13, 14, C.blobS); box(g, 4, 15, 11, 15, C.blobD);
    box(g, 6, 9, 6, 10, C.eye); box(g, 10, 9, 10, 10, C.eye); g[9][6] = C.white;
    return g;
  },
  // A cyan berry (register 604): round, a crown on top, a shine, a small leaf.
  berry() {
    const g = grid();
    ellipse(g, 8, 9.5, 6.6, 6, C.berryS); ellipse(g, 7.7, 9.2, 5.8, 5.2, C.berry);
    ellipse(g, 5.4, 7.6, 1.7, 1.3, C.berryH); g[7][5] = C.white;
    box(g, 7, 4, 9, 4, C.berryD); g[3][7] = C.berryD; g[3][9] = C.berryD; g[5][8] = C.berryD;
    line(g, 9, 3, 11, 1, C.leaf); box(g, 11, 1, 13, 2, C.leaf);
    return g;
  },
  // A crate: 1-pixel outline, light top-left edge, plank seams, a brace, nails.
  box() {
    const g = grid(); box(g, 0, 0, 15, 15, C.box);
    box(g, 0, 0, 15, 0, C.boxD); box(g, 0, 15, 15, 15, C.boxD); box(g, 0, 0, 0, 15, C.boxD); box(g, 15, 0, 15, 15, C.boxD);
    box(g, 1, 1, 14, 1, C.boxL); box(g, 1, 1, 1, 14, C.boxL);
    box(g, 1, 5, 14, 5, C.boxD); box(g, 1, 10, 14, 10, C.boxD); box(g, 2, 6, 14, 6, C.boxL); box(g, 2, 11, 14, 11, C.boxL);
    line(g, 2, 13, 13, 2, C.boxD); line(g, 2, 12, 12, 2, C.boxL);
    for (const [x, y] of [[3, 3], [12, 3], [3, 8], [12, 8], [3, 13], [12, 13]]) g[y][x] = C.boxD;
    return g;
  },
};

// Colour-keyed pieces take their colour (an INK colour name's hex) and derive a dark and a light step.
Object.assign(BUILD, {
  // A shut door: a frame, slats and a lit top edge in its colour.
  doorShut(col) {
    const { c, d, l } = steps(col), g = grid();
    box(g, 0, 0, 15, 15, d); box(g, 1, 1, 14, 14, c); box(g, 1, 1, 14, 1, l);
    for (const x of [4, 7, 10, 13]) box(g, x, 2, x, 14, d);
    box(g, 1, 8, 14, 8, d); box(g, 2, 9, 14, 9, l);
    return g;
  },
  // An open door: only its dashed frame.
  doorOpen(col) {
    const g = grid();
    for (let i = 1; i < 15; i++) if (i % 4 < 2) { g[1][i] = col; g[14][i] = col; g[i][1] = col; g[i][14] = col; }
    return g;
  },
  // A switch plate: a pill with a knob, left and hollow while off, right and filled while on.
  switchOff(col) {
    const { c, d } = steps(col), g = grid();
    box(g, 3, 5, 12, 10, c); box(g, 4, 6, 11, 9, d); g[5][3] = null; g[5][12] = null; g[10][3] = null; g[10][12] = null;
    box(g, 4, 6, 6, 9, c); box(g, 5, 6, 5, 6, mixHex(col, '#fcfcfa', 0.45));
    return g;
  },
  switchOn(col) {
    const { c, d } = steps(col), g = grid();
    box(g, 3, 5, 12, 10, c); g[5][3] = null; g[5][12] = null; g[10][3] = null; g[10][12] = null;
    box(g, 9, 6, 11, 9, '#fcfcfa'); g[9][11] = d;
    return g;
  },
  // A floor button: a faint ring and a cap, sunk lower while pressed.
  buttonUp(col) {
    const { c, d, l } = steps(col), g = grid();
    ellipse(g, 8, 8.5, 6, 6, d); ellipse(g, 8, 7.8, 4, 4, c); g[6][6] = l; g[6][7] = l;
    return g;
  },
  buttonDown(col) {
    const { c, d } = steps(col), g = grid();
    ellipse(g, 8, 8.5, 6, 6, d); ellipse(g, 8, 8.8, 3, 3, c);
    return g;
  },
  // A laser: only its barrels (register 493), one per direction it fires, the next to fire lit orange
  // (register 603). key: "right,down|right".
  laser(key) {
    const [dirs, next] = key.split('|'), g = grid();
    const turn = { right: (x, y) => [x, y], down: (x, y) => [15 - y, x], left: (x, y) => [15 - x, 15 - y], up: (x, y) => [y, 15 - x] };
    for (const d of dirs.split(',')) {
      const lit = d === next, body = lit ? INK.zap : '#727072', edge = lit ? '#c4643a' : '#403e41', tip = lit ? INK.zapCore : '#939293';
      const put = (x, y, c) => { const [X, Y] = turn[d](x, y); g[Y][X] = c; };
      for (let x = 6; x <= 15; x++) { put(x, 6, edge); put(x, 9, edge); put(x, 7, body); put(x, 8, body); }
      put(6, 7, edge); put(6, 8, edge); put(14, 7, tip); put(15, 7, tip); put(14, 8, tip); put(15, 8, tip);
    }
    return g;
  },
});

Object.assign(BUILD, PIECE_SPRITES, SKIN_SPRITES);


// Each sprite as rows of [x, length, colour] runs, built on first use.
const runs = new Map();
function runsOf(name, param, exact) {
  if (!exact) name = skinned(name);
  const key = param ? name + ':' + param : name;
  if (runs.has(key)) return runs.get(key);
  const g = BUILD[name](param), out = [];
  // A run reaches half a unit into a filled neighbour to its right or below, which is painted after it, so a
  // zoom that is not a whole number leaves no hairline seams between pixels.
  g.forEach((row, y) => { for (let x = 0; x < N;) { const c = row[x]; let n = 1; while (x + n < N && row[x + n] === c) n++; if (c) out.push([x, y, n, c, x + n < N && !!row[x + n], y + 1 < N && row.slice(x, x + n).every((_, i) => g[y + 1][x + i])]); x += n; } });
  runs.set(key, out);
  return out;
}
export const SPRITES = Object.keys(BUILD);

// Boil (register 647, as in Baba Is You): every few frames an edge pixel of a row grows or shrinks by one,
// a different few each frame, so a still sprite shimmers. Off under reduced motion, when turned off on the
// Looks page, and for a test driving the page unless it asks (window.__boil).
const BOIL_MS = 260;
export function boilOn() {
  if (typeof window === 'undefined' || look.boil === false) return false;
  if (navigator.webdriver && !window.__boil) return false;
  return !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
}
const boils = new Map();
function boiled(key, list) {
  const f = Math.floor(performance.now() / BOIL_MS) % 3;
  if (!f) return list;
  const k = key + '#' + f;
  if (boils.has(k)) return boils.get(k);
  const hash = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  const firsts = new Set(), lasts = new Map();
  list.forEach((r, i) => { if (![...firsts].some(j => list[j][1] === r[1])) firsts.add(i); lasts.set(r[1], i); });
  const out = list.map((r, i) => {
    const h = hash(k + ':' + i) % 9;
    if (h === 0 && firsts.has(i) && r[2] > 2) return [r[0] + 1, r[1], r[2] - 1, ...r.slice(3)];
    if (h === 1 && [...lasts.values()].includes(i) && r[2] > 2) return [r[0], r[1], r[2] - 1, ...r.slice(3)];
    return r;
  });
  boils.set(k, out);
  return out;
}

// Draws a sprite with its top-left at (x, y) in room units; outline draws only its edge pixels (a hidden blob).
// colour: a hex for the colour-keyed pieces (doors, switches, buttons).
// exact: draw this very sprite, not the skin its object wears (the Looks page's previews).
export function drawSprite(g, name, x, y, { outline = false, colour = null, exact = false } = {}) {
  if (outline) {
    const grid = BUILD[exact ? name : skinned(name)]();
    g.fillStyle = INK.player;
    grid.forEach((row, yy) => row.forEach((c, xx) => {
      if (!c) return;
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !(grid[yy + dy] || [])[xx + dx]);
      if (edge && (xx + yy) % 2 === 0) g.fillRect(x + xx * PX, y + yy * PX, PX, PX);
    }));
    return;
  }
  // Every run is rounded to whole pixels of whatever it is drawn on, so a sprite stays crisp at any position
  // or scale and its runs meet with no seams (registers 607, 621).
  const m = g.getTransform ? g.getTransform() : null;
  if (m && !m.b && !m.c) {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const X = u => Math.round(m.a * u + m.e), Y = u => Math.round(m.d * u + m.f);
    for (const [rx, ry, n, c] of exact || !boilOn() ? runsOf(name, colour, exact) : boiled((exact ? '' : skinned(name)) + ':' + colour, runsOf(name, colour, exact))) { const x0 = X(x + rx * PX), y0 = Y(y + ry * PX); g.fillStyle = c; g.fillRect(x0, y0, X(x + (rx + n) * PX) - x0, Y(y + (ry + 1) * PX) - y0); }
    g.restore(); return;
  }
  for (const [rx, ry, n, c, r, d] of runsOf(name, colour, exact)) { g.fillStyle = c; g.fillRect(x + rx * PX, y + ry * PX, n * PX + (r ? 0.5 : 0), PX + (d ? 0.5 : 0)); }
}
