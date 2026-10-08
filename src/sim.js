// The rules. Pure and deterministic: no DOM, no clock, no randomness.
// One call to step() is one tick; the renderer only reads state.

export const TICK_MS = 60;
export const RT_PERIOD = 6;
export const JUMP_TICKS = 6;
export const LASER_TICKS = 5;

export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export const COLOURS = ['red', 'blue', 'yellow', 'green'];

// A triangle ('tri:se') is solid in that corner; its other two faces are open. What
// enters through one open face leaves through the other, turned 90 degrees.
export const CORNERS = ['nw', 'ne', 'sw', 'se'];
const EXIT_FACE = { up: 'n', down: 's', left: 'w', right: 'e' };
const ENTRY_FACE = { up: 's', down: 'n', left: 'e', right: 'w' };
const OUT = { n: 'up', s: 'down', e: 'right', w: 'left' };
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
const openFaces = corner => [OPP[corner[0]], OPP[corner[1]]];
const turn = (corner, d) => OUT[openFaces(corner).find(f => f !== ENTRY_FACE[d])];

// Two laser hits this many player tiles apart kill a strong enemy.
export const HURT_TILES = 4;

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
  if (c.startsWith('tri:')) return CORNERS.includes(c.slice(4));
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
      axis: e.axis || 'h', dir: e.dir || 1, mode: e.mode || 'input', slide: null, dead: false, rush: false, hurt: 0,
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

const triAt = (s, x, y) => { const c = inb(s, x, y) && cellAt(s, x, y); return c && c.startsWith('tri:') ? c.slice(4) : null; };

// One step from (x, y) going d: where it lands and the way it went, or null when a
// wall, a closed door or a triangle's solid side is in the way. The turn happens on
// the way out: inside a triangle, heading into its solid side sends you along the slope.
function stepTo(s, x, y, d) {
  const here = triAt(s, x, y);
  if (here && !openFaces(here).includes(EXIT_FACE[d])) d = turn(here, d);
  const [dx, dy] = DIRS[d], nx = x + dx, ny = y + dy;
  if (solidCell(s, nx, ny)) return null;
  const tri = triAt(s, nx, ny);
  if (tri && !openFaces(tri).includes(ENTRY_FACE[d])) return null;
  return { x: nx, y: ny, d };
}

// Where a piece at (x, y) pushed d would go, if that tile is free.
function pushTo(s, x, y, d) {
  const t = stepTo(s, x, y, d);
  return t && !entAt(s, t.x, t.y) && !playerAt(s, t.x, t.y) ? t : null;
}

const entAt = (s, x, y, not) => s.entities.find(e => !e.dead && e !== not && e.x === x && e.y === y);
const playerAt = (s, x, y) => s.player.x === x && s.player.y === y;

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

