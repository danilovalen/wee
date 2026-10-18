// Placing and moving inside a level: what the level refuses, why, and saying so on the tile.
import { placementErrors } from '../campaign/rules.js';
import { place, moveAt } from '../editor/edit.js';
import { S } from '../editor/state.js';
import { $, now } from './dom.js';

// Move: carries the thing on one tile to another, when the target can take it and the room
// breaks no rule it kept before. Returns the moved room or null.
export function moveIn(level, from, to) {
  return moveRefusal(level, from, to) ? null : moveAt(level, from, to);
}

// Why a tap may not change the room, or null when it may: placing must not break a rule the
// level enforces as you build (a maximum, a second goal, a box on a button). Too few of
// something is fine while building; Run says so.
export function refusal(level, ui, x, y, how) {
  if (!S.camp) return null;
  const def = S.camp.def, before = new Set(placementErrors(def, level).map(e => e.msg)), next = structuredClone(level);
  place(next, ui, x, y, how);
  const e = placementErrors(def, next).find(e => !/^Place at least/.test(e.msg) && !before.has(e.msg));
  return e ? tipOf(e.msg) : null;
}
export const allows = (level, ui, x, y, how) => !refusal(level, ui, x, y, how);
// A refusal said on the tile: the start and goal are never removed, only moved.
const tipOf = msg => msg === 'Place the goal.' ? 'The goal stays. Use Move.' : msg === 'Place the start.' ? 'The start stays. Use Move.' : msg;

// Why Move cannot carry a thing from one tile to another, or null when it can.
export function moveRefusal(level, from, to) {
  const next = moveAt(level, from, to);
  if (!next) return 'Cannot go there.';
  if (!S.camp) return null;
  const before = new Set(placementErrors(S.camp.def, level).map(e => e.msg)), e = placementErrors(S.camp.def, next).find(e => !before.has(e.msg));
  return e ? tipOf(e.msg) : null;
}

// Says why a tap was refused, on the tile, for a moment; the room does not change.
export function refuse(x, y, why) {
  S.fx.push({ type: 'refuse', x, y, at: now() });
  say(x, y, why);
}

// A line on a tile, for a moment.
export function say(x, y, why, ms = 1500) {
  const tip = $('campTip'), c = $('game'), w = $('roomWrap').getBoundingClientRect(), r = c.getBoundingClientRect();
  tip.textContent = why;
  tip.style.left = `${r.left - w.left + (x + 0.5) * r.width / S.level.w}px`;
  tip.style.top = `${r.top - w.top + y * r.height / S.level.h}px`;
  tip.hidden = false;
  clearTimeout(say.t); say.t = setTimeout(() => { tip.hidden = true; }, ms);
}

// The first one-way placed in a level says how to turn it; once per browser.
const TURN_HINT = 'wee.hint.turnOneWay';
export function hintTurn(x, y) {
  try { if (localStorage.getItem(TURN_HINT)) return; localStorage.setItem(TURN_HINT, '1'); } catch { /* no storage: say it every time */ }
  say(x, y, 'Tap it again to turn it.', 3000);
}
