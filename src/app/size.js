// The room's size: a "+" on each edge of the room adds a row or a column there, and the size
// readout in the status bar opens the rest (width and height, add or cut a side, Border).
import { $ } from './dom.js';

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

export function buildSize() {
  // A handle does what the popover's Add arrow on that side does, so there is one way to add.
  document.querySelectorAll('[data-plus]').forEach(b => b.onclick = () => document.querySelector(`[data-side=${b.dataset.plus}][data-delta="1"]`).click());
  $('sizeBtn').onclick = () => ($('sizePop').hidden ? openSize() : closeSize());
  document.addEventListener('pointerdown', ev => { if (!$('sizePop').hidden && !ev.target.closest('#sizePop, #sizeBtn')) closeSize(); });
  addEventListener('keydown', ev => { if (ev.key === 'Escape') closeSize(); });
  addEventListener('resize', () => { if (!$('sizePop').hidden) place(); });
}
