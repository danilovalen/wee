// Doors and switches, dying, and the room reset.
import { CLOCKWISE, COLOURS, FUSE, HOLDS_DOOR } from './base.js';
import { cellAt, entAt, inb, playerAt } from './grid.js';

// Which of its directions, in clockwise order, a turret aims first.
export const startAim = t => Math.max(0, CLOCKWISE.filter(d => t.dirs.includes(d)).indexOf(t.start));

// The room's pieces as the level places them; a reset builds them again from here.
export const freshPieces = list => list.map((e, i) => ({
  id: i + 1, kind: e.kind, x: e.x, y: e.y, ...(e.kind === 'bomb' ? { fuse: null } : {}),
  axis: e.axis || 'h', dir: e.dir || 1, mode: e.mode || 'input', slide: null, dead: false, rush: false,
  turret: e.turret ? { dirs: CLOCKWISE.filter(d => e.turret.dirs.includes(d)), mode: e.turret.mode, aim: startAim(e.turret) } : null,
}));

// A colour's doors open only while every button, receiver and sensor of that colour
// is held; its inverted doors close then. A closing door of either kind squashes you,
// weak enemies, boxes and lone turrets, unless a strong enemy, a heavy box or a block
// stands in it (or you, armored): then the colour keeps its state, so both kinds hold.
// A room's cells never change during a run, so where its switches are is worked out once.
const SWITCHES = new WeakMap();
export function switchesOf(s) {
  let list = SWITCHES.get(s.cells);
  if (!list) {
    list = [];
    s.cells.forEach((c, i) => {
      const x = i % s.w, y = (i - x) / s.w;
      if (c.startsWith('button:')) list.push({ i, x, y, col: c.slice(7), button: true });
      else if (c.startsWith('receiver:')) list.push({ i, x, y, col: c.slice(9), button: false });
      else if (c.startsWith('sensor:')) list.push({ i, x, y, col: c.slice(7), button: false });
    });
    SWITCHES.set(s.cells, list);
  }
  return list;
}

const DOORS = new WeakMap();
function doorsOf(s, cell) {
  let by = DOORS.get(s.cells);
  if (!by) { by = {}; s.cells.forEach((c, i) => { if (/^i?door:/.test(c)) (by[c] ||= []).push([i % s.w, Math.floor(i / s.w)]); }); DOORS.set(s.cells, by); }
  return by[cell] || [];
}

export function refreshDoors(s) {
  const pressed = {}, any = {};
  // A receiver or a sensor is a button that a turret beam holds down.
  for (const { i, x, y, col, button } of switchesOf(s)) {
    const down = button ? playerAt(s, x, y) || !!entAt(s, x, y) : s.lit.has(i);
    any[col] = true;
    pressed[col] = (pressed[col] ?? true) && down;
  }
  let squashed = false;
  for (const col of COLOURS) {
    const want = !!(any[col] && pressed[col]);
    if (want !== !!s.open[col]) {
      const doors = doorsOf(s, (want ? 'idoor:' : 'door:') + col);
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

// Dying or pressing Reset puts the whole room back as it started, with you on your last
// checkpoint. Pieces still moving this tick are left behind, marked dead.
export function respawn(s) {
  for (const e of s.entities) e.dead = true;
  s.entities = freshPieces(s.origin);
  s.broken = [];
  Object.assign(s.player, { x: s.checkpoint.x, y: s.checkpoint.y, dir: null, moved: 0, hidden: false, hideTicks: 0, sticky: false, stuck: null, pushing: null, snap: true });
  refreshDoors(s);
}

// A heavy step that reached a breakable block breaks it. The list is replaced, never edited,
// so a copy of a run can share it.
export function smash(s, t) {
  if (!t.crack) return;
  s.broken = [...s.broken, t.y * s.w + t.x];
  s.events.push({ type: 'break', x: t.x, y: t.y });
}

// A push lights a bomb, unless it is in water or already burning.
export function light(s, e) {
  if (e.kind !== 'bomb' || e.fuse != null || cellAt(s, e.x, e.y) === 'water') return;
  e.fuse = FUSE;
  s.events.push({ type: 'light', id: e.id });
}

// A bomb going off: everything in the 3x3 around it that a blast destroys goes (light boxes,
// weak enemies, breakable blocks), another bomb there goes off too, and you die if you are in it.
const BLASTED = ['box', 'enemy'];
function blast(s, e) {
  kill(s, e, 'blast');
  s.events.push({ type: 'blast', x: e.x, y: e.y });
  let you = false;
  for (let y = e.y - 1; y <= e.y + 1; y++) for (let x = e.x - 1; x <= e.x + 1; x++) {
    if (!inb(s, x, y)) continue;
    if (cellAt(s, x, y) === 'crack' && !s.broken.includes(y * s.w + x)) smash(s, { x, y, crack: true });
    if (playerAt(s, x, y)) you = true;
    for (const o of s.entities) {
      if (o.dead || o.x !== x || o.y !== y) continue;
      if (o.kind === 'bomb') you = blast(s, o) || you;
      else if (BLASTED.includes(o.kind)) kill(s, o, 'blast');
    }
  }
  return you;
}
export function explode(s, e) { if (blast(s, e)) die(s); }

export function die(s) {
  s.events.push({ type: 'die', x: s.player.x, y: s.player.y });
  s.deaths++;
  respawn(s);
}

export function kill(s, e, how) {
  e.dead = true;
  s.events.push({ type: 'kill', id: e.id, how });
}

// Puts a piece on t, or destroys it when t is a death block. A puddle makes it sticky
// (a turret never is), water washes that off.
export function land(s, e, t) {
  if (t.death) { kill(s, e, 'death'); return false; }
  e.x = t.x; e.y = t.y;
  const c = cellAt(s, e.x, e.y);
  if (c === 'sticky' && e.kind !== 'turret' && !e.glue && !e.sticky) { e.sticky = true; s.events.push({ type: 'sticky', id: e.id }); }
  if (c === 'water') { e.sticky = false; if (e.fuse != null) { e.fuse = null; s.events.push({ type: 'fizzle', id: e.id }); } }
  return true;
}
