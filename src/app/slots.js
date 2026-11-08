// Who is playing (register 834): three saves on one phone, switched from the menu's corner. Me keeps its
// progress; Guest starts from nothing every time it is picked; Everything opens every level. A switch sets
// the current save aside under its own key, puts the chosen one in place and reloads. Sound stays shared.
import { $ } from './dom.js';
import { glyph } from './glyphs.js';

const SLOT = 'wee.slot', STASH = 'wee.stash.', SHARED = ['wee.sound'];
export const SLOTS = [
  { id: 'me', name: 'Me', note: 'Your own progress.' },
  { id: 'guest', name: 'Guest', note: 'Starts from nothing, every time.' },
  { id: 'all', name: 'Everything', note: 'Every level open.' },
];
const get = k => { try { return localStorage.getItem(k); } catch { return null; } };
export const slotNow = () => get(SLOT) || 'me';
// The keys that make up a save: every wee one but the slot's own, the set-aside saves and what all share.
function saveKeys() {
  const out = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('wee.') && k !== SLOT && !k.startsWith(STASH) && !SHARED.includes(k)) out.push(k); } } catch { /* storage off */ }
  return out;
}

// Picking Guest while a guest plays starts it over; picking the slot already in use does nothing else.
export function switchSlot(to, reload = () => location.reload()) {
  const from = slotNow();
  if (to === from && to !== 'guest') return false;
  try {
    const keys = saveKeys();
    if (from !== 'guest') localStorage.setItem(STASH + from, JSON.stringify(Object.fromEntries(keys.map(k => [k, localStorage.getItem(k)]))));
    keys.forEach(k => localStorage.removeItem(k));
    const saved = to === 'guest' ? {} : JSON.parse(localStorage.getItem(STASH + to) || '{}');
    for (const [k, v] of Object.entries(saved)) localStorage.setItem(k, v);
    if (to === 'all') localStorage.setItem('wee.dev', '1');
    localStorage.setItem(SLOT, to);
  } catch { return false; }
  reload();
  return true;
}

export function bindSlots() {
  const b = $('menuSlot'), now = SLOTS.find(s => s.id === slotNow()) || SLOTS[0];
  b.innerHTML = glyph('player');
  const label = 'Playing as ' + now.name + ': tap to switch';
  b.setAttribute('aria-label', label); b.title = label; b.classList.toggle('on', now.id !== 'me');
  b.onclick = () => {
    $('slotList').replaceChildren(...SLOTS.map(s => {
      const row = document.createElement('button'), here = s.id === now.id;
      row.type = 'button'; row.dataset.slot = s.id; row.className = 'slotRow' + (here ? ' on' : '');
      if (here) row.setAttribute('aria-current', 'true');
      row.innerHTML = `<b>${s.name}${here ? ' (now)' : ''}</b><small>${here && s.id === 'guest' ? 'Tap to start over.' : s.note}</small>`;
      row.onclick = () => { $('slotBox').close(); switchSlot(s.id); };
      return row;
    }));
    $('slotBox').showModal();
  };
  $('slotNo').onclick = () => $('slotBox').close();
}
