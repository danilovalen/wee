// The tutorial (registers 507, 512, 514, 515, 519, 521, 618): "Tutorial", one room, a coach bubble that walks the
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
import { glyph } from './glyphs.js';

const BLOCK = { x: 4, y: 1 };
const settled = () => S.game && !S.game.player.dir && !S.game.entities.some(e => !e.dead && (e.rush || e.slide));
const goalAt = () => { const i = S.level.cells.indexOf('goal'); return { x: i % S.level.w, y: Math.floor(i / S.level.w) }; };
// On Test's way to the star the robot stays on its top row or the star's column; anywhere else it is lost.
const lost = () => settled() && !S.game.won && S.game.player.y !== 1 && S.game.player.x !== 3;
let ran = false;
const STEPS = [
  { say: 'Swipe across the room, or press an arrow key, to slide Wee.', wait: 'Try any direction.', swipe: true, enter: () => setMode('play'), done: () => S.game && S.game.move > 0 && settled() },
  { say: 'Wee only stops at a block or a wall, so it can’t stop on the berry yet.', next: 'Next', tile: goalAt },
  { say: 'Tap the pencil to go back to building the room.', ring: '#mode', done: () => S.mode === 'edit' },
  { say: 'You don’t move Wee to win: you build its room with blocks.', next: 'Next', ring: '#palette [data-tool="wall"]', enter: () => { S.ui.tool = 'wall'; syncPanel(); } },
  { say: 'Place a block here, so Wee stops right above the berry.', tile: () => BLOCK, done: () => S.level.cells[BLOCK.y * S.level.w + BLOCK.x] === 'wall' },
  { say: 'Tap the arrows to try your room yourself.', ring: '#campTest', done: () => S.mode === 'play' },
  { say: 'Swipe right, then down, to bring Wee to the berry.', wait: 'Arrow keys work too.', swipe: true, tile: goalAt, done: () => S.game && S.game.won && settled(),
    lost: { say: 'Wee can’t reach the berry from there, so it goes back to its start.' } },
  { say: 'Playing it yourself doesn’t beat the level, so tap the pencil to go back.', ring: '#mode', done: () => S.mode === 'edit' },
  { say: 'By tapping play, Wee will find the shortest path to the berry and walk through it.', ring: '#campRun', enter: () => { ran = false; }, done: () => ran && S.mode === 'edit' },
  // Register 587: the side star, and that another room can earn it later (586).
  { say: 'Winning fills the big star; each small star is a side goal, which you don’t need to win.', next: 'Next', ring: '#tutPic', pic: true },
  { say: 'If one room can’t meet every goal, try another room later: stars you earn stay.', next: 'Next', ring: '#tutPic', pic: true },
  { say: 'You beat it, so tap the arrow to see the real levels.', ring: '#campBack', done: () => current() && current().name === 'levels' },
  { say: 'When you beat a level, its big star shows how many tiles you placed: fewer is better.', next: 'Next', ring: '.campRow[data-level="1"] .campStar.main', list: true },
  { say: 'Each side goal you meet fills one of its small stars.', wait: 'Tap Level 1 to start.', ring: '.campRow[data-level="1"]', list: true },
];

let step = -1, ring = null, sel = null, shown = null;
const seen = () => { const p = progress(); p.levels.tutorial = { ...(p.levels.tutorial || {}), seen: true }; write(p); };
const active = () => step >= 0;
const now = () => { const s = STEPS[step]; return s.lost && lost() ? { ...s, ...s.lost, next: null, wait: null, swipe: false } : s; };

// The bubble sits under the goal card on the room screen; on the level list it lives in that page,
// low on the screen, since a page covers everything outside it.
function draw() {
  const s = now(), box = $('tutBox');
  if (shown === s) return;
  shown = s;
  $('tutSay').textContent = s.say;
  // A big star and two small ones, as a level card draws them (register 625).
  $('tutPic').hidden = !s.pic;
  if (s.pic && !$('tutPic').childElementCount) $('tutPic').innerHTML = ['main', '', ''].map((k, i) => `<span class="campStar${k ? ' main on' : ''}">${glyph('star')}</span>${i === 0 ? '<span class="campStarLine"></span>' : ''}`).join('');
  $('tutNext').hidden = !s.next;
  $('tutWait').textContent = s.wait || (s.next ? '' : 'Tap the ringed spot.');
  const host = s.list ? $('campBox') : document.body;
  if (box.parentNode !== host) host.append(box);
  if (s.list) Object.assign(box.style, { top: '', bottom: '12px' });
  else Object.assign(box.style, { top: Math.round($('stage').getBoundingClientRect().top + 4) + 'px', bottom: 'auto' });
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
  // Levels always answers: it leaves the tutorial (register 669).
  if (inside('#campBack')) return true;
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
  // A let-go always gets through, so a stroke started on the ringed tile ends wherever it is released (register 663).
  for (const type of ['pointerdown', 'click', 'contextmenu', 'wheel']) addEventListener(type, ev => {
    if (!active() || allowed(ev)) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
  }, { capture: true, passive: false });
  addEventListener('keydown', ev => {
    if (!active() || (ev.target.closest && ev.target.closest('#tutBox')) || (now().swipe && ARROWS.includes(ev.key))) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
  }, true);
  $('tutNext').onclick = () => to(step + 1);
  // Skipping counts as seen, so Campaign opens the list from then on.
  $('tutSkip').onclick = () => { seen(); stop(); go('levels'); };
  addEventListener('wee:demoDone', () => { if (active() && S.camp && S.camp.verdict && S.camp.verdict.won) ran = true; });
  // Started at once, so the room opens already in the first step's mode and nothing flashes.
  addEventListener('wee:place', ev => {
    const p = ev.detail;
    if (p.name === 'level' && p.arg === 'tutorial') { if (!active()) begin(); }
    // Leaving any other way ends it: the room's save keeps it from opening again by itself (register 669).
    else if (!(active() && p.name === 'levels' && STEPS[step].list) && !(active() && p.name === 'levels' && step === STEPS.length - 3)) { if (active()) stop(); }
  });
}
