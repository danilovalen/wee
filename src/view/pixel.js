// The pixel grid every sprite is built on (register 602): 16x16 art pixels, 2 units each, and the shapes
// the builders draw with.
export const N = 16;
export const PX = 2;
export const grid = () => Array.from({ length: N }, () => Array(N).fill(null));
export const inside = (x, y, cx, cy, rx, ry) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
export function ellipse(g, cx, cy, rx, ry, c) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (inside(x, y, cx, cy, rx, ry)) g[y][x] = c; }
export function box(g, x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = c; }
export function line(g, x0, y0, x1, y1, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / (n || 1)), y = Math.round(y0 + (y1 - y0) * i / (n || 1)); if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = c; }
}
export const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const mixHex = (a, b, t) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
export const steps = col => ({ c: col, d: mixHex(col, '#19181a', 0.45), l: mixHex(col, '#fcfcfa', 0.45) });
// A grid turned to face a direction, drawn facing right.
export const turn = (g, d) => {
  const out = grid(), f = { right: (x, y) => [x, y], down: (x, y) => [15 - y, x], left: (x, y) => [15 - x, 15 - y], up: (x, y) => [y, 15 - x] }[d];
  g.forEach((row, y) => row.forEach((c, x) => { if (c) { const [X, Y] = f(x, y); out[Y][X] = c; } }));
  return out;
};
// A square slab with stair-cut corners: face, a light top-left edge and a dark bottom-right one.
export function slab(g, x0, y0, x1, y1, face, light, dark) {
  box(g, x0, y0, x1, y1, face);
  if (light) { box(g, x0 + 1, y0, x1 - 1, y0, light); box(g, x0, y0 + 1, x0, y1 - 1, light); }
  if (dark) { box(g, x0 + 1, y1, x1 - 1, y1, dark); box(g, x1, y0 + 1, x1, y1 - 1, dark); }
  for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) g[y][x] = null;
}
export const W = { face: '#5b595c', light: '#939293', dark: '#403e41', crack: '#403e41' };
