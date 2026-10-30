// The tutorial (registers 507, 512): "How to play", one room, a coach bubble that walks the player
// through it. Strict: each step waits for one thing, and only the ringed thing answers a tap.
// Copy is a draft.
import { S } from '../editor/state.js';
import { $ } from './dom.js';
import { setMode } from './play.js';
import { syncPanel } from './panels.js';
import { toRoom, toScreen } from './camera.js';
import { T } from '../view/ink.js';
import { go, current } from './nav.js';
import { progress, write } from './progress.js';

const BLOCK = { x: 4, y: 1 };
const STEPS = [
  { say: 'The robot slides in a straight line until a block or a wall stops it.', next: 'Next', enter: () => { setMode('play'); setTimeout(() => S.pending && S.pending.push('right'), 400); } },
  { say: 'With nothing to stop it above the star, the robot slid right past it.', next: 'Next', tile: () => goalAt() },
  { say: 'You don’t move the robot yourself: you build its room with blocks.', next: 'Next', ring: '#palette [data-tool="wall"]', enter: () => { setMode('edit'); S.ui.tool = 'wall'; syncPanel(); } },
  { say: 'Place a block here, so the robot stops right above the star.', tile: () => BLOCK, done: () => S.level.cells[BLOCK.y * S.level.w + BLOCK.x] === 'wall' },
  { say: 'By tapping Run, the robot will find the shortest path to the star and walk through it.', ring: '#campRun', waitWin: true },
  { say: 'The big star means you won, the small stars are side goals, and the number counts the tiles you placed: fewer is better.', next: 'Level 1', end: true, low: true },
];

let step = -1, ring = null;
const active = () => step >= 0;
const goalAt = () => { const i = S.level.cells.indexOf('goal'); return { x: i % S.level.w, y: Math.floor(i / S.level.w) }; };

function show() {
  const s = STEPS[step];
  $('tutSay').textContent = s.say;
  $('tutNext').hidden = !s.next; $('tutNext').textContent = s.next || '';
  $('tutWait').hidden = !!s.next; $('tutSkip').hidden = !!s.end;
  place(s);
  if (ring) ring.classList.remove('tutRing');
  ring = s.ring ? document.querySelector(s.ring) : null;
  if (ring) ring.classList.add('tutRing');
  if (s.enter) s.enter();
}
// Under the goal card, clear of the room, the tools and Run; the last step sits low, under the verdict.
function place(s) {
  const box = $('tutBox'), card = $('campBrief').getBoundingClientRect();
  if (s.low) Object.assign(box.style, { top: '', bottom: '12px' });
  else Object.assign(box.style, { top: Math.round(card.bottom + 8) + 'px', bottom: 'auto' });
}
function to(n) { step = n; show(); }
function begin() { $('tutBox').hidden = false; document.body.classList.add('tutorial'); to(0); loop(); }
export function stop() {
  step = -1; $('tutBox').hidden = true; $('tutTile').hidden = true; document.body.classList.remove('tutorial');
  if (ring) ring.classList.remove('tutRing'); ring = null;
}

// Each frame: the ringed tile follows the camera, and a step that waits on the room checks it.
function loop() {
  if (!active()) return;
  const s = STEPS[step], box = $('tutTile'), at = s.tile && s.tile();
  box.hidden = !at;
  if (at) {
    const a = toScreen(at.x * T, at.y * T), b = toScreen((at.x + 1) * T, (at.y + 1) * T);
    Object.assign(box.style, { left: a.x + 'px', top: a.y + 'px', width: (b.x - a.x) + 'px', height: (b.y - a.y) + 'px' });
  }
  if (s.done && s.done()) { to(step + 1); }
  requestAnimationFrame(loop);
}

// Strict: a tap reaches only the bubble, the ringed control, or the ringed tile when the step waits on it.
function allowed(ev) {
  const t = ev.target;
  if (t.closest && t.closest('#tutBox')) return true;
  const s = STEPS[step];
  if (ring && t.closest && t.closest(s.ring)) return true;
  if (s.done && t.id === 'game' || (s.done && t.closest && t.closest('#game'))) {
    const at = toRoom(ev.clientX, ev.clientY);
    return Math.floor(at.x / T) === BLOCK.x && Math.floor(at.y / T) === BLOCK.y;
  }
  return false;
}

export function bindTutorial() {
  for (const type of ['pointerdown', 'pointerup', 'click', 'contextmenu', 'wheel']) addEventListener(type, ev => {
    if (!active() || allowed(ev)) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
  }, { capture: true, passive: false });
  addEventListener('keydown', ev => { if (active() && !(ev.target.closest && ev.target.closest('#tutBox'))) { ev.preventDefault(); ev.stopImmediatePropagation(); } }, true);
  $('tutNext').onclick = () => { const s = STEPS[step]; if (s.end) { stop(); go('level', '1'); } else to(step + 1); };
  // Skipping counts as seen, so Campaign opens the list from then on.
  $('tutSkip').onclick = () => { const p = progress(); p.levels.tutorial = { ...(p.levels.tutorial || {}), seen: true }; write(p); stop(); go('levels'); };
  addEventListener('wee:demoDone', () => { if (active() && STEPS[step].waitWin && S.camp && S.camp.verdict && S.camp.verdict.won) setTimeout(() => active() && to(step + 1), 600); });
  addEventListener('wee:place', ev => {
    const p = ev.detail;
    if (p.name === 'level' && p.arg === 'tutorial') { if (!active()) setTimeout(begin, 300); }
    else if (active()) stop();
  });
}
export const inTutorial = () => active() && current() && current().arg === 'tutorial';
