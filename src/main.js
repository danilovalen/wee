import { createGame, step, gameText, replay, emptyLevel, resizeLevel, parseLevel, TICK_MS, COLOURS, POWERS, NEEDS, CLOCKWISE, CARRIES_TURRET } from './sim.js';
import { T, INK, drawEdit, drawPlay, drawPiece } from './render.js';
import { SAMPLE } from './sample.js';

const $ = id => document.getElementById(id);
const canvas = $('game'), g = canvas.getContext('2d');

// Draft copy: each line is the rule in the order the player meets it.
const TOOLS = [
  { id: 'look', label: 'Look' },
  { id: 'wall', label: 'Block' },
  { id: 'erase', label: 'Erase' },
  { id: 'start', label: 'Start' },
  { id: 'checkpoint', label: 'Checkpoint' },
  { id: 'mover', label: 'Moving block' },
  { id: 'enemy', label: 'Weak enemy' },
  { id: 'strong', label: 'Strong enemy' },
  { id: 'turret', label: 'Laser turret' },
  { id: 'box', label: 'Box' },
  { id: 'heavy', label: 'Heavy box' },
  { id: 'tri', label: 'Triangle' },
  { id: 'button', label: 'Button' },
  { id: 'door', label: 'Door' },
  { id: 'receiver', label: 'Receiver' },
];
const POWER_TEXT = {
  boomerang: 'While sliding, press back to slide the other way.',
  dive: 'While sliding, press the same arrow to land at once and crash.',
  laser: 'While sliding, press a side arrow to fire a beam that way.',
  cycle: 'When standing, press Space to jump. The world takes a step.',
  hook: 'Stop on grapple tiles.',
  swim: 'Pass through tiles that would kill you.',
  light: 'When standing still, light up dark rooms.',
};
const NAMES = { boomerang: 'Boomerang', dive: 'Dive', laser: 'Laser', cycle: 'Cycle', hook: 'Hook', swim: 'Swim', light: 'Light' };

const touch = matchMedia('(pointer: coarse)').matches;
const portrait = () => innerHeight > innerWidth;

// A new room takes the screen's shape: taller than wide on a phone held upright.
function starterLevel() {
  const l = portrait() ? emptyLevel(12, 14) : emptyLevel(20, 12);
  for (let x = 0; x < l.w; x++) { l.cells[x] = 'wall'; l.cells[(l.h - 1) * l.w + x] = 'wall'; }
  for (let y = 0; y < l.h; y++) { l.cells[y * l.w] = 'wall'; l.cells[y * l.w + l.w - 1] = 'wall'; }
  return l;
}

const ui = { tool: 'look', axis: 'h', mode: 'input', colour: 'red', aim: ['right'], corner: 'se' };
let level = starterLevel();
let played = null, keylog = [];
let mode = 'edit', game = null, prev = null, pending = [], acc = 0, last = 0, fx = [], hover = null, painting = 0, swipe = null;

function now() { return performance.now(); }

// ---------- canvas size ----------
function fit() {
  const stage = $('stage').clientWidth || level.w * T;
  const room = portrait() ? innerHeight * 0.62 : innerHeight - 140;
  const zoom = Math.min(2.5, stage / (level.w * T), room / (level.h * T));
  const k = (window.devicePixelRatio || 1) * zoom;
  canvas.width = Math.round(level.w * T * k); canvas.height = Math.round(level.h * T * k);
  canvas.style.width = Math.round(level.w * T * zoom) + 'px';
  g.setTransform(canvas.width / (level.w * T), 0, 0, canvas.height / (level.h * T), 0, 0);
  $('w').value = level.w; $('h').value = level.h;
}

// ---------- editing ----------
const idx = (x, y) => y * level.w + x;
const pieceAt = (x, y) => level.entities.findIndex(e => e.x === x && e.y === y);

// Does (x, y) already hold the kind of thing this tool places?
function holds(x, y, tool) {
  const c = level.cells[idx(x, y)], pc = level.entities[pieceAt(x, y)];
  if (tool === 'wall' || tool === 'checkpoint') return c === tool;
  if (tool === 'button' || tool === 'door' || tool === 'tri' || tool === 'receiver') return c.startsWith(tool + ':');
  if (tool === 'turret') return !!pc && (pc.kind === 'turret' || !!pc.turret);
  return !!pc && pc.kind === tool;
}

