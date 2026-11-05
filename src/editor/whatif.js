// What each tile's change does to the answer (registers 755, 756): placing the piece in hand there (every
// way round, the longest kept), or with Erase, taking out what is there. One search per candidate.
import { search } from '../solve/solve.js';
import { NOTES_MAX } from '../solve/design.js';
import { place, turnDoor, turnSwitch } from './edit.js';
import { variants } from './variants.js';

const clone = l => JSON.parse(JSON.stringify(l));
function* answer(level) { const r = yield* search(level, NOTES_MAX); return r.status === 'solved' ? r.moves : null; }

// Fills `map` (tile -> { moves or null, same, level, ui, what }) as it goes; returns the room's own answer length.
export function* whatIf(level, ui, map) {
  const base = yield* answer(level), b = base && base.length, sig = base && base.join();
  const note = (i, l, moves, extra) => { map.set(i, { moves: moves && moves.length, same: !!moves && moves.length === b && moves.join() !== sig, level: l, ...extra }); };
  if (ui.tool === 'erase') {
    for (let k = 0; k < level.entities.length; k++) { const e = level.entities[k], l = clone(level); l.entities.splice(k, 1); note(e.y * level.w + e.x, l, yield* answer(l), { what: e.kind }); }
    for (let i = 0; i < level.cells.length; i++) {
      const c = level.cells[i];
      if (!c || c === 'goal' || map.has(i)) continue;
      const l = clone(level); l.cells[i] = ''; note(i, l, yield* answer(l), { what: c.split(':')[0] });
    }
    return b;
  }
  for (let y = 0; y < level.h; y++) for (let x = 0; x < level.w; x++) {
    const i = y * level.w + x;
    if (level.cells[i] || level.entities.some(e => e.x === x && e.y === y) || (level.start && level.start.x === x && level.start.y === y)) continue;
    let best = null;
    for (const u of variants(ui)) {
      const l = clone(level);
      if (!place(l, u, x, y, 'place').length) continue;
      if (u.inverted) turnDoor(l, x, y);
      if (u.on) turnSwitch(l, x, y);
      const m = yield* answer(l);
      if (!best || (m && (!best.m || m.length > best.m.length))) best = { l, m, u };
    }
    if (best) note(i, best.l, best.m, { ui: best.u, what: ui.tool });
  }
  return b;
}

