// A saved room's own menu in the Library: Rename, Duplicate, Copy code and Delete, without
// opening the room. Right-click, or hold on a touch screen.
import { encodeRoom } from '../level/code.js';
import { splitRoom } from '../level/room.js';
import { S } from '../editor/state.js';
import { put, remove, newId } from './store.js';
import { $ } from './dom.js';

const HOLD_MS = 500;
let menuFor = null;
// What the Library lends the menu, handed in by rooms.js so the two modules do not import each other.
let say, fillCurrent, refresh, remember, syncRoomsButton;
export function menuOn(b, r) {
  b.addEventListener('contextmenu', ev => { ev.preventDefault(); openMenu(b, r); });
  let timer = null, from = null;
  const stop = () => { clearTimeout(timer); timer = null; };
  b.addEventListener('pointerdown', ev => {
    if (ev.pointerType !== 'touch') return;
    from = { x: ev.clientX, y: ev.clientY };
    timer = setTimeout(() => { timer = null; b.dataset.held = '1'; openMenu(b, r); }, HOLD_MS);
  });
  b.addEventListener('pointermove', ev => { if (timer && Math.hypot(ev.clientX - from.x, ev.clientY - from.y) > 8) stop(); });
  for (const t of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(t, stop);
  // The tap that ends a hold opened the menu; it does not also open the room.
  b.addEventListener('click', ev => { if (b.dataset.held) { delete b.dataset.held; ev.stopImmediatePropagation(); ev.preventDefault(); } }, true);
}
function openMenu(b, r) {
  const m = $('tileMenu');
  menuFor = r;
  $('tileRename').hidden = true; $('tileCode').hidden = true;
  m.hidden = false;
  const t = b.getBoundingClientRect();
  m.style.left = `${t.left + 8}px`;
  m.style.top = `${Math.max(8, Math.min(t.top + 24, innerHeight - m.offsetHeight - 8))}px`;
  m.querySelector('button').focus();
}
const closeMenu = () => { $('tileMenu').hidden = true; menuFor = null; };
// The open room follows a change made to its saved copy from the menu.
function followOpen(id, change) { if (S.room && S.room.id === id) { change(S.room); fillCurrent(); syncRoomsButton(); } }
async function menuAct(act) {
  const r = menuFor; if (!r) return;
  const { meta, level } = splitRoom(r), name = meta.name || 'Untitled';
  if (act === 'rename') { $('tileRename').hidden = false; $('tileName').value = name; $('tileName').select(); return; }
  if (act === 'code') {
    const code = await encodeRoom(level);
    try { await navigator.clipboard.writeText(code); say(`Code for "${name}" copied.`); closeMenu(); }
    catch { $('tileCode').hidden = false; $('tileCode').value = code; $('tileCode').select(); say('Copy it from the box.'); }
    return;
  }
  closeMenu();
  try {
    if (act === 'duplicate') { await put({ ...r, id: newId(), name: `${name} copy` }); say(`Duplicated "${name}".`); }
    if (act === 'delete') {
      if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
      await remove(r.id);
      followOpen(r.id, room => { room.id = null; room.saved = null; remember(null); });
      say(`Deleted "${name}".`);
    }
  } catch (e) { say(e.message); }
  await refresh();
}
async function renameTo(value) {
  const r = menuFor, name = value.trim(); if (!r || !name) return;
  closeMenu();
  try { await put({ ...r, name }); } catch (e) { say(e.message); return; }
  followOpen(r.id, room => { room.name = name; });
  say(`Renamed to "${name}".`);
  await refresh();
}

export function buildTileMenu(lib) {
  ({ say, fillCurrent, refresh, remember, syncRoomsButton } = lib);
  document.querySelectorAll('#tileMenu [data-act]').forEach(b => b.onclick = () => menuAct(b.dataset.act));
  $('tileRename').onsubmit = ev => { ev.preventDefault(); renameTo($('tileName').value); };
  $('roomsBox').addEventListener('pointerdown', ev => { if (!$('tileMenu').hidden && !ev.target.closest('#tileMenu')) closeMenu(); });
  $('roomsBox').addEventListener('close', closeMenu);
}