const COLOUR_NAME = { red: 'Red', blue: 'Blue', yellow: 'Yellow', green: 'Green' };
const CLOCK_NAME = { realtime: 'real time', input: 'on your move', follow: 'same way as you' };
const ARROW = { up: '\u2191', right: '\u2192', down: '\u2193', left: '\u2190' };
const CORNER_NAME = { nw: 'top left', ne: 'top right', sw: 'bottom left', se: 'bottom right' };

// The Look tool's one line about a tile: what is on it and how it is set.
function describe(x, y) {
  const c = level.cells[idx(x, y)], pc = level.entities[pieceAt(x, y)], parts = [];
  if (pc) {
    const name = TOOLS.find(t => t.id === pc.kind)?.label || pc.kind;
    parts.push(['mover', 'enemy', 'strong'].includes(pc.kind)
      ? `${name} \u00b7 ${pc.mode === 'follow' ? '' : (pc.axis === 'h' ? 'across \u00b7 ' : 'up and down \u00b7 ')}${CLOCK_NAME[pc.mode]}` : name);
    if (pc.turret && pc.kind !== 'turret') parts.push('carries a turret');
    if (pc.turret) parts.push(`fires ${pc.turret.dirs.map(d => ARROW[d]).join(' ')} \u00b7 ${CLOCK_NAME[pc.turret.mode]}`);
  }
  if (c) {
    const [kind, v] = c.split(':');
    if (kind === 'wall') parts.push('Block');
    else if (kind === 'checkpoint') parts.push('Checkpoint');
    else if (kind === 'tri') parts.push(`Triangle, solid ${CORNER_NAME[v]}`);
    else parts.push(`${COLOUR_NAME[v]} ${kind}`);
  }
  if (level.start.x === x && level.start.y === y) parts.push('Start');
  return parts.length ? parts.join(' \u00b7 ') : 'Empty floor';
}

// how: 'place', 'remove' (only what this tool places) or 'erase' (anything).
function place(x, y, how) {
  if (how === 'remove' && !holds(x, y, ui.tool)) return;
  if (how === 'place' && holds(x, y, ui.tool)) return;
  const t = how === 'erase' ? 'erase' : how === 'remove' ? 'remove' : ui.tool, i = idx(x, y), pi = pieceAt(x, y);
  const gone = { type: 'erase', x, y, at: now() };
  const removePiece = () => { if (pi >= 0) { gone.piece = level.entities[pi]; level.entities.splice(pi, 1); } };
  const setCell = c => { if (level.cells[i] !== c) { if (level.cells[i]) gone.cell = level.cells[i]; level.cells[i] = c; } };
  const isStart = level.start.x === x && level.start.y === y;
  if (t === 'erase') {
    if (pi >= 0) removePiece(); else setCell('');
  } else if (t === 'remove') {
    const host = pi >= 0 ? level.entities[pi] : null;
    if (ui.tool === 'turret' && host && host.kind !== 'turret') { gone.piece = { ...host }; delete host.turret; }
    else if (['wall', 'checkpoint', 'button', 'door', 'tri', 'receiver'].includes(ui.tool)) setCell('');
    else removePiece();
  } else if (t === 'tri') {
    if (isStart) return;
    removePiece(); setCell('tri:' + ui.corner);
  } else if (t === 'start') {
    if (level.cells[i] === 'wall' || level.cells[i].startsWith('door:')) setCell('');
    removePiece();
    level.start = { x, y };
  } else if (t === 'wall') {
    if (isStart) return;
    removePiece(); setCell('wall');
  } else if (t === 'checkpoint' || t === 'button' || t === 'door' || t === 'receiver') {
    if ((t === 'door' || t === 'receiver') && isStart) return;
    if (t === 'door' || t === 'receiver') removePiece();
    setCell(t === 'checkpoint' ? 'checkpoint' : t + ':' + ui.colour);
  } else if (t === 'turret') {
    if (isStart) return;
    const turret = { dirs: CLOCKWISE.filter(d => ui.aim.includes(d)), mode: ui.mode };
    const host = pi >= 0 ? level.entities[pi] : null;
    if (host && (CARRIES_TURRET.includes(host.kind) || host.kind === 'turret')) {
      if (JSON.stringify(host.turret) === JSON.stringify(turret)) return;
      host.turret = turret;
    } else {
      removePiece();
      if (level.cells[i] === 'wall' || level.cells[i].startsWith('door:')) setCell('');
      level.entities.push({ kind: 'turret', x, y, turret });
    }
  } else {
    if (isStart) return;
    const want = { kind: t, x, y, ...(t === 'mover' || t === 'enemy' || t === 'strong' ? { axis: ui.axis, dir: 1, mode: ui.mode } : {}) };
    if (pi >= 0 && JSON.stringify(level.entities[pi]) === JSON.stringify(want)) return;
    removePiece();
    if (level.cells[i] === 'wall' || level.cells[i].startsWith('door:')) setCell('');
    level.entities.push(want);
  }
  if (gone.cell || gone.piece) fx.push(gone);
  if (t !== 'erase' && t !== 'remove') fx.push({ type: 'place', x, y, at: now() });
}

