// The tutorial (registers 507, 512, 514, 515): "How to play", one room, a coach bubble that walks the
// player through moving the robot, building, Test, Run and the stars on the level list. Strict: each
// step waits for one thing, and only the ringed thing answers a tap. Copy is a draft.
import { S } from '../editor/state.js';
import { $ } from './dom.js';
import { setMode } from './play.js';
import { syncPanel } from './panels.js';
import { toRoom, toScreen } from './camera.js';
import { T } from '../view/ink.js';
import { go, current } from './nav.js';
import { progress, write } from './progress.js';

const BLOCK = { x: 4, y: 1 };
const settled = () => S.game && !S.game.player.dir && !S.game.entities.some(e => !e.dead && (e.rush || e.slide));
const goalAt = () => { const i = S.level.cells.indexOf('goal'); return { x: i % S.level.w, y: Math.floor(i / S.level.w) }; };
// On Test's way to the star the robot stays on its top row or the star's column; anywhere else it is lost.
const lost = () => settled() && !S.game.won && S.game.player.y !== 1 && S.game.player.x !== 3;
let ran = false;
const STEPS = [
  { say: 'Swipe across the room, or press an arrow key, to slide the robot.', wait: 'Try any direction.', swipe: true, enter: () => setMode('play'), done: () => S.game && S.game.move > 0 && settled() },
  { say: 'The robot only stops at a block or a wall, so it can’t stop on the star yet.', next: 'Next', tile: goalAt },
  { say: 'Tap Edit to go back to building the room.', ring: '#mode', done: () => S.mode === 'edit' },
  { say: 'You don’t move the robot to win: you build its room with blocks.', next: 'Next', ring: '#palette [data-tool="wall"]', enter: () => { S.ui.tool = 'wall'; syncPanel(); } },
  { say: 'Place a block here, so the robot stops right above the star.', tile: () => BLOCK, done: () => S.level.cells[BLOCK.y * S.level.w + BLOCK.x] === 'wall' },
  { say: 'Tap Test to try your room yourself.', ring: '#campTest', done: () => S.mode === 'play' },
  { say: 'Swipe right, then down, to bring the robot to the star.', wait: 'Arrow keys work too.', swipe: true, tile: goalAt, done: () => S.game && S.game.won && settled(),
    lost: { say: 'The robot can’t reach the star from there, so it goes back to its start.' } },
  { say: 'Playing it yourself doesn’t beat the level, so tap Edit to go back.', ring: '#mode', done: () => S.mode === 'edit' },
  { say: 'By tapping Run, the robot will find the shortest path to the star and walk through it.', ring: '#campRun', enter: () => { ran = false; }, done: () => ran && S.mode === 'edit' },
  { say: 'You beat the level: tap Levels to see your star.', ring: '#campBack', done: () => current() && current().name === 'levels' },
  { say: 'This star means you beat the level, and its number counts the tiles you placed: fewer is better.', next: 'Next', ring: '.campRow[data-level="tutorial"] .campStar.main', list: true },
  { say: 'The other levels also have side goals, and each one you meet fills a small star.', wait: 'Tap Level 1 to start.', ring: '.campRow[data-level="1"]', list: true },
];

let step = -1, ring = null, sel = null, shown = null;
const active = () => step >= 0;
const now = () => { const s = STEPS[step]; return s.lost && lost() ? { ...s, ...s.lost, next: null, wait: null, swipe: false } : s; };

