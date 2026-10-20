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
// A tile lands only on bare floor. Returns false, moving nothing, when the front cannot go.
export function pushChain(s, x, y, d) {
  const [dx, dy] = DIRS[d], list = [];
  for (let cx = x, cy = y; ; cx += dx, cy += dy) {
    if (!inb(s, cx, cy) || playerAt(s, cx, cy)) return false;
    const e = entAt(s, cx, cy);
    if (crateAt(s, cx, cy) && pushesTile(s, cx, cy, d)) { if (e) return false; list.push({ x: cx, y: cy }); continue; }
    if (e) {
      const g = gateAt(s, cx, cy);
      if (!PUSHED(e) || e.glue || (g && !g.includes(d))) return false;
      list.push({ e, x: cx, y: cy }); continue;
    }
    const last = list.at(-1);
    if (!last) return false;
    if (last.e) { const t = pushTo(s, last.x, last.y, d, wades(last.e)); if (!t || t.x !== cx || t.y !== cy) return false; last.to = t; }
    else if (cellAt(s, cx, cy) !== '') return false;
    break;
  }
  const cells = [...s.cells], crates = new Set(s.crates);
  for (let i = list.length - 1; i >= 0; i--) {
    const o = list[i];
    if (o.e) continue;
    const from = o.y * s.w + o.x, to = from + dy * s.w + dx;
    cells[to] = s.wireAt ? rewire(cells[from], s.wireAt[to]) : cells[from]; cells[from] = '';
    crates.delete(from); crates.add(to);
    s.events.push({ type: 'tilePush', x: o.x, y: o.y, d });
  }
  s.cells = cells; s.crates = crates;
  for (let i = list.length - 1; i >= 0; i--) {
    const o = list[i];
    if (o.e) land(s, o.e, o.to || { x: o.x + dx, y: o.y + dy, d });
  }
  return true;
}
