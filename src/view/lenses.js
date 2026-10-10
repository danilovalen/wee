// The editor's lenses, drawn over the room. A heat lens recolours tiles under the pieces; dots,
// lines and frames are marks on top. One lens per group, so nothing here paints over its own kind.
import { INK, T } from './ink.js';

const centre = (i, w) => [(i % w) * T + T / 2, Math.floor(i / w) * T + T / 2];

// heat: { distance: Map, hopeless: [] } or { tiles: Set, colour }.
export function drawHeat(g, w, heat) {
  if (!heat) return;
  const fill = (i, colour) => { g.fillStyle = colour; g.fillRect((i % w) * T, Math.floor(i / w) * T, T, T); };
  if (heat.distance) {
    const max = Math.max(1, ...heat.distance.values());
    // Near the goal is green, far is red; a tile no stop on can still win is grey.
    for (const [i, d] of heat.distance) fill(i, `hsla(${Math.round(120 * (1 - d / max))}, 75%, 45%, 0.5)`);
    for (const i of heat.hopeless) fill(i, 'rgba(120, 128, 145, 0.55)');
    return;
  }
  g.globalAlpha = 0.35;
  for (const i of heat.tiles) fill(i, heat.colour);
  g.globalAlpha = 1;
}

// marks: { dots: [tiles], small: [tiles], lines: [tiles in order], moves: [{ a, b, n }],
// frames: Set of tiles, crosses: Set of tiles }.
export function drawLensMarks(g, w, { dots, small, lines, moves, frames, crosses } = {}) {
  if (dots) {
    g.fillStyle = INK.player;
    for (const i of dots) { const [x, y] = centre(i, w); g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); }
  }
  if (small) {
    g.fillStyle = INK.player; g.globalAlpha = 0.6;
    for (const i of small) { const [x, y] = centre(i, w); g.beginPath(); g.arc(x, y, 1.8, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
  }
  if (moves && moves.length) {
    // One arrow per move between two stops, wider the more positions make it.
    const max = Math.max(...moves.map(m => m.n));
    g.strokeStyle = INK.player; g.fillStyle = INK.player; g.globalAlpha = 0.55; g.lineCap = 'round';
    for (const { a, b, n } of moves) {
      const [ax, ay] = centre(a, w), [bx, by] = centre(b, w), t = Math.atan2(by - ay, bx - ax);
      // Each direction sits a little to its own side, so a move and its way back do not overlap.
      const ox = -Math.sin(t) * 2.5, oy = Math.cos(t) * 2.5, ex = bx + ox - Math.cos(t) * 6, ey = by + oy - Math.sin(t) * 6;
      g.lineWidth = 1 + 3 * n / max;
      g.beginPath(); g.moveTo(ax + ox, ay + oy); g.lineTo(ex, ey); g.stroke();
      g.beginPath(); g.moveTo(ex + Math.cos(t) * 4, ey + Math.sin(t) * 4); g.lineTo(ex - Math.cos(t - 0.6) * 4, ey - Math.sin(t - 0.6) * 4); g.lineTo(ex - Math.cos(t + 0.6) * 4, ey - Math.sin(t + 0.6) * 4); g.closePath(); g.fill();
    }
    g.globalAlpha = 1;
  }
  if (lines && lines.length > 1) {
    g.strokeStyle = INK.goal; g.fillStyle = INK.goal; g.lineWidth = 2.5; g.lineCap = 'round';
    for (let n = 1; n < lines.length; n++) {
      const [ax, ay] = centre(lines[n - 1], w), [bx, by] = centre(lines[n], w), a = Math.atan2(by - ay, bx - ax);
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx - Math.cos(a) * 7, by - Math.sin(a) * 7); g.stroke();
      g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - Math.cos(a - 0.5) * 9, by - Math.sin(a - 0.5) * 9); g.lineTo(bx - Math.cos(a + 0.5) * 9, by - Math.sin(a + 0.5) * 9); g.closePath(); g.fill();
      // Each move's number sits at the middle of its arrow.
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      g.fillStyle = '#10131b'; g.beginPath(); g.arc(mx, my, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = INK.goal; g.font = 'bold 8px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(n), mx, my + 0.5);
    }
  }
  if (crosses) {
    g.strokeStyle = '#ff9f43'; g.lineWidth = 2.5; g.lineCap = 'round';
    for (const i of crosses) {
      const x = (i % w) * T, y = Math.floor(i / w) * T;
      g.strokeRect(x + 2, y + 2, T - 4, T - 4);
      g.beginPath(); g.moveTo(x + 9, y + 9); g.lineTo(x + T - 9, y + T - 9); g.moveTo(x + T - 9, y + 9); g.lineTo(x + 9, y + T - 9); g.stroke();
    }
  }
  if (frames) {
    g.strokeStyle = INK.beam; g.lineWidth = 2;
    for (const i of frames) g.strokeRect((i % w) * T + 2, Math.floor(i / w) * T + 2, T - 4, T - 4);
  }
}
