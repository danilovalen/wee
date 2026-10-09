// Where rooms are kept: on the server when the page is served by one, otherwise in this
// browser's local storage. A room is a level file with id, name, note and updated added.
const KEY = 'wee.rooms';
let mode = 'device';

export const where = () => mode;

export async function detect() {
  try {
    const r = await fetch('api/rooms', { cache: 'no-store' });
    if (r.ok && (r.headers.get('content-type') || '').includes('json')) { mode = 'server'; return mode; }
  } catch { /* opened from a file, or no server */ }
  mode = 'device';
  return mode;
}

function readLocal() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
function writeLocal(rooms) { localStorage.setItem(KEY, JSON.stringify(rooms)); }

export const newId = () => 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export async function list() {
  if (mode === 'server') {
    const r = await fetch('api/rooms', { cache: 'no-store' });
    if (!r.ok) throw new Error('The server did not list the rooms.');
    return r.json();
  }
  return readLocal();
}

export async function put(room) {
  room = { ...room, updated: new Date().toISOString() };
  if (mode === 'server') {
    const r = await fetch('api/rooms/' + room.id, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(room) });
    if (!r.ok) throw new Error('The server did not save the room: ' + (await r.text()));
    return r.json();
  }
  const rooms = readLocal().filter(o => o.id !== room.id);
  rooms.push(room);
  writeLocal(rooms);
  return room;
}

export async function remove(id) {
  if (mode === 'server') {
    const r = await fetch('api/rooms/' + id, { method: 'DELETE' });
    if (!r.ok) throw new Error('The server did not delete the room.');
    return;
  }
  writeLocal(readLocal().filter(o => o.id !== id));
}
