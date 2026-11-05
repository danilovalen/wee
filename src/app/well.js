// The well: a fixed-height drawer under the room, with a tab for findings (warnings and
// design notes) and one for lenses. It never pushes anything off the screen, it only takes
// height from the room. All copy is draft.
import { S } from '../editor/state.js';
import { $ } from './dom.js';

export const WELL = { open: false, tab: 'findings' };

export function openWell(tab) {
  WELL.open = true; if (tab) WELL.tab = tab; syncWell();
  // On a phone the well and a sheet share the bottom, so the well puts the sheet away.
  $('sheet').hidden = true; document.querySelectorAll('[data-sheet]').forEach(b => b.classList.toggle('on', b.dataset.sheet === 'build'));
}
export function closeWell() { WELL.open = false; syncWell(); }

// Warnings plus design notes, not counting the line that says they are being worked out, nor the room's measures.
function findings() {
  const lint = $('lintBox').hidden ? 0 : $('lintList').children.length;
  // Notes dimmed by an edit are about the room before it, so they are not counted.
  const design = $('designBox').hidden || $('designBox').classList.contains('stale') ? 0 : $('designList').querySelectorAll('li:not(.working):not(.metric):not(.nums):not(.more)').length;  // the room's measures (650) are not findings
  return lint + design;
}

// On a wide Sandbox the well is a column right of the room, always there, so the room is never covered
// and nothing moves when it fills (register 730); elsewhere it floats over the room's foot (689).
function home() {
  const col = document.body.classList.contains('sandbox') && innerWidth > 700, to = col ? document.querySelector('main') : $('roomArea');
  if ($('well').parentNode !== to) to.append($('well'));
  document.body.classList.toggle('wellColumn', col);
  return col;
}

let shown = '';
export function syncWell() {
  const col = home(), edit = S.mode === 'edit', open = (WELL.open && edit) || col, n = findings();
  const label = n ? `Findings ${n}` : 'Findings';
  const key = [open, col, WELL.tab, label, edit, $('lensBox').hidden, n].join();
  if (key === shown) return;
  shown = key;
  $('well').hidden = !open;
  // With nothing found and the well shut there is nothing to open: the button greys out
  // (a phone hides a greyed one), so nothing beside it moves.
  $('wellBtn').hidden = !edit || col;
  $('wellBtn').disabled = !n && !open;
  $('wellBtn').textContent = label;
  $('wellBtn').setAttribute('aria-expanded', String(open));
  $('wellBtn').classList.toggle('on', open);
  document.querySelectorAll('[data-well]').forEach(b => { const on = b.dataset.well === WELL.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
  document.querySelectorAll('#well [data-pane]').forEach(p => { p.hidden = p.dataset.pane !== WELL.tab; });
  $('wellEmpty').hidden = n > 0;
}

export function buildWell() {
  home();
  addEventListener('resize', syncWell);
  document.querySelectorAll('[data-well]').forEach(b => b.onclick = () => openWell(b.dataset.well));
  $('wellClose').onclick = closeWell;
  $('wellBtn').onclick = () => (WELL.open && WELL.tab === 'findings' ? closeWell() : openWell('findings'));
}
