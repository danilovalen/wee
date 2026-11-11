// What a harsh moment looks like (docs/THEME.md rule 20, register 842): the blob as each death leaves it, and
// the marks a room keeps until the player leaves the level. Drawn on the same 32 grid as every piece.
import { sheet, dk, lt, EYE, WHITE } from './crayon.js';
import { P } from './crayonSprites.js';

const drops = (s, c, list) => { for (const [x, y, r] of list) s.oval(x, y, r, r * 0.85, c, 0.1); return s; };
// A shut eye as a cross: out cold.
const cross = (s, x, y) => s.line(x, y, x + 3, y + 3, EYE).line(x + 3, y, x, y + 3, EYE);

export const CRAYON_MOMENTS = {
  // The blob, dead, as what killed it left it. key: "how|dir|hex" (how: spring, crush, spikes, laser, blast, hit).
  blobDead(key) {
    const [how, dir, hex] = String(key).split('|'), c = hex || P.violet;
    if (how === 'spring') {
      // Flat against whatever stood behind it: a tall smear on the far side, one eye still looking.
      const s = sheet().oval(25, 16, 6, 14.5, c, 0.14).lit(25, 16, 6.5, 15, c);
      drops(s, c, [[17, 5, 2.4], [15, 26, 2.8], [12, 15, 1.8], [19, 20, 1.6]]);
      s.eye(23, 5, 0); cross(s, 23, 17); s.rect(23, 24, 27, 24, EYE);
      return s.turned(dir || 'right');
    }
    if (how === 'crush') { const s = sheet().oval(16, 17, 14.5, 8, c, 0.1).lit(16, 17, 15, 8.5, c); drops(s, c, [[3, 9, 1.8], [28, 26, 2], [6, 27, 1.6]]); cross(s, 8, 13); cross(s, 20, 13); s.line(12, 21, 14, 20, EYE).line(14, 20, 17, 21, EYE).line(17, 21, 20, 20, EYE); return s; }
    if (how === 'spikes') {
      // Popped: the skin lies in scraps round a burst, its eyes on the largest.
      const s = sheet().oval(15, 19, 9, 5.5, c, 0.2).lit(15, 19, 9.5, 6, c);
      drops(s, c, [[25, 9, 3], [5, 8, 2.4], [27, 24, 2.2], [20, 5, 1.6]]);
      for (const [x, y] of [[12, 12], [20, 13], [16, 9]]) s.rect(x, y, x + 1, y + 1, P.hi);
      s.eye(10, 15, 0, true).eye(17, 15, 0, true);
      return s;
    }
    if (how === 'laser' || how === 'blast') {
      // Burnt: a soot shape of itself, eyes wide.
      const k = P.deep, s = sheet().oval(16, 16.5, 11.5, 11, k, 0.12).lit(16, 16.5, 12, 11.5, k, 0.3);
      s.rect(10, 12, 13, 18, WHITE).rect(18, 12, 21, 18, WHITE).rect(11, 14, 12, 16, EYE).rect(19, 14, 20, 16, EYE).rect(14, 21, 17, 22, EYE);
      if (how === 'blast') drops(s, P.top, [[24, 5, 3], [27, 9, 2], [6, 6, 2.2]]); else for (const x of [9, 15, 21]) s.rect(x, 3, x + 1, 5, P.top);
      return s;
    }
    const s = sheet().oval(16, 16.5, 11.5, 11, c, 0.07).lit(16, 16.5, 12, 11.5, c); cross(s, 10, 13); cross(s, 18, 13); s.rect(13, 21, 18, 21, EYE);
    return s;
  },
  // A mark the room keeps. key: "kind|hex|dir" (kind: splat, puddle, scraps, soot, scorch, juice, rubble, flat).
  stain(key) {
    const [kind, hex, dir] = String(key).split('|'), c = hex || P.violet, s = sheet();
    if (kind === 'splat') return drops(s.oval(27, 16, 4.5, 13, c, 0.2), c, [[18, 6, 2.2], [16, 25, 2.6], [12, 14, 1.6], [21, 19, 1.4]]).turned(dir || 'right');
    if (kind === 'puddle') return drops(s.oval(16, 18, 12, 6.5, c, 0.16), c, [[4, 10, 1.6], [27, 26, 1.8]]).oval(13, 16, 3, 1.4, lt(c, 0.4), 0, true);
    if (kind === 'scraps') return drops(s, c, [[9, 20, 3.4], [22, 11, 2.8], [24, 23, 2.4], [7, 8, 2], [16, 15, 1.6]]);
    if (kind === 'soot') return drops(s.oval(16, 17, 10, 9, dk(P.deep, 0.2), 0.2), dk(P.deep, 0.2), [[5, 7, 2], [26, 25, 2.4], [27, 8, 1.6]]);
    if (kind === 'scorch') { s.oval(16, 16, 15, 15, dk(P.deep, 0.1), 0.08).oval(16, 16, 10, 10, dk(P.deep, 0.45), 0.12); for (const [x, y] of [[2, 4], [28, 3], [3, 27], [29, 28]]) s.rect(x, y, x + 1, y + 1, dk(P.deep, 0.3)); return s; }
    if (kind === 'juice') return drops(s, c, [[12, 20, 2.4], [20, 23, 1.8], [17, 16, 1.4], [8, 25, 1.2]]);
    if (kind === 'rubble') { for (const [x, y, w, h] of [[5, 20, 6, 4], [16, 23, 5, 3], [22, 16, 4, 4], [10, 12, 3, 3], [25, 25, 3, 2]]) s.rect(x, y, x + w, y + h, P.wall).rect(x, y, x + w, y, lt(P.wall, 0.35)).rect(x, y + h, x + w, y + h, dk(P.wall, 0.3)); return s; }
    // A crushed box: its boards flat on the floor.
    const w = lt(P.wood, 0.25); s.rect(2, 12, 29, 21, w); for (const x of [8, 15, 22]) s.rect(x, 12, x, 21, dk(P.wood, 0.3)); s.rect(2, 12, 29, 12, lt(P.wood, 0.55)).rect(2, 21, 29, 21, dk(P.wood, 0.25));
    return s.rect(5, 16, 6, 17, dk(P.wood, 0.5)).rect(26, 16, 27, 17, dk(P.wood, 0.5));
  },
};
