// While you play: once everything has come to rest, a search in the background asks whether
// the goal can still be reached. When it cannot, a few seconds later a quiet bubble suggests Undo, with a
// sound that means "undo" (register 661). A room that cannot be won from its start says nothing: that is a
// level still being built, not a softlock (register 681).
import { canWin, settled, stateKey, unsearchable } from '../solve/solve.js';
import { createGame } from '../rules/game.js';
import { S } from '../editor/state.js';
import { $ } from './dom.js';
import { play } from './sound.js';

const SLICE_MS = 8, WAIT_MS = 2500;
let job = null, timer = null, start = null;

// keep: an Undo keeps the bubble up until the search finds the goal reachable again (register 688).
export function resetStuck(keep = false) { job = null; clearTimeout(timer); if (!keep) { $('stuck').hidden = true; banner(STUCK); } }
// The whole bubble is the button (757), and with nothing to undo it offers Reset instead.
const STUCK = 'Stuck? Undo your last move.';
function banner(text) {
  const undo = !!(S.undoPlay && S.undoPlay.length);
  $('stuckText').textContent = undo ? text : text.replace(/Undo your last move\./, 'Reset the room.');
  $('stuckReset').textContent = undo ? 'Undo' : 'Reset';
}
// A death leaves the blob where it died and asks for an Undo, as Baba Is You does (register 775).
export function showDead() { job = null; clearTimeout(timer); banner('You died, so undo your last move.'); $('stuck').hidden = false; play('stuck'); }

export function watchStuck(game) {
  if (game.won) { resetStuck(); return; }
  if (!settled(game) || unsearchable(S.played)) return;
  const key = stateKey(game);
  if (job && job.key === key) return;
  if (!start || start.of !== S.played) start = { of: S.played, it: canWin(createGame(S.played)), wins: undefined };
  const me = job = { key }, it = canWin(game), from = start;
  // Still stuck after a move or an Undo, the bubble stays as it is, with no second sound (register 688).
  clearTimeout(timer);
  const slice = () => {
    if (job !== me) return;
    const until = performance.now() + SLICE_MS;
    for (;;) {
      if (from.wins === undefined) { const r = from.it.next(); if (r.done) from.wins = r.value; else if (performance.now() > until) break; else continue; }
      if (from.wins !== true) return;
      const r = it.next();
      if (r.done) {
        if (r.value !== false) $('stuck').hidden = true;
        else if ($('stuck').hidden) timer = setTimeout(() => { if (job === me) { banner(STUCK); $('stuck').hidden = false; play('stuck'); } }, window.__stuckMs ?? WAIT_MS);
        return;
      }
      if (performance.now() > until) break;
    }
    setTimeout(slice, 0);
  };
  setTimeout(slice, 0);
}
