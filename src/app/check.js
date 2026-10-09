// Check: runs the solver a slice at a time so the page stays responsive, and shows the
// answer. Show solution plays the found moves in play mode, one each time you come to rest.
import { search, parseMove, reach } from '../solve/solve.js';
import { lint, brokenAt } from '../solve/lint.js';
import { now } from './dom.js';
import { S } from '../editor/state.js';
import { $ } from './dom.js';

const SLICE_MS = 25;
// The stop map searches this long, then shows what it found.
const STOPS_BUDGET_MS = 2000;
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

// The stop map, toggled from the Look tool: computed a slice at a time, drawn while the
// room is unchanged.
export function toggleStops() {
  if (S.stops) { S.stops = null; $('stopsBtn').setAttribute('aria-pressed', 'false'); $('stopsBtn').textContent = 'Show stops'; return; }
  const stamp = JSON.stringify(S.level), out = {}, it = reach(JSON.parse(stamp), { budgetMs: STOPS_BUDGET_MS, out });
  S.stops = { stamp, list: null, out };
  $('stopsBtn').setAttribute('aria-pressed', 'true'); $('stopsBtn').textContent = 'Hide stops';
  const slice = () => {
    if (!S.stops || S.stops.stamp !== stamp) return;
    const until = performance.now() + SLICE_MS;
    for (;;) {
      const r = it.next();
      if (r.done) {
        S.stops.list = r.value.stops;
        S.redraw = true;
        $('placeHint').textContent = r.value.why ? 'Has real-time pieces, so stops cannot be mapped.' : `${r.value.stops.length} tiles you can stop on${r.value.capped ? ', maybe more' : ''}.`;
        return;
      }
      if (performance.now() > until) break;
    }
    setTimeout(slice, 0);
  };
  slice();
}
