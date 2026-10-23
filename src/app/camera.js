// The camera (register 408). A room whose tiles, fitted to the screen, are too small to tap zooms:
// a pinch or Ctrl and the wheel zooms around the fingers or the pointer, two fingers or the wheel pan,
// and Fit shows the whole room again. One finger keeps editing and playing. While playing zoomed in,
// the view follows the mover, still while they stay in the middle and sliding only as they near an edge.
import { T } from '../view/ink.js';
import { S } from '../editor/state.js';
import { $, canvas, g } from './dom.js';

const MIN_TILE = 28, MAX_TILE = 56;
// The middle of the view the mover may cross without the view moving, as a share of each side.
const SLACK = 0.25;
// cam.fit: the fitted scale (CSS px per room px); z: how far in, 1 being fitted; x, y: the view's
// top left in room px; held: a pan by hand, so following waits for the mover's next step.
export const cam = { fit: 1, z: 1, x: 0, y: 0, held: false };
let editView = null, lastAt = null;

export const zoomable = () => cam.fit * T < MIN_TILE;
const size = () => ({ W: S.level.w * T, H: S.level.h * T });
const maxZ = () => Math.max(1, MAX_TILE / (cam.fit * T));

function clamp() {
  const { W, H } = size();
  cam.z = zoomable() ? Math.min(maxZ(), Math.max(1, cam.z)) : 1;
  cam.x = Math.min(W - W / cam.z, Math.max(0, cam.x));
  cam.y = Math.min(H - H / cam.z, Math.max(0, cam.y));
}

// The drawing transform; fit() sizes the canvas, this decides what of the room it shows.
export function apply() {
  clamp();
  const s = canvas.width / size().W, k = s * cam.z;
  g.setTransform(k, 0, 0, k, -cam.x * k, -cam.y * k);
  const zoomed = cam.z > 1.001;
  $('fitBtn').hidden = !zoomed;
  // The room's resize bars act on its edges, which a zoomed view may not show: Fit first.
  $('roomWrap').classList.toggle('zoomed', zoomed);
  S.redraw = true;
}

export function setFit(z) { cam.fit = z; }

// A point on the screen as room px, and back.
export function toRoom(cx, cy) {
  const r = canvas.getBoundingClientRect(), { W, H } = size();
  return { x: cam.x + (cx - r.left) / r.width * W / cam.z, y: cam.y + (cy - r.top) / r.height * H / cam.z };
}
export function toScreen(x, y) {
  const r = canvas.getBoundingClientRect(), { W } = size(), k = r.width / W * cam.z;
  return { x: r.left + (x - cam.x) * k, y: r.top + (y - cam.y) * k };
}

// Zoom to z keeping the room point under (cx, cy) where it is.
function zoomTo(z, cx, cy) {
  const at = toRoom(cx, cy), r = canvas.getBoundingClientRect(), { W, H } = size();
  cam.z = z; clamp();
  cam.x = at.x - (cx - r.left) / r.width * W / cam.z;
  cam.y = at.y - (cy - r.top) / r.height * H / cam.z;
  apply();
}

export function fitView() { cam.z = 1; cam.x = cam.y = 0; apply(); }

// Play keeps the zoom; going back to editing returns to the view you were editing with.
export function enterPlay() { editView = { ...cam }; lastAt = null; cam.held = false; }
export function leavePlay() { if (editView) Object.assign(cam, { z: editView.z, x: editView.x, y: editView.y }); editView = null; apply(); }

// Each frame in play: slide the view only when the mover leaves the middle.
export function follow() {
  if (S.mode !== 'play' || cam.z <= 1.001 || !S.game) return;
  const p = S.game.player, at = `${p.x},${p.y}`;
  if (at !== lastAt) { lastAt = at; cam.held = false; }
  if (cam.held) return;
  const { W, H } = size(), vw = W / cam.z, vh = H / cam.z, px = (p.x + 0.5) * T, py = (p.y + 0.5) * T;
  const want = (c, v, m) => m < c + SLACK * v ? m - SLACK * v : m > c + (1 - SLACK) * v ? m - (1 - SLACK) * v : c;
  const tx = want(cam.x, vw, px), ty = want(cam.y, vh, py);
  if (Math.abs(tx - cam.x) + Math.abs(ty - cam.y) < 0.5) return;
  cam.x += (tx - cam.x) * 0.2; cam.y += (ty - cam.y) * 0.2;
  apply();
}

export function bindCamera() {
  $('fitBtn').onclick = fitView;
  const fingers = new Map();
  let pinch = null;
  const two = () => { const [a, b] = [...fingers.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; };
  // Capture, so a pinch starts before the editor treats its first finger as a tap.
  canvas.addEventListener('pointerdown', ev => {
    if (ev.pointerType !== 'touch') return;
    fingers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (fingers.size !== 2 || !zoomable()) return;
    // The first finger's stroke, if it began one, is taken back: two fingers are the camera's.
    if (S.before !== null && S.before !== undefined) { S.level = JSON.parse(S.before); S.before = null; }
    if (S.gateHold) { clearTimeout(S.gateHold.timer); S.gateHold = null; }
    S.painting = 0; S.carry = null; S.swipe = null;
    const t = two();
    pinch = { ...t, z: cam.z, at: toRoom(t.mx, t.my) };
    S.pinch = true; ev.stopImmediatePropagation();
  }, true);
  canvas.addEventListener('pointermove', ev => {
    if (!fingers.has(ev.pointerId)) return;
    fingers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (!pinch || fingers.size < 2) return;
    const t = two(), r = canvas.getBoundingClientRect(), { W, H } = size();
    cam.z = pinch.z * t.d / pinch.d; clamp();
    // The room point first under the fingers stays under them, so the room zooms and pans at once.
    cam.x = pinch.at.x - (t.mx - r.left) / r.width * W / cam.z;
    cam.y = pinch.at.y - (t.my - r.top) / r.height * H / cam.z;
    cam.held = true;
    apply();
  }, true);
  const up = ev => { fingers.delete(ev.pointerId); if (fingers.size < 2) { pinch = null; if (!fingers.size) S.pinch = false; } };
  canvas.addEventListener('pointerup', up, true);
  canvas.addEventListener('pointercancel', up, true);
  canvas.addEventListener('wheel', ev => {
    if (!zoomable()) return;
    ev.preventDefault();
    if (ev.ctrlKey || ev.metaKey) { zoomTo(cam.z * Math.exp(-ev.deltaY * 0.01), ev.clientX, ev.clientY); return; }
    const r = canvas.getBoundingClientRect(), per = size().W / r.width / cam.z;
    cam.x += ev.deltaX * per; cam.y += ev.deltaY * per; cam.held = true;
    apply();
  }, { passive: false });
}
