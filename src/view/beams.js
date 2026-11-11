// A laser's beam in the crayon look (docs/THEME.md, register 862): a flat band with a pale core and the same
// dark-tinted line as every piece, drawn in whole pixels with no glow. It stops at the line of whatever it
// hits, so it never runs onto a wall.
import { INK, T } from './ink.js';
import { DIRS } from '../rules/base.js';
import { lineOf } from './crayon.js';
import { P } from './crayonSprites.js';

const LINE = 4, BODY = 2, STOP = 2;
// One straight stretch from (x0, y0) to (x1, y1), half wide; cap: how far it runs past each end.
function bar(g, x0, y0, x1, y1, half, cap0, cap1) {
  if (y0 === y1) { const [a, b, ca, cb] = x0 <= x1 ? [x0, x1, cap0, cap1] : [x1, x0, cap1, cap0]; g.fillRect(a - ca, y0 - half, b - a + ca + cb, half * 2); }
  else { const [a, b, ca, cb] = y0 <= y1 ? [y0, y1, cap0, cap1] : [y1, y0, cap1, cap0]; g.fillRect(x0 - half, a - ca, half * 2, b - a + ca + cb); }
}
export function drawBeams(g, beams, now) {
  for (const b of beams) {
    const pts = b.path.map(([x, y]) => [x * T + T / 2, y * T + T / 2]);
    const layer = (half, colour) => {
      g.fillStyle = colour;
      for (let i = 1; i < pts.length; i++) bar(g, ...pts[i - 1], ...pts[i], half, half, half);
      // The last stretch reaches what stopped it and ends flat against its line.
      if (b.wall || b.stop) { const [x, y] = pts[pts.length - 1], [dx, dy] = DIRS[b.end], r = T / 2 - STOP; bar(g, x, y, x + dx * r, y + dy * r, half, half, 0); }
    };
    layer(LINE, lineOf(P.orange)); layer(BODY, INK.zap);
    // The core comes and goes, the only thing about a beam that moves.
    if (Math.floor(now / 180) % 3) layer(1, INK.zapCore);
  }
}
