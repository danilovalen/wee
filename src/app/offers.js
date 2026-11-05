// Choosing a suggestion (registers 745, 746, pattern B): a line in Findings is chosen by a tap, Tab or the
// d-pad, and while it is chosen its change shows on the room; Apply sits only on the chosen line. A tap on
// it again, Escape, or any change to the room lets it go. A line with no change to make only rings its tiles.
import { S } from '../editor/state.js';
import { now } from './dom.js';

const stampOf = l => JSON.stringify(l);
let chosen = null;

function pick(li, offer) {
  if (chosen && chosen.li === li) return drop();
  drop();
  chosen = { li, ...offer, from: stampOf(S.level) };
  li.classList.add('sel'); li.setAttribute('aria-selected', 'true');
  S.redraw = true;
}
export function drop() {
  if (!chosen) return;
  chosen.li.classList.remove('sel'); chosen.li.setAttribute('aria-selected', 'false');
  chosen = null; S.redraw = true;
}
// The room the editor draws while a line is chosen: its change, until the room itself changes.
export function previewLevel() {
  if (!chosen) return null;
  if (chosen.from !== stampOf(S.level) || !chosen.li.isConnected) { drop(); return null; }
  // Its tiles keep ringing while it is chosen.
  const t = now();
  if (chosen.spots && (!chosen.rang || t - chosen.rang > 900)) { chosen.rang = t; for (const s of chosen.spots) S.fx.push({ type: 'flash', x: s.x, y: s.y, at: t }); }
  return chosen.level || null;
}
// One line of Findings that can be chosen; with a level, it carries an Apply that keeps the change.
export function choosable(text, { level = null, spots = [], apply = null } = {}) {
  const li = document.createElement('li');
  li.className = 'offer'; li.tabIndex = 0; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', 'false');
  li.append(Object.assign(document.createElement('span'), { textContent: text }));
  const choose = () => pick(li, { level, spots });
  li.onclick = e => { if (!e.target.closest('.apply')) choose(); };
  li.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } if (e.key === 'Escape' && chosen && chosen.li === li) { e.stopPropagation(); drop(); } };
  if (apply) {
    const b = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Apply', className: 'apply' });
    b.onclick = () => { drop(); apply(); };
    li.append(b);
  }
  return li;
}
