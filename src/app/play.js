// Play mode: switching modes, the tick loop, drawing each frame, and the copied report.
import { TICK_MS } from '../rules/base.js';
import { createGame, step, gameText } from '../rules/game.js';
import { aimKey } from '../rules/player.js';
import { drawEdit, drawPlay } from '../view/scene.js';
import { S } from '../editor/state.js';
import { $, g, now } from './dom.js';
import { syncPanel, keysText } from './panels.js';

export function snapshot(s) {
  const ents = {};
  for (const e of s.entities) ents[e.id] = { x: e.x, y: e.y };
  return { player: { x: s.player.x, y: s.player.y }, ents };
}

export function tick() {
  const game = S.game;
  for (const k of S.pending) S.keylog.push({ t: game.tick, k });
  S.prev = snapshot(game);
  const before = { x: game.player.x, y: game.player.y };
  step(game, S.pending);
  S.pending = [];
  const t = now();
  $('moves').textContent = `Moves ${game.move}`;
  for (const e of game.events) {
    if (e.type === 'win') { $('winText').textContent = `Solved in ${e.moves} ${e.moves === 1 ? 'move' : 'moves'}.`; $('win').hidden = false; }
    if (e.type === 'dive') S.fx.push({ ...e, toX: game.player.x, toY: game.player.y, at: t });
    else S.fx.push({ ...e, at: t, x: e.x ?? before.x, y: e.y ?? before.y });
  }
}

// A key as the rules should take it, given where you are drawn right now.
export const aim = k => S.game ? aimKey(S.game, k, S.acc / TICK_MS) : k;

export function setMode(m, keep) {
  if (keep) { $('keys').textContent = keysText(); return; }
  S.mode = m;
  document.body.classList.toggle('play', m === 'play');
  $('mode').textContent = m === 'play' ? 'Edit' : 'Play';
  $('keys').textContent = keysText();
  $('pad').hidden = m !== 'play';
  $('win').hidden = true;
  $('moves').textContent = m === 'play' ? 'Moves 0' : '';
  S.fx = [];
  if (m === 'edit') { S.ui.tool = 'look'; S.ui.group = 'basic'; }
  syncPanel();
  if (m === 'play') { S.played = JSON.parse(JSON.stringify(S.level)); S.keylog = []; S.game = createGame(S.level); S.prev = snapshot(S.game); S.pending = []; S.acc = 0; }
  else S.game = null;
}

export function frame(t) {
  const dt = Math.min(250, t - (S.last || t)); S.last = t;
  if (S.mode === 'play' && !window.__manualClock) {
    S.acc += dt;
    while (S.acc >= TICK_MS) { tick(); S.acc -= TICK_MS; }
  }
  render();
  requestAnimationFrame(frame);
}

export function render() {
  const t = now();
  S.fx = S.fx.filter(f => t - f.at < 400);
  if (S.mode === 'play') drawPlay(g, S.game, S.prev, Math.min(1, S.acc / TICK_MS), S.fx, t);
  else drawEdit(g, S.level, S.hover, S.fx, t);
}

// A report is the room as it was when play began, every key with its tick, and the
// state it ended in, so one run can be replayed exactly with replay().
export function report() {
  return JSON.stringify({ format: 'wee-report', version: 1, ticks: S.game.tick, level: S.played, keys: S.keylog, end: JSON.parse(gameText(S.game)) });
}
export async function copyReport() {
  const text = report();
  try { await navigator.clipboard.writeText(text); flash('Report copied. Paste it in the chat.'); }
  catch { $('reportText').value = text; $('reportBox').showModal(); $('reportText').select(); }
}
function flash(msg) { $('keys').textContent = msg; setTimeout(() => setMode(S.mode, true), 2500); }
