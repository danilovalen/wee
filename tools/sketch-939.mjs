// Draws the sketches for registers 947 (stars), 950 (logo) and 951 (switches) with the game's own crayon
// pipeline, into docs/sketches/. Run: node tools/sketch-939.mjs
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';

const server = await serve(5291);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.goto('http://localhost:5291/index.html'); await page.waitForTimeout(800);
const SETUP = async () => {
  const { sheet, ink, lt, dk, resolve } = await import('/src/view/crayon.js');
  const { P } = await import('/src/view/crayonSprites.js');
  document.body.innerHTML = '<div id="sketch" style="display:inline-block;padding:16px;background:#f3ead8;font:12px monospace;color:#5a4a3a"></div>';
  const root = document.getElementById('sketch');
  const paint = (g, scale, pad = 3) => { const cv = document.createElement('canvas'), w = g[0].length + 2 * pad, h = g.length + 2 * pad; cv.width = w; cv.height = h; cv.style.width = `${w * scale}px`; cv.style.height = `${h * scale}px`; cv.style.imageRendering = 'pixelated'; const c = cv.getContext('2d'); for (const [x, y, n, col] of ink(g)) { c.fillStyle = col; c.fillRect(x + pad, y + pad, n, 1); } return cv; };
  const row = (label, items) => { const r = document.createElement('div'); r.style.cssText = 'display:flex;align-items:center;gap:18px;margin:8px 0'; const l = document.createElement('div'); l.style.width = '150px'; l.textContent = label; r.append(l, ...items); root.append(r); };
  const cell = (node, caption) => { const d = document.createElement('div'); d.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;position:relative'; d.append(node); if (caption) { const t = document.createElement('div'); t.textContent = caption; d.append(t); } return d; };
  window.SK = { sheet, ink, lt, dk, resolve, P, paint, row, cell, root };
};
const shot = async (name, fn) => {
  await page.evaluate(SETUP);
  await page.evaluate(fn);
  await page.waitForTimeout(200);
  await page.locator('#sketch').screenshot({ path: `docs/sketches/${name}.png` });
};

// 947: three star shapes, filled and empty, at 32 and 48 px, with a number inside.
await shot('stars-947', async () => {

  const { sheet, lt, dk, P, paint, row, cell } = window.SK;
  const gold = P.yellow, rim = dk(P.yellow, 0.35), empty = P.top;
  const starPoly = (cx, cy, R, r) => Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r : R; return [cx + k * Math.cos(a), cy + k * Math.sin(a)]; });
  const inPoly = (pts, x, y) => { let inside = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if (((yi > y) !== (yj > y)) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; } return inside; };
  const shapes = {
    'A. Puffy': (x, y) => { const pts = starPoly(16, 17, 13, 8.2); if (inPoly(pts, x, y)) return true; return pts.filter((_, i) => i % 2 === 0).some(([px, py]) => (x - (px * 0.82 + 16 * 0.18)) ** 2 + (y - (py * 0.82 + 17 * 0.18)) ** 2 <= 3.4 ** 2); },
    'B. Cookie': (x, y) => inPoly(starPoly(16, 17, 14, 10), x, y) || (x - 16) ** 2 + (y - 17) ** 2 <= 9.5 ** 2,
    'C. Cloud': (x, y) => (x - 16) ** 2 + (y - 17) ** 2 <= 8 ** 2 || Array.from({ length: 5 }, (_, i) => -Math.PI / 2 + i * 2 * Math.PI / 5).some(a => (x - (16 + 8.5 * Math.cos(a))) ** 2 + (y - (17 + 8.5 * Math.sin(a))) ** 2 <= 5.2 ** 2),
  };
  const draw = (f, on) => { const s = sheet(32, 32); for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (f(x + 0.5, y + 0.5)) s.put(x, y, on ? gold : empty); if (on) { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (s.g[y][x] && !(s.g[y - 1] || [])[x]) s.g[y][x] = lt(gold, 0.5); } return s.g; };
  const withNum = (cv, n, px, on) => { const w = document.createElement('div'); w.style.cssText = 'position:relative;display:inline-block'; const t = document.createElement('b'); t.textContent = n; t.style.cssText = `position:absolute;left:0;right:0;top:${px * 0.53}px;transform:translateY(-50%);text-align:center;font:800 ${Math.round(px * 0.3)}px monospace;color:${on ? '#4a3200' : '#8a7a66'}`; w.append(cv, t); return w; };
  const today = document.createElement('div'); today.innerHTML = document.querySelector('.campBigStar') ? '' : '';
  for (const [name, f] of Object.entries(shapes)) {
    const items = [];
    for (const px of [32, 48]) for (const on of [true, false]) items.push(cell(withNum(paint(draw(f, on), px / 38), '12', px, on), `${px}px ${on ? 'filled' : 'empty'}`));
    row(name, items);
  }
});

