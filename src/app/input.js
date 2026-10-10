// Pointer and keys: painting in edit mode, swipes and arrows in play mode.
import { describe, holds, place } from '../editor/edit.js';
import { S } from '../editor/state.js';
import { $, canvas, touch, now } from './dom.js';
import { setMode, aim } from './play.js';
import { begin, end, step as undoStep } from './undo.js';
import { save } from './rooms.js';
import { selectDown, selectMove, selectUp, selectKey } from './select.js';
import { LENS_GROUPS, cycleLens, lensesOff } from './lenses.js';
import { syncPanel } from './panels.js';
import { fit } from './fit.js';
import { toolForKey, bareKey, showKeys } from './keys.js';
import { TOOLS } from '../editor/palette.js';

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
    if (S.ui.tool === 'look') {
      $('placeHint').textContent = describe(S.level, c.x, c.y);
      // You can start a run from any tile you could stand on.
      const cell = S.level.cells[c.y * S.level.w + c.x];
      const open = !/^(wall|receiver:|spring:|door:|idoor:|death)/.test(cell) && !S.level.entities.some(e => e.x === c.x && e.y === c.y);
      S.lookAt = open ? c : null;
      $('playHere').hidden = !open;
      return;
    }
    if (S.ui.tool === 'select') { canvas.setPointerCapture(ev.pointerId); S.hover = c; selectDown(c); return; }
    begin();
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
    S.hover = touch && S.ui.tool !== 'select' ? null : c;
    if (c && S.ui.tool === 'select' && ev.buttons) selectMove(c);
    if (S.painting && c && S.ui.tool !== 'start') paint(c.x, c.y, S.painting);
  });
  const lift = () => { S.painting = 0; S.swipe = null; selectUp(); end(); };
  canvas.addEventListener('pointerup', lift);
  canvas.addEventListener('pointercancel', lift);
  canvas.addEventListener('pointerleave', () => { S.hover = null; });

  window.addEventListener('keydown', ev => {
    // Typing in a field is typing, not a shortcut.
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName) && !['checkbox', 'radio', 'button'].includes(ev.target.type)) return;
    if (S.mode === 'edit' && selectKey(ev)) return;
    if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'z' || ev.key === 'Z' || ev.key === 'y')) {
      undoStep(ev.key === 'z' && !ev.shiftKey, () => { syncPanel(); fit(); });
      ev.preventDefault(); return;
    }
    if ((ev.ctrlKey || ev.metaKey) && (ev.key === 's' || ev.key === 'S')) {
      ev.preventDefault();
      save(false).then(ok => { if (!ok) $('roomsBtn').click(); });
      return;
    }
    if (S.mode === 'edit' && bareKey(ev)) { ev.preventDefault(); return; }
    if (ev.key === '?' && !ev.ctrlKey && !ev.metaKey) { showKeys(); ev.preventDefault(); return; }
    const tool = S.mode === 'edit' ? toolForKey(ev) : null;
    if (tool) { S.ui.tool = tool; S.ui.group = TOOLS.find(t => t.id === tool).group; syncPanel(); ev.preventDefault(); return; }
    // Keys 1 to 4 cycle a lens group, 0 turns every lens off.
    if (S.mode === 'edit' && !ev.ctrlKey && !ev.metaKey && /^[0-4]$/.test(ev.key)) {
      if (ev.key === '0') lensesOff(); else cycleLens(LENS_GROUPS[+ev.key - 1].id);
      ev.preventDefault(); return;
    }
    if (ev.key === 'e' || ev.key === 'E') { setMode(S.mode === 'play' ? 'edit' : 'play'); ev.preventDefault(); return; }
    if (S.mode !== 'play') return;
    const k = KEYS[ev.key];
    if (!k) return;
    ev.preventDefault();
    if (!ev.repeat) { S.demo = null; S.demoWait = null; S.pending.push(aim(k)); }
  });
}
