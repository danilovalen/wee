// The editor's lenses, drawn over the room. A heat lens recolours tiles under the pieces; dots, lines and
// frames are marks on top. Every mark is whole pixel cells with no see-through (register 742).
import { INK, T, cells, pxDisc, pxRing, pxStroke } from './ink.js';
import { DIGITS } from './digits.js';

const centre = (i, w) => [(i % w) * T + T / 2, Math.floor(i / w) * T + T / 2];
// What a ring or a dot says about the shortest wins: every one uses this tile, some do, or none do.
export const USE = { required: '#78dce8', optional: '#fc9867', unused: '#939293' };
const FAINT = '#403e41';

// heat: { distance: Map, hopeless: [] } or { tiles: Set, colour }.
export function drawHeat(g, w, heat) {
  if (!heat) return;
  const fill = (i, colour) => { g.fillStyle = colour; g.fillRect((i % w) * T, Math.floor(i / w) * T, T, T); };
  if (heat.whatif) {
    // Warm where a change makes the answer longer, cool where shorter, stronger the bigger the change (755).
    const ds = [...heat.whatif.values()].filter(r => r.moves).map(r => Math.abs(r.moves - (heat.base || 0)));
    const max = Math.max(1, ...ds);
    for (const [i, r] of heat.whatif) {
      if (!r.moves) continue;
      const d = r.moves - (heat.base || 0);
      if (d) fill(i, `hsla(${d > 0 ? 25 : 200}, 85%, 55%, ${0.2 + 0.45 * Math.abs(d) / max})`);
    }
    return;
  }
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

// A straight run of square cells from a to b, `t` thick; dash: cells on, then off.
export function pxLine(g, ax, ay, bx, by, t = 2, dash = 0) {
  const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 2)), out = [];
  for (let k = 0; k <= n; k++) {
    if (dash && Math.floor(k / dash) % 2) continue;
    const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n;
    out.push([Math.round((x - t / 2) / 2) * 2, Math.round((y - t / 2) / 2) * 2, t, t]);
  }
  cells(g, out);
}
// An arrowhead pointing along angle a with its tip at (x, y), as stairs of whole cells.
function pxHead(g, x, y, a, s = 8) {
  for (let d = 0; d <= s; d += 2) {
    const half = Math.round(d * 0.55 / 2) * 2, bx = x - Math.cos(a) * d, by = y - Math.sin(a) * d;
    pxLine(g, bx - Math.sin(a) * half, by + Math.cos(a) * half, bx + Math.sin(a) * half, by - Math.cos(a) * half, 2);
  }
}
// A number in 3x5 bitmap digits, each pixel one 2-unit cell, on a dark plate with a light rim (741).
export function pxNumber(g, n, cx, cy) {
  const s = String(n), wd = s.length * 8 - 2, x0 = Math.round((cx - wd / 2) / 2) * 2, y0 = Math.round((cy - 5) / 2) * 2;
  g.fillStyle = '#fcfcfa'; cells(g, [[x0 - 4, y0 - 4, wd + 8, 18]]);
  g.fillStyle = '#19181a'; cells(g, [[x0 - 2, y0 - 2, wd + 4, 14]]);
  g.fillStyle = '#fcfcfa';
  const px = [];
  [...s].forEach((ch, k) => DIGITS[ch].forEach((row, y) => [...row].forEach((on, x) => { if (on === '1') px.push([x0 + k * 8 + x * 2, y0 + y * 2, 2, 2]); })));
  cells(g, px);
}
// Whether the straight run from a to b arrives at, leaves or crosses tile f (register 752).
export function touches(a, b, f, w) {
  if (f == null) return true;
  if (a === f || b === f) return true;
  const ax = a % w, ay = Math.floor(a / w), bx = b % w, by = Math.floor(b / w), fx = f % w, fy = Math.floor(f / w);
  return ax === bx ? fx === ax && fy > Math.min(ay, by) && fy < Math.max(ay, by) : ay === by && fy === ay && fx > Math.min(ax, bx) && fx < Math.max(ax, bx);
}
// Where each move's number goes: the middle of its arrow, or further along when another number sits there,
// so two numbers never stack (751).
function labelSpots(path, w) {
  const used = [], out = [];
  for (let n = 1; n < path.length; n++) {
    const [ax, ay] = centre(path[n - 1], w), [bx, by] = centre(path[n], w);
    const spots = [0.5, 0.3, 0.7, 0.2, 0.8].map(f => [ax + (bx - ax) * f, ay + (by - ay) * f]);
    let at = spots.find(([x, y]) => used.every(([u, v]) => Math.abs(u - x) >= 16 || Math.abs(v - y) >= 14));
    if (!at) { const [x, y] = spots[0], k = used.filter(([u, v]) => Math.abs(u - x) < 16 && Math.abs(v - y) < 14).length; at = [x + (ax === bx ? 16 * k : 0), y + (ay === by ? 14 * k : 0)]; }
    used.push(at); out.push(at);
  }
  return out;
}

