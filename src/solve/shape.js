// Trim (register 693): the smallest room that plays the same. Takes out rows and columns, at the edges or
// inside, one at a time, keeping each cut after which the room still solves in the same number of moves
// and keeps its traps (owner: moves and dead ends both stay). A generator, run a slice at a time.
import { routes } from './design.js';

// Line k of the room taken out ('col' or 'row'), with everything past it moved over by one. Null when the
// line holds the start, the goal or a piece, or the room would be empty.
export function cutLine(l, axis, k) {
  const col = axis === 'col', at = o => (col ? o.x : o.y) === k;
  if ((col ? l.w : l.h) < 2) return null;
  if (l.start && at(l.start)) return null;
  if (l.entities.some(at)) return null;
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) if ((col ? x : y) === k && l.cells[y * l.w + x] === 'goal') return null;
  const shift = o => ({ ...o, x: col && o.x > k ? o.x - 1 : o.x, y: !col && o.y > k ? o.y - 1 : o.y });
  const cells = [];
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) if ((col ? x : y) !== k) cells.push(l.cells[y * l.w + x]);
  return {
    ...l, w: l.w - (col ? 1 : 0), h: l.h - (col ? 0 : 1), cells, start: l.start && shift(l.start), entities: l.entities.map(shift),
    ...(l.crates ? { crates: l.crates.filter(c => !at(c)).map(shift) } : {}), ...(l.wires ? { wires: l.wires.filter(c => !at(c)).map(shift) } : {}),
  };
}

// Plays the same: the same shortest length, the same number of tiles where every stop is a trap, and dead
// ends if and only if the room had them.
export const same = (a, b) => !!b && b.par === a.par && b.traps.length === a.traps.length && (b.dead > 0) === (a.dead > 0);

// { level, cut } with cut the number of lines taken out, or null when nothing can go (or the room is too big
// to map, or has no answer).
export function* trimRoom(level, max) {
  const base = yield* routes(level, max);
  if (!base || base.par == null) return null;
  let cur = level, cut = 0;
  for (let found = true; found;) {
    found = false;
    scan: for (const axis of ['row', 'col']) for (let k = 0; k < (axis === 'col' ? cur.w : cur.h); k++) {
      const next = cutLine(cur, axis, k);
      if (next && same(base, yield* routes(next, max))) { cur = next; cut++; found = true; break scan; }
    }
  }
  return cut ? { level: cur, cut } : null;
}
