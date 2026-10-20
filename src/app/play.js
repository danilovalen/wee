// Play mode: switching modes, the tick loop, drawing each frame, and the copied report.
import { frame as look } from '../view/ink.js';
import { TICK_MS } from '../rules/base.js';
import { createGame, step, gameText } from '../rules/game.js';
import { aimKey } from '../rules/player.js';
import { drawEdit, drawPlay } from '../view/scene.js';
import { S } from '../editor/state.js';
import { $, g, now } from './dom.js';
import { openSheet } from './sheets.js';
import { syncPanel, keysText } from './panels.js';
import { feedDemo } from './check.js';
import { selectOverlay } from './select.js';
import { moveRefusal } from './campaignMove.js';
import { watchStuck, resetStuck } from './stuck.js';
import { lensMarks, lensBusy } from './lenses.js';
import { syncWell } from './well.js';
import { syncChips } from './chips.js';
import { gust } from './snow.js';
import { stateKey } from '../solve/solve.js';
import { respawn } from '../rules/life.js';
// The run as Reset would leave it, to tell whether Reset would change anything.
const resetKey = game => { const c = structuredClone(game); respawn(c); return stateKey(c); };
import { syncEnabled } from './enabled.js';

export function snapshot(s) {
  const ents = {};
  for (const e of s.entities) ents[e.id] = { x: e.x, y: e.y };
  return { player: { x: s.player.x, y: s.player.y }, ents };
}

export function tick() {
  const game = S.game;
  feedDemo(game);
  for (const k of S.pending) S.keylog.push({ t: game.tick, k });
  S.prev = snapshot(game);
  const before = { x: game.player.x, y: game.player.y }, wasDir = game.player.dir;
  step(game, S.pending);
  S.pending = [];
  const t = now();
  $('moves').textContent = `Moves ${game.move}`;
  // Drift: a slide starting gusts the snow; each tile the player leaves holds a fading ghost.
  if (game.player.dir && game.player.dir !== wasDir) gust(game.player.dir);
  if ((game.player.x !== before.x || game.player.y !== before.y) && Math.abs(game.player.x - before.x) + Math.abs(game.player.y - before.y) === 1) S.fx.push({ type: 'ghost', x: before.x, y: before.y, at: t });
  // Where Reset would put you moves only when you reach a checkpoint.
  if (game.events.some(e => e.type === 'checkpoint')) S.freshKey = resetKey(game);
  syncEnabled();
  for (const e of game.events) {
    if (e.type === 'win') { $('winText').textContent = `Solved in ${e.moves} ${e.moves === 1 ? 'move' : 'moves'}.`; $('win').hidden = false; dispatchEvent(new CustomEvent('wee:win', { detail: { moves: e.moves } })); }
    if (e.type === 'dive') S.fx.push({ ...e, toX: game.player.x, toY: game.player.y, at: t });
    else S.fx.push({ ...e, at: t, x: e.x ?? before.x, y: e.y ?? before.y });
  }
  watchStuck(game);
  // A Run's robot has played its whole path: say so once, so the level can go back to editing.
  if (S.demoRunning && !(S.demo && S.demo.length) && !S.demoWait && !game.player.dir && !game.entities.some(e => !e.dead && (e.rush || e.slide))) {
    S.demoRunning = false;
    dispatchEvent(new Event('wee:demoDone'));
  }
}

// A key as the rules should take it, given where you are drawn right now.
export const aim = k => S.game ? aimKey(S.game, k, S.acc / TICK_MS) : k;

