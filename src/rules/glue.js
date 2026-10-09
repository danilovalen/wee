// Sticky pieces: a piece that crosses a puddle is sticky until water washes it off or it
// meets another piece, and then the two are glued. A glued pair moves as one: when one
// moves, the other moves the same way, or they come apart.
import { wades } from './base.js';
import { entAt, playerAt, shift } from './grid.js';
import { land } from './life.js';

export const partnerOf = (s, e) => (e.glue && s.entities.find(o => o.id === e.glue && !o.dead)) || null;

// A sticky e ran into o: they glue, which uses the stickiness up. A turret never glues,
// and a piece glues to one other at most. (A glued piece is never sticky: see land.)
export function meet(s, e, o) {
  if (!e.sticky || o.kind === 'turret' || partnerOf(s, o)) return false;
  e.sticky = false;
  e.glue = o.id; o.glue = e.id;
  s.events.push({ type: 'glue', id: e.id, to: o.id });
  return true;
}

export function unglue(s, e) {
  const o = partnerOf(s, e);
  e.glue = null;
  if (!o) return;
  o.glue = null;
  s.events.push({ type: 'unglue', id: e.id, to: o.id });
}

// Moves e's partner by (dx, dy): it goes, or the two come apart.
function bring(s, e, dx, dy) {
  const o = partnerOf(s, e);
  if (!o) { e.glue = null; return false; }
  const t = shift(s, o.x, o.y, dx, dy, wades(o), o);
  if (t && !playerAt(s, t.x, t.y)) { land(s, o, t); return true; }
  unglue(s, e);
  return false;
}

// e is about to move by (dx, dy) and its partner is in the way: the partner goes
// first, or they come apart and e stays.
export const lead = (s, e, dx, dy) => bring(s, e, dx, dy);
// e moved by (dx, dy): its partner follows.
export const follow = (s, e, dx, dy) => { if (e.glue) bring(s, e, dx, dy); };
// The piece in e's way when it is e's partner, so the caller leads it instead.
export const partnerAt = (s, e, x, y) => { const o = entAt(s, x, y, e); return o && o.id === e.glue ? o : null; };

// The end of a tick: a pair that ended up apart (one died, or was moved by something
// that does not bring its partner) lets go.
export function checkGlue(s) {
  for (const e of s.entities) {
    if (e.dead || !e.glue) continue;
    const o = partnerOf(s, e);
    if (!o || Math.abs(o.x - e.x) + Math.abs(o.y - e.y) !== 1) unglue(s, e);
  }
}
