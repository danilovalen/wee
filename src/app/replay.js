// Replay (register 758): any run played back one move at a time. The keys are played again from the room
// as play began, keeping the whole game after each move, so stepping back or forward just shows a kept
// position. Lenses and the room stay as they were; Back returns to the run; in the Sandbox, Edit from here
// opens the position on screen as a new room.
import { S } from '../editor/state.js';
import { $ } from './dom.js';
import { runFrames, levelAt, movesLog } from '../solve/frames.js';

const STEP_MS = 450;
let deps = null, timer = null, lastRun = null;
// The room changed since the last Run: its replay no longer matches what is on screen.
export function forgetRun() { lastRun = null; if ($('campReplay')) $('campReplay').disabled = true; }
const R = () => S.replay;

function show() {
  const r = R(), n = r.frames.length - 1;
  $('rpAt').textContent = r.i ? `Move ${r.i} of ${n}` : `Start, ${n} ${n === 1 ? 'move' : 'moves'}`;
  $('rpStart').disabled = $('rpBack').disabled = r.i === 0;
  $('rpEnd').disabled = $('rpFwd').disabled = r.i === n;
  $('rpPlay').textContent = timer ? 'Pause' : 'Play';
  $('rpPlay').setAttribute('aria-pressed', String(!!timer));
  S.redraw = true;
}
function pause() { clearInterval(timer); timer = null; }
export function replayTo(i) {
  const r = R(); if (!r) return;
  r.i = Math.max(0, Math.min(r.frames.length - 1, i));
  if (r.i === r.frames.length - 1) pause();
  show();
}
// The game the room draws while a replay is open.
export const replayGame = () => R() && R().frames[R().i].game;

export function openReplay(run) {
  if (!S.played || !S.game) return;
  pause();
  const { level, log, ticks } = run || { level: S.played, log: S.keylog, ticks: S.game.tick };
  S.replay = { frames: runFrames(level, log, ticks), i: 0 };
  document.body.classList.add('replaying');
  $('replayBar').hidden = false;
  $('rpEditHere').hidden = !!(S.camp || S.puzzle);
  show();
  $('rpFwd').focus();
}
export function closeReplay() {
  if (!R()) return;
  pause(); S.replay = null;
  document.body.classList.remove('replaying');
  $('replayBar').hidden = true;
  S.redraw = true;
}

export function bindReplay(d) {
  deps = d;
  for (const id of ['replayBtn', 'winReplay', 'cardReplay']) if ($(id)) $(id).onclick = () => { if ($('winBox').open) $('winBox').close(); openReplay(); };
  // Show solution opens the found answer in Replay, to step through at your own pace (register 771).
  $('showSolution').onclick = () => {
    const moves = S.check?.result?.moves; if (!moves) return;
    deps.setMode('play'); openReplay({ level: S.played, ...movesLog(S.played, moves) });
  };
  // A Run plays live, then offers Replay for as long as the room stays as it ran (register 771).
  addEventListener('wee:demoDone', () => {
    if (!S.camp || !S.played || !S.game) return;
    lastRun = { level: S.played, log: [...S.keylog], ticks: S.game.tick, stamp: JSON.stringify(S.level) };
    $('campReplay').disabled = false;
  });
  $('campReplay').onclick = () => {
    if (!lastRun || lastRun.stamp !== JSON.stringify(S.level)) { $('campReplay').disabled = true; return; }
    const run = lastRun;
    deps.setMode('play'); openReplay(run);
  };
  $('rpStart').onclick = () => { pause(); replayTo(0); };
  $('rpBack').onclick = () => { pause(); replayTo(R().i - 1); };
  $('rpFwd').onclick = () => { pause(); replayTo(R().i + 1); };
  $('rpEnd').onclick = () => { pause(); replayTo(Infinity); };
  $('rpPlay').onclick = () => {
    if (timer) { pause(); show(); return; }
    if (R().i === R().frames.length - 1) R().i = 0;
    timer = setInterval(() => replayTo(R().i + 1), STEP_MS); show();
  };
  $('rpClose').onclick = closeReplay;
  $('rpEditHere').onclick = () => {
    const level = levelAt(S.played, replayGame());
    if (!deps.leaveOk()) return;
    closeReplay(); deps.setMode('edit'); deps.openRoom(level, {});
  };
  // Left and right step, Home and End jump, Space plays, Escape leaves (registers 740, 758).
  addEventListener('keydown', e => {
    if (!R() || e.target.closest && e.target.closest('input, textarea')) return;
    const act = { ArrowLeft: 'rpBack', ArrowRight: 'rpFwd', Home: 'rpStart', End: 'rpEnd', ' ': 'rpPlay', Escape: 'rpClose' }[e.key];
    if (act) { e.preventDefault(); e.stopImmediatePropagation(); $(act).click(); }
  }, true);
}
