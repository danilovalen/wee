// The room's size: a + and a − for each side add or cut a row or a column there, and the size
// readout in the status bar opens the rest (width and height, add or cut a side, Border).
import { $, now } from './dom.js';
import { S } from '../editor/state.js';
import { moveSide } from '../level/format.js';
import { change } from './undo.js';

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
// (or the room's 2x2 floor) does nothing and flashes what is in the way (register 252).
// In a campaign level the start is the level's, so a cut may not take it.
const keeps = l => !!l && !(S.camp && S.level.start && !l.start);
// The tiles of the line a cut would take that hold something. Empty when the 2x2 floor stops it.
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
// A tap: a press and its release on the button. A press the phone cancels counts too, since some
// viewers cancel a plain tap (register 227); a release elsewhere does not.
function tapper(b, side, k, after) {
  let down = false;
  b.addEventListener('pointerdown', ev => { down = true; ev.preventDefault(); });
  const go = () => { if (down) { down = false; resize(side, k, after); } };
  b.addEventListener('pointerup', go); b.addEventListener('pointercancel', go);
  b.addEventListener('pointerleave', () => { down = false; });
  b.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); resize(side, k, after); } });
}

export function buildSize({ after }) {
  document.querySelectorAll('[data-plus]').forEach(b => tapper(b, b.dataset.plus, 1, after));
  document.querySelectorAll('[data-minus]').forEach(b => tapper(b, b.dataset.minus, -1, after));
  $('sizeBtn').onclick = () => ($('sizePop').hidden ? openSize() : closeSize());
  document.addEventListener('pointerdown', ev => { if (!$('sizePop').hidden && !ev.target.closest('#sizePop, #sizeBtn')) closeSize(); });
  addEventListener('keydown', ev => { if (ev.key === 'Escape') closeSize(); });
  addEventListener('resize', () => { if (!$('sizePop').hidden) place(); });
}
