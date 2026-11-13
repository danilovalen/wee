// Nudges instead of paragraphs (register 955, docs/ONBOARDING_PROPOSAL.md): in Puzzle 0 and Build 0, once the
// player has been still for a while, the one thing to do next pulses, and keeps pulsing until it is done.
import { S } from '../editor/state.js';
import { $ } from './dom.js';
import { progress } from './progress.js';
import { INTRO } from '../campaign/progression.js';

export const IDLE_MS = { swipe: 4000, build: 6000 };
let still = Date.now(), ran = false;
const idle = ms => Date.now() - still >= ms;
const walls = () => S.level.cells.filter(c => c === 'wall').length;
const big = () => S.level.w > 3 || S.level.h > 3;

// What the player has not done yet, with how long to wait before nudging it: [selector or 'swipe', ms], or null.
function need() {
  if (S.puzzle && S.puzzle.id === INTRO.puzzle?.id) return S.game && !S.game.move ? ['swipe', IDLE_MS.swipe] : null;
  if (!S.camp || S.camp.def.id !== INTRO.build?.id || S.mode !== 'edit' || S.demoRunning) return null;
  if (!walls()) return ['[data-tool="wall"]', IDLE_MS.build];
  const won = progress().levels[S.camp.def.id]?.beaten;
  if (!won && !ran) return ['#campRun', IDLE_MS.build];
  return won && big() ? ['.grip', IDLE_MS.build] : null;
}
// Once a nudge shows, it stays until its thing is done, whatever else is tapped (register 955).
let shown = null;
export function want() {
  const n = need();
  if (!n) { shown = null; return null; }
  if (shown !== n[0] && idle(n[1])) shown = n[0];
  return shown === n[0] ? shown : null;
}

function sync() {
  const w = want();
  for (const e of document.querySelectorAll('.nudge')) if (!w || !e.matches(w)) e.classList.remove('nudge');
  if (w && w !== 'swipe') for (const e of document.querySelectorAll(w)) if (e.checkVisibility()) e.classList.add('nudge');
  $('nudgeHand').hidden = w !== 'swipe';
}

export function bindNudges() {
  const act = () => { still = Date.now(); };
  for (const t of ['pointerdown', 'keydown']) addEventListener(t, act, true);
  addEventListener('wee:demoDone', () => { ran = true; });
  addEventListener('hashchange', () => { ran = false; act(); });
  setInterval(sync, 250);
}