export function setMode(m, keep) {
  if (keep) { $('keys').textContent = keysText(); return; }
  if (m === 'play' && !S.playFrom && !S.level.start) return;
  S.mode = m;
  document.body.classList.toggle('play', m === 'play');
  $('mode').textContent = m === 'play' ? 'Edit' : 'Play';
  $('keys').textContent = keysText();
  $('pad').hidden = m !== 'play';
  $('win').hidden = true;
  resetStuck();
  $('moves').textContent = m === 'play' ? 'Moves 0' : '\u00a0';
  if (m === 'play') openSheet('build');
  // On a phone, play takes the whole screen: the room is sized again without the editor.
  requestAnimationFrame(() => dispatchEvent(new Event('resize')));
  S.fx = [];
  if (m === 'edit') { S.ui.tool = 'look'; S.ui.group = 'basic'; }
  syncPanel();
  if (m !== 'play') { S.demo = null; S.demoWait = null; }
  // Play from here: the same room, starting on the tile you looked at.
  const from = m === 'play' && S.playFrom ? { ...S.level, start: S.playFrom } : S.level;
  S.playFrom = null;
  if (m === 'play') { S.played = JSON.parse(JSON.stringify(from)); S.keylog = []; S.game = createGame(from); S.freshKey = resetKey(S.game); S.prev = snapshot(S.game); S.pending = []; S.acc = 0; }
  else S.game = null;
  syncEnabled();
}

// Edit mode redraws when something may have changed (any input, an effect still
// playing, a search still running), and otherwise only slowly, for rooms with tiles that
// move on their own (water, goal). Play redraws every frame.
const AMBIENT_MS = 100;
const ANIMATED = /^(water|goal)$/;
function editNeedsDraw(t) {
  if (S.redraw) return true;
  if (S.fx.length || S.paste || S.moving || S.carry || lensBusy()) return true;
  return t - (S.drawnAt || 0) > AMBIENT_MS && S.level.cells.some(c => ANIMATED.test(c));
}
export function frame(t) {
  const dt = Math.min(250, t - (S.last || t)); S.last = t;
  if (S.mode === 'play' && !window.__manualClock) {
    S.acc += dt;
    while (S.acc >= TICK_MS) { tick(); S.acc -= TICK_MS; }
  }
  if (S.mode === 'play' || editNeedsDraw(t)) { render(); S.redraw = false; S.drawnAt = t; }
  syncWell();
  syncChips();
  requestAnimationFrame(frame);
}

export function render() {
  S.draws++;
  const t = now();
  S.fx = S.fx.filter(f => t - f.at < (f.type === 'flash' ? 900 : 400));
  look.avatar = S.camp ? 'robot' : 'you';
  if (S.mode === 'play') drawPlay(g, S.game, S.prev, Math.min(1, S.acc / TICK_MS), S.fx, t);
  else drawEdit(g, S.level, S.hover, S.fx, t, marks(), selectOverlay() || carryOverlay() || (S.trail ? { trail: S.trail } : null));
}

// Move's preview: where the carried thing would land, and whether it can.
let carried = null;
function carryOverlay() {
  const from = S.carry, to = S.hover;
  if (!from || !to || (from.x === to.x && from.y === to.y)) return null;
  const key = `${from.x},${from.y},${to.x},${to.y},${JSON.stringify(S.level)}`;
  if (!carried || carried.key !== key) carried = { key, ok: !moveRefusal(S.level, from, to) };
  return { carry: { from, to, ok: carried.ok } };
}

// What the editor marks on the room: the lenses on now, and pieces or tiles the design notes
// found change nothing.
function marks() {
  const stamp = JSON.stringify(S.level);
  return { lens: lensMarks(), unused: S.design && S.design.stamp === stamp ? S.design.unused : [], reach: S.hover || (S.ui.tool === 'look' ? S.lookTile : null) };
}

// A report is the room as it was when play began, every key with its tick, and the
// state it ended in, so one run can be replayed exactly with replay().
export function report() {
  return JSON.stringify({ format: 'wee-report', version: 1, ticks: S.game.tick, level: S.played, keys: S.keylog, end: JSON.parse(gameText(S.game)) });
}
export async function copyReport() {
  const text = report();
  try { await navigator.clipboard.writeText(text); flash('Copied.'); }
  catch { $('reportText').value = text; $('reportBox').showModal(); $('reportText').select(); }
}
function flash(msg) { $('keys').textContent = msg; setTimeout(() => setMode(S.mode, true), 2500); }
