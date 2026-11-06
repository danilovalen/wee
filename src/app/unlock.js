// Dev mode (registers 589, 606, 780): the main menu's corner lock. On, every level is open and the
// tester's extras show (Debug, Copy report, Download, Import, Export all); off, the game shows a player
// only what they need. Kept across reloads under its own key, never in saved progress, and a padlock badge
// sits in the top bar while it is on so a screenshot never passes for real progress.
import { $ } from './dom.js';
import { glyph } from './glyphs.js';

const KEY = 'wee.dev';
let on = false;
try { on = localStorage.getItem(KEY) === '1'; } catch { /* storage off */ }
export const unlocked = () => on;
// Everything open for a test that jumps straight to a later level (window.__openAll), or in dev mode.
export const allOpen = () => on || !!globalThis.__openAll;

function sync() {
  const b = $('menuUnlock');
  b.innerHTML = glyph(on ? 'unlock' : 'lock');
  const label = on ? 'Dev mode is on: tap to turn it off' : 'Turn on dev mode to open every level and show the test tools';
  b.setAttribute('aria-label', label); b.title = label; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on);
  const badge = $('unlockBadge');
  badge.hidden = !on; badge.innerHTML = glyph('unlock'); badge.title = 'Dev mode';
  document.body.classList.toggle('unlocked', on);
  document.body.classList.toggle('dev', on);
}

export function setDev(v) {
  on = !!v;
  try { if (on) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* storage off */ }
  sync(); dispatchEvent(new CustomEvent('wee:unlock'));
}

export function bindUnlock() {
  sync();
  // Turning it on asks first (register 818): a tester's tap would otherwise skip the whole progression.
  $('menuUnlock').onclick = () => on ? setDev(false) : $('devBox').showModal();
  $('devYes').onclick = () => { $('devBox').close(); setDev(true); };
  $('devNo').onclick = () => $('devBox').close();
}
