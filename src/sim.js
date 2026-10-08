// The rules. Pure and deterministic: no DOM, no clock, no randomness.
// One call to step() is one tick; the renderer only reads state.

export const TICK_MS = 60;
export const RT_PERIOD = 6;
export const JUMP_TICKS = 6;
export const LASER_TICKS = 5;

export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export const COLOURS = ['red', 'blue', 'yellow', 'green'];

// A power listed in NEEDS cannot act until its block type exists.
export const POWERS = ['boomerang', 'dive', 'laser', 'cycle', 'hook', 'swim', 'light'];
export const NEEDS = { hook: 'grapple tiles', swim: 'hazard tiles', light: 'dark levels' };

export function emptyLevel(w = 20, h = 12) {
  return {
    format: 'wee-level', version: 1, w, h,
    cells: Array(w * h).fill(''),
    start: { x: 1, y: 1 },
    entities: [],
    powers: { boomerang: true, dive: true, laser: true, cycle: true, hook: false, swim: false, light: false },
    clock: 'tile',
  };
}

export function resizeLevel(level, w, h) {
  const cells = Array(w * h).fill('');
  for (let y = 0; y < Math.min(h, level.h); y++)
    for (let x = 0; x < Math.min(w, level.w); x++) cells[y * w + x] = level.cells[y * level.w + x];
  return {
    ...level, w, h, cells,
    start: { x: Math.min(level.start.x, w - 1), y: Math.min(level.start.y, h - 1) },
    entities: level.entities.filter(e => e.x < w && e.y < h),
  };
}

// Refuses a file it does not understand instead of half-loading it.
export function parseLevel(text) {
  const l = JSON.parse(text);
  if (l.format !== 'wee-level') throw new Error('Not a wee level file.');
  if (!(l.w > 0 && l.h > 0) || !Array.isArray(l.cells) || l.cells.length !== l.w * l.h)
    throw new Error('The room size does not match its cells.');
  for (const c of l.cells) if (!isCell(c)) throw new Error('Unknown tile: ' + c);
  for (const e of l.entities) if (!['mover', 'enemy', 'box', 'heavy'].includes(e.kind))
    throw new Error('Unknown piece: ' + e.kind);
  if (!['tile', 'slide'].includes(l.clock)) throw new Error('Unknown clock: ' + l.clock);
  return { ...emptyLevel(l.w, l.h), ...l, powers: { ...emptyLevel().powers, ...l.powers } };
}

function isCell(c) {
  if (c === '' || c === 'wall' || c === 'checkpoint') return true;
  const [kind, colour] = c.split(':');
  return (kind === 'button' || kind === 'door') && COLOURS.includes(colour);
}

export function createGame(level) {
  const l = JSON.parse(JSON.stringify(level));
  let id = 0;
  const s = {
    w: l.w, h: l.h, cells: l.cells, powers: l.powers, clock: l.clock,
    start: { ...l.start },
    checkpoint: { ...l.start },
    player: { x: l.start.x, y: l.start.y, dir: null, moved: 0, air: 0, snap: true },
    entities: l.entities.map(e => ({
      id: ++id, kind: e.kind, x: e.x, y: e.y,
      axis: e.axis || 'h', dir: e.dir || 1, mode: e.mode || 'input', slide: null, dead: false,
    })),
    open: {}, tick: 0, worldSteps: 0, deaths: 0, events: [],
  };
  refreshDoors(s);
  return s;
}

const inb = (s, x, y) => x >= 0 && y >= 0 && x < s.w && y < s.h;
const cellAt = (s, x, y) => s.cells[y * s.w + x];

function solidCell(s, x, y) {
  if (!inb(s, x, y)) return true;
  const c = cellAt(s, x, y);
  if (c === 'wall') return true;
  if (c.startsWith('door:')) return !s.open[c.slice(5)];
  return false;
}

const entAt = (s, x, y, not) => s.entities.find(e => !e.dead && e !== not && e.x === x && e.y === y);
const playerAt = (s, x, y) => s.player.x === x && s.player.y === y;

