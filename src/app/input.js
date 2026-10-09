// Pointer and keys: painting in edit mode, swipes and arrows in play mode.
import { describe, holds, place } from '../editor/edit.js';
import { S } from '../editor/state.js';
import { $, canvas, touch, now } from './dom.js';
import { setMode, aim } from './play.js';

function cellFromEvent(ev) {
  const r = canvas.getBoundingClientRect(), level = S.level;
  const x = Math.floor((ev.clientX - r.left) / r.width * level.w);
  const y = Math.floor((ev.clientY - r.top) / r.height * level.h);
  return x >= 0 && y >= 0 && x < level.w && y < level.h ? { x, y } : null;
}

function paint(x, y, how) {
  const t = now();
  for (const f of place(S.level, S.ui, x, y, how)) S.fx.push({ ...f, at: t });
}

// In play, a swipe is an arrow key: each new direction within one drag sends once.
const SWIPE_PX = 24;
const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', ' ': 'hide', r: 'respawn', R: 'respawn' };

export function bindInput() {
  canvas.addEventListener('contextmenu', ev => ev.preventDefault());
  canvas.addEventListener('pointerdown', ev => {
    if (S.mode === 'play') {
      S.swipe = { x: ev.clientX, y: ev.clientY, last: null };
      canvas.setPointerCapture(ev.pointerId);
      return;
    }
    const c = cellFromEvent(ev); if (!c) return;
    if (S.ui.tool === 'look') { $('placeHint').textContent = describe(S.level, c.x, c.y); return; }
    S.painting = ev.button === 2 ? 'erase' : holds(S.level, c.x, c.y, S.ui.tool) && S.ui.tool !== 'start' ? 'remove' : 'place';
    canvas.setPointerCapture(ev.pointerId);
    paint(c.x, c.y, S.painting);
  });
  canvas.addEventListener('pointermove', ev => {
    if (S.mode === 'play' && S.swipe) {
      const sw = S.swipe, dx = ev.clientX - sw.x, dy = ev.clientY - sw.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
      const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      if (d !== sw.last) S.pending.push(aim(d));
      Object.assign(sw, { x: ev.clientX, y: ev.clientY, last: d });
      return;
    }
    const c = S.mode === 'edit' ? cellFromEvent(ev) : null;
    // The outline follows a mouse only; a finger would leave it behind on lift.
    S.hover = touch ? null : c;
    if (S.painting && c && S.ui.tool !== 'start') paint(c.x, c.y, S.painting);
  });
  canvas.addEventListener('pointerup', () => { S.painting = 0; S.swipe = null; });
  canvas.addEventListener('pointercancel', () => { S.painting = 0; S.swipe = null; });
  canvas.addEventListener('pointerleave', () => { S.hover = null; });

  window.addEventListener('keydown', ev => {
    if (ev.target.tagName === 'INPUT' && ev.target.type === 'number') return;
    if (ev.key === 'e' || ev.key === 'E') { setMode(S.mode === 'play' ? 'edit' : 'play'); ev.preventDefault(); return; }
    if (S.mode !== 'play') return;
    const k = KEYS[ev.key];
    if (!k) return;
    ev.preventDefault();
    if (!ev.repeat) S.pending.push(aim(k));
  });
}
