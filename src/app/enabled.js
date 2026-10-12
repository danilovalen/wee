// A control that would do nothing right now is greyed out, never left to refuse a click.
// Runs after every change to the room and every switch between editing and playing.
import { S } from '../editor/state.js';
import { $ } from './dom.js';
import { moveSide } from '../level/format.js';

export function syncEnabled() {
  const level = S.level;
  // With no start (a cut took it), there is nothing to play or check until one is placed.
  $('mode').disabled = S.mode === 'edit' && !level.start;
  $('checkBtn').disabled = !level.start;
  // A side's add or cut is greyed out when it cannot happen (a placed thing, 2x2, 40x30).
  document.querySelectorAll('[data-side][data-delta]').forEach(b => { b.disabled = !moveSide(level, b.dataset.side, +b.dataset.delta); });
}
