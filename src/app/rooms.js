// The Rooms panel: the room being edited (name, note, save), the saved rooms, the
// templates, and moving rooms in and out as files.
import { TEMPLATES } from '../level/templates.js';
import { encodeRoom, decodeRoom } from '../level/code.js';
import { splitRoom, joinRoom, stampOf, pack, unpack } from '../level/room.js';
import { starterLevel } from '../editor/state.js';
import { newHistory } from '../editor/history.js';
import { S } from '../editor/state.js';
import { thumbURL } from '../view/thumb.js';
import { list, put, remove, where, newId, detect } from './store.js';
import { contains, uses, MECHANISMS } from '../solve/tags.js';
import { $ } from './dom.js';
import { readDraft, noteChange, flushDraft, clearDraft } from './draft.js';
import { menuOn, buildTileMenu } from './tilemenu.js';
import { place, go, current, back } from './nav.js';
import { buildMore } from './more.js';

const LAST = 'wee.last';
let A = null; // the page actions (setMode, syncPanel, fit), passed in to avoid an import cycle
let saved = [];

// A template opened and left as it is has nothing to lose: it is clean until it changes.
export const dirty = () => !S.camp && (!S.room || stampOf(S.level) !== (S.room.saved ?? S.room.template) || S.room.edited);
export const leaveOk = () => !dirty() || confirm('Leave the unsaved changes in this room?');

export function syncRoomsButton() {
  if (inSandbox()) noteChange(dirty());
  $('roomsBtn').textContent = dirty() ? 'Rooms •' : 'Rooms';
  $('roomsBtn').title = (S.room && S.room.name) || 'Unsaved room';
  // The room's name in the header opens its page; a dot means changes not saved yet.
  $('roomTitle').textContent = ((S.room && S.room.name) || 'Untitled') + (dirty() ? ' \u2022' : '');
}

export function remember(id) { try { if (id) localStorage.setItem(LAST, id); else localStorage.removeItem(LAST); } catch { /* storage off */ } }

// Opening a generated room is one undo step; undoing it, or redoing it, brings back the
// room it replaced, name and all, instead of leaving the generated room's name on it.
export function followUndo() {
  const g = S.genPrev, now = stampOf(S.level);
  if (!g) return;
  if (S.room === g.gen && now === g.prevStamp) S.room = g.prev;
  else if (S.room === g.prev && now === g.genStamp) S.room = g.gen;
}

export function openRoom(level, meta) {
  S.level = level;
  S.room = { id: meta.id || null, name: meta.name || '', note: meta.note || '', solution: meta.solution || null, recipe: meta.recipe || null, puzzle: !!meta.puzzle, saved: stampOf(level), edited: false };
  S.genPrev = null;
  S.history = newHistory();
  remember(S.room.id);
  A.setMode('edit'); A.syncPanel(); A.fit();
  fillCurrent();
}

export function fillCurrent() {
  $('roomName').value = S.room ? S.room.name : '';
  $('roomNote').value = S.room ? S.room.note : '';
  $('roomDelete').disabled = !S.room || !S.room.id;
}

const sayWhere = () => { $('roomsWhere').textContent = where() === 'server' ? 'Saved on the server.' : 'Saved in this browser only: Export all, under More, keeps a copy.'; };

export function say(msg) { $('roomsSay').textContent = msg; $('infoSay').textContent = msg; }

export async function save(asNew) {
  if (!S.room) S.room = { id: null, name: '', note: '', saved: null, edited: false };
  const name = $('roomName').value.trim();
  if (!name) { say('Give the room a name first.'); $('roomName').focus(); return false; }
  const id = asNew || !S.room.id ? newId() : S.room.id;
  // A check of this exact room gives the room its par, solution and what it uses.
  const r = S.check && S.check.stamp === JSON.stringify(S.level) && S.check.result;
  const solution = r && r.status === 'solved' ? r.moves : null;
  let stored;
  try {
    stored = await put(joinRoom({ id, name, note: $('roomNote').value, solution, uses: solution ? uses(S.level, solution) : [], recipe: S.room.recipe, puzzle: S.room.puzzle }, S.level));
  } catch (e) { say(e.message); return false; }
  Object.assign(S.room, { id, name, note: $('roomNote').value, solution, saved: stampOf(S.level), edited: false });
  remember(id);
  say(`Saved "${name}".`);
  fillCurrent(); syncRoomsButton();
  clearDraft();
  saved = [stored, ...saved.filter(o => o.id !== stored.id)];
  renderList();
  return true;
}

// Thumbnails and tags are worked out once per version of a room, not on every redraw.
const thumbs = new Map(), tagCache = new Map();
const versionOf = (r, level) => r && r.id ? r.id + '@' + r.updated : JSON.stringify(level);
function thumb(level, version) {
  if (!thumbs.has(version)) thumbs.set(version, thumbURL(level));
  const img = new Image();
  img.src = thumbs.get(version); img.className = 'thumb'; img.alt = '';
  return img;
}

