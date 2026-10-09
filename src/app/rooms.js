// The Rooms panel: the room being edited (name, note, save), the saved rooms, the
// templates, and moving rooms in and out as files.
import { TEMPLATES } from '../level/templates.js';
import { splitRoom, joinRoom, stampOf, pack, unpack } from '../level/room.js';
import { starterLevel } from '../editor/state.js';
import { newHistory } from '../editor/history.js';
import { S } from '../editor/state.js';
import { T } from '../view/ink.js';
import { drawEdit } from '../view/scene.js';
import { list, put, remove, where, newId, detect } from './store.js';
import { $ } from './dom.js';

const LAST = 'wee.last';
let A = null; // the page actions (setMode, syncPanel, fit), passed in to avoid an import cycle
let saved = [];

export const dirty = () => !S.room || stampOf(S.level) !== S.room.saved || S.room.edited;
export const leaveOk = () => !dirty() || confirm('This room has changes that are not saved. Leave them?');

export function syncRoomsButton() {
  $('roomsBtn').textContent = dirty() ? 'Rooms •' : 'Rooms';
  $('roomsBtn').title = (S.room && S.room.name) || 'Unsaved room';
}

function remember(id) { try { if (id) localStorage.setItem(LAST, id); else localStorage.removeItem(LAST); } catch { /* storage off */ } }

export function openRoom(level, meta) {
  S.level = level;
  S.room = { id: meta.id || null, name: meta.name || '', note: meta.note || '', saved: stampOf(level), edited: false };
  S.history = newHistory();
  remember(S.room.id);
  A.setMode('edit'); A.syncPanel(); A.fit();
  fillCurrent();
}

function fillCurrent() {
  $('roomName').value = S.room ? S.room.name : '';
  $('roomNote').value = S.room ? S.room.note : '';
  $('roomDelete').disabled = !S.room || !S.room.id;
  $('roomsWhere').textContent = where() === 'server' ? 'Saved on the server.' : 'Saved in this browser only. Export all to keep a copy.';
}

function say(msg) { $('roomsSay').textContent = msg; }

export async function save(asNew) {
  if (!S.room) S.room = { id: null, name: '', note: '', saved: null, edited: false };
  const name = $('roomName').value.trim();
  if (!name) { say('Give the room a name first.'); $('roomName').focus(); return false; }
  const id = asNew || !S.room.id ? newId() : S.room.id;
  try {
    await put(joinRoom({ id, name, note: $('roomNote').value }, S.level));
  } catch (e) { say(e.message); return false; }
  Object.assign(S.room, { id, name, note: $('roomNote').value, saved: stampOf(S.level), edited: false });
  remember(id);
  say(`Saved "${name}".`);
  fillCurrent(); syncRoomsButton();
  await refresh();
  return true;
}

function thumb(level) {
  const c = document.createElement('canvas');
  c.width = level.w * T; c.height = level.h * T;
  drawEdit(c.getContext('2d'), level, null, [], 0);
  c.className = 'thumb';
  return c;
}

function row(level, title, sub, onOpen) {
  const li = document.createElement('li'), b = document.createElement('button');
  b.type = 'button'; b.className = 'roomRow';
  const text = document.createElement('span'), name = document.createElement('b'), small = document.createElement('small');
  name.textContent = title; small.textContent = sub;
  text.append(name, small);
  b.append(thumb(level), text);
  b.onclick = onOpen;
  li.append(b);
  return li;
}

const when = iso => iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';

export async function refresh() {
  try { saved = await list(); } catch (e) { say(e.message); saved = []; }
  saved.sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  const ul = $('roomList');
  ul.replaceChildren(...saved.map(r => {
    const { meta, level } = splitRoom(r);
    return row(level, meta.name || 'Untitled', `${level.w}x${level.h} · ${when(meta.updated)}`, () => { if (leaveOk()) { openRoom(level, meta); $('roomsBox').close(); } });
  }));
  if (!saved.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'No saved rooms yet.'; ul.append(li); }
  return saved;
}

function download(name, data) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function buildRooms(actions) {
  A = actions;
  $('templateList').replaceChildren(...TEMPLATES.map(t => {
    const { level } = splitRoom(t.level);
    return row(level, t.name, `Template · ${level.w}x${level.h}`, () => { if (leaveOk()) { openRoom(level, { name: '' }); S.room.saved = null; syncRoomsButton(); $('roomsBox').close(); } });
  }));
  $('roomsBtn').onclick = async () => { fillCurrent(); say(''); $('roomsBox').showModal(); await refresh(); };
  $('roomSave').onclick = () => save(false);
  $('roomSaveAs').onclick = () => save(true);
  $('roomName').oninput = $('roomNote').oninput = () => { if (S.room) S.room.edited = true; else S.room = { id: null, name: '', note: '', saved: null, edited: true }; syncRoomsButton(); };
  $('roomNew').onclick = () => { if (!leaveOk()) return; openRoom(starterLevel(innerHeight > innerWidth), {}); say('A new room. Name it and save.'); };
  $('roomDelete').onclick = async () => {
    if (!S.room || !S.room.id || !confirm(`Delete "${S.room.name}"? This cannot be undone.`)) return;
    try { await remove(S.room.id); } catch (e) { say(e.message); return; }
    S.room.id = null; S.room.saved = null; remember(null);
    say('Deleted. The room is still open here, unsaved.');
    fillCurrent(); syncRoomsButton(); await refresh();
  };
  $('roomDownload').onclick = () => download(($('roomName').value.trim() || 'room').replace(/[^\w-]+/g, '-') + '.wee', joinRoom({ id: S.room?.id || null, name: $('roomName').value, note: $('roomNote').value }, S.level));
  $('exportAll').onclick = async () => download('wee-rooms.weepack', pack(await refresh()));
  $('importBtn').onclick = () => $('importFile').click();
  $('importFile').onchange = async () => {
    const f = $('importFile').files[0]; $('importFile').value = '';
    if (!f) return;
    let rooms;
    try { rooms = unpack(await f.text()); } catch (e) { say('This file cannot be opened. ' + e.message); return; }
    if (rooms.length === 1 && !rooms[0].id) {
      if (!leaveOk()) return;
      const { meta, level } = splitRoom(rooms[0]);
      openRoom(level, { name: meta.name || f.name.replace(/\.\w+$/, ''), note: meta.note });
      S.room.saved = null; syncRoomsButton();
      say('Opened. Save it to keep it.');
      return;
    }
    for (const r of rooms) await put({ ...r, id: r.id || newId() });
    say(`Imported ${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'}.`);
    await refresh();
  };
}

// At start: find the store, and reopen the room you were last on.
export async function bootRooms() {
  await detect();
  let last = null;
  try { last = localStorage.getItem(LAST); } catch { /* storage off */ }
  const rooms = await refresh();
  const r = last && rooms.find(o => o.id === last);
  if (r) { const { meta, level } = splitRoom(r); openRoom(level, meta); }
  else { S.room = { id: null, name: '', note: '', saved: stampOf(S.level), edited: false }; syncRoomsButton(); }
}
