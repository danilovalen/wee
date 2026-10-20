// Drawing wires (register 347).
import { INK, T } from './ink.js';

// Wires (register 347): each colour in its own lane of the tile, joining the same colour next door.
// In play they thin out, and a network that is on glows.
const LANE = { teal: -7, violet: 0, charcoal: 7 };
export function drawWires(g, w, wires, live = null) {
  if (!wires || !wires.length) return;
  const has = new Set(wires.map(r => `${r.w}:${r.x},${r.y}`));
  g.save(); g.lineCap = 'round';
  for (const r of wires) {
    const o = LANE[r.w], cx = r.x * T + T / 2 + o, cy = r.y * T + T / 2 + o, on = live && live(r);
    g.strokeStyle = g.fillStyle = INK[r.w]; g.lineWidth = live ? (on ? 3 : 1.5) : 3; g.globalAlpha = live ? (on ? 0.95 : 0.45) : 0.9;
    g.beginPath(); g.arc(cx, cy, g.lineWidth * 0.9, 0, Math.PI * 2); g.fill();
    g.beginPath();
    if (has.has(`${r.w}:${r.x + 1},${r.y}`)) { g.moveTo(cx, cy); g.lineTo(cx + T, cy); }
    if (has.has(`${r.w}:${r.x},${r.y + 1}`)) { g.moveTo(cx, cy); g.lineTo(cx, cy + T); }
    g.stroke();
  }
  g.restore();
}