function row(level, title, sub, onOpen, version) {
  const li = document.createElement('li'), b = document.createElement('button');
  b.type = 'button'; b.className = 'roomRow';
  const text = document.createElement('span'), name = document.createElement('b'), small = document.createElement('small');
  name.textContent = title; small.textContent = sub;
  text.append(name, small);
  b.append(thumb(level, version || versionOf(null, level)), text);
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

// The library leads with the room behind it when that has unsaved changes, so work in progress shows.
async function fillLibrary() {
  say(''); sayWhere();
  const now = $('openNow'), live = dirty();
  now.replaceChildren(...(live ? [row(S.level, (S.room && S.room.name) || 'Untitled', 'Unsaved changes', closeAll)] : []));
  await refresh();
}

// The Sandbox's two places, the Rooms page and the room under it; leaving keeps unsaved work as a draft.
let sandboxOpen = false;
async function enterSandbox() {
  if (sandboxOpen) return;
  sandboxOpen = true;
  const full = new URLSearchParams(location.search).has('sandbox') || location.hash.startsWith('#room=');
  S.simple = !full; document.body.classList.toggle('simple', !full);
  await (window.wee.roomsReady = bootRooms()); A.syncPanel();
}
const leaveSandbox = next => { if (next === 'room' || next === 'rooms') return; flushDraft(dirty()); sandboxOpen = false; S.simple = false; document.body.classList.remove('simple'); };
const inSandbox = () => sandboxOpen && !S.camp && !S.puzzle;

// A room's tags: what it holds, what its saved solution does, and whether it started generated.
const GENERATED = 'from:generated';
function tagsOf(r) {
  const v = versionOf(r);
  if (!tagCache.has(v)) { const { level } = splitRoom(r); tagCache.set(v, new Set([...contains(level), ...(r.uses || []), ...(r.recipe ? [GENERATED] : [])])); }
  return tagCache.get(v);
}

// Built a few rooms at a time, so a long list never freezes the page; a newer call
// abandons an older one still building.
const SLICE_MS = 12;
let building = 0, exampleRows = () => [];
function renderList() {
  const my = ++building, filter = $('tagFilter').value, ul = $('roomList'), counts = {};
  let i = 0, shown = 0;
  ul.replaceChildren();
  const slice = () => {
    if (my !== building) return;
    const until = performance.now() + SLICE_MS;
    for (; i < saved.length && performance.now() < until; i++) {
      const r = saved[i], tags = tagsOf(r);
      for (const t of tags) counts[t] = (counts[t] || 0) + 1;
      if (filter && !tags.has(filter)) continue;
      const { meta, level } = splitRoom(r);
      const par = meta.par ? `, par ${meta.par}` : ', not checked';
      const li = row(level, meta.name || 'Untitled', `${level.w}x${level.h}${par}, ${when(meta.updated)}`, () => { if (leaveOk()) { openRoom(level, meta); closeAll(); } }, versionOf(r));
      menuOn(li.firstChild, r);
      ul.append(li);
      shown++;
    }
    if (i < saved.length) { setTimeout(slice, 0); return; }
    if (!shown && saved.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'No room has this yet.'; ul.append(li); }
    // The example closes the same list, marked as one (register 399).
    if (!filter) ul.append(...exampleRows());
    $('libTools').hidden = !saved.length;
    // The filter lists every mechanism with how many rooms have it; the tally shows the gaps.
    const opts = [new Option('All rooms', ''), new Option(`Started generated (${counts[GENERATED] || 0})`, GENERATED)];
    for (const [t, label] of MECHANISMS) opts.push(new Option(`${label} (${counts[t] || 0})`, t));
    $('tagFilter').replaceChildren(...opts);
    $('tagFilter').value = filter;
    const explored = MECHANISMS.filter(([t]) => counts[t]).length;
    $('exploredSum').textContent = `Explored ${explored} of ${MECHANISMS.length} mechanisms`;
    $('unexplored').replaceChildren(...MECHANISMS.filter(([t]) => !counts[t]).map(([, label]) => { const li = document.createElement('li'); li.textContent = label; return li; }));
  };
  slice();
}

function download(name, data) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Back to the room: the pop-ups close, and the Rooms page goes up to the room under it.
const closeAll = () => { if ($('infoBox').open) $('infoBox').close(); if (current()?.name === 'rooms') back('room'); };

export function buildRooms(actions) {
  A = actions;
  // The library shows the examples only; the other templates are test fixtures, opened by tests through window.wee (register 396).
  const EXAMPLES = ['Hex counter'];
  const templateRows = (list = TEMPLATES, kind = 'Template') => list.map(t => { const { level } = splitRoom(t.level);
    return row(level, t.name, `${kind}, ${level.w}x${level.h}`, () => { if (leaveOk()) { openRoom(level, { name: '' }); S.room.template = S.room.saved; S.room.saved = null; syncRoomsButton(); closeAll(); } }); });
  window.wee.openTemplate = name => templateRows(TEMPLATES.filter(t => t.name === name))[0].firstChild.click();
  exampleRows = () => templateRows(TEMPLATES.filter(t => EXAMPLES.includes(t.name)), 'Example').map(li => { li.classList.add('example'); return li; });
  // Rooms from the menu (rooms/start) is the Sandbox's first screen, its way back Menu; from a room, Close (registers 395, 399).
  place('rooms', { page: 'roomsBox', parent: arg => arg === 'start' ? 'menu' : 'room', enter: async arg => { $('roomsClose').hidden = arg === 'start'; $('roomsMenu').hidden = arg !== 'start'; await enterSandbox(); await fillLibrary(); }, exit: leaveSandbox });
  place('room', { parent: () => 'menu', enter: enterSandbox, exit: leaveSandbox });
  $('roomsBtn').onclick = () => go('rooms');
  buildTileMenu({ say, fillCurrent, refresh, remember, syncRoomsButton });
  $('roomTitle').onclick = () => { fillCurrent(); say(''); $('shareOut').hidden = true; $('infoBox').showModal(); };
  $('codeBtn').onclick = () => { const open = $('codeRow').hidden; $('codeRow').hidden = !open; $('codeBtn').setAttribute('aria-expanded', String(open)); if (open) $('codeIn').focus(); };
  $('tagFilter').onchange = renderList;
  $('roomSave').onclick = () => save(false);
  $('roomSaveAs').onclick = () => save(true);
  $('roomName').oninput = $('roomNote').oninput = () => { if (S.room) S.room.edited = true; else S.room = { id: null, name: '', note: '', saved: null, edited: true }; syncRoomsButton(); };
  // New room opens an empty room at once (register 399).
  $('roomNew').onclick = () => { if (!leaveOk()) return; openRoom(starterLevel(innerHeight > innerWidth), {}); closeAll(); };
  buildMore();
  $('roomDelete').onclick = async () => {
    if (!S.room || !S.room.id || !confirm(`Delete "${S.room.name}"? This cannot be undone.`)) return;
    try { await remove(S.room.id); } catch (e) { say(e.message); return; }
    S.room.id = null; S.room.saved = null; remember(null);
    say('Deleted, and the room is still open here, unsaved.');
    fillCurrent(); syncRoomsButton(); await refresh();
  };
  $('roomDownload').onclick = () => download(($('roomName').value.trim() || 'room').replace(/[^\w-]+/g, '-') + '.wee', joinRoom({ id: S.room?.id || null, name: $('roomName').value, note: $('roomNote').value }, S.level));
  // A code or link: copied to the clipboard, or left selected in the box when the
  // browser will not allow that (a page opened from a file).
  const share = async link => {
    const code = await encodeRoom(S.level);
    const text = link ? location.href.replace(/#.*$/, '') + '#room=' + code : code;
    try { await navigator.clipboard.writeText(text); say(link ? 'Link copied.' : 'Code copied.'); }
    catch { $('shareOut').hidden = false; $('shareOut').value = text; $('shareOut').select(); say('Copy it from the box.'); }
  };
  $('copyCode').onclick = () => share(false);
  $('copyLink').onclick = () => share(true);
  $('openCode').onclick = async () => {
    let level;
    try { level = await decodeRoom($('codeIn').value); } catch (e) { say(e.message); return; }
    if (!leaveOk()) return;
    openRoom(level, {}); S.room.saved = null; syncRoomsButton();
    $('codeIn').value = '';
    closeAll(); $('placeHint').textContent = 'To keep this room from a code, name it and save.';
  };
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
      closeAll(); $('placeHint').textContent = 'To keep this room, save it.';
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
  // A link with #room= opens that room, unsaved, before anything else.
  if (location.hash.startsWith('#room=')) {
    try {
      const level = await decodeRoom(location.hash);
      await refresh();
      openRoom(level, {}); S.room.saved = null; syncRoomsButton();
      try { history.replaceState({ path: '#/room', prev: null }, '', location.pathname + location.search + '#/room'); } catch { /* a preview frame keeps its address */ }
      return;
    } catch { /* a bad link falls through to the usual start */ }
  }
  addEventListener('pagehide', () => flushDraft(dirty()));
  addEventListener('visibilitychange', () => { if (document.hidden) flushDraft(dirty()); });
  let last = null;
  try { last = localStorage.getItem(LAST); } catch { /* storage off */ }
  const rooms = await refresh();
  // Unsaved work from last time comes back first, marked unsaved against its saved room.
  const d = readDraft();
  if (d && d.level) {
    try {
      const savedRoom = d.id && rooms.find(o => o.id === d.id);
      openRoom(splitRoom({ ...d.level, format: 'wee-level' }).level, { id: d.id, name: d.name, note: d.note, solution: d.solution });
      S.room.saved = savedRoom ? stampOf(splitRoom(savedRoom).level) : null;
      S.room.edited = true;
      syncRoomsButton();
      $('placeHint').textContent = 'To keep your unsaved changes, which are back, save them.';
      return;
    } catch { clearDraft(); }
  }
  const r = last && rooms.find(o => o.id === last);
  if (r) { const { meta, level } = splitRoom(r); openRoom(level, meta); }
  else { S.room = { id: null, name: '', note: '', saved: stampOf(S.level), edited: false }; syncRoomsButton(); }
}
