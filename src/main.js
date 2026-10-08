import { createGame, step, gameText, emptyLevel, resizeLevel, parseLevel, TICK_MS, COLOURS, POWERS, NEEDS, CLOCKWISE, CARRIES_TURRET } from './sim.js';
import { T, INK, drawEdit, drawPlay, drawPiece } from './render.js';

const $ = id => document.getElementById(id);
const canvas = $('game'), g = canvas.getContext('2d');

// Draft copy: each line is the rule in the order the player meets it.
const TOOLS = [
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
  { id: 'button', label: 'Button' },
  { id: 'door', label: 'Door' },
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

function starterLevel() {
  const l = emptyLevel(20, 12);
  for (let x = 0; x < l.w; x++) { l.cells[x] = 'wall'; l.cells[(l.h - 1) * l.w + x] = 'wall'; }
  for (let y = 0; y < l.h; y++) { l.cells[y * l.w] = 'wall'; l.cells[y * l.w + l.w - 1] = 'wall'; }
  return l;
}

const ui = { tool: 'wall', axis: 'h', mode: 'input', colour: 'red', aim: ['right'] };
let level = starterLevel();
let mode = 'edit', game = null, prev = null, pending = [], acc = 0, last = 0, fx = [], hover = null, painting = 0;

function now() { return performance.now(); }

// ---------- canvas size ----------
function fit() {
  const stage = $('stage').clientWidth || level.w * T;
  const zoom = Math.max(1, Math.min(2.5, stage / (level.w * T), (innerHeight - 140) / (level.h * T)));
  const k = (window.devicePixelRatio || 1) * zoom;
  canvas.width = Math.round(level.w * T * k); canvas.height = Math.round(level.h * T * k);
  canvas.style.width = Math.round(level.w * T * zoom) + 'px';
  g.setTransform(canvas.width / (level.w * T), 0, 0, canvas.height / (level.h * T), 0, 0);
  $('w').value = level.w; $('h').value = level.h;
}

// ---------- editing ----------
const idx = (x, y) => y * level.w + x;
const pieceAt = (x, y) => level.entities.findIndex(e => e.x === x && e.y === y);

function place(x, y, erase) {
  const t = erase ? 'erase' : ui.tool, i = idx(x, y), pi = pieceAt(x, y);
  const gone = { type: 'erase', x, y, at: now() };
  const removePiece = () => { if (pi >= 0) { gone.piece = level.entities[pi]; level.entities.splice(pi, 1); } };
  const setCell = c => { if (level.cells[i] !== c) { if (level.cells[i]) gone.cell = level.cells[i]; level.cells[i] = c; } };
  const isStart = level.start.x === x && level.start.y === y;
  if (t === 'erase') {
    if (pi >= 0) removePiece(); else setCell('');
  } else if (t === 'start') {
    if (level.cells[i] === 'wall' || level.cells[i].startsWith('door:')) setCell('');
    removePiece();
    level.start = { x, y };
  } else if (t === 'wall') {
    if (isStart) return;
    removePiece(); setCell('wall');
  } else if (t === 'checkpoint' || t === 'button' || t === 'door') {
    if (t === 'door' && isStart) return;
    if (t === 'door') removePiece();
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
  if (t !== 'erase') fx.push({ type: 'place', x, y, at: now() });
}

function cellFromEvent(ev) {
  const r = canvas.getBoundingClientRect();
  const x = Math.floor((ev.clientX - r.left) / r.width * level.w);
  const y = Math.floor((ev.clientY - r.top) / r.height * level.h);
  return x >= 0 && y >= 0 && x < level.w && y < level.h ? { x, y } : null;
}

canvas.addEventListener('contextmenu', ev => ev.preventDefault());
canvas.addEventListener('pointerdown', ev => {
  if (mode !== 'edit') return;
  const c = cellFromEvent(ev); if (!c) return;
  painting = ev.button === 2 ? 2 : 1;
  canvas.setPointerCapture(ev.pointerId);
  place(c.x, c.y, painting === 2);
});
canvas.addEventListener('pointermove', ev => {
  hover = mode === 'edit' ? cellFromEvent(ev) : null;
  if (painting && hover && ui.tool !== 'start') place(hover.x, hover.y, painting === 2);
});
canvas.addEventListener('pointerup', () => { painting = 0; });
canvas.addEventListener('pointerleave', () => { hover = null; });

// ---------- play ----------
function snapshot(s) {
  const ents = {};
  for (const e of s.entities) ents[e.id] = { x: e.x, y: e.y };
  return { player: { x: s.player.x, y: s.player.y }, ents };
}

function tick() {
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

function setMode(m) {
  mode = m;
  document.body.classList.toggle('play', m === 'play');
  $('mode').textContent = m === 'play' ? 'Edit' : 'Play';
  $('keys').textContent = m === 'play'
    ? 'Arrows slide. Space jumps. R returns you to the checkpoint. E goes back to editing.'
    : 'E plays this room.';
  fx = [];
  if (m === 'play') { game = createGame(level); prev = snapshot(game); pending = []; acc = 0; }
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

// The text state and a fixed clock, for gates and agents.
window.renderGameToText = () => mode === 'play' ? gameText(game, 'play') : JSON.stringify({ mode: 'edit', level });
window.advanceTime = ms => {
  if (mode !== 'play') return;
  for (let i = 0; i < Math.round(ms / TICK_MS); i++) tick();
  acc = 0; render();
};
window.wee = { press: k => pending.push(k), setMode, getLevel: () => level, loadLevel: l => { level = parseLevel(JSON.stringify(l)); syncPanel(); fit(); } };

// ---------- panels ----------
function icon(tool) {
  const c = document.createElement('canvas'), k = 20 / T;
  c.width = 40; c.height = 40;
  const x = c.getContext('2d'); x.scale(2 * k, 2 * k);
  if (tool === 'wall' || tool === 'checkpoint' || tool === 'button' || tool === 'door') {
    const l = emptyLevel(1, 1); l.cells[0] = tool === 'wall' || tool === 'checkpoint' ? tool : tool + ':red';
    l.start = { x: 9, y: 9 }; drawEdit(x, l, null, [], 0);
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
    box.onchange = () => { level.powers[p] = box.checked; if (game) game.powers[p] = box.checked; };
    const name = document.createElement('b'); name.textContent = NAMES[p];
    const say = document.createElement('small'); say.textContent = NEEDS[p] ? 'Needs ' + NEEDS[p] + '.' : POWER_TEXT[p];
    row.append(box, name, say);
    $('powerList').append(row);
  }
  document.querySelectorAll('input[name=clock]').forEach(r => r.onchange = () => { level.clock = r.value; if (game) game.clock = r.value; });
  $('mode').onclick = () => setMode(mode === 'play' ? 'edit' : 'play');
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
  $('open').onclick = () => $('file').click();
  $('file').onchange = async () => {
    const f = $('file').files[0]; $('file').value = '';
    if (!f) return;
    try { level = parseLevel(await f.text()); setMode('edit'); syncPanel(); fit(); }
    catch (err) { alert('This file cannot be opened. ' + err.message); }
  };
}

function syncPanel() {
  document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === ui.tool));
  document.querySelectorAll('[data-axis]').forEach(b => b.classList.toggle('on', b.dataset.axis === ui.axis));
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === ui.mode));
  document.querySelectorAll('[data-colour]').forEach(b => b.classList.toggle('on', b.dataset.colour === ui.colour));
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
