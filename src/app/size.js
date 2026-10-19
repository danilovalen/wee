// The room's size: a "+" on each edge of the room adds a row or a column there, and the size
// readout in the status bar opens the rest (width and height, add or cut a side, Border).
import { $, canvas } from './dom.js';
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

// A grip on each edge: a tap adds a line, a drag outward adds as many as it covers and a drag
// inward cuts them. While dragging, a band shows the lines that will come or go; it stops at
// the last line that can go (a placed thing, 2x2 inside) or come (40x30), so no drag fails.
const OUT = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };
// In a campaign level the start is the level's, so a cut may not take it.
const keeps = l => !!l && !(S.camp && S.level.start && !l.start);
function grip(b, after) {
  const side = b.dataset.plus, wrap = $('roomWrap');
  let from = null, n = 0;
  const band = document.createElement('div'); band.className = 'sizeBand'; band.hidden = true; wrap.append(band);
  const tile = () => canvas.getBoundingClientRect().width / S.level.w;
  const show = () => {
    const t = tile(), c = canvas.getBoundingClientRect(), w = wrap.getBoundingClientRect();
    const len = Math.abs(n) * t, out = n > 0, x0 = c.left - w.left, y0 = c.top - w.top;
    const box = { top: [x0, out ? y0 - len : y0, c.width, len], bottom: [x0, out ? y0 + c.height : y0 + c.height - len, c.width, len],
      left: [out ? x0 - len : x0, y0, len, c.height], right: [out ? x0 + c.width : x0 + c.width - len, y0, len, c.height] }[side];
    Object.assign(band.style, { left: box[0] + 'px', top: box[1] + 'px', width: box[2] + 'px', height: box[3] + 'px' });
    band.classList.toggle('cut', n < 0);
    band.textContent = n > 0 ? '+' + n : '\u2212' + -n;
    band.hidden = n === 0;
  };
  b.addEventListener('pointerdown', ev => { from = { x: ev.clientX, y: ev.clientY, moved: false, far: 0 }; n = 0; b.setPointerCapture(ev.pointerId); ev.preventDefault(); });
  b.addEventListener('pointermove', ev => {
    if (!from) return;
    const [ux, uy] = OUT[side], d = (ev.clientX - from.x) * ux + (ev.clientY - from.y) * uy;
    if (Math.abs(d) > 6) from.moved = true;
    from.far = Math.max(from.far, Math.abs(d));
    if (!from.moved) return;
    n = Math.round(d / tile()) || 0;
    while (n && !keeps(moveSide(S.level, side, n))) n -= Math.sign(n);
    show();
  });
  const done = ev => {
    if (!from) return;
    // A press that never went half a tile is a tap, however much the finger drifted.
    // A cancel that never went half a tile is a tap too: some phone viewers cancel a plain tap.
    const tap = from.far < tile() / 2, k = tap ? 1 : n; from = null; band.hidden = true;
    if (!k || (ev.type === 'pointercancel' && !tap)) return;
    const l = moveSide(S.level, side, k);
    if (!keeps(l)) return;
    const lost = S.level.start && !l.start;
    change(() => { S.level = l; }); after();
    if (lost) $('placeHint').textContent = 'The cut took the start. To play, place it again.';
  };
  // A release anywhere ends the drag, even off the grip, outside the window, or where the
  // browser never gave the grip its capture (some phone webviews): the window hears it too.
  b.addEventListener('pointerup', done); b.addEventListener('pointercancel', done); b.addEventListener('lostpointercapture', done);
  addEventListener('pointerup', done); addEventListener('pointercancel', done);
  // A new press anywhere else drops a band left behind by a drag whose release never came.
  addEventListener('pointerdown', ev => { if (ev.target !== b && (from || !band.hidden)) { from = null; band.hidden = true; } });
}

export function buildSize({ after }) {
  document.querySelectorAll('[data-plus]').forEach(b => grip(b, after));
  $('sizeBtn').onclick = () => ($('sizePop').hidden ? openSize() : closeSize());
  document.addEventListener('pointerdown', ev => { if (!$('sizePop').hidden && !ev.target.closest('#sizePop, #sizeBtn')) closeSize(); });
  addEventListener('keydown', ev => { if (ev.key === 'Escape') closeSize(); });
  addEventListener('resize', () => { if (!$('sizePop').hidden) place(); });
}
