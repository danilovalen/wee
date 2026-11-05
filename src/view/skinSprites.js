// The alternate skins (register 613), one per object, bought with stars in Looks.
import { INK } from './ink.js';
import { grid, ellipse, box, line, turn, slab, steps, mixHex, W } from './pixel.js';

export const SKIN_SPRITES = {
  // Berry: a cyan cherry pair on one stalk.
  berryAlt() {
    const g = grid(); ellipse(g, 5, 11, 3.6, 3.6, '#3f9aa6'); ellipse(g, 11, 11.5, 3.6, 3.6, '#3f9aa6');
    ellipse(g, 4.8, 10.8, 2.8, 2.8, '#78dce8'); ellipse(g, 10.8, 11.3, 2.8, 2.8, '#78dce8'); g[10][4] = '#c9f4fa'; g[10][10] = '#c9f4fa';
    line(g, 5, 7, 8, 2, '#6f9e45'); line(g, 11, 8, 8, 2, '#6f9e45'); box(g, 8, 1, 10, 2, '#6f9e45');
    return g;
  },
  // Block: lab tiles, a slab split into four with grout lines.
  wallFaceAlt() {
    const g = grid(); slab(g, 0, 0, 15, 15, '#727072', '#939293', '#4d4b4e');
    box(g, 1, 7, 14, 8, '#5b595c'); box(g, 7, 1, 8, 14, '#5b595c'); g[2][2] = '#c1c0c0'; g[2][10] = '#c1c0c0'; g[10][2] = '#c1c0c0'; g[10][10] = '#c1c0c0';
    return g;
  },
  // Box: a steel crate with corner plates and a stripe.
  boxAlt() {
    const g = grid(); slab(g, 0, 0, 15, 15, '#857f6a', '#a59f85', '#5e5a4a');
    for (const [x, y] of [[1, 1], [12, 1], [1, 12], [12, 12]]) box(g, x, y, x + 2, y + 2, '#5e5a4a');
    box(g, 1, 6, 14, 9, '#ffd866'); for (let x = 1; x <= 14; x += 4) box(g, x, 6, x + 1, 9, '#221f22');
    return g;
  },
  // Door: a shutter of horizontal slats; open, its rails only.
  doorShutAlt(col) {
    const { c, d, l } = steps(col), g = grid();
    box(g, 0, 0, 15, 15, d); box(g, 1, 1, 14, 14, c);
    for (const y of [3, 6, 9, 12]) { box(g, 1, y, 14, y, d); box(g, 1, y - 1, 14, y - 1, l); }
    return g;
  },
  doorOpenAlt(col) {
    const { d } = steps(col), g = grid(); box(g, 0, 0, 15, 1, col); box(g, 0, 2, 15, 2, d); box(g, 0, 14, 1, 15, col); box(g, 14, 14, 15, 15, col);
    return g;
  },
  // Switch: a lever on a plate, leaning left while off and right while on.
  switchOffAlt(col) {
    const { c, d } = steps(col), g = grid(); box(g, 3, 11, 12, 13, d); box(g, 4, 11, 11, 11, c);
    line(g, 8, 10, 4, 4, c); box(g, 3, 3, 4, 4, '#fcfcfa');
    return g;
  },
  switchOnAlt(col) {
    const { c, d } = steps(col), g = grid(); box(g, 3, 11, 12, 13, d); box(g, 4, 11, 11, 11, c);
    line(g, 8, 10, 12, 4, c); box(g, 11, 3, 12, 4, '#fcfcfa'); box(g, 6, 12, 9, 12, '#fcfcfa');
    return g;
  },
  // Button: a square pad, flush with the floor while pressed.
  buttonUpAlt(col) {
    const { c, d, l } = steps(col), g = grid(); box(g, 2, 3, 13, 13, d); box(g, 3, 2, 12, 11, c); box(g, 3, 2, 12, 2, l);
    return g;
  },
  buttonDownAlt(col) {
    const { c, d } = steps(col), g = grid(); box(g, 2, 2, 13, 13, d); box(g, 4, 4, 11, 11, c);
    return g;
  },
  // Laser: a round lens on a short arm, the one to fire next lit orange. key: "right,down|right".
  laserAlt(key) {
    const [dirs, next] = key.split('|'), g = grid();
    const turn = { right: (x, y) => [x, y], down: (x, y) => [15 - y, x], left: (x, y) => [15 - x, 15 - y], up: (x, y) => [y, 15 - x] };
    ellipse(g, 8, 8, 3, 3, '#5b595c');
    for (const d of dirs.split(',')) {
      const lit = d === next, ring = lit ? '#c4643a' : '#403e41', lens = lit ? INK.zap : '#727072';
      const put = (x, y, c) => { const [X, Y] = turn[d](x, y); g[Y][X] = c; };
      for (let x = 10; x <= 12; x++) { put(x, 7, '#403e41'); put(x, 8, '#403e41'); }
      for (let y = 5; y <= 10; y++) { put(13, y, ring); put(15, y, ring); } put(14, 5, ring); put(14, 10, ring);
      for (let y = 6; y <= 9; y++) put(14, y, lens); put(14, 6, lit ? INK.zapCore : '#939293');
    }
    return g;
  },
};
