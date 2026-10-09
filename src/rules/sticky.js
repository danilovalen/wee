// Sticky: a puddle makes you sticky until water washes it off or you stick to
// something. You ride a moving block or a sliding box you meet until you move off; a
// light box you meet glues to you and comes along until it cannot.
import { cellAt, shift } from './grid.js';
import { die, land } from './life.js';

// Sticky: a puddle makes you sticky until water washes it off or you stick to
// something. You ride a moving block or a sliding box you meet until you move off; a
// light box you meet glues to you and comes along until it cannot.
export const stuckTo = s => { const st = s.player.stuck; return st && s.entities.find(e => e.id === st.id && !e.dead); };
export const STICKS = e => e.kind === 'mover' || e.kind === 'box' || (e.kind === 'heavy' && !!e.slide);
export function stick(s, e) {
  const p = s.player;
  p.sticky = false;
  p.stuck = { id: e.id, ride: e.kind === 'mover' || !!e.slide, dx: e.x - p.x, dy: e.y - p.y };
  s.events.push({ type: 'stick', id: e.id });
}
export function unstick(s) {
  if (!s.player.stuck) return;
  s.player.stuck = null;
  s.events.push({ type: 'unstick' });
}
// Moving onto a tile: a puddle makes you sticky, water washes it off.
export function entered(s) {
  const p = s.player, c = cellAt(s, p.x, p.y);
  if (c === 'sticky' && !p.stuck && !p.sticky) { p.sticky = true; s.events.push({ type: 'sticky' }); }
  if (c === 'water') { p.sticky = false; unstick(s); }
}
// The piece you ride moved by (dx, dy): you go with it, or come off if you cannot.
export function carry(s, dx, dy) {
  const p = s.player, t = shift(s, p.x, p.y, dx, dy, p.swimming, stuckTo(s));
  if (!t) return;
  if (t.death) { die(s); return; }
  p.x = t.x; p.y = t.y;
  entered(s);
}
// Your move took you by (dx, dy): a glued box behind or beside you follows, or falls off.
export function drag(s, g, dx, dy) {
  const t = shift(s, g.x, g.y, dx, dy, false, g);
  if (t) land(s, g, t);
}
// The end of a tick: the one place a stuck piece lets go when it and you came apart
// (it could not follow, you could not, it died, you hid).
export function checkStuck(s) {
  const p = s.player, st = p.stuck, e = stuckTo(s);
  if (!st) return;
  if (!e || p.hidden || e.x !== p.x + st.dx || e.y !== p.y + st.dy) { unstick(s); return; }
  // A sliding box you rode has stopped: a light one is glued to you now, a heavy one lets go.
  if (st.ride && e.kind !== 'mover' && !e.slide) { if (e.kind === 'box') st.ride = false; else unstick(s); }
}