function cellFromEvent(ev) {
  const r = canvas.getBoundingClientRect();
  const x = Math.floor((ev.clientX - r.left) / r.width * level.w);
  const y = Math.floor((ev.clientY - r.top) / r.height * level.h);
  return x >= 0 && y >= 0 && x < level.w && y < level.h ? { x, y } : null;
}

canvas.addEventListener('contextmenu', ev => ev.preventDefault());
// In play, a swipe is an arrow key: each new direction within one drag sends once.
const SWIPE_PX = 24;
canvas.addEventListener('pointerdown', ev => {
  if (mode === 'play') {
    swipe = { x: ev.clientX, y: ev.clientY, last: null };
    canvas.setPointerCapture(ev.pointerId);
    return;
  }
  const c = cellFromEvent(ev); if (!c) return;
  if (ui.tool === 'look') { $('placeHint').textContent = describe(c.x, c.y); return; }
  painting = ev.button === 2 ? 'erase' : holds(c.x, c.y, ui.tool) && ui.tool !== 'start' ? 'remove' : 'place';
  canvas.setPointerCapture(ev.pointerId);
  place(c.x, c.y, painting);
});
canvas.addEventListener('pointermove', ev => {
  if (mode === 'play' && swipe) {
    const dx = ev.clientX - swipe.x, dy = ev.clientY - swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
    const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    if (d !== swipe.last) pending.push(d);
    Object.assign(swipe, { x: ev.clientX, y: ev.clientY, last: d });
    return;
  }
  const c = mode === 'edit' ? cellFromEvent(ev) : null;
  // The outline follows a mouse only; a finger would leave it behind on lift.
  hover = touch ? null : c;
  if (painting && c && ui.tool !== 'start') place(c.x, c.y, painting);
});
canvas.addEventListener('pointerup', () => { painting = 0; swipe = null; });
canvas.addEventListener('pointercancel', () => { painting = 0; swipe = null; });
canvas.addEventListener('pointerleave', () => { hover = null; });

// ---------- play ----------
function snapshot(s) {
  const ents = {};
  for (const e of s.entities) ents[e.id] = { x: e.x, y: e.y };
  return { player: { x: s.player.x, y: s.player.y }, ents };
}

function tick() {
  for (const k of pending) keylog.push({ t: game.tick, k });
  prev = snapshot(game);
  const before = { x: game.player.x, y: game.player.y };
  step(game, pending);
  pending = [];
  const t = now();
  for (const e of game.events) {
    if (e.type === 'dive') fx.push({ ...e, toX: game.player.x, toY: game.player.y, at: t });
    else fx.push({ ...e, at: t, x: e.x ?? before.x, y: e.y ?? before.y });
  }
}

function keysText() {
  return touch
    ? (mode === 'play' ? 'Swipe to slide. While sliding, swipe again to use a power.' : 'Press Play to try this room.')
    : (mode === 'play' ? 'Arrows slide. Space jumps. R returns you to the checkpoint. E goes back to editing.' : 'E plays this room.');
}

function setMode(m, keep) {
  if (keep) { $('keys').textContent = keysText(); return; }
  mode = m;
  document.body.classList.toggle('play', m === 'play');
  $('mode').textContent = m === 'play' ? 'Edit' : 'Play';
  $('keys').textContent = keysText();
  $('pad').hidden = m !== 'play';
  fx = [];
  if (m === 'edit') { ui.tool = 'look'; syncPanel(); }
  if (m === 'play') { played = JSON.parse(JSON.stringify(level)); keylog = []; game = createGame(level); prev = snapshot(game); pending = []; acc = 0; }
  else game = null;
}

