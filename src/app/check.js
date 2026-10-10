// Check: runs the solver a slice at a time so the page stays responsive, and shows the
// answer. Show solution plays the found moves in play mode, one each time you come to rest.
import { search, parseMove } from '../solve/solve.js';
import { lint, brokenAt } from '../solve/lint.js';
import { now } from './dom.js';
import { S } from '../editor/state.js';
import { $ } from './dom.js';
import { runDesign, clearDesign } from './design.js';

const SLICE_MS = 25;
// While you edit, the room is solved this long after the last change, with a smaller cap.
const LIVE_WAIT_MS = 300, LIVE_MAX = 5000;
let liveTimer = null;
const SAY = {
  solved: r => `Solvable in ${r.moves.length} ${r.moves.length === 1 ? 'move' : 'moves'}.`,
  unsolvable: () => 'No solution. Every reachable position was tried.',
  capped: r => `Stopped after ${r.states} positions without finding one.`,
  nogoal: () => 'Place a Goal to check the room.',
  realtime: () => 'Has real-time pieces, so it cannot be checked.',
};

export function checkText(r) { return SAY[r.status](r); }

// A live check runs by itself after an edit: it has a smaller cap and leaves the design
// notes to Check.
export function runCheck(live = false) {
  const level = JSON.parse(JSON.stringify(S.level)), stamp = JSON.stringify(level);
  const it = search(level, live ? LIVE_MAX : undefined);
  S.check = { stamp, result: null, live };
  clearDesign();
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
  $('checkText').textContent = S.check.live && r.status === 'capped' ? 'Too big to tell while editing. Press Check to search further.' : checkText(r);
  $('showSolution').hidden = r.status !== 'solved';
  if (r.status === 'solved' && !S.check.live) runDesign(r.moves.length);
}

// A check goes stale the moment the room changes, and a live one starts after a pause.
export function syncCheck() {
  const stamp = JSON.stringify(S.level);
  if (S.check && S.check.stamp === stamp) return;
  if (S.check) {
    S.check = null;
    clearDesign();
    $('checkText').textContent = '';
    $('showSolution').hidden = true;
  }
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => { if (!S.check && JSON.stringify(S.level) === stamp) runCheck(true); }, LIVE_WAIT_MS);
}

// Called each tick in play: feeds the next solution move once everything has stopped.
// A compound move ('right@3:left') presses its second key on that tick of the slide.
export function feedDemo(game) {
  const w = S.demoWait;
  if (w) { if (++w.i === w.at) { S.pending.push(w.then); S.demoWait = null; } return; }
  if (!S.demo || !S.demo.length) return;
  const busy = game.player.dir || game.player.hidden || game.entities.some(e => !e.dead && (e.rush || e.slide));
  if (busy) return;
  const { k, at, then } = parseMove(S.demo.shift());
  S.pending.push(k);
  if (then) S.demoWait = { i: 0, at, then };
}

// Warnings about the room, and whether its saved solution still wins. Tap one to see where.
let lintStamp = null;
export function syncLint() {
  if (S.mode !== 'edit') { $('lintBox').hidden = true; return; }
  const stamp = JSON.stringify(S.level) + (S.room && S.room.solution ? S.room.solution.join() : '');
  if (stamp === lintStamp) return;
  lintStamp = stamp;
  const warns = lint(S.level), sol = S.room && S.room.solution;
  if (sol) {
    const n = brokenAt(S.level, sol);
    if (n) warns.unshift({ x: S.level.start.x, y: S.level.start.y, msg: `The saved solution no longer wins: it breaks at move ${n} of ${sol.length}. Check again and save.` });
  }
  $('lintBox').hidden = !warns.length;
  $('lintSum').textContent = `${warns.length} ${warns.length === 1 ? 'warning' : 'warnings'}`;
  $('lintList').replaceChildren(...warns.map(w => {
    const li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.textContent = w.msg;
    b.onclick = () => S.fx.push({ type: 'flash', x: w.x, y: w.y, at: now() });
    li.append(b);
    return li;
  }));
}