// marks: { rings: [{ i, use }], passing: [{ i, use }], lines: [tiles in order], moves: [{ a, b, n }],
// frames: Set of tiles, crosses: Set of tiles, focus: a tile the line lenses narrow to }.
export function drawLensMarks(g, w, { rings, passing, lines, moves, frames, crosses, stale, cutAt, stopper, focus, deltas } = {}) {
  if (deltas) for (const { i, breaks, same, d } of deltas) {
    const x = (i % w) * T, y = Math.floor(i / w) * T;
    if (breaks) { g.fillStyle = '#ff6188'; pxLine(g, x + 9, y + 9, x + T - 9, y + T - 9, 4); pxLine(g, x + T - 9, y + 9, x + 9, y + T - 9, 4); }
    else if (d) pxNumber(g, (d > 0 ? '+' : '-') + Math.abs(d), x + T / 2, y + T / 2);
    else if (same) { g.fillStyle = '#939293'; pxDisc(g, x + T / 2, y + T / 2, 2); }
  }
  if (passing) for (const { i, use } of passing) { const [x, y] = centre(i, w); g.fillStyle = USE[use] || INK.player; pxDisc(g, x, y, 3); }
  if (rings) for (const { i, use } of rings) { const [x, y] = centre(i, w); g.strokeStyle = USE[use] || INK.player; pxRing(g, x, y, 7, 2); }
  if (moves && moves.length) {
    // One arrow per move between two stops, wider the more positions make it.
    const max = Math.max(...moves.map(m => m.n));
    for (const { a, b, n } of moves) {
      const on = touches(a, b, focus, w);
      const [ax, ay] = centre(a, w), [bx, by] = centre(b, w), t = Math.atan2(by - ay, bx - ax);
      // Each direction sits a little to its own side, so a move and its way back do not overlap.
      const ox = -Math.sin(t) * 4, oy = Math.cos(t) * 4, ex = bx + ox - Math.cos(t) * 6, ey = by + oy - Math.sin(t) * 6;
      g.fillStyle = on ? INK.player : FAINT;
      pxLine(g, ax + ox, ay + oy, ex - Math.cos(t) * 4, ey - Math.sin(t) * 4, n * 2 > max ? 4 : 2);
      pxHead(g, ex + Math.cos(t) * 2, ey + Math.sin(t) * 2, t, 6);
    }
  }
  if (lines && lines.length > 1) {
    // While a new answer is worked out, the old one is dashed and grey; once an edit breaks it, only the part
    // up to its new stopper is drawn (720, 722, 751).
    const last = cutAt != null ? Math.min(cutAt, lines.length - 1) : lines.length - 1, old = stale || cutAt != null;
    const spots = labelSpots(lines.slice(0, last + 1), w);
    for (let n = 1; n <= last; n++) {
      const on = touches(lines[n - 1], lines[n], focus, w);
      const [ax, ay] = centre(lines[n - 1], w), [bx, by] = centre(lines[n], w), a = Math.atan2(by - ay, bx - ax);
      g.fillStyle = old ? '#939293' : on ? INK.goal : FAINT;
      pxLine(g, ax, ay, bx - Math.cos(a) * 8, by - Math.sin(a) * 8, 2, old ? 2 : 0);
      pxHead(g, bx, by, a, 8);
    }
    for (let n = 1; n <= last; n++) if (touches(lines[n - 1], lines[n], focus, w)) pxNumber(g, n, ...spots[n - 1]);
    if (stopper != null && stopper >= 0) {
      const x = (stopper % w) * T, y = Math.floor(stopper / w) * T;
      g.fillStyle = '#ff6188';
      pxLine(g, x + 9, y + 9, x + T - 9, y + T - 9, 4); pxLine(g, x + T - 9, y + 9, x + 9, y + T - 9, 4);
    }
  }
  if (crosses) {
    g.strokeStyle = '#fc9867'; g.fillStyle = '#fc9867';
    for (const i of crosses) {
      const x = (i % w) * T, y = Math.floor(i / w) * T;
      pxStroke(g, x + 2, y + 2, T - 4, T - 4);
      pxLine(g, x + 9, y + 9, x + T - 9, y + T - 9, 2); pxLine(g, x + T - 9, y + 9, x + 9, y + T - 9, 2);
    }
  }
  if (frames) {
    g.strokeStyle = INK.beam;
    for (const i of frames) pxStroke(g, (i % w) * T + 2, Math.floor(i / w) * T + 2, T - 4, T - 4);
  }
}
