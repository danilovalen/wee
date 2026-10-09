// Geometry: what is on a tile, and where one step from a tile lands (walls, doors,
// triangles, one-way tiles, water).
import { DIRS, DIR_OF, ENTRY_FACE, EXIT_FACE, openFaces, turn } from './base.js';

export const inb = (s, x, y) => x >= 0 && y >= 0 && x < s.w && y < s.h;
export const cellAt = (s, x, y) => s.cells[y * s.w + x];

export function solidCell(s, x, y) {
  if (!inb(s, x, y)) return true;
  const c = cellAt(s, x, y);
  if (c === 'wall' || c.startsWith('receiver:') || c.startsWith('spring:')) return true;
  if (c.startsWith('door:')) return !s.open[c.slice(5)];
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
// it only along its listed directions; any other way, it is a wall.
export const gateAt = (s, x, y) => { const c = inb(s, x, y) && cellAt(s, x, y); return c && c.startsWith('gate:') ? c.slice(5).split(',') : null; };

// wet: whether this mover may enter water (beams always may).
export function stepTo(s, x, y, d, wet = true) {
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
