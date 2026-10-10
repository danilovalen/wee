// While you play: once everything has come to rest, a search in the background asks whether
// the goal can still be reached, and says so when it cannot. All copy is draft.
import { canWin, settled, stateKey, unsearchable } from '../solve/solve.js';
import { S } from '../editor/state.js';
import { $ } from './dom.js';

const SLICE_MS = 8;
let job = null;

export function resetStuck() { job = null; $('stuck').hidden = true; }

export function watchStuck(game) {
  if (game.won || !settled(game) || unsearchable(S.played)) return;
  const key = stateKey(game);
  if (job && job.key === key) return;
  const me = job = { key }, it = canWin(game);
  $('stuck').hidden = true;
  const slice = () => {
    if (job !== me) return;
    const until = performance.now() + SLICE_MS;
    for (;;) {
      const r = it.next();
      if (r.done) { $('stuck').hidden = r.value !== false; return; }
      if (performance.now() > until) break;
    }
    setTimeout(slice, 0);
  };
  setTimeout(slice, 0);
}
