// Who is playing (register 834): saves on one phone, switched from the menu's corner. Me keeps its progress;
// Guest starts from nothing every time it is picked. The dev lock is a third save, every level open: turning
// it on sets the save in use aside, and turning it off puts that one back (835), so nothing won with every
// level open counts. A switch sets the current save aside under its own key, puts the chosen one in place
// and reloads. Sound stays shared.
import { $ } from './dom.js';
import { glyph } from './glyphs.js';
import { topScores, postScore } from './board.js';
import { progress } from './progress.js';

const SLOT = 'wee.slot', BACK = 'wee.slot.back', STASH = 'wee.stash.', SHARED = ['wee.sound', 'wee.board'];
export const SLOTS = [
  { id: 'me', name: 'Me', note: 'Your own progress.' },
  { id: 'guest', name: 'Guest', note: 'Starts from nothing, every time.' },
];

const get = k => { try { return localStorage.getItem(k); } catch { return null; } };
export const slotNow = () => get(SLOT) || 'me';
// The keys that make up a save: every wee one but the slot's own two, the set-aside saves and what all share.
function saveKeys() {
  const out = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('wee.') && k !== SLOT && k !== BACK && !k.startsWith(STASH) && !SHARED.includes(k)) out.push(k); } } catch { /* storage off */ }
  return out;
}

// Picking Guest while a guest plays starts it over; picking the slot already in use does nothing else. The
// lock keeps a guest's save aside and brings it back (keep), so a guest can peek with every level open.
export function switchSlot(to, keep = false, reload = () => location.reload()) {
  const from = slotNow();
  if (to === from && to !== 'guest') return false;
  try {
    const keys = saveKeys();
    if (from !== 'guest' || keep) localStorage.setItem(STASH + from, JSON.stringify(Object.fromEntries(keys.map(k => [k, localStorage.getItem(k)]))));
    keys.forEach(k => localStorage.removeItem(k));
    const saved = to === 'guest' && !keep ? {} : JSON.parse(localStorage.getItem(STASH + to) || '{}');
    for (const [k, v] of Object.entries(saved)) localStorage.setItem(k, v);
    if (to === 'all') localStorage.setItem('wee.dev', '1');
    localStorage.setItem(SLOT, to);
  } catch { return false; }
  reload();
  return true;
}

// The dev lock: on, the save in use steps aside for the every-level one; off, it comes back.
export function setDevSlot(on) {
  if (on) { try { localStorage.setItem(BACK, slotNow()); } catch { /* storage off */ } return switchSlot('all', true); }
  return switchSlot(get(BACK) || 'me', true);
}

export function bindSlots() {
  // A save that scored before the board existed takes its line on the first load.
  if (slotNow() !== 'all' && Object.values(progress().levels).some(r => r && r.beaten)) postScore(progress(), slotNow());
  const b = $('menuSlot'), now = SLOTS.find(s => s.id === slotNow()) || { id: 'all', name: 'every level open' };
  b.innerHTML = glyph('player');
  const label = (now.id === 'all' ? 'Playing with every level open' : 'Playing as ' + now.name) + ': tap to switch';
  b.setAttribute('aria-label', label); b.title = label; b.classList.toggle('on', now.id === 'guest');
  b.onclick = () => {
    $('slotList').replaceChildren(...SLOTS.map(s => {
      const row = document.createElement('button'), here = s.id === now.id;
      row.type = 'button'; row.dataset.slot = s.id; row.className = 'slotRow' + (here ? ' on' : '');
      if (here) row.setAttribute('aria-current', 'true');
      row.innerHTML = `<b>${s.name}${here ? ' (now)' : ''}</b><small>${here && s.id === 'guest' ? 'Tap to start over.' : s.note}</small>`;
      row.onclick = () => { $('slotBox').close(); switchSlot(s.id); };
      return row;
    }));
    // The best scores saved on this device (register 839), a guest named by the day it started.
    const day = t => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    $('slotBoard').replaceChildren(...topScores().map(r => Object.assign(document.createElement('li'), { textContent: `${r.slot === 'me' ? 'Me' : `Guest, ${day(parseInt(r.id.split(':')[1]) || r.at)}`}: ${r.score}` })));
    $('slotBoardBox').hidden = !$('slotBoard').children.length;
    $('slotBox').showModal();
  };
  $('slotNo').onclick = () => $('slotBox').close();
}
