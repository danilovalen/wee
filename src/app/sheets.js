// A phone's bottom tabs: Build shows the tools, Room and Powers slide a sheet up over them,
// Rooms opens the rooms list. One sheet at a time; Build, Escape or play closes it.
import { $ } from './dom.js';
import { closeWell } from './well.js';

export function openSheet(name) {
  const sheet = $('sheet');
  if (name && name !== 'build') closeWell();
  sheet.hidden = !name || name === 'build';
  document.querySelectorAll('#sheet [data-pane]').forEach(p => { p.hidden = p.dataset.pane !== name; });
  document.querySelectorAll('[data-sheet]').forEach(b => b.classList.toggle('on', b.dataset.sheet === (sheet.hidden ? 'build' : name)));
}

export function buildSheets() {
  document.querySelectorAll('[data-sheet]').forEach(b => b.onclick = () => openSheet($('sheet').hidden || !b.classList.contains('on') ? b.dataset.sheet : 'build'));
  $('navRooms').onclick = () => $('roomsBtn').click();
  addEventListener('keydown', ev => { if (ev.key === 'Escape') openSheet('build'); });
  // A tapped power shows what it does, under its name; the rest stay one line.
  $('powers').addEventListener('click', ev => {
    const row = ev.target.closest('.power'); if (!row) return;
    document.querySelectorAll('#powers .power').forEach(r => r.classList.toggle('show', r === row));
  });
}
