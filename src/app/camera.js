// The camera (register 408). A room whose tiles, fitted to the screen, are too small to tap zooms:
// a pinch or Ctrl and the wheel zooms around the fingers or the pointer, two fingers or the wheel pan,
// and Fit shows the whole room again. One finger keeps editing and playing. While playing zoomed in,
// the view follows the mover, still while they stay in the middle and sliding only as they near an edge.
// Zoomed in, the view fills the room's whole area, not the fitted room's shape (register 414).
import { T } from '../view/ink.js';
import { S } from '../editor/state.js';
import { $, canvas, g } from './dom.js';

const MIN_TILE = 28, MAX_TILE = 56;
// The middle of the view the mover may cross without the view moving, as a share of each side.
const SLACK = 0.25;
// cam.fit: the fitted scale (CSS px per room px); z: how far in, 1 being fitted; x, y: the view's
// top left in room px; held: a pan by hand, so following waits for the mover's next step.
export const cam = { fit: 1, z: 1, x: 0, y: 0, held: false };
let editView = null, lastAt = null, avail = { w: 0, h: 0 };

export const zoomable = () => cam.fit * T < MIN_TILE;
const size = () => ({ W: S.level.w * T, H: S.level.h * T });
const maxZ = () => Math.max(1, MAX_TILE / (cam.fit * T));

const scale = () => cam.fit * cam.z;  // CSS px per room px
const isZoomed = () => cam.z > 1.001;
// The view's box in CSS px: the fitted room, or zoomed in, the whole area the room may use.
function box() { const { W, H } = size(); return isZoomed() ? { w: Math.max(avail.w, W * cam.fit), h: Math.max(avail.h, H * cam.fit) } : { w: W * cam.fit, h: H * cam.fit }; }
// Along each side the view stays on the room, or centres it where the room is the smaller.
function clampXY() {
  const { W, H } = size(), b = box(), k = scale();
  const one = (c, R, v) => R >= v ? Math.min(R - v, Math.max(0, c)) : (R - v) / 2;
  cam.x = one(cam.x, W, b.w / k); cam.y = one(cam.y, H, b.h / k);
}

// Sizes the canvas to the view and sets the drawing transform. anchor: a room point to keep under
// a screen point, worked out after the canvas takes its new size.
export function apply(anchor) {
  cam.z = zoomable() ? Math.min(maxZ(), Math.max(1, cam.z)) : 1;
  const b = box(), dpr = window.devicePixelRatio || 1;
  // Setting a canvas size clears it, even to the same size, so only a real change is written.
  const cw = Math.round(b.w * dpr), ch = Math.round(b.h * dpr), w = Math.round(b.w) + 'px', h = Math.round(b.h) + 'px';
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  if (canvas.style.width !== w) canvas.style.width = w;
  if (canvas.style.height !== h) canvas.style.height = h;
  if (anchor) {
    const r = canvas.getBoundingClientRect(), k = r.width / b.w * scale();
    cam.x = anchor.at.x - (anchor.cx - r.left) / k; cam.y = anchor.at.y - (anchor.cy - r.top) / k;
  }
  clampXY();
  const kd = canvas.width / b.w * scale();
  g.setTransform(kd, 0, 0, kd, -cam.x * kd, -cam.y * kd);
  const zoomed = isZoomed();
  $('fitBtn').hidden = !zoomed;
  // The room's resize bars act on its edges, which a zoomed view may not show: Fit first.
  $('roomWrap').classList.toggle('zoomed', zoomed);
  S.redraw = true;
}

// fit() hands over the fitted scale and the area the room may use, in CSS px.
export function setFit(z, w, h) { cam.fit = z; avail = { w, h }; }

// A zoomed view can show past the room's edges, which the scene does not paint: clear first.
export function clearView() { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); g.restore(); }

// A point on the screen as room px, and back.
const perRoom = () => canvas.getBoundingClientRect().width / box().w * scale();  // screen px per room px
export function toRoom(cx, cy) {
  const r = canvas.getBoundingClientRect(), k = perRoom();
  return { x: cam.x + (cx - r.left) / k, y: cam.y + (cy - r.top) / k };
}
export function toScreen(x, y) {
  const r = canvas.getBoundingClientRect(), k = perRoom();
  return { x: r.left + (x - cam.x) * k, y: r.top + (y - cam.y) * k };
}

// Zoom to z keeping the room point under (cx, cy) where it is.
function zoomTo(z, cx, cy) { const at = toRoom(cx, cy); cam.z = z; apply({ at, cx, cy }); }

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
  const b = box(), vw = b.w / scale(), vh = b.h / scale(), px = (p.x + 0.5) * T, py = (p.y + 0.5) * T;
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
    const t = two();
    cam.z = pinch.z * t.d / pinch.d; cam.held = true;
    // The room point first under the fingers stays under them, so the room zooms and pans at once.
    apply({ at: pinch.at, cx: t.mx, cy: t.my });
  }, true);
  const up = ev => { fingers.delete(ev.pointerId); if (fingers.size < 2) { pinch = null; if (!fingers.size) S.pinch = false; } };
  canvas.addEventListener('pointerup', up, true);
  canvas.addEventListener('pointercancel', up, true);
  canvas.addEventListener('wheel', ev => {
    if (!zoomable()) return;
    ev.preventDefault();
    if (ev.ctrlKey || ev.metaKey) { zoomTo(cam.z * Math.exp(-ev.deltaY * 0.01), ev.clientX, ev.clientY); return; }
    const per = 1 / perRoom();
    cam.x += ev.deltaX * per; cam.y += ev.deltaY * per; cam.held = true;
    apply();
  }, { passive: false });
}
