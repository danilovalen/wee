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

// A grey piece wears its wire (register 352): a dashed, colourless trim until it sits on one, then the
// wire's colour, so a grey button and door that share no wire look apart.
const GREY = /^[a-z]+:(wire|wnone|w\d+(\|w\d+)*)$/;
export const isGrey = c => GREY.test(c);
export const wireColoursAt = (wires, x, y) => (wires || []).filter(r => r.x === x && r.y === y).map(r => r.w);
export function drawTrim(g, x, y, cols) {
  g.save(); g.lineWidth = cols.length ? 2.5 : 2; g.strokeStyle = cols.length ? INK[cols[0]] : '#6b7280';
  if (!cols.length) g.setLineDash([4, 3]);
  g.beginPath(); g.roundRect(x * T + 2, y * T + 2, T - 4, T - 4, 5); g.stroke(); g.restore();
}

// In the editor, a focused grey piece (hovered, or tapped with Look) lights its wires and every piece on
// them, and dims the rest; on no wire, only itself lights.
export function drawReach(g, level, at, nets) {
  const i = at.y * level.w + at.x, cell = level.cells[i];
  if (!isGrey(cell) && !(nets.at[i].length && /^(button|toggle|sensor):/.test(cell))) return;
  const ids = new Set(nets.at[i]), lit = new Set([i]);
  nets.at.forEach((list, k) => { if (list.some(id => ids.has(id))) lit.add(k); });
  g.save(); g.fillStyle = INK.floor; g.globalAlpha = 0.6;
  for (let k = 0; k < level.cells.length; k++) if (!lit.has(k)) g.fillRect((k % level.w) * T, Math.floor(k / level.w) * T, T, T);
  g.globalAlpha = 1; g.strokeStyle = INK.goal; g.lineWidth = 3;
  for (const k of lit) if (level.cells[k] || k === i) { g.beginPath(); g.roundRect((k % level.w) * T + 1, Math.floor(k / level.w) * T + 1, T - 2, T - 2, 6); g.stroke(); }
  g.restore();
}
