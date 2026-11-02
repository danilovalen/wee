// The HUD's pixel icons (registers 599, 602): 16x16 bitmaps on the same 2-unit pixel as the room's
// sprites, one stroke weight (2 pixels), drawn as SVG rectangles in the button's ink. A star has an outline
// and an inside, so the card can draw it empty or filled.
const N = 16;
const grid = () => Array.from({ length: N }, () => Array(N).fill(0));
function box(g, x0, y0, x1, y1, v = 1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = v; }
function line(g, x0, y0, x1, y1, v = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / (n || 1)), y = Math.round(y0 + (y1 - y0) * i / (n || 1)); box(g, x, y, x, y, v); }
}
const thick = (g, x0, y0, x1, y1) => { line(g, x0, y0, x1, y1); line(g, x0 + 1, y0, x1 + 1, y1); };
function ring(g, cx, cy, r, w = 1.6) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d <= r && d > r - w) g[y][x] = 1; } }
const mirror = g => g.map(r => r.slice().reverse());

const ICON = {
  levels() { const g = grid(); for (const [x, y] of [[1, 1], [9, 1], [1, 9], [9, 9]]) { box(g, x, y, x + 5, y + 5); box(g, x + 2, y + 2, x + 3, y + 3, 0); } return g; },
  run() { const g = grid(); for (let y = 2; y <= 13; y++) { const w = Math.round((y <= 7.5 ? y - 2 : 13 - y) * 1.6); box(g, 4, y, 4 + w, y); } return g; },
  // A game pad's cross with an arrow cut into each arm, so it never reads as Move's thin arrows.
  test() {
    const g = grid(); box(g, 5, 0, 10, 15); box(g, 0, 5, 15, 10);
    box(g, 7, 2, 8, 2, 0); box(g, 6, 3, 9, 3, 0); box(g, 7, 13, 8, 13, 0); box(g, 6, 12, 9, 12, 0);
    box(g, 2, 7, 2, 8, 0); box(g, 3, 6, 3, 9, 0); box(g, 13, 7, 13, 8, 0); box(g, 12, 6, 12, 9, 0);
    return g;
  },
  edit() { const g = grid(); for (let i = 0; i < 9; i++) box(g, 4 + i, 10 - i, 5 + i, 11 - i); box(g, 2, 12, 4, 13); box(g, 12, 1, 14, 3); box(g, 13, 2, 13, 2, 0); return g; },
  undo() { const g = grid(); for (let i = 0; i < 4; i++) box(g, 2 + i, 5 - i, 2 + i, 6 + i); box(g, 3, 5, 10, 6); for (let y = 6; y <= 11; y++) box(g, y > 7 && y < 10 ? 12 : 11, y, y > 7 && y < 10 ? 13 : 12, y); box(g, 5, 12, 11, 13); return g; },
  redo() { return mirror(ICON.undo()); },
  reset() { const g = grid(); ring(g, 8, 8.5, 6.5, 2); box(g, 9, 0, 15, 5, 0); box(g, 10, 1, 14, 2); box(g, 13, 1, 14, 5); return g; },
  menu() { const g = grid(); box(g, 2, 3, 13, 4); box(g, 2, 7, 13, 8); box(g, 2, 11, 13, 12); return g; },
  next() { const g = grid(); box(g, 2, 7, 12, 8); for (let i = 0; i < 5; i++) { box(g, 9 + i, 3 + i, 10 + i, 3 + i); box(g, 9 + i, 12 - i, 10 + i, 12 - i); } return g; },
  skip() { const g = grid(); for (let y = 3; y <= 12; y++) { const w = Math.round((y <= 7.5 ? y - 3 : 12 - y) * 1.4); box(g, 3, y, 3 + w, y); } box(g, 11, 3, 12, 12); return g; },
  fit() { const g = grid(); for (const [x, y, sx, sy] of [[1, 1, 1, 1], [14, 1, -1, 1], [1, 14, 1, -1], [14, 14, -1, -1]]) { box(g, Math.min(x, x + 4 * sx), Math.min(y, y + sy), Math.max(x, x + 4 * sx), Math.max(y, y + sy)); box(g, Math.min(x, x + sx), Math.min(y, y + 4 * sy), Math.max(x, x + sx), Math.max(y, y + 4 * sy)); } return g; },
  check() { const g = grid(); thick(g, 2, 8, 6, 12); thick(g, 6, 12, 13, 3); line(g, 2, 9, 6, 13); line(g, 6, 13, 13, 4); return g; },
  cross() { const g = grid(); thick(g, 2, 2, 12, 12); thick(g, 12, 2, 2, 12); return g; },
  flag() { const g = grid(); box(g, 3, 1, 4, 15); box(g, 5, 2, 12, 3); box(g, 5, 4, 10, 7); box(g, 5, 8, 12, 9); box(g, 11, 4, 12, 4); box(g, 11, 7, 12, 7); return g; },
  path() { const g = grid(); box(g, 2, 3, 3, 13); box(g, 2, 3, 9, 4); box(g, 8, 3, 9, 10); box(g, 8, 9, 12, 10); for (let i = 0; i < 3; i++) { box(g, 11 + i, 7 + i, 11 + i, 12 - i); } box(g, 1, 12, 4, 15); return g; },
  lock() { const g = grid(); box(g, 2, 7, 13, 14); box(g, 4, 9, 11, 12, 0); box(g, 7, 9, 8, 11); box(g, 4, 2, 5, 6); box(g, 10, 2, 11, 6); box(g, 5, 1, 10, 2); return g; },
  unlock() { const g = grid(); box(g, 2, 7, 13, 14); box(g, 4, 9, 11, 12, 0); box(g, 7, 9, 8, 11); box(g, 4, 2, 5, 6); box(g, 5, 1, 10, 2); box(g, 10, 2, 11, 3); return g; },
  star() {
    // Drawn by hand: a five-point star that stays even at 16 pixels.
    const g = ["................", ".......##.......", ".......##.......", "......####......", "......####......", ".##############.", "..############..", "...##########...", "....########....", "....########....", "...####..####...", "...###....###...", "..###......###..", "..##........##..", "................", "................"].map(r => [...r].map(c => (c === '#' ? 2 : 0)));
    // Its edge pixels are the outline (1); the rest is the inside (2).
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !(g[y + dy] || [])[x + dx])) g[y][x] = 1;
    return g;
  },
  // Looks: a painter's palette with a thumb hole and three dabs.
  looks() {
    const g = grid(); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const d = Math.hypot((x + 0.5 - 8) / 7, (y + 0.5 - 8) / 6); if (d <= 1) g[y][x] = 1; }
    box(g, 9, 9, 11, 11, 0); box(g, 10, 12, 12, 13, 0);
    for (const [x, y] of [[4, 5], [8, 3], [4, 9]]) box(g, x, y, x + 1, y + 1, 0);
    return g;
  },
  look() { const g = grid(); ring(g, 6.5, 6.5, 5.5, 2); for (let i = 0; i < 5; i++) box(g, 10 + i, 10 + i, 11 + i, 11 + i); return g; },
  erase() { const g = grid(); thick(g, 2, 2, 12, 12); thick(g, 12, 2, 2, 12); return g; },
  move() { const g = grid(); box(g, 7, 1, 8, 14); box(g, 1, 7, 14, 8); for (let i = 1; i <= 3; i++) { box(g, 7 - i, 1 + i, 8 + i, 1 + i); box(g, 7 - i, 14 - i, 8 + i, 14 - i); box(g, 1 + i, 7 - i, 1 + i, 8 + i); box(g, 14 - i, 7 - i, 14 - i, 8 + i); } return g; },
};

// One path per value: the outline (1) in the ink, the inside (2) in the glyph's fill.
function paths(g) {
  const d = { 1: '', 2: '' };
  g.forEach((row, y) => { for (let x = 0; x < N;) { const v = row[x]; let n = 1; while (x + n < N && row[x + n] === v) n++; if (v) d[v] += `M${x} ${y}h${n}v1h-${n}z`; x += n; } });
  return d;
}
const cache = {};
export function pixelGlyph(key) {
  if (!ICON[key]) return null;
  if (!cache[key]) {
    const d = paths(ICON[key]());
    cache[key] = `<svg class="glyph px" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path class="o" d="${d[1]}"/>${d[2] ? `<path class="i" d="${d[2]}"/>` : ''}</svg>`;
  }
  return cache[key];
}
export const PIXEL_ICONS = Object.keys(ICON);

// A bitmap for canvas drawing (the tool row's icons), 1 where the ink goes.
export const pixelBitmap = key => (ICON[key] ? ICON[key]() : null);
