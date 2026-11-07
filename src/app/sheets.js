// A phone's bottom bar (register 831): Play, Check and Notes stand in for the header's buttons, within a
// thumb's reach; Room and Powers slide a sheet up over the tools, and a second tap puts it away. The rooms
// list opens from the room's name. One sheet at a time; Escape or play closes it.
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
  // Each mirrors the header button it stands for: its words, greyed or not, pressed or not.
  for (const [nav, src] of [['navPlay', 'mode'], ['navCheck', 'checkBtn'], ['navNotes', 'wellBtn']]) {
    const b = $(nav), from = $(src), sync = () => {
      const words = from.dataset.label || from.textContent;
      b.querySelector('span').textContent = nav === 'navNotes' ? words.replace('Findings', 'Notes') : words;
      if (from.dataset.icon) b.querySelector('i').innerHTML = from.innerHTML;
      b.disabled = from.disabled; b.classList.toggle('on', from.classList.contains('on'));
    };
    b.onclick = () => from.click();
    new MutationObserver(sync).observe(from, { attributes: true, childList: true, characterData: true, subtree: true });
    sync();
  }
  addEventListener('keydown', ev => { if (ev.key === 'Escape') openSheet('build'); });
  // A tapped power shows what it does, under its name; the rest stay one line.
  $('powers').addEventListener('click', ev => {
    const row = ev.target.closest('.power'); if (!row) return;
    document.querySelectorAll('#powers .power').forEach(r => r.classList.toggle('show', r === row));
  });
}
