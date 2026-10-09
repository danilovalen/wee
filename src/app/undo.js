// Every change to the level goes through change(), so it can be undone as one step.
import { record, undo, redo } from '../editor/history.js';
import { S } from '../editor/state.js';
import { $ } from './dom.js';
import { syncCheck, syncLint } from './check.js';
import { syncRoomsButton, followUndo } from './rooms.js';

export function syncUndo() {
  $('undo').disabled = S.mode !== 'edit' || !S.history.past.length;
  $('redo').disabled = S.mode !== 'edit' || !S.history.future.length;
}

// A drag is one step: begin() at pointer down, end() at pointer up.
export function begin() { S.before = JSON.stringify(S.level); }
export function end() {
  if (S.before === null) return;
  record(S.history, S.before, S.level);
  S.before = null;
  syncUndo();
  syncCheck();
  syncLint();
  syncRoomsButton();
}

// One whole edit: fn may change S.level in place or replace it.
export function change(fn) { begin(); fn(); end(); }

export function step(back, after) {
  if (S.mode !== 'edit') return;
  const l = back ? undo(S.history, S.level) : redo(S.history, S.level);
  if (!l) return;
  S.level = l;
  followUndo();
  after();
  syncUndo();
}
