// A control that would do nothing right now is greyed out, never left to refuse a click.
// Runs after every change to the room, every switch between editing and playing, and each
// tick of a run. Controls marked data-edit work on the room being edited, so a run greys them.
import { S } from '../editor/state.js';
import { $ } from './dom.js';
import { moveSide } from '../level/format.js';
import { stateKey } from '../solve/solve.js';

export function syncEnabled() {
  const level = S.level, play = S.mode === 'play';
  document.querySelectorAll('[data-edit]').forEach(b => { b.disabled = play; });
  if (play) {
    $('mode').disabled = false;
    // Reset does nothing until the run has moved away from where it would put you.
    $('respawnBtn').disabled = !!S.game && stateKey(S.game) === S.freshKey;
    return;
  }
  // With no start (a cut took it), there is nothing to play or check until one is placed.
  $('mode').disabled = !level.start;
  $('checkBtn').disabled = !level.start;
  // A side's add or cut is greyed out when it cannot happen (a placed thing, 2x2, 40x30).
  document.querySelectorAll('[data-side][data-delta]').forEach(b => { b.disabled = !moveSide(level, b.dataset.side, +b.dataset.delta); });
}
