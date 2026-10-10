// Doors and switches, dying, and the room reset.
import { CLOCKWISE, COLOURS, HOLDS_DOOR } from './base.js';
import { cellAt, entAt, playerAt } from './grid.js';

// Which of its directions, in clockwise order, a turret aims first.
export const startAim = t => Math.max(0, CLOCKWISE.filter(d => t.dirs.includes(d)).indexOf(t.start));

// The room's pieces as the level places them; a reset builds them again from here.
export const freshPieces = list => list.map((e, i) => ({
  id: i + 1, kind: e.kind, x: e.x, y: e.y,
  axis: e.axis || 'h', dir: e.dir || 1, mode: e.mode || 'input', slide: null, dead: false, rush: false,
  turret: e.turret ? { dirs: CLOCKWISE.filter(d => e.turret.dirs.includes(d)), mode: e.turret.mode, aim: startAim(e.turret) } : null,
}));

// A colour's doors open only while every button, receiver and sensor of that colour
// is held; its inverted doors close then. A closing door of either kind squashes you,
// weak enemies, boxes and lone turrets, unless a strong enemy, a heavy box or a block
// stands in it (or you, armored): then the colour keeps its state, so both kinds hold.
export function refreshDoors(s) {
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
    if (want !== !!s.open[col]) {
      const closing = (want ? 'idoor:' : 'door:') + col, doors = [];
      s.cells.forEach((c, i) => { if (c === closing) doors.push([i % s.w, Math.floor(i / s.w)]); });
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
  Object.assign(s.player, { x: s.checkpoint.x, y: s.checkpoint.y, dir: null, moved: 0, hidden: false, hideTicks: 0, sticky: false, stuck: null, pushing: null, snap: true });
  refreshDoors(s);
}

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
  if (c === 'water') e.sticky = false;
  return true;
}
