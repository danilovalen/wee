// The Shape helpers (registers 693, 694, 698): Trim and Remove one are offered in the design notes after a
// Check, each with Apply; Best spot sits with the tool's options and puts the current piece where it makes
// the room longest. Each searches first, a slice at a time, and changes the room only on Apply.
import { trimRoom } from '../solve/shape.js';
import { search } from '../solve/solve.js';
import { NOTES_MAX } from '../solve/design.js';
import { place } from '../editor/edit.js';
import { TOOLS } from '../editor/palette.js';
import { S } from '../editor/state.js';
import { $, now, DEFAULT_HINT } from './dom.js';

const SLICE_MS = 25, clone = l => JSON.parse(JSON.stringify(l));
const name = t => t === 'start' ? 'blob' : ((TOOLS.find(x => x.id === t) || {}).label || t).toLowerCase();
const flash = (x, y) => { S.fx.push({ type: 'flash', x, y, at: now() }); S.redraw = true; };

// The answer's length, or null when the room cannot be won (or is too big to tell).
function* movesOf(level) { const r = yield* search(level, NOTES_MAX); return r.status === 'solved' ? r.moves.length : null; }

// Every empty tile tried with the tool as it is set now, the same way a tap would place it.
export function* placeBest(level, ui) {
  const base = yield* movesOf(level);
  let best = null;
  for (let y = 0; y < level.h; y++) for (let x = 0; x < level.w; x++) {
    const i = y * level.w + x;
    if (level.cells[i] || level.entities.some(e => e.x === x && e.y === y) || (level.start && level.start.x === x && level.start.y === y)) continue;
    const l = clone(level);
    if (!place(l, ui, x, y, 'place').length) continue;
    const n = yield* movesOf(l);
    if (n != null && n > (best ? best.moves : base ?? 0)) best = { level: l, moves: n, x, y };
  }
  return best && { ...best, from: base };
}

// Every piece and every tile but the goal, taken out alone.
export function* removeBest(level) {
  const base = yield* movesOf(level);
  let best = null;
  const tryOut = function* (l, x, y, what) { const n = yield* movesOf(l); if (n != null && n > (best ? best.moves : base ?? 0)) best = { level: l, moves: n, x, y, what }; };
  for (let k = 0; k < level.entities.length; k++) { const e = level.entities[k], l = clone(level); l.entities.splice(k, 1); yield* tryOut(l, e.x, e.y, e.kind); }
  for (let i = 0; i < level.cells.length; i++) {
    const c = level.cells[i];
    if (!c || c === 'goal') continue;
    const l = clone(level); l.cells[i] = '';
    yield* tryOut(l, i % level.w, Math.floor(i / level.w), c.split(':')[0]);
  }
  return best && { ...best, from: base };
}

// What each search found, as one plain sentence (register 700: say what is true of what is there).
export const trimText = r => r ? `Trim to ${r.level.w}x${r.level.h}: it plays the same.` : 'Every row and column is needed.';
export const removeText = r => r ? `Without the ${name(r.what)} at ${r.x}, ${r.y} it takes ${r.moves} moves instead of ${r.from}.` : 'Removing any one piece or tile does not make it longer.';
const placeText = (t, r) => !r ? `A ${name(t)} on any empty tile does not make it longer.` : r.from == null ? `A ${name(t)} at ${r.x}, ${r.y} makes it ${r.moves} moves.` : `A ${name(t)} at ${r.x}, ${r.y} makes it ${r.moves} moves instead of ${r.from}.`;

// Apply hands the new room to the editor, which makes it one undo step and refits (panels.js).
const applyRoom = level => dispatchEvent(new CustomEvent('wee:apply', { detail: level }));
// A design note that offers a change: its text flashes where, and Apply makes it.
export function offerLine(text, found) {
  const li = document.createElement('li');
  if (!found) { li.textContent = text; return li; }
  const say = Object.assign(document.createElement('button'), { type: 'button', textContent: text });
  li.append(say);
  say.onclick = () => found.x != null && flash(found.x, found.y);
  const apply = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Apply', className: 'apply' });
  apply.onclick = () => applyRoom(found.level);
  li.append(apply);
  return li;
}

let offer = null, token = 0;
export function run(it, done) {
  const me = ++token, stamp = JSON.stringify(S.level);
  const slice = () => {
    if (me !== token || JSON.stringify(S.level) !== stamp) return;
    const until = performance.now() + SLICE_MS;
    for (;;) { const r = it.next(); if (r.done) { done(r.value); return; } if (performance.now() > until) break; }
    setTimeout(slice, 0);
  };
  setTimeout(slice, 0);
}
function say(text, found = null) {
  offer = found;
  $('placeHint').textContent = text || DEFAULT_HINT;
  $('shapeAsk').hidden = !found; $('placeBtn').hidden = !!found;
  if (found) flash(found.x, found.y);
}

export function buildShape() {
  $('placeBtn').onclick = () => {
    const tool = S.ui.tool;
    say(`Trying a ${name(tool)} on every empty tile...`);
    run(placeBest(clone(S.level), { ...S.ui }), r => say(placeText(tool, r), r));
  };
  $('shapeYes').onclick = () => { if (!offer) return; const l = offer.level; say(''); applyRoom(l); };
  $('shapeNo').onclick = () => { token++; say(''); };
}
