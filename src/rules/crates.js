// Pushable tiles (register 336): a relay, a one-way, a door or an inverted door in a box's frame.
// The level lists them as crates: [{x, y}]; a run keeps them as tile indices in s.crates. Pushing
// replaces s.cells and s.crates, never edits them, so a copy of a run can share both.
import { DIRS, PUSHED, wades } from './base.js';
import { cellAt, entAt, gateAt, gateDirs, inb, playerAt, pushTo, solidCell } from './grid.js';
import { land } from './life.js';
import { rewire } from './wires.js';

export const crateAt = (s, x, y) => inb(s, x, y) && s.crates.has(y * s.w + x);

// A relay is always pushed; a door or inverted door only while closed (open, you walk through);
// a one-way only along its arrow.
export function pushesTile(s, x, y, d) {
  const c = cellAt(s, x, y);
  if (c.startsWith('sensor:')) return true;
  if (c.startsWith('door:') || c.startsWith('idoor:')) return solidCell(s, x, y);
  if (c.startsWith('gate:')) return gateDirs(s, c).includes(d);
  return false;
}

// Pushes the row starting at (x, y) one tile d: pushable tiles and pushed pieces go as one train.
// A tile lands on bare floor or on spikes, which it covers (registers 449, 453). Returns false, moving nothing, when the front cannot go.
export function pushChain(s, x, y, d) {
  const [dx, dy] = DIRS[d], list = [];
  for (let cx = x, cy = y; ; cx += dx, cy += dy) {
    if (!inb(s, cx, cy) || playerAt(s, cx, cy)) return false;
    const e = entAt(s, cx, cy);
    // A piece standing on a pushable tile is pushed off it alone (register 455).
    if (!e && crateAt(s, cx, cy) && pushesTile(s, cx, cy, d)) { list.push({ x: cx, y: cy }); continue; }
    if (e) {
      const g = gateAt(s, cx, cy);
      if (!PUSHED(e) || e.glue || (g && !g.includes(d))) return false;
      list.push({ e, x: cx, y: cy }); continue;
    }
    const last = list.at(-1);
    if (!last) return false;
    // The front piece lands where it would alone; only a row of pieces alone lets a triangle turn it
    // (a box train, register 278), a row with a tile in it goes straight.
    if (last.e) { const t = pushTo(s, last.x, last.y, d, wades(last.e)); if (!t || ((t.x !== cx || t.y !== cy) && !list.every(o => o.e))) return false; last.to = t; }
    // A tile lands like a box (register 505): on floor, on spikes it covers, or into an open doorway.
    else if (crateAt(s, cx, cy) || !(cellAt(s, cx, cy) === '' || cellAt(s, cx, cy) === 'death' || (/^i?door:/.test(cellAt(s, cx, cy)) && !solidCell(s, cx, cy)))) return false;
    break;
  }
  const cells = [...s.cells], crates = new Set(s.crates), tiles = s.tiles.map(t => ({ ...t }));
  for (let i = list.length - 1; i >= 0; i--) {
    const o = list[i];
    if (o.e) continue;
    const from = o.y * s.w + o.x, to = from + dy * s.w + dx;
    cells[to] = s.wireAt ? rewire(cells[from], s.wireAt[to]) : cells[from]; cells[from] = s.ground[from];
    crates.delete(from); crates.add(to);
    const t = tiles.find(t => t.y * s.w + t.x === from); t.x += dx; t.y += dy; t.cell = cells[to];
    // by: a box earlier in the row pushed this tile, not the robot.
    s.events.push({ type: 'tilePush', id: t.id, x: o.x, y: o.y, d, by: list.slice(0, i).some(p => p.e && p.e.kind === 'box') ? 'box' : 'robot' });
  }
  s.cells = cells; s.crates = crates; s.tiles = tiles;
  for (let i = list.length - 1; i >= 0; i--) {
    const o = list[i];
    if (o.e) land(s, o.e, o.to || { x: o.x + dx, y: o.y + dy, d });
  }
  return true;
}
