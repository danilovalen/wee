// The room's size: a grip on each side adds or cuts rows or columns there, and the size
// readout in the status bar opens the rest (width and height, add or cut a side, Border).
import { $, now } from './dom.js';
import { S } from '../editor/state.js';
import { moveSide } from '../level/format.js';
import { change, begin, end } from './undo.js';

export function syncSize(level) {
  $('sizeBtn').textContent = `${level.w}×${level.h}`;
}

function place() {
  const pop = $('sizePop'), r = $('sizeBtn').getBoundingClientRect();
  pop.style.bottom = `${innerHeight - r.top + 6}px`;
  pop.style.left = `${Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8))}px`;
}
export function closeSize() { $('sizePop').hidden = true; $('sizeBtn').setAttribute('aria-expanded', 'false'); }
function openSize() { $('sizePop').hidden = false; $('sizeBtn').setAttribute('aria-expanded', 'true'); place(); }

// A + or a − on each side: a tap adds or cuts one line there. A cut that would take a placed thing
// (or the room's last line) does nothing and flashes what is in the way (register 252).
// In a campaign level the start is the level's, so a cut may not take it.
const keeps = l => !!l && !(S.camp && S.level.start && !l.start);
// The tiles of the line a cut would take that hold something. Empty when the last line stops it.
function blockers(level, side) {
  const { w, h } = level, at = side === 'top' ? 0 : side === 'bottom' ? h - 1 : side === 'left' ? 0 : w - 1;
  const across = side === 'top' || side === 'bottom', out = [];
  for (let i = 0; i < (across ? w : h); i++) {
    const x = across ? i : at, y = across ? at : i;
    const full = level.cells[y * w + x] || level.entities.some(e => e.x === x && e.y === y) || (level.start && level.start.x === x && level.start.y === y);
    if (full) out.push({ x, y });
  }
  return out;
}
function resize(side, k, after) {
  const l = moveSide(S.level, side, k);
  if (!keeps(l)) {
    if (k < 0) { for (const b of blockers(S.level, side)) S.fx.push({ type: 'flash', x: b.x, y: b.y, at: now() }); S.redraw = true; }
    return;
  }
  const lost = S.level.start && !l.start;
  change(() => { S.level = l; }); after();
  if (lost) $('placeHint').textContent = 'To play, place the start again.';
}
// A grip on each side of the room: drag it out to add lines there, in to cut them, one line per tile
// dragged, the whole drag one undo step (register 540). A cut that something is in the way of stops
// there and flashes what is in the way. It starts away from the screen's edge, so the phone's back
// swipe never takes the drag (register 541).
const OUT = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };
function grip(b, side, after) {
  let drag = null;
  const step = k => {
    const l = moveSide(S.level, side, k);
    if (!keeps(l)) { if (k < 0) { for (const x of blockers(S.level, side)) S.fx.push({ type: 'flash', x: x.x, y: x.y, at: now() }); S.redraw = true; } return false; }
    if (!drag.changed) { begin(); drag.changed = true; }
    if (S.level.start && !l.start) drag.lost = true;
    S.level = l; drag.done += k; after(); return true;
  };
  b.addEventListener('pointerdown', ev => {
    ev.preventDefault(); b.setPointerCapture?.(ev.pointerId);
    const r = $('game').getBoundingClientRect();
    drag = { x: ev.clientX, y: ev.clientY, tile: r.width / S.level.w, done: 0, changed: false, stuck: 0 };
    b.classList.add('held');
  });
  b.addEventListener('pointermove', ev => {
    if (!drag) return;
    const [ox, oy] = OUT[side], want = Math.round(((ev.clientX - drag.x) * ox + (ev.clientY - drag.y) * oy) / drag.tile);
    while (drag.done < want && step(1));
    while (drag.done > want && drag.stuck !== want) if (!step(-1)) { drag.stuck = want; break; }
  });
  const stop = () => {
    if (!drag) return;
    b.classList.remove('held');
    if (drag.changed) { end(); if (drag.lost) $('placeHint').textContent = 'To play, place the start again.'; }
    drag = null;
  };
  b.addEventListener('pointerup', stop); b.addEventListener('pointercancel', stop); b.addEventListener('lostpointercapture', stop);
  // From the keyboard: the arrow pointing out adds a line, the one pointing in cuts one.
  b.addEventListener('keydown', ev => {
    const k = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[ev.key];
    if (!k) return;
    ev.preventDefault(); const [ox, oy] = OUT[side], d = k[0] * ox + k[1] * oy;
    if (d) resize(side, d, after);
  });
}

export function buildSize({ after }) {
  document.querySelectorAll('[data-grip]').forEach(b => grip(b, b.dataset.grip, after));
  $('sizeBtn').onclick = () => ($('sizePop').hidden ? openSize() : closeSize());
  document.addEventListener('pointerdown', ev => { if (!$('sizePop').hidden && !ev.target.closest('#sizePop, #sizeBtn')) closeSize(); });
  addEventListener('keydown', ev => { if (ev.key === 'Escape') closeSize(); });
  addEventListener('resize', () => { if (!$('sizePop').hidden) place(); });
}