// 950: the logo as it is, and three lighter treatments of its edge.
await shot('logo-950', async () => {

  const { lt, dk, P, paint, row, cell, ink } = window.SK;
  const { logoSheet } = await import('/src/app/logo.js');
  const base = logoSheet(), c = P.violet, hi = lt(c, 0.5), lo = dk(c, 0.22);
  const flat = base.map(r => r.map(v => (v === hi || v === lo ? c : v)));
  const noFoot = base.map(r => r.map(v => (v === lo ? c : v)));
  const plain = (g, edge) => { const cv = document.createElement('canvas'), pad = 3, w = g[0].length + 2 * pad, h = g.length + 2 * pad; cv.width = w; cv.height = h; cv.style.width = `${w * 3}px`; cv.style.height = `${h * 3}px`; cv.style.imageRendering = 'pixelated'; const x2 = cv.getContext('2d'); for (const [x, y, n, col] of ink(g, { edge })) { x2.fillStyle = col; x2.fillRect(x + pad, y + pad, n, 1); } return cv; };
  row('Today', [cell(paint(base, 3), 'light top, dark foot, dark edge, line')]);
  row('A', [cell(plain(noFoot, undefined), 'no dark foot')]);
  row('B', [cell(plain(flat, undefined), 'no light top, no dark foot')]);
  row('C', [cell(plain(flat, 0), 'flat colour and the line only')]);
});

// 951: switches off and on, today and three ways to tell them apart.
await shot('switch-951', async () => {

  const { sheet, lt, dk, P, paint, row, cell } = window.SK;
  const { CRAYON } = await import('/src/view/crayonSprites.js').catch(() => ({}));
  const sprites = (await import('/src/view/crayonSprites.js'));
  const S = sprites.SPRITES || sprites.CRAYON || sprites.default || sprites;
  const col = P.red, WHITE = '!#ffffff';
  const pair = (off, on, label) => row(label, [cell(paint(off.g, 3), 'off'), cell(paint(on.g, 3), 'on')]);
  const findSprite = name => Object.values(sprites).find(v => v && typeof v === 'object' && typeof v[name] === 'function');
  const lib = findSprite('switchOn');
  pair(lib.switchOff(col), lib.switchOn(col), 'Today');
  // A: off is grey, on is the colour.
  const grey = P.top;
  const offA = sheet().slab(4, 9, 27, 22, dk(grey, 0.2), 2).rect(8, 13, 23, 18, dk(grey, 0.45)); offA.oval(10.5, 15.5, 4, 4, lt(grey, 0.4));
  pair(offA, lib.switchOn(col), 'A. Off is grey');
  // B: on glows: a lit ring round the plate.
  const onB = sheet().oval(16, 16, 15.5, 11.5, lt(col, 0.75)).slab(4, 9, 27, 22, col, 2).rect(8, 13, 23, 18, dk(col, 0.35)); onB.oval(21.5, 15.5, 4, 4, P.hi).oval(21, 15, 2, 1.6, WHITE);
  pair(lib.switchOff(col), onB, 'B. On glows');
  // C: a lamp in the plate, dark while off and lit while on, and the lever moves.
  const offC = sheet().slab(4, 9, 27, 22, dk(col, 0.35), 2).rect(8, 13, 23, 18, dk(col, 0.6)).oval(16, 6, 3, 3, dk(col, 0.7)); offC.oval(10.5, 15.5, 4, 4, lt(grey, 0.2));
  const onC = sheet().oval(16, 6, 4.5, 4.5, lt(P.yellow, 0.6)).slab(4, 9, 27, 22, col, 2).rect(8, 13, 23, 18, dk(col, 0.35)).oval(16, 6, 3, 3, P.yellow); onC.oval(21.5, 15.5, 4, 4, P.hi).oval(21, 15, 2, 1.6, WHITE);
  pair(offC, onC, 'C. A lamp that lights');
});

await browser.close(); server.close();
