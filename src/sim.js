// The rules. Pure and deterministic: no DOM, no clock, no randomness.
// One call to step() is one tick; the renderer only reads state.

export const TICK_MS = 60;
export const RT_PERIOD = 6;
export const JUMP_TICKS = 6;
export const LASER_TICKS = 5;

export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export const COLOURS = ['red', 'blue', 'yellow', 'green'];

// Clockwise order: a turret fires its chosen directions in this order.
export const CLOCKWISE = ['up', 'right', 'down', 'left'];
export const KINDS = ['mover', 'enemy', 'strong', 'box', 'heavy', 'turret'];
const MOVES = ['mover', 'enemy', 'strong'];
const ENEMY = ['enemy', 'strong'];
// realtime: on its own clock; input: on each world step; follow: on each world step,
// the same way the player moved.
export const MODES = ['realtime', 'input', 'follow'];
// A turret can stand alone or ride one of these.
export const CARRIES_TURRET = ['box', 'heavy', 'enemy', 'strong'];

function checkTurret(t) {
  if (!Array.isArray(t.dirs) || t.dirs.length < 1 || t.dirs.length > 4 || t.dirs.some(d => !CLOCKWISE.includes(d)) || new Set(t.dirs).size !== t.dirs.length)
    throw new Error('A turret needs one to four different directions.');
  if (!MODES.includes(t.mode)) throw new Error('Unknown turret clock: ' + t.mode);
}

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
  for (const e of l.entities) {
    if (!KINDS.includes(e.kind)) throw new Error('Unknown piece: ' + e.kind);
    if (e.turret) checkTurret(e.turret);
    if (MOVES.includes(e.kind) && e.mode && !MODES.includes(e.mode)) throw new Error('Unknown clock: ' + e.mode);
  }
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
      turret: e.turret ? { dirs: CLOCKWISE.filter(d => e.turret.dirs.includes(d)), mode: e.turret.mode, next: 0 } : null,
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
    if (e.kind === 'enemy' && diving) kill(s, e, 'dive');
    else if (ENEMY.includes(e.kind)) { die(s); return 'died'; }
    else if (e.kind === 'heavy') {
      if (diving) { e.slide = d; s.events.push({ type: 'crash', x: nx, y: ny }); }
      return 'blocked';
    } else if (e.kind === 'box' && free(s, nx + dx, ny + dy)) { e.x += dx; e.y += dy; }
    else return 'blocked';
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
  const moved = s.player.moved, d = s.player.dir;
  s.player.dir = null; s.player.moved = 0;
  if (moved > 0 && s.clock === 'slide') worldStep(s, d);
}

// A slide that moved the player gives the world its step, per the clock.
function slideOnce(s, diving) {
  const r = playerStep(s, s.player.dir, diving);
  if (r === 'moved') { if (s.clock === 'tile') worldStep(s, s.player.dir); return true; }
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

// A turret fires its next direction clockwise, or the given one. The beam kills you
// (unless you are in the air) and weak enemies; anything else solid stops it.
function fireTurret(s, e, forced) {
  const t = e.turret;
  let d = forced;
  if (!d) { d = t.dirs[t.next % t.dirs.length]; t.next++; }
  const [dx, dy] = DIRS[d];
  let x = e.x + dx, y = e.y + dy, len = 0, hit = false;
  while (!solidCell(s, x, y)) {
    if (playerAt(s, x, y) && s.player.air === 0) { hit = true; break; }
    const o = entAt(s, x, y);
    if (o) {
      if (o.kind === 'enemy') kill(s, o, 'turret');
      else break;
    }
    len++; x += dx; y += dy;
  }
  s.events.push({ type: 'beam', x: e.x, y: e.y, d, len: hit ? len + 1 : len });
  if (hit) die(s);
}

function fireTurrets(s, mode) {
  for (const e of s.entities) if (!e.dead && e.turret && e.turret.mode === mode) fireTurret(s, e);
}

// d is the way the player moved for this step; a jump gives none, so 'follow'
// pieces and turrets sit it out.
export function worldStep(s, d = null) {
  s.worldSteps++;
  for (const e of s.entities) {
    if (e.dead || !MOVES.includes(e.kind)) continue;
    if (e.mode === 'input') moveMover(s, e);
    else if (e.mode === 'follow' && d) moveMover(s, e, d);
  }
  fireTurrets(s, 'input');
  if (d) for (const e of s.entities) if (!e.dead && e.turret && e.turret.mode === 'follow' && e.turret.dirs.includes(d)) fireTurret(s, e, d);
  refreshDoors(s);
}

// Moves one tile along its patrol, or the given way. Blocked, it stays and turns its patrol.
function moveMover(s, e, d) {
  const dx = d ? DIRS[d][0] : e.axis === 'h' ? e.dir : 0, dy = d ? DIRS[d][1] : e.axis === 'v' ? e.dir : 0;
  const tx = e.x + dx, ty = e.y + dy;
  if (solidCell(s, tx, ty)) { e.dir = -e.dir; return; }
  const o = entAt(s, tx, ty, e);
  if (o) {
    if (o.kind === 'box' && free(s, tx + dx, ty + dy)) { o.x += dx; o.y += dy; }
    else { e.dir = -e.dir; return; }
  }
  if (playerAt(s, tx, ty)) {
    if (ENEMY.includes(e.kind)) {
      e.x = tx; e.y = ty;
      if (e.kind === 'enemy' && s.player.air > 0) kill(s, e, 'jump'); else die(s);
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
    if (ENEMY.includes(o.kind)) kill(s, o, 'squash');
    else { e.slide = null; return; }
  }
  e.x = tx; e.y = ty;
  if (playerAt(s, tx, ty)) die(s);
}

// Besides keys, a run takes settings changed mid-play: 'power:dive:0', 'clock:slide'.
function input(s, k) {
  const p = s.player;
  if (k.startsWith('power:')) { const [, name, on] = k.split(':'); if (POWERS.includes(name)) s.powers[name] = on === '1'; return; }
  if (k.startsWith('clock:')) { const c = k.slice(6); if (c === 'tile' || c === 'slide') s.clock = c; return; }
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
  if (s.tick % RT_PERIOD === RT_PERIOD - 1) {
    for (const e of s.entities) if (!e.dead && e.mode === 'realtime' && MOVES.includes(e.kind)) moveMover(s, e);
    fireTurrets(s, 'realtime');
  }
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
    pieces: s.entities.filter(e => !e.dead).map(e => ({
      kind: e.kind, x: e.x, y: e.y,
      ...(MOVES.includes(e.kind) ? { axis: e.axis, mode: e.mode } : {}),
      ...(e.turret ? { turret: { dirs: e.turret.dirs, mode: e.turret.mode, next: e.turret.dirs[e.turret.next % e.turret.dirs.length] } } : {}),
    })),
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
