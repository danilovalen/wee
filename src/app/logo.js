// The title (docs/THEME.md rule 34, register 876): "wee" drawn as three crayon letters on the pieces' own
// grid and inked by the same pass, so it has their line, their lit edge and their lumps. It is alive on
// the menu: two drawings in turn, slower than a piece.
import { sheet, ink, wobble, lt, dk } from '../view/crayon.js';
import { P } from '../view/crayonSprites.js';
import { boilOn } from '../view/sprites.js';

export const LOGO_W = 96, LOGO_H = 36, LOGO_SCALE = 2;
// The title moves less than a piece (register 887): two drawings, changing twice a second.
const LOGO_MS = 500;
// The letters, fat strokes with soft ends. The e is a lump with its eye cut out and its mouth left open.
export function logoSheet() {
  const s = sheet(LOGO_W, LOGO_H), c = P.violet;
  const dot = (x, y) => s.oval(x, y, 4.2, 4.2, c);
  const stroke = (x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) dot(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); };
  stroke(6, 10, 10, 26); stroke(10, 26, 17, 14); stroke(17, 14, 24, 26); stroke(24, 26, 28, 10);
  for (const cx of [48, 78]) {
    s.oval(cx, 18.5, 12.5, 12.5, c, 0.04);
    // The eye of the e, and the mouth: a slot from its middle out to the right, under the bar.
    for (let y = 0; y < LOGO_H; y++) for (let x = 0; x < LOGO_W; x++) if (((x + 0.5 - cx) / 5.5) ** 2 + ((y + 0.5 - 13.5) / 3.2) ** 2 <= 1 || (y >= 20 && y <= 23 && x >= cx - 1 && x <= cx + 13)) s.g[y][x] = null;
  }
  // Lit from the top left: a cell with nothing above it is lighter, one with nothing below it darker.
  const g = s.g, top = [], foot = [];
  for (let y = 0; y < LOGO_H; y++) for (let x = 0; x < LOGO_W; x++) if (g[y][x]) { if (!(g[y - 1] || [])[x]) top.push([x, y]); else if (!(g[y + 1] || [])[x] || !(g[y + 2] || [])[x]) foot.push([x, y]); }
  for (const [x, y] of top) g[y][x] = lt(c, 0.5);
  for (const [x, y] of foot) g[y][x] = dk(c, 0.22);
  return s.g;
}
// Draws the title into a canvas inside el and keeps it alive while it shows.
export function buildLogo(el) {
  const cv = document.createElement('canvas'), pad = 2;
  cv.width = LOGO_W + 2 * pad; cv.height = LOGO_H + 2 * pad; cv.className = 'logoArt';
  cv.style.width = `${cv.width * LOGO_SCALE}px`; cv.style.height = `${cv.height * LOGO_SCALE}px`;
  const g = cv.getContext('2d'), base = logoSheet();
  let shown = -1;
  const draw = f => {
    if (f === shown) return;
    shown = f; g.clearRect(0, 0, cv.width, cv.height);
    for (const [x, y, n, col] of ink(wobble(base, 'logo', f))) { g.fillStyle = col; g.fillRect(x + pad, y + pad, n, 1); }
  };
  el.textContent = ''; el.setAttribute('aria-label', 'wee'); el.append(cv);
  draw(0);
  const tick = () => { requestAnimationFrame(tick); if (el.offsetParent !== null) draw(boilOn() ? Math.floor(performance.now() / LOGO_MS) % 2 : 0); };
  requestAnimationFrame(tick);
  // A new palette repaints it.
  addEventListener('wee:look', () => { shown = -1; });
  return cv;
}