function free(s, x, y) {
  return !solidCell(s, x, y) && !entAt(s, x, y) && !playerAt(s, x, y);
}

// A colour's doors open only while every button of that colour is pressed.
// A door that is occupied cannot close on what stands in it.
function refreshDoors(s) {
  const pressed = {}, any = {};
  s.cells.forEach((c, i) => {
    if (!c.startsWith('button:')) return;
    const col = c.slice(7), x = i % s.w, y = (i - x) / s.w;
    const down = (playerAt(s, x, y) && s.player.air === 0) || !!entAt(s, x, y);
    any[col] = true;
    pressed[col] = (pressed[col] ?? true) && down;
  });
  for (const col of COLOURS) {
    const want = !!(any[col] && pressed[col]);
    if (!want && s.open[col]) {
      const blocked = s.cells.some((c, i) => c === 'door:' + col &&
        (entAt(s, i % s.w, Math.floor(i / s.w)) || playerAt(s, i % s.w, Math.floor(i / s.w))));
      if (blocked) continue;
    }
    s.open[col] = want;
  }
}

function respawn(s) {
  Object.assign(s.player, { x: s.checkpoint.x, y: s.checkpoint.y, dir: null, moved: 0, air: 0, snap: true });
  refreshDoors(s);
}

function die(s) {
  s.events.push({ type: 'die', x: s.player.x, y: s.player.y });
  s.deaths++;
  respawn(s);
}

function kill(s, e, how) {
  e.dead = true;
  s.events.push({ type: 'kill', id: e.id, how });
}

// One player tile. Returns 'moved', 'blocked' or 'died'.
function playerStep(s, d, diving) {
  const [dx, dy] = DIRS[d], p = s.player, nx = p.x + dx, ny = p.y + dy;
  if (solidCell(s, nx, ny)) return 'blocked';
  const e = entAt(s, nx, ny);
  if (e) {
    if (e.kind === 'enemy') { die(s); return 'died'; }
    if (e.kind === 'heavy') {
      if (diving) { e.slide = d; s.events.push({ type: 'crash', x: nx, y: ny }); }
      return 'blocked';
    }
    if (e.kind !== 'box' || !free(s, nx + dx, ny + dy)) return 'blocked';
    e.x += dx; e.y += dy;
  }
  p.x = nx; p.y = ny; p.moved++;
  if (cellAt(s, nx, ny) === 'checkpoint' && (s.checkpoint.x !== nx || s.checkpoint.y !== ny)) {
    s.checkpoint = { x: nx, y: ny };
    s.events.push({ type: 'checkpoint', x: nx, y: ny });
  }
  refreshDoors(s);
  return 'moved';
}

function endSlide(s) {
  const moved = s.player.moved;
  s.player.dir = null; s.player.moved = 0;
  if (moved > 0 && s.clock === 'slide') worldStep(s);
}

// A slide that moved the player gives the world its step, per the clock.
function slideOnce(s, diving) {
  const r = playerStep(s, s.player.dir, diving);
  if (r === 'moved') { if (s.clock === 'tile') worldStep(s); return true; }
  if (r === 'blocked') endSlide(s);
  return false;
}

function dive(s) {
  s.events.push({ type: 'dive', fromX: s.player.x, fromY: s.player.y });
  for (let i = 0; i < s.w * s.h && s.player.dir; i++) {
    const before = s.deaths;
    if (!slideOnce(s, true) || s.deaths !== before) break;
  }
  if (s.player.dir) endSlide(s);
  s.player.snap = true;
}

function laser(s, d) {
  const [dx, dy] = DIRS[d];
  let x = s.player.x + dx, y = s.player.y + dy, len = 0;
  while (!solidCell(s, x, y)) {
    const e = entAt(s, x, y);
    if (e) {
      if (e.kind === 'enemy') kill(s, e, 'laser');
      else break;
    }
    len++; x += dx; y += dy;
  }
  s.events.push({ type: 'laser', x: s.player.x, y: s.player.y, d, len });
}

export function worldStep(s) {
  s.worldSteps++;
  for (const e of s.entities) if (!e.dead && e.mode === 'input' && (e.kind === 'mover' || e.kind === 'enemy')) moveMover(s, e);
  refreshDoors(s);
}

