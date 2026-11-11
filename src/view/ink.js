// The palette, the tile size and the small drawing helpers every view file shares.
import { TICK_MS } from '../rules/base.js';

export const AIM = { up: -Math.PI / 2, right: 0, down: Math.PI / 2, left: Math.PI };

export const T = 32;

// Fog (docs/MANGA_THEME.md): a neutral gray room, and every thing in it its own saturated pastel.
export const INK = {
  puff: '#78dce8',
  goo: '#a9dc76', gooDark: '#5a9a2b', idoor: '#403e41', goal: '#ffd866',
  water: '#78dce8', waterHi: '#e8eef6', shock: '#ffd866',
  armor: '#e8eef6',
  floor: '#2d2a2e', grid: '#19181a', wall: '#5b595c', wallTop: '#727072', crack: '#403e41',
  player: '#ab9df2', start: '#ab9df2', robotDark: '#4b3fd6', robotTip: '#ff6188', robotVisor: '#19181a', robotEye: '#78dce8', shadow: 'rgba(0,0,0,0.35)',
  mover: '#78dce8', moverEdge: '#e8eef6', enemy: '#ff6188', strong: '#ff6188', strongEdge: '#e8eef6', beam: '#ff6188', zap: '#fc9867', zapCore: '#e8eef6', barrel: '#ab9df2', box: '#939293', boxEdge: '#403e41',
  heavy: '#ab9df2', heavyEdge: '#4b3fd6', bomb: '#403e41', bombHi: '#939293', fuse: '#b08a5c', spark: '#fc9867', blast: '#fc9867', rivet: '#e8eef6', flag: '#ffd866', laser: '#ff6188',
  red: '#ff6188', blue: '#78dce8', yellow: '#ffd866', green: '#a9dc76',
  // Grey pieces read wires (register 347); the wires' own three colours are none of the doors'.
  wire: '#939293', teal: '#3f9aa6', violet: '#4b3fd6', charcoal: '#403e41',
  mark: '#939293', deathBg: '#8f2a45', deathSpike: '#e8eef6', gateBg: '#403e41', gateArrow: '#a9dc76', unlit: '#5b595c', spring: '#ffd866', gravel: '#b08a5c', gravelDot: '#5b595c', gravelHi: '#e8eef6',
};

export const ease = t => 1 - Math.pow(1 - t, 3);
export const lerp = (a, b, t) => a + (b - a) * t;
// The time the current frame is drawn at, for tiles that move on their own.
// avatar: who plays, the robot (campaign) or you, a circle (register 302).
// face: the way the blob last went; dead: how it died, while it lies there; stains: the room's marks.
export const frame = { clock: 0, avatar: 'robot', face: 'right', dead: null, stains: [], live: false };


export const LASER_MS = 5 * TICK_MS;
export const PUFF_MS = 380;
// [along the old way, to the side, radius] for each little cloud of a puff.
export const PUFFS = [[0.9, 0, 8], [0.6, 0.6, 6.5], [0.6, -0.6, 6.5], [0.1, 0.9, 5], [0.1, -0.9, 5], [1.3, 0.35, 4.5], [1.3, -0.35, 4.5]];

