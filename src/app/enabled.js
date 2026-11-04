// A control that would do nothing right now is greyed out, never left to refuse a click.
// Runs after every change to the room, every switch between editing and playing, and each
// tick of a run. Controls marked data-edit work on the room being edited, so a run greys them.
import { S } from '../editor/state.js';
import { $, DEFAULT_HINT } from './dom.js';
import { stateKey } from '../solve/solve.js';

const NO_BLOB = 'Place the blob to play or check this room.';
export function syncEnabled() {
  const level = S.level, play = S.mode === 'play';
  document.querySelectorAll('[data-edit]').forEach(b => { b.disabled = play; });
  if (play) {
    $('mode').disabled = false;
    // Reset does nothing until the run has moved away from where it would put you.
    $('respawnBtn').disabled = !!S.game && stateKey(S.game) === S.freshKey;
    $('playUndo').disabled = !(S.undoPlay && S.undoPlay.length) || !!S.demoRunning;
    return;
  }
  // With no start (taken off, register 705, or cut), there is nothing to play or check until one is placed,
  // and the hint says so.
  $('mode').disabled = !level.start;
  const hint = $('placeHint');
  if (!level.start && hint.textContent === DEFAULT_HINT) hint.textContent = NO_BLOB;
  else if (level.start && hint.textContent === NO_BLOB) hint.textContent = DEFAULT_HINT;
  // Check is greyed out while this exact room's full check runs or once it is done: a second
  // press would redo the same work and redraw the same words.
  const stamp = level.start && S.check && !S.check.live ? JSON.stringify(level) : null;
  $('checkBtn').disabled = !level.start || (!!stamp && S.check.stamp === stamp);
}