const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', ' ': 'jump', r: 'respawn', R: 'respawn' };
window.addEventListener('keydown', ev => {
  if (ev.target.tagName === 'INPUT' && ev.target.type === 'number') return;
  if (ev.key === 'e' || ev.key === 'E') { setMode(mode === 'play' ? 'edit' : 'play'); ev.preventDefault(); return; }
  if (mode !== 'play') return;
  const k = KEYS[ev.key];
  if (!k) return;
  ev.preventDefault();
  if (!ev.repeat) pending.push(k);
});

// ---------- loop ----------
function frame(t) {
  const dt = Math.min(250, t - (last || t)); last = t;
  if (mode === 'play' && !window.__manualClock) {
    acc += dt;
    while (acc >= TICK_MS) { tick(); acc -= TICK_MS; }
  }
  render();
  requestAnimationFrame(frame);
}

function render() {
  const t = now();
  fx = fx.filter(f => t - f.at < 400);
  if (mode === 'play') drawPlay(g, game, prev, Math.min(1, acc / TICK_MS), fx, t);
  else drawEdit(g, level, hover, fx, t);
}

// A report is the room as it was when play began, every key with its tick, and the
// state it ended in, so one run can be replayed exactly with replay().
function report() {
  return JSON.stringify({ format: 'wee-report', version: 1, ticks: game.tick, level: played, keys: keylog, end: JSON.parse(gameText(game)) });
}
async function copyReport() {
  const text = report();
  try { await navigator.clipboard.writeText(text); flash('Report copied. Paste it in the chat.'); }
  catch { $('reportText').value = text; $('reportBox').showModal(); $('reportText').select(); }
}
function flash(msg) { $('keys').textContent = msg; setTimeout(() => setMode(mode, true), 2500); }

// The text state and a fixed clock, for gates and agents.
window.renderGameToText = () => mode === 'play' ? gameText(game, 'play') : JSON.stringify({ mode: 'edit', level });
window.advanceTime = ms => {
  if (mode !== 'play') return;
  for (let i = 0; i < Math.round(ms / TICK_MS); i++) tick();
  acc = 0; render();
};
window.wee = { report, replay, gameText, press: k => pending.push(k), setMode, getLevel: () => level, loadLevel: l => { level = parseLevel(JSON.stringify(l)); syncPanel(); fit(); } };

// ---------- panels ----------
function icon(tool) {
  const c = document.createElement('canvas'), k = 20 / T;
  c.width = 40; c.height = 40;
  const x = c.getContext('2d'); x.scale(2 * k, 2 * k);
  if (tool === 'wall' || tool === 'checkpoint' || tool === 'button' || tool === 'door' || tool === 'tri') {
    const l = emptyLevel(1, 1); l.cells[0] = tool === 'wall' || tool === 'checkpoint' ? tool : tool === 'tri' ? 'tri:se' : tool + ':red';
    l.start = { x: 9, y: 9 }; drawEdit(x, l, null, [], 0);
  } else if (tool === 'look') {
    x.strokeStyle = '#c3cad8'; x.lineWidth = 2.5;
    x.beginPath(); x.arc(14, 14, 7, 0, Math.PI * 2); x.moveTo(19, 19); x.lineTo(26, 26); x.stroke();
  } else if (tool === 'receiver') {
    const l = emptyLevel(1, 1); l.cells[0] = 'receiver:red'; l.start = { x: 9, y: 9 }; drawEdit(x, l, null, [], 0);
  } else if (tool === 'erase') {
    x.strokeStyle = '#8e98ad'; x.lineWidth = 3; x.beginPath(); x.moveTo(8, 8); x.lineTo(24, 24); x.moveTo(24, 8); x.lineTo(8, 24); x.stroke();
  } else if (tool === 'start') {
    x.fillStyle = INK.player; x.beginPath(); x.arc(16, 16, 10, 0, Math.PI * 2); x.fill();
  } else if (tool === 'turret') drawPiece(x, { kind: 'turret', turret: { dirs: ['up', 'right'], mode: 'input' } }, 0, 0);
  else drawPiece(x, { kind: tool, axis: 'h', dir: 1, mode: 'input' }, 0, 0);
  return c;
}

