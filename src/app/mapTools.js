// The map room's tools (register 932), in dev mode only and only in a map room: a level spot names the
// level, puzzle or challenge it opens and the side its card goes; a sign says what is typed.
import { S } from '../editor/state.js';
import { plan } from '../campaign/progression.js';
import { unlocked } from './unlock.js';
import { $ } from './dom.js';

export const mapTools = () => unlocked() && S.level && S.level.map ? ['spot', 'sign'] : [];
// Every room the campaign opens, in plan order, as [id, name].
// A challenge goes by its card's name, Place 3 or Remove 3, then its own.
export function mapRooms() {
  const n = { c: 0, r: 0 };
  return plan().flatMap(({ def, side, twin }) => [def, side, twin].filter(Boolean).map(r => {
    const k = r.id[0] === 'c' || r.id[0] === 'r' ? r.id[0] : null;
    return [r.id, k ? `${k === 'c' ? 'Place' : 'Remove'} ${++n[k]} (${r.name})` : r.name];
  }));
}

function fill() {
  const placed = new Set((S.level?.spots || []).map(s => s.for)), rooms = mapRooms(), sel = $('spotFor');
  sel.replaceChildren(...rooms.map(([id, name]) => Object.assign(document.createElement('option'), { value: id, textContent: placed.has(id) ? `${name} (placed)` : name })));
  if (!rooms.some(([id]) => id === S.ui.spotFor)) S.ui.spotFor = (rooms.find(([id]) => !placed.has(id)) || rooms[0] || [''])[0];
  sel.value = S.ui.spotFor;
}

export function buildMapTools() {
  S.ui.spotCard ||= 'up'; S.ui.signText ||= 'Land';
  $('spotFor').onchange = e => { S.ui.spotFor = e.target.value; };
  $('spotFor').onfocus = fill;
  document.querySelectorAll('[data-card]').forEach(b => b.onclick = () => { S.ui.spotCard = b.dataset.card; syncMapTools(); });
  $('signText').value = S.ui.signText;
  $('signText').oninput = e => { S.ui.signText = e.target.value; };
}
export function syncMapTools() {
  if (S.ui.tool === 'spot') fill();
  document.querySelectorAll('[data-card]').forEach(b => b.classList.toggle('on', b.dataset.card === S.ui.spotCard));
}
