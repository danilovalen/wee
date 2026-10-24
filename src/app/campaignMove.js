// Placing and moving inside a level: what the level refuses, why, and saying so on the tile.
import { placementErrors, START_ON } from '../campaign/rules.js';
import { place, moveAt, swapAt } from '../editor/edit.js';
import { S } from '../editor/state.js';
import { $, now } from './dom.js';
import { T } from '../view/ink.js';
import { toScreen } from './camera.js';

// Move: carries the thing on one tile to another, when the target can take it and the room
// breaks no rule it kept before. Where a plain move would break one (a box or the robot left on a
// button or a switch), the two swap instead (register 230). Returns the moved room or null.
export function moveIn(level, from, to) {
  return tries(level, from, to).find(next => !newError(level, next)) || null;
}
const tries = (level, from, to) => [moveAt(level, from, to), swapAt(level, from, to)].filter(Boolean);
// The first rule a change breaks that the room kept before, or null.
function newError(level, next) {
  if (!S.camp) return null;
  const before = new Set(placementErrors(S.camp.def, level).map(e => e.msg));
  return placementErrors(S.camp.def, next).find(e => !before.has(e.msg)) || null;
}

// Why a tap may not change the room, or null when it may: placing must not break a rule the
// level enforces as you build (a maximum, a second goal, a box on a button). Too few of
// something is fine while building; Run says so.
export function refusal(level, ui, x, y, how) {
  if (!S.camp) return null;
  const e = newPlacementError(level, placed(level, ui, x, y, how));
  // The robot's start is never removed, so a tile placed under it cannot take its place.
  if (e && e.msg === START_ON && level.start && level.start.x === x && level.start.y === y) return tipOf('Place the start.');
  return e ? tipOf(e.msg) : null;
}
const placed = (level, ui, x, y, how, first) => { const next = structuredClone(level); if (first) first(next); place(next, ui, x, y, how); return next; };
function newPlacementError(level, next) {
  const def = S.camp.def, before = new Set(placementErrors(def, level).map(e => e.msg));
  return placementErrors(def, next).find(e => !/^Place at least/.test(e.msg) && !before.has(e.msg)) || null;
}
// A box or the robot placed onto a button, a switch or spikes takes the tile's place, and one of
// those placed under a box takes the box's, instead of refusing (register 441). Returns the room or null.
const UNDER_TILE = c => /^(button|toggle):|^death$/.test(c || '');
export function replacing(level, ui, x, y, how) {
  if (!S.camp || how !== 'place') return null;
  const first = placed(level, ui, x, y, how), e = newPlacementError(level, first);
  if (!e || e.msg !== START_ON) return null;
  const i = y * level.w + x;
  // The tile was already there, so the newcomer is the box or the robot: the tile goes.
  const clear = UNDER_TILE(level.cells[i])
    ? l => { l.cells[i] = ''; }
    : l => { l.entities = l.entities.filter(p => p.x !== x || p.y !== y); };
  const next = placed(level, ui, x, y, how, clear);
  return newPlacementError(level, next) ? null : next;
}
export const allows = (level, ui, x, y, how) => !refusal(level, ui, x, y, how);
// A refusal said on the tile: the start and goal are never removed, only moved.
const tipOf = msg => msg === 'Place the goal.' ? 'To move the goal, use Move.' : msg === 'Place the start.' ? 'To move the start, use Move.' : msg;

// Why Move cannot carry a thing from one tile to another, or null when it can.
export function moveRefusal(level, from, to) {
  const all = tries(level, from, to);
  if (!all.length) return 'Cannot go there.';
  if (all.some(next => !newError(level, next))) return null;
  return tipOf(newError(level, all[0]).msg);
}

// Says why a tap was refused, on the tile, for a moment; the room does not change.
export function refuse(x, y, why) {
  S.fx.push({ type: 'refuse', x, y, at: now() });
  say(x, y, why);
}

// A line on a tile, for a moment.
export function say(x, y, why, ms = 1500) {
  const tip = $('campTip'), w = $('roomWrap').getBoundingClientRect(), at = toScreen((x + 0.5) * T, y * T);
  tip.textContent = why;
  tip.style.left = `${at.x - w.left}px`;
  tip.style.top = `${at.y - w.top}px`;
  tip.hidden = false;
  clearTimeout(say.t); say.t = setTimeout(() => { tip.hidden = true; }, ms);
}

