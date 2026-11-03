// While you play: once everything has come to rest, a search in the background asks whether
// the goal can still be reached. When it cannot, a few seconds later a quiet bubble suggests Undo, with a
// sound that means "undo" (register 661).
import { canWin, settled, stateKey, unsearchable } from '../solve/solve.js';
import { S } from '../editor/state.js';
import { $ } from './dom.js';
import { play } from './sound.js';

const SLICE_MS = 8, WAIT_MS = 2500;
let job = null, timer = null;

export function resetStuck() { job = null; clearTimeout(timer); $('stuck').hidden = true; }

export function watchStuck(game) {
  if (game.won || !settled(game) || unsearchable(S.played)) return;
  const key = stateKey(game);
  if (job && job.key === key) return;
  const me = job = { key }, it = canWin(game);
  $('stuck').hidden = true; clearTimeout(timer);
  const slice = () => {
    if (job !== me) return;
    const until = performance.now() + SLICE_MS;
    for (;;) {
      const r = it.next();
      if (r.done) {
        if (r.value === false) timer = setTimeout(() => { if (job === me) { $('stuck').hidden = false; play('stuck'); } }, window.__stuckMs ?? WAIT_MS);
        return;
      }
      if (performance.now() > until) break;
    }
    setTimeout(slice, 0);
  };
  setTimeout(slice, 0);
}
