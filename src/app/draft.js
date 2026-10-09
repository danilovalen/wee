// Autosave: the room being edited, with its name and note, kept in this browser after
// every change, so a closed tab or a phone that drops the page loses nothing. Saving the
// room clears it; a reload with a draft newer than the saved room brings the draft back.
import { S } from '../editor/state.js';

const KEY = 'wee.draft';
let timer = null;

export function readDraft() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
export function clearDraft() {
  clearTimeout(timer); timer = null;
  try { localStorage.removeItem(KEY); } catch { /* storage off */ }
}
function write() {
  timer = null;
  const r = S.room || {};
  const draft = { level: S.level, id: r.id || null, name: r.name || '', note: r.note || '', solution: r.solution || null, at: new Date().toISOString() };
  try { localStorage.setItem(KEY, JSON.stringify(draft)); } catch { /* storage full or off: nothing to do */ }
}
// Called whenever the room or its name or note may have changed; writes once things settle.
export function noteChange(dirty) {
  if (!dirty) { clearDraft(); return; }
  clearTimeout(timer);
  timer = setTimeout(write, 400);
}
// For a closing tab: write now, not later.
export function flushDraft(dirty) { if (dirty && timer) { clearTimeout(timer); write(); } }
