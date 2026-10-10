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

// marks: { dots: [tiles], lines: [tiles in order], frames: Set of tiles }.
export function drawLensMarks(g, w, { dots, lines, frames } = {}) {
  if (dots) {
    g.fillStyle = INK.player;
    for (const i of dots) { const [x, y] = centre(i, w); g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); }
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
  if (frames) {
    g.strokeStyle = INK.beam; g.lineWidth = 2;
    for (const i of frames) g.strokeRect((i % w) * T + 2, Math.floor(i / w) * T + 2, T - 4, T - 4);
  }
}
