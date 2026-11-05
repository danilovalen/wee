// Zoom controls (register 781): + and − beside Fit and their keys, a reset to tiles a comfortable size,
// dragging empty space with Look or Move to pan, and the arrow keys panning while editing.
import { T } from '../view/ink.js';
import { S } from '../editor/state.js';
import { $, canvas } from './dom.js';
import { cam, apply, zoomTo, toRoom, perRoom, fitView } from './camera.js';

const STEP = 1.25, RESET_TILE = 40, DRAG_PX = 6;
const middle = () => { const r = canvas.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
export const zoomBy = f => zoomTo(cam.z * f, ...middle());
// Reset: tiles at a comfortable tapping size, or the whole room when that already shows them bigger.
export const zoomReset = () => zoomTo(Math.max(1, RESET_TILE / (cam.fit * T)), ...middle());
export function panBy(dx, dy) { cam.x += dx * T; cam.y += dy * T; cam.held = true; apply(); }

// A tile with nothing on it, or past the room's edge: a drag there moves the view, not a piece.
function emptyAt(cx, cy) {
  const p = toRoom(cx, cy), x = Math.floor(p.x / T), y = Math.floor(p.y / T), l = S.level;
  if (x < 0 || y < 0 || x >= l.w || y >= l.h) return true;
  const i = y * l.w + x;
  return !l.cells[i] && !(l.start && l.start.x === x && l.start.y === y) && !l.entities.some(e => e.x === x && e.y === y) && !(l.crates || []).some(c => c.x === x && c.y === y);
}

// + (or =) and − zoom, F fits the room, Shift+F resets the zoom; arrows pan while editing. True when it took the key.
export function zoomKey(ev) {
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
  if (ev.key === '+' || ev.key === '=') { zoomBy(STEP); return true; }
  if (ev.key === '-' || ev.key === '_') { zoomBy(1 / STEP); return true; }
  if (ev.key === 'f') { fitView(); return true; }
  if (ev.key === 'F') { zoomReset(); return true; }
  const d = S.mode === 'edit' && { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
  if (d && cam.z > 1.001) { panBy(...d); return true; }
  return false;
}

export function bindZoom() {
  $('zoomIn').onclick = () => zoomBy(STEP);
  $('zoomOut').onclick = () => zoomBy(1 / STEP);
  $('zoomReset').onclick = zoomReset;
  let drag = null;
  canvas.addEventListener('pointerdown', ev => {
    drag = null;
    if (S.mode !== 'edit' || S.pinch || cam.z <= 1.001 || !['look', 'move'].includes(S.ui.tool) || !emptyAt(ev.clientX, ev.clientY)) return;
    drag = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, look: S.lookTile, on: false };
  }, true);
  canvas.addEventListener('pointermove', ev => {
    if (!drag || ev.pointerId !== drag.id || S.pinch) return;
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (!drag.on && Math.hypot(dx, dy) < DRAG_PX) return;
    // Once it drags, the press was a pan: the Look tap or Move pick it began is taken back.
    if (!drag.on) { drag.on = true; S.lookTile = drag.look; S.carry = null; }
    const k = perRoom();
    cam.x -= dx / k; cam.y -= dy / k; cam.held = true; drag.x = ev.clientX; drag.y = ev.clientY;
    apply(); ev.stopImmediatePropagation();
  }, true);
  for (const t of ['pointerup', 'pointercancel']) canvas.addEventListener(t, ev => { if (drag && ev.pointerId === drag.id) { if (drag.on) ev.stopImmediatePropagation(); drag = null; } }, true);
}
