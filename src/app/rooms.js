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
import { contains, uses, MECHANISMS } from '../solve/tags.js';
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
  // A check of this exact room gives the room its par, solution and what it uses.
  const r = S.check && S.check.stamp === JSON.stringify(S.level) && S.check.result;
  const solution = r && r.status === 'solved' ? r.moves : null;
  try {
    await put(joinRoom({ id, name, note: $('roomNote').value, solution, uses: solution ? uses(S.level, solution) : [] }, S.level));
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
  renderList();
  return saved;
}

// A room's tags: what it holds, and what its saved solution does.
const tagsOf = r => { const { level } = splitRoom(r); return new Set([...contains(level), ...(r.uses || [])]); };

function renderList() {
  const filter = $('tagFilter').value, ul = $('roomList');
  const counts = {};
  for (const r of saved) for (const t of tagsOf(r)) counts[t] = (counts[t] || 0) + 1;
  const shown = saved.filter(r => !filter || tagsOf(r).has(filter));
  ul.replaceChildren(...shown.map(r => {
    const { meta, level } = splitRoom(r);
    const par = meta.par ? ` · par ${meta.par}` : ' · not checked';
    return row(level, meta.name || 'Untitled', `${level.w}x${level.h}${par} · ${when(meta.updated)}`, () => { if (leaveOk()) { openRoom(level, meta); $('roomsBox').close(); } });
  }));
  if (!shown.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = saved.length ? 'No room has this yet.' : 'No saved rooms yet.'; ul.append(li); }
  // The filter lists every mechanism with how many rooms have it; the tally shows the gaps.
  const opts = [new Option('All rooms', '')];
  for (const [t, label] of MECHANISMS) opts.push(new Option(`${label} (${counts[t] || 0})`, t));
  $('tagFilter').replaceChildren(...opts);
  $('tagFilter').value = filter;
  const explored = MECHANISMS.filter(([t]) => counts[t]).length;
  $('exploredSum').textContent = `Explored ${explored} of ${MECHANISMS.length} mechanisms`;
  $('unexplored').replaceChildren(...MECHANISMS.filter(([t]) => !counts[t]).map(([, label]) => { const li = document.createElement('li'); li.textContent = label; return li; }));
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
  $('tagFilter').onchange = renderList;
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
