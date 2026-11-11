// The alternate skins (registers 612, 613, 777, 829) redrawn for the crayon look, on the same 32 grid and
// from above, like the pieces they stand in for (crayonSprites.js). Names and keys are the old ones.
import { sheet, dk, lt, WHITE, EYE } from './crayon.js';
import { P, wallSheet } from './crayonSprites.js';

const stamp = (s, top) => { top.g.forEach((row, y) => row.forEach((c, x) => { if (c) s.put(x, y, c); })); return s; };
// A boxing glove facing right, its cuff at column x.
function glove(s, x) {
  s.rect(x, 9, x + 3, 22, P.hi).rect(x, 21, x + 3, 22, P.top);
  s.oval(x + 9, 16, 6.5, 8.5, P.red, 0.05).oval(x + 6, 21, 3.5, 3.5, P.red).lit(x + 9, 16, 7, 9, P.red);
  s.oval(x + 7, 11, 2.2, 1.4, lt(P.red, 0.6), 0, true);
  return s;
}
// A scissor arm from column x0 to x1: crossed bars, pinned where they meet.
function scissor(s, x0, x1) {
  for (let x = x0; x < x1; x += 8) { const b = Math.min(x + 8, x1); s.line(x, 10, b, 20, P.top, 2).line(x, 20, b, 10, P.mid, 2); s.rect(x + 3, 14, x + 4, 16, EYE); }
  return s;
}

export const CRAYON_SKINS = {
  // Berry: a pair of cherries on one stalk.
  berryAlt() { const s = sheet(); s.line(16, 4, 9, 15, P.wood, 2).line(16, 4, 23, 16, P.wood, 2).oval(20, 5, 4.5, 2.6, P.green, 0.1); for (const [x, y] of [[9, 21], [23, 22]]) { s.oval(x, y, 6.5, 6.5, P.blue, 0.05).lit(x, y, 7, 7, P.blue); s.oval(x - 2, y - 3, 1.8, 1.2, lt(P.blue, 0.65), 0, true); } return s; },
  // Block: lab tiles, a slab split into four with grout between them and a shine on each.
  wallFaceAlt() { const s = sheet().slab(0, 0, 31, 31, P.wall, 2).rect(2, 15, 29, 16, dk(P.wall, 0.3)).rect(15, 2, 16, 29, dk(P.wall, 0.3)); for (const [x, y] of [[4, 4], [19, 4], [4, 19], [19, 19]]) s.rect(x, y, x + 3, y + 1, lt(P.wall, 0.5)); return s; },
  // Box: a steel crate from above, a plate on each corner and a warning stripe across it.
  boxAlt() { const s = sheet().slab(1, 1, 30, 30, P.top, 2); for (let x = 3; x <= 28; x++) for (let y = 13; y <= 18; y++) s.put(x, y, Math.floor((x + y) / 4) % 2 ? P.yellow : EYE); for (const [x, y] of [[3, 3], [22, 3], [3, 22], [22, 22]]) { s.rect(x, y, x + 6, y + 6, P.mid).rect(x, y, x + 6, y, lt(P.mid, 0.4)); s.put(x + 3, y + 3, dk(P.mid, 0.5)); } return s; },
  // Door: a shutter of slats running across; open, its two rails only.
  doorShutAlt(col) { const s = sheet().slab(0, 0, 31, 31, dk(col, 0.3), 2); for (let y = 3; y <= 26; y += 4) s.rect(3, y, 28, y + 1, lt(col, 0.35)).rect(3, y + 2, 28, y + 2, col).rect(3, y + 3, 28, y + 3, dk(col, 0.35)); return s.rect(14, 13, 17, 18, P.hi).rect(15, 15, 16, 16, dk(col, 0.5)); },
  doorOpenAlt(col) { return sheet().rect(0, 0, 3, 31, col).rect(28, 0, 31, 31, col).rect(0, 0, 0, 31, lt(col, 0.4)).rect(31, 0, 31, 31, dk(col, 0.3)); },
  // Switch: a lever on a round plate, leaning left while off and right, its knob lit, while on.
  switchOffAlt(col) { const s = sheet().oval(16, 16, 11, 11, dk(col, 0.4)).lit(16, 16, 11.5, 11.5, dk(col, 0.4)).oval(16, 16, 3, 3, P.mid); s.line(16, 15, 8, 9, P.hi, 3).oval(8, 9, 3.5, 3.5, P.top); return s; },
  switchOnAlt(col) { const s = sheet().oval(16, 16, 11, 11, col).lit(16, 16, 11.5, 11.5, col).oval(16, 16, 3, 3, P.mid); s.line(15, 15, 23, 9, P.hi, 3).oval(24, 9, 3.5, 3.5, WHITE).oval(24, 9, 2, 2, lt(col, 0.6)); return s; },
  // Button: a square pad with a bevel, flush with the floor and darker while pressed.
  buttonUpAlt(col) { return sheet().slab(4, 4, 27, 27, P.top, 2).slab(8, 8, 23, 23, col, 2).rect(11, 11, 14, 12, lt(col, 0.65)); },
  buttonDownAlt(col) { return sheet().slab(4, 4, 27, 27, P.top, 2).rect(8, 8, 23, 23, dk(col, 0.3)).rect(8, 8, 23, 9, dk(col, 0.55)).rect(8, 8, 9, 23, dk(col, 0.45)); },
  // Laser: a round lens on a short arm, the one to fire next lit orange. key: "right,down|right".
  laserAlt(key) {
    const [dirs, next] = key.split('|'), s = sheet();
    for (const d of dirs.split(',')) { const lit = d === next, c = lit ? P.orange : P.mid, b = sheet().rect(14, 13, 24, 18, dk(c, 0.3)).rect(14, 13, 24, 13, lt(c, 0.3)).oval(26, 15.5, 5, 5, dk(c, 0.45)).oval(26, 15.5, 3.4, 3.4, lit ? P.hi : P.top); b.put(25, 14, WHITE); stamp(s, b.turned(d)); }
    return s;
  },
  // Spring: a boxing glove in the block's pocket; out, it punches across the tile in front on a scissor arm.
  // key: "right", "right|bare", "right||out". Drawn facing right, then turned.
  springAlt(key) {
    const [d, bare, out] = key.split('|'), c = sheet().rect(16, 5, 31, 26, dk(P.wall, 0.45)).rect(16, 5, 31, 6, dk(P.wall, 0.6));
    if (out === 'out') scissor(c, 16, 32); else glove(c, 17);
    return stamp(bare === 'bare' ? sheet() : wallSheet(), c.turned(d));
  },
  springArmAlt(d) { return glove(scissor(sheet(), 0, 15), 15).turned(d); },
};
