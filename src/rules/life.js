// Doors and switches, dying, and the room reset.
import { CLOCKWISE, COLOURS, FUSE, HOLDS_DOOR } from './base.js';
import { cellAt, entAt, fling, gateDirs, inb, playerAt } from './grid.js';

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
      else if (c.startsWith('toggle:')) list.push({ i, x, y, col: c.slice(7), toggle: true });
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

// A toggle flips each time something enters it (you, or any piece), and starts off. Who stands
// on each toggle is kept, so standing still or sliding on does not flip it twice; with flip
// false, the occupants are only noted (a run's start, a reset). Both are replaced, never
// edited, so a copy of a run can share them.
export function flipToggles(s, flip = true) {
  const list = switchesOf(s).filter(w => w.toggle);
  if (!list.length) return;
  const was = s.onToggle || {}, now = {};
  let on = s.toggled;
  for (const { i, x, y } of list) {
    const ids = s.player.x === x && s.player.y === y ? ['you'] : [];
    for (const e of s.entities) if (!e.dead && e.x === x && e.y === y) ids.push(e.id);
    now[i] = ids;
    if (flip) for (const id of ids) if (!(was[i] || []).includes(id)) on = on.includes(i) ? on.filter(j => j !== i) : [...on, i].sort((a, b) => a - b);
  }
  s.onToggle = now; s.toggled = on;
}

export function refreshDoors(s) {
  const pressed = {}, any = {};
  flipToggles(s);
  // A receiver or a sensor is a button that a turret beam holds down; a toggle is held while on.
  for (const { i, x, y, col, button, toggle } of switchesOf(s)) {
    const down = toggle ? s.toggled.includes(i) : button ? playerAt(s, x, y) || !!entAt(s, x, y) : s.lit.has(i);
    for (const c of col.split('|')) { any[c] = true; pressed[c] = (pressed[c] ?? true) && down; }
  }
  let squashed = false;
  const turned = [], was = { ...s.open };
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
    if (want !== !!s.open[col]) turned.push(col);
    s.open[col] = want;
  }
  // A door of two colours closes only when both have, an inverted one the moment either opens:
  // then it squashes what is in it.
  s.cells.forEach((c, i) => {
    const m = /^(i?)door:(\w+\|\w+)$/.exec(c);
    if (!m) return;
    const cols = m[2].split('|'), x = i % s.w, y = Math.floor(i / s.w), before = cols.some(col => was[col]), after = cols.some(col => s.open[col]);
    if (m[1] ? before || !after : !before || after) return;
    for (const e of s.entities.filter(e => !e.dead && e.x === x && e.y === y)) kill(s, e, 'door');
    if (s.player.x === x && s.player.y === y && !s.player.hidden) squashed = true;
  });
  launch(s, turned, was);
  if (squashed) { s.events.push({ type: 'squash', x: s.player.x, y: s.player.y }); die(s); }
}

// A one-way of a colour that just turned launches what stands on it along its new arrow, sliding
// on until something stops it (register 253), as if it had kept moving that way.
function launch(s, cols, was) {
  if (!cols.length) return;
  s.cells.forEach((c, i) => {
    const own = c.startsWith('gate:') && c.split('@')[1] ? c.split('@')[1].split('|') : [];
    // A one-way of two colours turns only when the pair goes from neither open to either, or back.
    if (!own.some(col => cols.includes(col)) || own.some(col => was[col]) === own.some(col => s.open[col])) return;
    const x = i % s.w, y = (i - x) / s.w;
    fling(s, x, y, gateDirs(s, c)[0], 'launch');
  });
}

// Dying or pressing Reset puts the whole room back as it started, with you on your last
// checkpoint. Pieces still moving this tick are left behind, marked dead.
export function respawn(s) {
  for (const e of s.entities) e.dead = true;
  s.entities = freshPieces(s.origin);
  s.broken = [];
  Object.assign(s.player, { x: s.checkpoint.x, y: s.checkpoint.y, dir: null, moved: 0, hidden: false, hideTicks: 0, sticky: false, stuck: null, pushing: null, snap: true });
  // Doors start over as a new room's do, so a one-way that turns back on reset launches nothing a start would not.
  s.toggled = []; s.open = {}; flipToggles(s, false);
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
// weak enemies, breakable blocks), another bomb there goes off too, and you die if you are in it
// (unless armored).
const BLASTED = ['box', 'enemy'];
function blast(s, e) {
  kill(s, e, 'blast');
  s.events.push({ type: 'blast', x: e.x, y: e.y });
  let you = false;
  for (let y = e.y - 1; y <= e.y + 1; y++) for (let x = e.x - 1; x <= e.x + 1; x++) {
    if (!inb(s, x, y)) continue;
    if (cellAt(s, x, y) === 'crack' && !s.broken.includes(y * s.w + x)) smash(s, { x, y, crack: true });
    if (playerAt(s, x, y) && !s.powers.armored) you = true;
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

// A bomb that is crushed, squashed or falls into death goes off instead of just breaking.
export function kill(s, e, how) {
  if (e.kind === 'bomb' && how !== 'blast') { explode(s, e); return; }
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