// The bubble sits under the goal card on the room screen; on the level list it lives in that page,
// low on the screen, since a page covers everything outside it.
function draw() {
  const s = now(), box = $('tutBox');
  if (shown === s) return;
  shown = s;
  $('tutSay').textContent = s.say;
  $('tutNext').hidden = !s.next; $('tutNext').textContent = s.next || '';
  $('tutWait').textContent = s.wait || (s.next ? '' : 'Tap the ringed spot.');
  const host = s.list ? $('campBox') : document.body;
  if (box.parentNode !== host) host.append(box);
  if (s.list) Object.assign(box.style, { top: '', bottom: '12px' });
  else Object.assign(box.style, { top: Math.round($('campBrief').getBoundingClientRect().bottom + 8) + 'px', bottom: 'auto' });
  if (ring) ring.classList.remove('tutRing');
  sel = s.ring || null; ring = sel ? document.querySelector(sel) : null;
  if (ring) ring.classList.add('tutRing');
}
function to(n) { step = n; shown = null; const s = STEPS[n]; if (s.enter) s.enter(); draw(); }
function begin() { $('tutBox').hidden = false; document.body.classList.add('tutorial'); to(0); requestAnimationFrame(loop); }
export function stop() {
  step = -1; shown = null; $('tutBox').hidden = true; $('tutTile').hidden = true; document.body.classList.remove('tutorial');
  document.body.append($('tutBox'));
  if (ring) ring.classList.remove('tutRing'); ring = null;
}

// Each frame: the bubble follows the step (and Test's lost robot), the ringed tile follows the camera,
// and a step that waits on the game checks it.
function loop() {
  if (!active()) return;
  draw();
  const s = now(), box = $('tutTile'), at = !s.list && s.tile && s.tile();
  box.hidden = !at;
  if (at) {
    const a = toScreen(at.x * T, at.y * T), b = toScreen((at.x + 1) * T, (at.y + 1) * T);
    Object.assign(box.style, { left: a.x + 'px', top: a.y + 'px', width: (b.x - a.x) + 'px', height: (b.y - a.y) + 'px' });
  }
  if (ring && !ring.isConnected) { ring = sel && document.querySelector(sel); if (ring) ring.classList.add('tutRing'); }
  // A robot lost on Test's way goes back to its start after a moment, once.
  if (s !== STEPS[step] && !S.tutBack) S.tutBack = setTimeout(() => { S.tutBack = null; if (active() && lost()) S.pending.push('respawn'); }, 1500);
  if (STEPS[step].done && STEPS[step].done()) { to(step + 1); }
  requestAnimationFrame(loop);
}

// Strict: a tap reaches only the bubble, the ringed control, the ringed tile when the step waits on a
// block there, or the room when the step asks for a swipe.
function allowed(ev) {
  const t = ev.target, s = now(), inside = q => t.closest && t.closest(q);
  if (inside('#tutBox')) return true;
  if (sel && inside(sel)) return true;
  if (s.swipe && (inside('#roomArea') || t === document.documentElement || t === document.body)) return true;
  if (s.tile && s.done && !s.swipe && inside('#game')) {
    const at = toRoom(ev.clientX, ev.clientY), c = s.tile();
    return Math.floor(at.x / T) === c.x && Math.floor(at.y / T) === c.y;
  }
  return false;
}
const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

export function bindTutorial() {
  for (const type of ['pointerdown', 'pointerup', 'click', 'contextmenu', 'wheel']) addEventListener(type, ev => {
    if (!active() || allowed(ev)) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
  }, { capture: true, passive: false });
  addEventListener('keydown', ev => {
    if (!active() || (ev.target.closest && ev.target.closest('#tutBox')) || (now().swipe && ARROWS.includes(ev.key))) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
  }, true);
  $('tutNext').onclick = () => to(step + 1);
  // Skipping counts as seen, so Campaign opens the list from then on.
  $('tutSkip').onclick = () => { const p = progress(); p.levels.tutorial = { ...(p.levels.tutorial || {}), seen: true }; write(p); stop(); go('levels'); };
  addEventListener('wee:demoDone', () => { if (active() && S.camp && S.camp.verdict && S.camp.verdict.won) ran = true; });
  // Started at once, so the room opens already in the first step's mode and nothing flashes.
  addEventListener('wee:place', ev => {
    const p = ev.detail;
    if (p.name === 'level' && p.arg === 'tutorial') { if (!active()) begin(); }
    else if (!(active() && p.name === 'levels' && STEPS[step].list) && !(active() && p.name === 'levels' && step === STEPS.length - 3)) { if (active()) stop(); }
  });
}
