// Check: runs the solver a slice at a time so the page stays responsive, and shows the
// answer. Show solution plays the found moves in play mode, one each time you come to rest.
import { search } from '../solve/solve.js';
import { S } from '../editor/state.js';
import { $ } from './dom.js';

const SLICE_MS = 25;
const SAY = {
  solved: r => `Solvable in ${r.moves.length} ${r.moves.length === 1 ? 'move' : 'moves'}.`,
  unsolvable: () => 'No solution. Every reachable position was tried.',
  capped: r => `Stopped after ${r.states} positions without finding one.`,
  nogoal: () => 'Place a Goal to check the room.',
  realtime: () => 'Has real-time pieces, so it cannot be checked.',
};

export function checkText(r) { return SAY[r.status](r); }

export function runCheck() {
  const level = JSON.parse(JSON.stringify(S.level)), stamp = JSON.stringify(level);
  const it = search(level);
  S.check = { stamp, result: null };
  $('checkText').textContent = 'Checking...';
  $('showSolution').hidden = true;
  const slice = () => {
    if (!S.check || S.check.stamp !== stamp) return;
    const until = performance.now() + SLICE_MS;
    for (;;) {
      const r = it.next();
      if (r.done) { finish(r.value); return; }
      if (performance.now() > until) { $('checkText').textContent = `Checking... ${r.value} positions`; break; }
    }
    setTimeout(slice, 0);
  };
  slice();
}

function finish(r) {
  S.check.result = r;
  $('checkText').textContent = checkText(r);
  $('showSolution').hidden = r.status !== 'solved';
}

// A check goes stale the moment the room changes.
export function syncCheck() {
  if (!S.check || S.check.stamp === JSON.stringify(S.level)) return;
  S.check = null;
  $('checkText').textContent = '';
  $('showSolution').hidden = true;
}

// Called each tick in play: feeds the next solution move once everything has stopped.
export function feedDemo(game) {
  if (!S.demo || !S.demo.length) return;
  const busy = game.player.dir || game.player.hidden || game.entities.some(e => !e.dead && (e.rush || e.slide));
  if (!busy) S.pending.push(S.demo.shift());
}