// Pixel shapes (register 621): discs, rings and ellipses filled as whole 2-unit cells, each rounded to
// the whole pixels of whatever it is drawn on, so nothing round is drawn smooth.
const CELL = 2;
export function cells(g, list) {
  const m = g.getTransform ? g.getTransform() : null;
  if (!m || m.b || m.c) { for (const [x, y, w, h] of list) g.fillRect(x, y, w, h); return; }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const X = u => Math.round(m.a * u + m.e), Y = u => Math.round(m.d * u + m.f);
  for (const [x, y, w, h] of list) { const x0 = X(x), y0 = Y(y); g.fillRect(x0, y0, Math.max(1, X(x + w) - x0), Math.max(1, Y(y + h) - y0)); }
  g.restore();
}
// Cells whose centres fall inside an ellipse at (cx, cy) with radii rx, ry, less those inside the inner one.
function ellipseCells(cx, cy, rx, ry, inner = 0) {
  const out = [], n = Math.ceil(Math.max(rx, ry) / CELL) + 1, x0 = Math.round(cx / CELL) * CELL, y0 = Math.round(cy / CELL) * CELL;
  for (let j = -n; j <= n; j++) {
    let run = null;
    for (let i = -n; i <= n + 1; i++) {
      const x = x0 + i * CELL + CELL / 2 - cx, y = y0 + j * CELL + CELL / 2 - cy, d = (x / rx) ** 2 + (y / ry) ** 2;
      const hit = i <= n && d <= 1 && !(inner && (x / (rx - inner)) ** 2 + (y / (ry - inner)) ** 2 < 1);
      if (hit && run === null) run = i;
      if (!hit && run !== null) { out.push([x0 + run * CELL, y0 + j * CELL, (i - run) * CELL, CELL]); run = null; }
    }
  }
  return out;
}
export const pxDisc = (g, cx, cy, r) => cells(g, ellipseCells(cx, cy, Math.max(r, CELL / 2), Math.max(r, CELL / 2)));
export const pxEllipse = (g, cx, cy, rx, ry) => cells(g, ellipseCells(cx, cy, Math.max(rx, CELL / 2), Math.max(ry, CELL / 2)));
// A ring of the given width, in the stroke colour.
export function pxRing(g, cx, cy, r, w = CELL) { const f = g.fillStyle; g.fillStyle = g.strokeStyle; cells(g, ellipseCells(cx, cy, r + w / 2, r + w / 2, w)); g.fillStyle = f; }
// A square frame of the given width, in the stroke colour.
export function pxFrame(g, x, y, w, h, t = CELL) { const f = g.fillStyle; g.fillStyle = g.strokeStyle; cells(g, [[x, y, w, t], [x, y + h - t, w, t], [x, y + t, t, h - 2 * t], [x + w - t, y + t, t, h - 2 * t]]); g.fillStyle = f; }
// A filled right triangle with its square corner at the named corner, as stairs of whole cells.
export function pxTri(g, x, y, s, corner) {
  const out = [], n = Math.round(s / CELL);
  for (let j = 0; j < n; j++) {
    const k = corner === 'nw' || corner === 'ne' ? n - j : j + 1, left = corner === 'nw' || corner === 'sw';
    out.push([left ? x : x + s - k * CELL, y + j * CELL, k * CELL, CELL]);
  }
  cells(g, out);
}
// A rectangle's outline as whole cells (register 621), for what used to be strokeRect(x, y, w, h): the cell
// ring that holds the stroke's outer half, in the stroke colour; dash: cells on, then off, around it.
export function pxStroke(g, x, y, w, h, dash = 0) {
  const x0 = Math.floor((x - 1) / CELL) * CELL, y0 = Math.floor((y - 1) / CELL) * CELL, x1 = Math.ceil((x + w + 1) / CELL) * CELL, y1 = Math.ceil((y + h + 1) / CELL) * CELL;
  if (!dash) return pxFrame(g, x0, y0, x1 - x0, y1 - y0);
  const f = g.fillStyle, list = []; g.fillStyle = g.strokeStyle;
  const keep = i => Math.floor(i / dash) % 2 === 0;
  let i = 0;
  for (let u = x0; u < x1; u += CELL) { if (keep(i++)) list.push([u, y0, CELL, CELL], [u, y1 - CELL, CELL, CELL]); }
  i = 0;
  for (let v = y0 + CELL; v < y1 - CELL; v += CELL) { if (keep(i++)) list.push([x0, v, CELL, CELL], [x1 - CELL, v, CELL, CELL]); }
  cells(g, list); g.fillStyle = f;
}
