// The well: a fixed-height drawer under the room, with a tab for findings (warnings and
// design notes) and one for lenses. It never pushes anything off the screen, it only takes
// height from the room. All copy is draft.
import { S } from '../editor/state.js';
import { $ } from './dom.js';

export const WELL = { open: false, tab: 'findings' };

export function openWell(tab) { WELL.open = true; if (tab) WELL.tab = tab; syncWell(); }
export function closeWell() { WELL.open = false; syncWell(); }

// Warnings plus design notes, not counting the line that says they are being worked out.
function findings() {
  const lint = $('lintBox').hidden ? 0 : $('lintList').children.length;
  const design = $('designBox').hidden || S.design?.working ? 0 : $('designList').children.length;
  return lint + design;
}

let shown = '';
export function syncWell() {
  const edit = S.mode === 'edit', open = WELL.open && edit, n = findings();
  const label = n ? `Findings ${n}` : 'Findings';
  const key = [open, WELL.tab, label, edit, $('lensBox').hidden, n].join();
  if (key === shown) return;
  shown = key;
  $('well').hidden = !open;
  // With nothing found and the well shut there is nothing to open: the button goes.
  $('wellBtn').hidden = !edit || (!n && !open);
  $('wellBtn').textContent = label;
  $('wellBtn').setAttribute('aria-expanded', String(open));
  $('wellBtn').classList.toggle('on', open);
  document.querySelectorAll('[data-well]').forEach(b => { const on = b.dataset.well === WELL.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
  document.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== WELL.tab; });
  $('wellEmpty').hidden = n > 0;
  $('lensOff').hidden = !$('lensBox').hidden;
}

export function buildWell() {
  document.querySelectorAll('[data-well]').forEach(b => b.onclick = () => openWell(b.dataset.well));
  $('wellClose').onclick = closeWell;
  $('wellBtn').onclick = () => (WELL.open && WELL.tab === 'findings' ? closeWell() : openWell('findings'));
}