function moveMover(s, e) {
  const dx = e.axis === 'h' ? e.dir : 0, dy = e.axis === 'v' ? e.dir : 0;
  const tx = e.x + dx, ty = e.y + dy;
  if (solidCell(s, tx, ty)) { e.dir = -e.dir; return; }
  const o = entAt(s, tx, ty, e);
  if (o) {
    if (o.kind === 'box' && free(s, tx + dx, ty + dy)) { o.x += dx; o.y += dy; }
    else { e.dir = -e.dir; return; }
  }
  if (playerAt(s, tx, ty)) {
    if (e.kind === 'enemy') {
      e.x = tx; e.y = ty;
      if (s.player.air > 0) kill(s, e, 'jump'); else die(s);
      return;
    }
    const p = s.player;
    if (free(s, tx + dx, ty + dy)) { p.x += dx; p.y += dy; s.events.push({ type: 'pushed' }); }
    else { e.x = tx; e.y = ty; die(s); return; }
  }
  e.x = tx; e.y = ty;
}

function slideHeavy(s, e) {
  const [dx, dy] = DIRS[e.slide], tx = e.x + dx, ty = e.y + dy;
  if (solidCell(s, tx, ty)) { e.slide = null; return; }
  const o = entAt(s, tx, ty, e);
  if (o) {
    if (o.kind === 'enemy') kill(s, o, 'squash');
    else { e.slide = null; return; }
  }
  e.x = tx; e.y = ty;
  if (playerAt(s, tx, ty)) die(s);
}

function input(s, k) {
  const p = s.player;
  if (k === 'respawn') { respawn(s); s.events.push({ type: 'respawn' }); return; }
  if (k === 'jump') {
    if (s.powers.cycle && !p.dir && p.air === 0) {
      p.air = JUMP_TICKS;
      s.events.push({ type: 'jump' });
      worldStep(s);
    }
    return;
  }
  if (!DIRS[k] || p.air > 0) return;
  if (!p.dir) { p.dir = k; p.moved = 0; return; }
  if (k === p.dir) { if (s.powers.dive) dive(s); }
  else if (k === OPPOSITE[p.dir]) { if (s.powers.boomerang) { p.dir = k; s.events.push({ type: 'boomerang' }); } }
  else if (s.powers.laser) laser(s, k);
}

export function step(s, inputs = []) {
  s.events = [];
  s.player.snap = false;
  for (const k of inputs) input(s, k);
  if (s.player.dir) slideOnce(s, false);
  for (const e of s.entities) if (!e.dead && e.kind === 'heavy' && e.slide) slideHeavy(s, e);
  if (s.tick % RT_PERIOD === RT_PERIOD - 1)
    for (const e of s.entities) if (!e.dead && e.mode === 'realtime' && (e.kind === 'mover' || e.kind === 'enemy')) moveMover(s, e);
  if (s.player.air > 0) s.player.air--;
  refreshDoors(s);
  s.tick++;
  return s;
}

// The one text reading of the game: tests, the bot and the agent all use it.
export function gameText(s, mode = 'play') {
  return JSON.stringify({
    mode, tick: s.tick, clock: s.clock, worldSteps: s.worldSteps, deaths: s.deaths,
    player: { x: s.player.x, y: s.player.y, sliding: s.player.dir, airborne: s.player.air > 0 },
    checkpoint: s.checkpoint,
    pieces: s.entities.filter(e => !e.dead).map(e => ({ kind: e.kind, x: e.x, y: e.y, ...(e.kind === 'mover' || e.kind === 'enemy' ? { axis: e.axis, mode: e.mode } : {}) })),
    open: COLOURS.filter(c => s.open[c]),
    powers: POWERS.filter(p => s.powers[p] && !NEEDS[p]),
  });
}

// Replays a key log ({t, k}) from the level; the same log always ends in the same text.
export function replay(level, log, ticks) {
  const s = createGame(level);
  for (let t = 0; t < ticks; t++) step(s, log.filter(i => i.t === t).map(i => i.k));
  return s;
}
