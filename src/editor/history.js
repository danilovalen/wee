// Undo and redo: a stack of whole levels, as text. An edit is recorded only when it
// changed the level, so a click that did nothing leaves nothing to undo.
export const LIMIT = 100;

export const newHistory = () => ({ past: [], future: [] });

// before: the level as text from just before the edit; level: the level now.
export function record(h, before, level) {
  if (before === JSON.stringify(level)) return false;
  h.past.push(before);
  if (h.past.length > LIMIT) h.past.shift();
  h.future = [];
  return true;
}

export function undo(h, level) {
  if (!h.past.length) return null;
  h.future.push(JSON.stringify(level));
  return JSON.parse(h.past.pop());
}

export function redo(h, level) {
  if (!h.future.length) return null;
  h.past.push(JSON.stringify(level));
  return JSON.parse(h.future.pop());
}
