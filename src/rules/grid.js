// Geometry: what is on a tile, and where one step from a tile lands (walls, doors,
// triangles, one-way tiles, water).
import { DIRS, DIR_OF, ENTRY_FACE, EXIT_FACE, OPPOSITE, breaks, openFaces, turn, wades } from './base.js';

export const inb = (s, x, y) => x >= 0 && y >= 0 && x < s.w && y < s.h;
export const cellAt = (s, x, y) => s.cells[y * s.w + x];

// Gravel stops anything sliding onto it, you included.
export const onGravel = (s, o) => cellAt(s, o.x, o.y) === 'gravel';

// A relay is solid to anything that moves, and a beam goes through it (register 312). A door of
// two colours ('door:red|blue') is open while either colour is (register 313).
export function solidCell(s, x, y, beam = false) {
  if (!inb(s, x, y)) return true;
  const c = cellAt(s, x, y);
  if (c === 'wall' || c.startsWith('spring:')) return true;
  if (c.startsWith('sensor:')) return !beam;
  if (c === 'crack') return !s.broken.includes(y * s.w + x);
  if (c.startsWith('door:')) return !c.slice(5).split('|').some(col => s.open[col]);
  if (c.startsWith('idoor:')) return c.slice(6).split('|').some(col => s.open[col]);
  return false;
}

export const triAt = (s, x, y) => { const c = inb(s, x, y) && cellAt(s, x, y); return c && c.startsWith('tri:') ? c.slice(4) : null; };

// One step from (x, y) going d: where it lands and the way it went, or null when a
// wall, a closed door or a triangle's solid side is in the way. The turn happens on
// the way out: inside a triangle, heading into its solid side sends you along the slope.
export function facing(s, x, y, d) {
  const here = triAt(s, x, y);
  return here && !openFaces(here).includes(EXIT_FACE[d]) ? turn(here, d) : d;
}

// A one-way tile ('gate:right', 'gate:right,left') lets things move onto it and off
// it only along its listed directions; any other way, it is a wall. A coloured one
// ('gate:right@red') points the other way while its colour's doors are open.
export const gateOf = c => { if (!c || !c.startsWith('gate:')) return null; const [ds, col] = c.slice(5).split('@'); return { dirs: ds.split(','), col: col || null }; };
export const gateDirs = (s, c) => { const g = gateOf(c); return g && (g.col && g.col.split('|').some(col => s.open[col]) ? g.dirs.map(d => OPPOSITE[d]) : g.dirs); };
export const gateAt = (s, x, y) => inb(s, x, y) ? gateDirs(s, cellAt(s, x, y)) : null;

// wet: whether this mover may enter water (beams always may). heavy: whether it breaks a
// breakable block; the step then lands on it, marked crack, and the mover breaks it on arrival.
export function stepTo(s, x, y, d, wet = true, heavy = false, beam = false) {
  d = facing(s, x, y, d);
  const [dx, dy] = DIRS[d], nx = x + dx, ny = y + dy;
  const from = gateAt(s, x, y), to = gateAt(s, nx, ny);
  if ((from && !from.includes(d)) || (to && !to.includes(d))) return null;
  if (heavy && inb(s, nx, ny) && cellAt(s, nx, ny) === 'crack' && solidCell(s, nx, ny)) return { x: nx, y: ny, d, crack: true };
  if (solidCell(s, nx, ny, beam)) return null;
  if (!wet && cellAt(s, nx, ny) === 'water') return null;
  if (cellAt(s, nx, ny) === 'death') return { x: nx, y: ny, d, death: true };
  const tri = triAt(s, nx, ny);
  if (tri && !openFaces(tri).includes(ENTRY_FACE[d])) return null;
  return { x: nx, y: ny, d };
}

// Where a piece at (x, y) pushed d would go, if that tile is free. A death block
// always takes it.
export function pushTo(s, x, y, d, wet) {
  const t = stepTo(s, x, y, d, wet);
  return t && (t.death || (!entAt(s, t.x, t.y) && !playerAt(s, t.x, t.y))) ? t : null;
}

export const inWater = (s, x, y) => inb(s, x, y) && cellAt(s, x, y) === 'water';

export const entAt = (s, x, y, not) => s.entities.find(e => !e.dead && e !== not && e.x === x && e.y === y);
// A hidden player is not on the board: nothing meets it, nothing stops at it.
export const playerAt = (s, x, y) => !s.player.hidden && s.player.x === x && s.player.y === y;
// Armored, only the heavy things crush you: a strong enemy and a heavy box.
export const crushes = (s, e) => e.kind === 'heavy' || e.kind === 'strong' || !s.powers.armored;
// Where a piece lands moved straight by (dx, dy), or null if it cannot go.
export function shift(s, x, y, dx, dy, wet, not) {
  const t = stepTo(s, x, y, DIR_OF(dx, dy), wet);
  if (!t || t.x !== x + dx || t.y !== y + dy) return null;
  if (!t.death && entAt(s, t.x, t.y, not)) return null;
  return t;
}

// Sends you and the piece standing on (x, y) sliding d, each if it can move that way and is not
// already going d: a spring in front of it, or a one-way under it that turned. type names the event.
export function fling(s, x, y, d, type) {
  const p = s.player;
  if (playerAt(s, x, y) && p.dir !== d && stepTo(s, x, y, d, p.swimming)) {
    if (!p.dir) p.moved = 0;
    p.dir = d;
    s.events.push({ type, x, y, d });
  }
  const e = entAt(s, x, y);
  if (e && e.kind !== 'turret' && e.slide !== d && stepTo(s, x, y, d, wades(e), breaks(e))) {
    e.slide = d; e.rush = false; e.rushDir = null;
    s.events.push({ type, x, y, d });
  }
}