function buildPanels() {
  for (const t of TOOLS) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.tool = t.id;
    b.append(icon(t.id), t.label);
    b.onclick = () => { ui.tool = t.id; syncPanel(); };
    $('palette').append(b);
  }
  for (const col of COLOURS) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.colour = col; b.title = col;
    b.style.background = INK[col];
    b.onclick = () => { ui.colour = col; syncPanel(); };
    $('colours').append(b);
  }
  document.querySelectorAll('[data-axis]').forEach(b => b.onclick = () => { ui.axis = b.dataset.axis; syncPanel(); });
  document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { ui.mode = b.dataset.mode; syncPanel(); });
  document.querySelectorAll('[data-corner]').forEach(b => b.onclick = () => { ui.corner = b.dataset.corner; syncPanel(); });
  document.querySelectorAll('[data-aim]').forEach(b => b.onclick = () => {
    const d = b.dataset.aim;
    if (ui.aim.includes(d)) { if (ui.aim.length > 1) ui.aim = ui.aim.filter(a => a !== d); }
    else ui.aim = [...ui.aim, d];
    syncPanel();
  });
  for (const p of POWERS) {
    const row = document.createElement('label');
    row.className = 'power' + (NEEDS[p] ? ' off' : '');
    const box = document.createElement('input');
    box.type = 'checkbox'; box.dataset.power = p; box.disabled = !!NEEDS[p];
    box.onchange = () => { level.powers[p] = box.checked; if (game) pending.push(`power:${p}:${box.checked ? 1 : 0}`); };
    const name = document.createElement('b'); name.textContent = NAMES[p];
    const say = document.createElement('small'); say.textContent = NEEDS[p] ? 'Needs ' + NEEDS[p] + '.' : POWER_TEXT[p];
    row.append(box, name, say);
    $('powerList').append(row);
  }
  document.querySelectorAll('input[name=clock]').forEach(r => r.onchange = () => { level.clock = r.value; if (game) pending.push('clock:' + r.value); });
  $('mode').onclick = () => setMode(mode === 'play' ? 'edit' : 'play');
  $('jumpBtn').onclick = () => pending.push('jump');
  $('respawnBtn').onclick = () => pending.push('respawn');
  $('reportBtn').onclick = copyReport;
  $('placeHint').textContent = touch ? 'Tap to place. Tap one again to remove it. Look changes nothing.' : 'Click to place. Click one again, or right click, to remove it. Look changes nothing.';
  const resize = () => {
    const w = Math.max(5, Math.min(40, +$('w').value || level.w)), h = Math.max(5, Math.min(30, +$('h').value || level.h));
    if (w !== level.w || h !== level.h) { level = resizeLevel(level, w, h); fit(); }
  };
  $('w').onchange = resize; $('h').onchange = resize;
  $('save').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(level, null, 1)], { type: 'application/json' }));
    a.download = 'room.wee';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('sample').onclick = () => { level = parseLevel(JSON.stringify(SAMPLE)); setMode('edit'); syncPanel(); fit(); };
  $('open').onclick = () => $('file').click();
  $('file').onchange = async () => {
    const f = $('file').files[0]; $('file').value = '';
    if (!f) return;
    try { level = parseLevel(await f.text()); setMode('edit'); syncPanel(); fit(); }
    catch (err) { alert('This file cannot be opened. ' + err.message); }
  };
}

function syncPanel() {
  canvas.style.touchAction = mode === 'edit' && ui.tool === 'look' ? 'pan-y' : 'none';
  document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === ui.tool));
  document.querySelectorAll('[data-axis]').forEach(b => b.classList.toggle('on', b.dataset.axis === ui.axis));
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === ui.mode));
  document.querySelectorAll('[data-colour]').forEach(b => b.classList.toggle('on', b.dataset.colour === ui.colour));
  document.querySelectorAll('[data-corner]').forEach(b => b.classList.toggle('on', b.dataset.corner === ui.corner));
  document.querySelectorAll('[data-aim]').forEach(b => {
    const on = ui.aim.includes(b.dataset.aim);
    b.classList.toggle('on', on);
    b.disabled = on && ui.aim.length === 1;
  });
  document.querySelectorAll('.opt').forEach(o => { o.hidden = !o.dataset.for.split(' ').includes(ui.tool); });
  if (ui.mode === 'follow') $('axisOpt').hidden = true;
  document.querySelectorAll('[data-power]').forEach(b => { b.checked = !!level.powers[b.dataset.power] && !NEEDS[b.dataset.power]; });
  document.querySelectorAll('input[name=clock]').forEach(r => { r.checked = r.value === level.clock; });
}

buildPanels();
syncPanel();
addEventListener('resize', fit);
fit();
setMode('edit');
requestAnimationFrame(frame);
