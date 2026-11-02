// Unlock everything for this session only (registers 589, 606): a corner button on the main menu. Kept in
// memory, never in saved progress, so a reload ends it. While on, a padlock badge sits in the top bar so a
// screenshot never passes for real progress.
import { $ } from './dom.js';
import { glyph } from './glyphs.js';

let on = false;
export const unlocked = () => on;

function sync() {
  const b = $('menuUnlock');
  b.innerHTML = glyph(on ? 'unlock' : 'lock');
  const label = on ? 'Everything is unlocked for this session; tap to lock it again' : 'Unlock everything for this session';
  b.setAttribute('aria-label', label); b.title = label; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on);
  const badge = $('unlockBadge');
  badge.hidden = !on; badge.innerHTML = glyph('unlock'); badge.title = 'Unlocked for this session';
  document.body.classList.toggle('unlocked', on);
}

export function bindUnlock() {
  sync();
  $('menuUnlock').onclick = () => { on = !on; sync(); dispatchEvent(new CustomEvent('wee:unlock')); };
}
