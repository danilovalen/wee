// The Rooms page's More (register 399): what is done rarely (open a code, import, export) waits behind one button.
import { $ } from './dom.js';

export function buildMore() {
  const more = open => { $('moreMenu').hidden = !open; $('moreBtn').setAttribute('aria-expanded', String(open)); };
  $('moreBtn').onclick = () => more($('moreMenu').hidden);
  $('moreMenu').addEventListener('click', ev => { if (ev.target.closest('button')) more(false); });
  document.addEventListener('pointerdown', ev => { if (!$('moreMenu').hidden && !ev.target.closest('#moreMenu, #moreBtn')) more(false); }, true);
  // Escape closes More before it would close the page.
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !$('moreMenu').hidden) { ev.preventDefault(); ev.stopPropagation(); more(false); } }, true);
}