// One player tile. Returns 'moved', 'blocked' or 'died'. A triangle turns the slide.
function playerStep(s, d, diving) {
  const p = s.player, t = stepTo(s, p.x, p.y, d);
  if (!t) return 'blocked';
  const nx = t.x, ny = t.y, e = entAt(s, nx, ny);
  if (e) {
    let b;
    if (e.kind === 'enemy' && diving) kill(s, e, 'dive');
    else if (ENEMY.includes(e.kind)) { die(s); return 'died'; }
    else if (e.kind === 'heavy') {
      if (diving) { e.slide = t.d; s.events.push({ type: 'crash', x: nx, y: ny }); }
      return 'blocked';
    } else if (e.kind === 'box' && (b = pushTo(s, nx, ny, t.d))) { e.x = b.x; e.y = b.y; }
    else return 'blocked';
  }
  p.x = nx; p.y = ny; p.moved++;
  if (p.dir) p.dir = t.d;
  for (const o of s.entities) if (o.hurt > 0) o.hurt--;
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
  const d = s.player.dir, r = playerStep(s, d, diving);
  if (r === 'moved') { if (s.clock === 'tile') worldStep(s, d); return true; }
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

// A beam from (x, y) heading d, turned by triangles. hit(piece) says whether it
// passes on. Returns the cells it crossed and whether a wall stopped it.
function trace(s, x, y, d, hit, hitsPlayer) {
  const path = [[x, y]];
  let cx = x, cy = y, cd = d, wall = true;
  for (let i = 0; i < s.w * s.h * 2; i++) {
    const t = stepTo(s, cx, cy, cd);
    if (!t) break;
    path.push([t.x, t.y]);
    if (hitsPlayer && playerAt(s, t.x, t.y) && s.player.air === 0) { wall = false; s.beamHitPlayer = true; break; }
    const o = entAt(s, t.x, t.y);
    if (o && !hit(o)) { wall = false; break; }
    cx = t.x; cy = t.y; cd = t.d;
  }
  return { path, wall, end: cd };
}

// A laser kills a weak enemy and goes on. A strong enemy stops it, and dies to a
// second hit within HURT_TILES of your moves. Anything else stops it.
function laserHit(s, o, how) {
  if (o.kind === 'enemy') { kill(s, o, how); return true; }
  if (o.kind === 'strong') {
    if (o.hurt > 0) kill(s, o, how);
    else { o.hurt = HURT_TILES; s.events.push({ type: 'hurt', id: o.id }); }
  }
  return false;
}

function laser(s, d) {
  const r = trace(s, s.player.x, s.player.y, d, o => laserHit(s, o, 'laser'), false);
  s.events.push({ type: 'laser', d, ...r });
}

// A turret fires its next direction clockwise, or the given one. Its beam also kills
// you unless you are in the air.
function fireTurret(s, e, forced) {
  const t = e.turret;
  let d = forced;
  if (!d) { d = t.dirs[t.next % t.dirs.length]; t.next++; }
  s.beamHitPlayer = false;
  const r = trace(s, e.x, e.y, d, o => laserHit(s, o, 'turret'), true);
  s.events.push({ type: 'beam', d, ...r });
  if (s.beamHitPlayer) die(s);
}

function fireTurrets(s, mode) {
  for (const e of s.entities) if (!e.dead && e.turret && e.turret.mode === mode) fireTurret(s, e);
}

// A jump is one cycle with no direction: each on-your-move piece slides along its
// patrol until something stops it, a tile per tick (see step), and turns there.
function jumpCycle(s) {
  s.worldSteps++;
  for (const e of s.entities) if (!e.dead && e.mode === 'input' && MOVES.includes(e.kind)) e.rush = true;
  fireTurrets(s, 'input');
  refreshDoors(s);
}

function rushOnce(s, e) {
  const x = e.x, y = e.y;
  moveMover(s, e, null, true);
  if (e.x === x && e.y === y) e.rush = false;
}

// d is the way the player moved for this step, which 'follow' pieces and turrets copy.
export function worldStep(s, d) {
  s.worldSteps++;
  for (const e of s.entities) {
    if (e.dead || !MOVES.includes(e.kind)) continue;
    if (e.mode === 'input' && !e.rush) moveMover(s, e);
    else if (e.mode === 'follow') moveMover(s, e, d);
  }
  fireTurrets(s, 'input');
  for (const e of s.entities) if (!e.dead && e.turret && e.turret.mode === 'follow' && e.turret.dirs.includes(d)) fireTurret(s, e, d);
  refreshDoors(s);
}

const patrolDir = e => e.axis === 'h' ? (e.dir > 0 ? 'right' : 'left') : (e.dir > 0 ? 'down' : 'up');

// Moves one tile along its patrol, or the given way. Blocked, it stays and turns its
// patrol. A triangle turns a patrol onto the other axis.
function moveMover(s, e, d, turned) {
  const t = stepTo(s, e.x, e.y, d || patrolDir(e));
  // Blocked, a patrol turns and moves the other way in the same step; a follower waits.
  const blocked = () => { if (d) return; e.dir = -e.dir; if (!turned) moveMover(s, e, null, true); };
  if (!t) { blocked(); return; }
  const o = entAt(s, t.x, t.y, e);
  let b;
  if (o) {
    if (o.kind === 'box' && (b = pushTo(s, t.x, t.y, t.d))) { o.x = b.x; o.y = b.y; }
    else { blocked(); return; }
  }
  if (playerAt(s, t.x, t.y)) {
    if (ENEMY.includes(e.kind)) {
      e.x = t.x; e.y = t.y;
      if (e.kind === 'enemy' && s.player.air > 0) kill(s, e, 'jump'); else die(s);
      return;
    }
    const p = s.player;
    if ((b = pushTo(s, t.x, t.y, t.d))) { p.x = b.x; p.y = b.y; s.events.push({ type: 'pushed' }); }
    else { e.x = t.x; e.y = t.y; die(s); return; }
  }
  e.x = t.x; e.y = t.y;
  if (!d) { e.axis = t.d === 'left' || t.d === 'right' ? 'h' : 'v'; e.dir = t.d === 'right' || t.d === 'down' ? 1 : -1; }
}

function slideHeavy(s, e) {
  const t = stepTo(s, e.x, e.y, e.slide);
  if (!t) { e.slide = null; return; }
  const o = entAt(s, t.x, t.y, e);
  if (o) {
    if (ENEMY.includes(o.kind)) kill(s, o, 'squash');
    else { e.slide = null; return; }
  }
  e.x = t.x; e.y = t.y; e.slide = t.d;
  if (playerAt(s, t.x, t.y)) die(s);
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
      jumpCycle(s);
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
  for (const e of s.entities) if (!e.dead && e.rush) rushOnce(s, e);
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
      ...(e.hurt > 0 ? { hurt: e.hurt } : {}),
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
