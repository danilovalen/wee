// A room is a level plus what the person wrote about it. These split and join the two.
import { parseLevel } from './format.js';

export const META = ['id', 'name', 'note', 'updated', 'par', 'solution', 'uses', 'recipe'];

export function splitRoom(room) {
  const meta = {}, level = { ...room };
  for (const k of META) { meta[k] = room[k] ?? null; delete level[k]; }
  return { meta, level: parseLevel(JSON.stringify(level)) };
}

export const joinRoom = (meta, level) => ({
  ...level, id: meta.id, name: meta.name, note: meta.note || '',
  ...(meta.solution ? { par: meta.solution.length, solution: meta.solution, uses: meta.uses || [] } : {}),
  ...(meta.recipe ? { recipe: meta.recipe } : {}),
});

// What counts as the room's content when asking whether it has unsaved changes.
export const stampOf = level => JSON.stringify(level);

export function pack(rooms) { return { format: 'wee-pack', version: 1, rooms }; }

// A pack file, or a single level file read as a pack of one.
export function unpack(text) {
  const data = JSON.parse(text);
  if (data.format === 'wee-pack' && Array.isArray(data.rooms)) return data.rooms.map(r => { splitRoom(r); return r; });
  if (data.format === 'wee-level') { splitRoom(data); return [data]; }
  throw new Error('Not a wee room or pack file.');
}
