// The rules. Pure and deterministic: no DOM, no clock, no randomness.
// One call to step() is one tick; the renderer only reads state.

export const TICK_MS = 60;
export const RT_PERIOD = 6;
// Hiding lasts at least this long, and until every piece the hide sent sliding has stopped.
export const HIDE_TICKS = 4;
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
export const POWERS = ['boomerang', 'dive', 'laser', 'cycle', 'hook', 'swim', 'light', 'armored'];
export const NEEDS = { hook: 'grapple tiles', light: 'dark levels' };

export function emptyLevel(w = 20, h = 12) {
  return {
    format: 'wee-level', version: 1, w, h,
    cells: Array(w * h).fill(''),
    start: { x: 1, y: 1 },
    entities: [],
    powers: { boomerang: true, dive: true, laser: true, cycle: true, hook: false, swim: false, light: false, armored: false },
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
  if (c.startsWith('receiver:')) return COLOURS.includes(c.slice(9));
  if (c.startsWith('sensor:')) return COLOURS.includes(c.slice(7));
  if (c === 'death' || c === 'water' || c === 'sticky') return true;
  if (c.startsWith('spring:')) return CLOCKWISE.includes(c.slice(7));
  if (c.startsWith('gate:')) { const ds = c.slice(5).split(','); return ds.length > 0 && new Set(ds).size === ds.length && ds.every(d => CLOCKWISE.includes(d)); }
  if (c.startsWith('tri:')) return CORNERS.includes(c.slice(4));
  const [kind, colour] = c.split(':');
  return (kind === 'button' || kind === 'door') && COLOURS.includes(colour);
}

// The room's pieces as the level places them; a reset builds them again from here.
const freshPieces = list => list.map((e, i) => ({
  id: i + 1, kind: e.kind, x: e.x, y: e.y,
  axis: e.axis || 'h', dir: e.dir || 1, mode: e.mode || 'input', slide: null, dead: false, rush: false,
  turret: e.turret ? { dirs: CLOCKWISE.filter(d => e.turret.dirs.includes(d)), mode: e.turret.mode, aim: 0 } : null,
}));

export function createGame(level) {
  const l = JSON.parse(JSON.stringify(level));
  const s = {
    origin: l.entities,
    w: l.w, h: l.h, cells: l.cells, powers: l.powers, clock: l.clock,
    start: { ...l.start },
    checkpoint: { ...l.start },
    player: { x: l.start.x, y: l.start.y, dir: null, moved: 0, hidden: false, hideTicks: 0, swimming: false, stroke: false, sticky: false, stuck: null, snap: true },
    entities: freshPieces(l.entities),
    open: {}, lit: new Set(), shocked: new Set(), beams: [], tick: 0, worldSteps: 0, deaths: 0, events: [],
  };
  computeBeams(s, false);
  refreshDoors(s);
  return s;
}

const inb = (s, x, y) => x >= 0 && y >= 0 && x < s.w && y < s.h;
const cellAt = (s, x, y) => s.cells[y * s.w + x];

function solidCell(s, x, y) {
  if (!inb(s, x, y)) return true;
  const c = cellAt(s, x, y);
  if (c === 'wall' || c.startsWith('receiver:') || c.startsWith('spring:')) return true;
  if (c.startsWith('door:')) return !s.open[c.slice(5)];
  return false;
}

const triAt = (s, x, y) => { const c = inb(s, x, y) && cellAt(s, x, y); return c && c.startsWith('tri:') ? c.slice(4) : null; };

// One step from (x, y) going d: where it lands and the way it went, or null when a
// wall, a closed door or a triangle's solid side is in the way. The turn happens on
// the way out: inside a triangle, heading into its solid side sends you along the slope.
function facing(s, x, y, d) {
  const here = triAt(s, x, y);
  return here && !openFaces(here).includes(EXIT_FACE[d]) ? turn(here, d) : d;
}

// A one-way tile ('gate:right', 'gate:right,left') lets things move onto it and off
// it only along its listed directions; any other way, it is a wall.
const gateAt = (s, x, y) => { const c = inb(s, x, y) && cellAt(s, x, y); return c && c.startsWith('gate:') ? c.slice(5).split(',') : null; };

// wet: whether this mover may enter water (beams always may).
function stepTo(s, x, y, d, wet = true) {
  d = facing(s, x, y, d);
  const [dx, dy] = DIRS[d], nx = x + dx, ny = y + dy;
  const from = gateAt(s, x, y), to = gateAt(s, nx, ny);
  if ((from && !from.includes(d)) || (to && !to.includes(d))) return null;
  if (solidCell(s, nx, ny)) return null;
  if (!wet && cellAt(s, nx, ny) === 'water') return null;
  if (cellAt(s, nx, ny) === 'death') return { x: nx, y: ny, d, death: true };
  const tri = triAt(s, nx, ny);
  if (tri && !openFaces(tri).includes(ENTRY_FACE[d])) return null;
  return { x: nx, y: ny, d };
}

// Where a piece at (x, y) pushed d would go, if that tile is free. A death block
// always takes it.
function pushTo(s, x, y, d, wet) {
  const t = stepTo(s, x, y, d, wet);
  return t && (t.death || (!entAt(s, t.x, t.y) && !playerAt(s, t.x, t.y))) ? t : null;
}

// Puts a piece on t, or destroys it when t is a death block.
function land(s, e, t) {
  if (t.death) { kill(s, e, 'death'); return false; }
  e.x = t.x; e.y = t.y;
  return true;
}

// Water stops you unless you are swimming, and stops weak enemies, light boxes and
// lone turrets. Strong enemies, heavy boxes and blocks go through it.
const WADES = ['strong', 'heavy', 'mover'];
const wades = e => WADES.includes(e.kind);
const inWater = (s, x, y) => inb(s, x, y) && cellAt(s, x, y) === 'water';

const entAt = (s, x, y, not) => s.entities.find(e => !e.dead && e !== not && e.x === x && e.y === y);
// A hidden player is not on the board: nothing meets it, nothing stops at it.
const playerAt = (s, x, y) => !s.player.hidden && s.player.x === x && s.player.y === y;
// Armored, only the heavy things crush you: a strong enemy and a heavy box.
const crushes = (s, e) => e.kind === 'heavy' || e.kind === 'strong' || !s.powers.armored;
// A closing door squashes what is in it, unless one of these holds it open.
const HOLDS_DOOR = ['strong', 'heavy', 'mover'];

// A colour's doors open only while every button, receiver and sensor of that colour
// is held. A closing door squashes you, weak enemies, boxes and lone turrets, unless a
// strong enemy, a heavy box or a block stands in it (or you, armored): then it stays open.
function refreshDoors(s) {
  const pressed = {}, any = {};
  // A receiver or a sensor is a button that a turret beam holds down.
  s.cells.forEach((c, i) => {
    const x = i % s.w, y = (i - x) / s.w;
    let col, down;
    if (c.startsWith('button:')) { col = c.slice(7); down = playerAt(s, x, y) || !!entAt(s, x, y); }
    else if (c.startsWith('receiver:')) { col = c.slice(9); down = s.lit.has(i); }
    else if (c.startsWith('sensor:')) { col = c.slice(7); down = s.lit.has(i); }
    else return;
    any[col] = true;
    pressed[col] = (pressed[col] ?? true) && down;
  });
  let squashed = false;
  for (const col of COLOURS) {
    const want = !!(any[col] && pressed[col]);
    if (!want && s.open[col]) {
      const doors = [];
      s.cells.forEach((c, i) => { if (c === 'door:' + col) doors.push([i % s.w, Math.floor(i / s.w)]); });
      const inside = ([x, y]) => s.entities.filter(e => !e.dead && e.x === x && e.y === y);
      const youIn = ([x, y]) => s.player.x === x && s.player.y === y;
      if (doors.some(d => inside(d).some(e => HOLDS_DOOR.includes(e.kind)) || (youIn(d) && s.powers.armored))) continue;
      for (const d of doors) {
        for (const e of inside(d)) kill(s, e, 'door');
        if (youIn(d) && !s.player.hidden) squashed = true;
      }
    }
    s.open[col] = want;
  }
  if (squashed) { s.events.push({ type: 'squash', x: s.player.x, y: s.player.y }); die(s); }
}

// Sticky: a puddle makes you sticky until water washes it off or you stick to
// something. You ride a moving block or a sliding box you meet until you move off; a
// light box you meet glues to you and comes along until it cannot.
const stuckTo = s => { const st = s.player.stuck; return st && s.entities.find(e => e.id === st.id && !e.dead); };
const STICKS = e => e.kind === 'mover' || e.kind === 'box' || (e.kind === 'heavy' && !!e.slide);
function stick(s, e) {
  const p = s.player;
  p.sticky = false;
  p.stuck = { id: e.id, ride: e.kind === 'mover' || !!e.slide, dx: e.x - p.x, dy: e.y - p.y };
  s.events.push({ type: 'stick', id: e.id });
}
function unstick(s) {
  if (!s.player.stuck) return;
  s.player.stuck = null;
  s.events.push({ type: 'unstick' });
}
const DIR_OF = (dx, dy) => Object.keys(DIRS).find(k => DIRS[k][0] === dx && DIRS[k][1] === dy);
// Where a piece lands moved straight by (dx, dy), or null if it cannot go.
function shift(s, x, y, dx, dy, wet, not) {
  const t = stepTo(s, x, y, DIR_OF(dx, dy), wet);
  if (!t || t.x !== x + dx || t.y !== y + dy) return null;
  if (!t.death && entAt(s, t.x, t.y, not)) return null;
  return t;
}
// Moving onto a tile: a puddle makes you sticky, water washes it off.
function entered(s) {
  const p = s.player, c = cellAt(s, p.x, p.y);
  if (c === 'sticky' && !p.stuck && !p.sticky) { p.sticky = true; s.events.push({ type: 'sticky' }); }
  if (c === 'water') { p.sticky = false; unstick(s); }
}
// The piece you ride moved by (dx, dy): you go with it, or come off if you cannot.
function carry(s, dx, dy) {
  const p = s.player, t = shift(s, p.x, p.y, dx, dy, p.swimming, stuckTo(s));
  if (!t) return;
  if (t.death) { die(s); return; }
  p.x = t.x; p.y = t.y;
  entered(s);
}
// Your move took you by (dx, dy): a glued box behind or beside you follows, or falls off.
function drag(s, g, dx, dy) {
  const t = shift(s, g.x, g.y, dx, dy, false, g);
  if (t) land(s, g, t);
}
// The end of a tick: the one place a stuck piece lets go when it and you came apart
// (it could not follow, you could not, it died, you hid).
function checkStuck(s) {
  const p = s.player, st = p.stuck, e = stuckTo(s);
  if (!st) return;
  if (!e || p.hidden || e.x !== p.x + st.dx || e.y !== p.y + st.dy) { unstick(s); return; }
  // A sliding box you rode has stopped: a light one is glued to you now, a heavy one lets go.
  if (st.ride && e.kind !== 'mover' && !e.slide) { if (e.kind === 'box') st.ride = false; else unstick(s); }
}

// Dying or pressing Reset puts the whole room back as it started, with you on your last
// checkpoint. Pieces still moving this tick are left behind, marked dead.
function respawn(s) {
  for (const e of s.entities) e.dead = true;
  s.entities = freshPieces(s.origin);
  Object.assign(s.player, { x: s.checkpoint.x, y: s.checkpoint.y, dir: null, moved: 0, hidden: false, hideTicks: 0, sticky: false, stuck: null, snap: true });
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
  const p = s.player, t = stepTo(s, p.x, p.y, d, p.swimming);
  if (!t) return 'blocked';
  if (t.death) { die(s); return 'died'; }
  const nx = t.x, ny = t.y, e = entAt(s, nx, ny), g = p.stuck && !p.stuck.ride ? stuckTo(s) : null;
  const dx = nx - p.x, dy = ny - p.y, ahead = !!e && e === g;
  if (ahead) {
    // The glued box is ahead: it goes first, or it falls off and stops you.
    const b = shift(s, g.x, g.y, dx, dy, false, g);
    if (!b) { unstick(s); return 'blocked'; }
    land(s, g, b);
  } else if (e && p.sticky && STICKS(e)) { stick(s, e); return 'blocked'; }
  else if (e) {
    let b;
    if (e.kind === 'enemy' && diving) kill(s, e, 'dive');
    else if (ENEMY.includes(e.kind)) { if (!crushes(s, e)) return 'blocked'; die(s); return 'died'; }
    else if (e.kind === 'heavy') {
      if (diving) { e.slide = t.d; s.events.push({ type: 'crash', x: nx, y: ny }); }
      return 'blocked';
    } else if (e.kind === 'box' && (b = pushTo(s, nx, ny, t.d, false))) land(s, e, b);
    else return 'blocked';
  }
  p.x = nx; p.y = ny; p.moved++;
  if (p.dir) p.dir = t.d;
  if (g && !ahead) drag(s, g, dx, dy);
  entered(s);
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
// passes on. Returns the cells it crossed, whether geometry stopped it (and the
// cell that did), and whether it reached you.
function trace(s, x, y, d, hit, hitsPlayer) {
  const path = [[x, y]];
  let cx = x, cy = y, cd = d, wall = true, stop = null, player = false;
  for (let i = 0; i < s.w * s.h * 2; i++) {
    const t = stepTo(s, cx, cy, cd);
    if (!t || t.death) { cd = facing(s, cx, cy, cd); stop = [cx + DIRS[cd][0], cy + DIRS[cd][1]]; break; }
    path.push([t.x, t.y]);
    if (hitsPlayer && playerAt(s, t.x, t.y)) { wall = false; player = true; break; }
    const o = entAt(s, t.x, t.y);
    if (o && !hit(o)) { wall = false; break; }
    cx = t.x; cy = t.y; cd = t.d;
  }
  return { path, wall, end: cd, stop, player };
}

// Any laser kills a weak enemy and goes on. Everything else stops it, and a strong
// enemy takes no harm from it.
function laserHit(s, o, how) {
  if (o.kind === 'enemy') { kill(s, o, how); return true; }
  return false;
}

function laser(s, d) {
  const r = trace(s, s.player.x, s.player.y, d, o => laserHit(s, o, 'laser'), false);
  const pools = shockPools(s, r.path);
  s.events.push({ type: 'laser', d, ...r, shocked: [...pools] });
  if (shockHarms(s, pools, 'laser')) die(s);
}

// Every body of water a beam touches: the cells joined to it side by side.
function shockPools(s, path) {
  const out = new Set(), todo = path.filter(([x, y]) => inWater(s, x, y)).map(([x, y]) => y * s.w + x);
  while (todo.length) {
    const i = todo.pop();
    if (out.has(i)) continue;
    out.add(i);
    const x = i % s.w, y = (i - x) / s.w;
    for (const [dx, dy] of Object.values(DIRS)) if (inWater(s, x + dx, y + dy)) todo.push((y + dy) * s.w + x + dx);
  }
  return out;
}

// A shocked pool hurts what is in it as a direct hit would. Returns whether it reached you.
function shockHarms(s, pools, how) {
  for (const e of s.entities) if (!e.dead && pools.has(e.y * s.w + e.x)) laserHit(s, e, how);
  return pools.has(s.player.y * s.w + s.player.x) && !s.player.hidden;
}

const aimOf = t => t.dirs[t.aim % t.dirs.length];

function turnTurrets(s, mode) {
  for (const e of s.entities) if (!e.dead && e.turret && e.turret.mode === mode) e.turret.aim++;
}

// Every turret beam is on all the time, recomputed each tick. With harm, it kills
// you (unless you are hidden) and weak enemies. A beam that ends on a receiver lights
// it; so does one crossing a sensor nothing stands on.
function computeBeams(s, harm) {
  s.beams = []; s.lit = new Set(); s.shocked = new Set();
  let hitYou = false;
  for (const e of s.entities) {
    if (e.dead || !e.turret) continue;
    const r = trace(s, e.x, e.y, aimOf(e.turret), o => harm ? laserHit(s, o, 'turret') : o.kind === 'enemy', true);
    if (r.stop && inb(s, ...r.stop) && cellAt(s, ...r.stop).startsWith('receiver:')) s.lit.add(r.stop[1] * s.w + r.stop[0]);
    for (const [x, y] of r.path) if (cellAt(s, x, y).startsWith('sensor:') && !entAt(s, x, y) && !playerAt(s, x, y)) s.lit.add(y * s.w + x);
    if (r.player) hitYou = true;
    for (const i of shockPools(s, r.path)) s.shocked.add(i);
    s.beams.push({ id: e.id, d: aimOf(e.turret), ...r });
  }
  if (harm && shockHarms(s, s.shocked, 'turret')) hitYou = true;
  if (harm && hitYou) die(s);
}

// A hide is one cycle with no direction: each on-your-move piece slides along its
// patrol until something stops it, a tile per tick (see step), and turns there.
function hideCycle(s) {
  s.worldSteps++;
  for (const e of s.entities) if (!e.dead && e.mode === 'input' && MOVES.includes(e.kind)) e.rush = true;
  turnTurrets(s, 'input');
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
    if (e.slide) continue;
    if (e.mode === 'input' && !e.rush) moveMover(s, e);
    else if (e.mode === 'follow') moveMover(s, e, d);
  }
  turnTurrets(s, 'input');
  for (const e of s.entities) if (!e.dead && e.turret && e.turret.mode === 'follow' && e.turret.dirs.includes(d)) e.turret.aim = e.turret.dirs.indexOf(d);
  refreshDoors(s);
}

const patrolDir = e => e.axis === 'h' ? (e.dir > 0 ? 'right' : 'left') : (e.dir > 0 ? 'down' : 'up');

// Moves one tile along its patrol, or the given way. Blocked, it stays and turns its
// patrol. A triangle turns a patrol onto the other axis.
function moveMover(s, e, d, turned) {
  const t = stepTo(s, e.x, e.y, d || patrolDir(e), wades(e)), ridden = stuckTo(s) === e;
  let pushed = false;
  // Blocked, a patrol turns and moves the other way in the same step; a follower waits.
  const blocked = () => { if (d) return; e.dir = -e.dir; if (!turned) moveMover(s, e, null, true); };
  if (!t) { blocked(); return; }
  if (t.death) { kill(s, e, 'death'); return; }
  const o = entAt(s, t.x, t.y, e);
  let b;
  if (o) {
    if (o.kind === 'box' && (b = pushTo(s, t.x, t.y, t.d, false))) land(s, o, b);
    else { blocked(); return; }
  }
  if (playerAt(s, t.x, t.y)) {
    if (ENEMY.includes(e.kind)) {
      if (!crushes(s, e)) { blocked(); return; }
      e.x = t.x; e.y = t.y;
      die(s);
      return;
    }
    const p = s.player;
    if ((b = pushTo(s, t.x, t.y, t.d, p.swimming)) && b.death) die(s);
    else if (b) { p.x = b.x; p.y = b.y; pushed = true; s.events.push({ type: 'pushed' }); if (p.sticky) stick(s, e); entered(s); }
    else if (!crushes(s, e)) { blocked(); return; }
    else { e.x = t.x; e.y = t.y; die(s); return; }
  }
  const mx = t.x - e.x, my = t.y - e.y;
  e.x = t.x; e.y = t.y;
  if (ridden && !pushed && stuckTo(s) === e) carry(s, mx, my);
  if (!d) { e.axis = t.d === 'left' || t.d === 'right' ? 'h' : 'v'; e.dir = t.d === 'right' || t.d === 'down' ? 1 : -1; }
}

// A piece sliding on its own (a thrown heavy box, anything a spring launched) goes a
// tile per tick until something stops it. A heavy box squashes enemies and you; an
// enemy that reaches you kills you; anything else just stops.
function slidePiece(s, e) {
  const t = stepTo(s, e.x, e.y, e.slide, wades(e));
  if (!t) { e.slide = null; return; }
  if (t.death) { kill(s, e, 'death'); return; }
  const o = entAt(s, t.x, t.y, e);
  if (o) {
    if (e.kind === 'heavy' && ENEMY.includes(o.kind)) kill(s, o, 'squash');
    else { e.slide = null; return; }
  }
  const p = s.player, ridden = stuckTo(s) === e;
  if (playerAt(s, t.x, t.y) && (ridden || p.sticky) && !ENEMY.includes(e.kind)) {
    // Sticky, a sliding box that reaches you pushes you along and you ride it.
    const b = pushTo(s, t.x, t.y, t.d, p.swimming);
    if (b && b.death) { die(s); return; }
    if (b) {
      p.x = b.x; p.y = b.y; e.slide = t.d; e.x = t.x; e.y = t.y;
      if (!ridden) stick(s, e);
      entered(s);
      return;
    }
  }
  if (playerAt(s, t.x, t.y) && (!crushes(s, e) || (e.kind !== 'heavy' && !ENEMY.includes(e.kind)))) { e.slide = null; return; }
  const mx = t.x - e.x, my = t.y - e.y;
  e.x = t.x; e.y = t.y; e.slide = t.d;
  if (playerAt(s, t.x, t.y)) die(s);
  else if (ridden && stuckTo(s) === e) carry(s, mx, my);
}

// A spring launches whatever stands on the tile its face looks at, when that piece
// can move on that way.
function fireSprings(s) {
  s.cells.forEach((c, i) => {
    if (!c.startsWith('spring:')) return;
    const d = c.slice(7), x = i % s.w + DIRS[d][0], y = Math.floor(i / s.w) + DIRS[d][1];
    if (!inb(s, x, y)) return;
    const p = s.player;
    if (playerAt(s, x, y) && p.dir !== d && stepTo(s, x, y, d, p.swimming)) {
      if (!p.dir) p.moved = 0;
      p.dir = d;
      s.events.push({ type: 'spring', x, y, d });
    }
    const e = entAt(s, x, y);
    if (e && e.kind !== 'turret' && e.slide !== d && stepTo(s, x, y, d, wades(e))) {
      e.slide = d;
      s.events.push({ type: 'spring', x, y, d });
    }
  });
}

// You come back once the hide has lasted HIDE_TICKS and nothing it sent sliding is
// still going. Whatever is on your tile then squashes you.
function unhide(s) {
  const p = s.player;
  if (++p.hideTicks < HIDE_TICKS || s.entities.some(e => !e.dead && e.rush)) return;
  p.hidden = false;
  s.events.push({ type: 'unhide' });
  if (s.entities.some(e => !e.dead && e.x === p.x && e.y === p.y && crushes(s, e)) || solidCell(s, p.x, p.y)) { s.events.push({ type: 'squash', x: p.x, y: p.y }); die(s); }
}

// Besides keys, a run takes settings changed mid-play: 'power:dive:0', 'clock:slide'.
function input(s, k) {
  const p = s.player;
  if (k.startsWith('power:')) { const [, name, on] = k.split(':'); if (POWERS.includes(name)) s.powers[name] = on === '1'; return; }
  if (k.startsWith('clock:')) { const c = k.slice(6); if (c === 'tile' || c === 'slide') s.clock = c; return; }
  if (k === 'respawn') { respawn(s); s.events.push({ type: 'respawn' }); return; }
  // The tap: with Cycle you hide, with Swim you start or stop swimming (never in
  // water), and either way the world takes one step.
  if (k === 'hide') {
    if (p.dir || p.hidden) return;
    const swim = s.powers.swim && !inWater(s, p.x, p.y);
    if (!s.powers.cycle && !swim) return;
    if (swim) { p.swimming = !p.swimming; s.events.push({ type: 'swim', on: p.swimming }); }
    if (s.powers.cycle) { p.hidden = true; p.hideTicks = 0; s.events.push({ type: 'hide' }); }
    hideCycle(s);
    return;
  }
  if (!DIRS[k] || p.hidden) return;
  // Riding, a move lets go.
  if (p.stuck && p.stuck.ride) unstick(s);
  if (!p.dir) { p.dir = k; p.moved = 0; return; }
  if (k === p.dir) { if (s.powers.dive) dive(s); }
  else if (k === OPPOSITE[p.dir]) { if (s.powers.boomerang) { p.dir = k; s.events.push({ type: 'boomerang' }); } }
  else if (s.powers.laser) laser(s, k);
}

export function step(s, inputs = []) {
  s.events = [];
  s.player.snap = false;
  for (const k of inputs) input(s, k);
  // Pieces already sliding move first, so a piece a spring launched gets away
  // before you reach it.
  for (const e of s.entities) if (!e.dead && e.slide) slidePiece(s, e);
  for (const e of s.entities) if (!e.dead && e.rush && !e.slide) rushOnce(s, e);
  // In water you move a tile every other tick.
  if (s.player.dir) {
    s.player.stroke = inWater(s, s.player.x, s.player.y) ? !s.player.stroke : false;
    if (!s.player.stroke) slideOnce(s, false);
  }
  if (s.tick % RT_PERIOD === RT_PERIOD - 1) {
    for (const e of s.entities) if (!e.dead && !e.slide && e.mode === 'realtime' && MOVES.includes(e.kind)) moveMover(s, e);
    turnTurrets(s, 'realtime');
  }
  if (s.player.hidden) unhide(s);
  fireSprings(s);
  checkStuck(s);
  computeBeams(s, true);
  refreshDoors(s);
  s.tick++;
  return s;
}

// The one text reading of the game: tests, the bot and the agent all use it.
export function gameText(s, mode = 'play') {
  return JSON.stringify({
    mode, tick: s.tick, clock: s.clock, worldSteps: s.worldSteps, deaths: s.deaths,
    player: { x: s.player.x, y: s.player.y, sliding: s.player.dir, hidden: s.player.hidden, swimming: s.player.swimming, sticky: s.player.sticky, stuck: s.player.stuck && (s.player.stuck.ride ? 'riding' : 'glued') },
    checkpoint: s.checkpoint,
    pieces: s.entities.filter(e => !e.dead).map(e => ({
      kind: e.kind, x: e.x, y: e.y,
      ...(MOVES.includes(e.kind) ? { axis: e.axis, mode: e.mode } : {}),
      ...(e.turret ? { turret: { dirs: e.turret.dirs, mode: e.turret.mode, aim: aimOf(e.turret) } } : {}),
    })),
    open: COLOURS.filter(c => s.open[c]),
    beams: s.beams.map(b => ({ from: b.path[0], to: b.path[b.path.length - 1] })),
    powers: POWERS.filter(p => s.powers[p] && !NEEDS[p]),
  });
}

// Replays a key log ({t, k}) from the level; the same log always ends in the same text.
export function replay(level, log, ticks) {
  const s = createGame(level);
  for (let t = 0; t < ticks; t++) step(s, log.filter(i => i.t === t).map(i => i.k));
  return s;
}
