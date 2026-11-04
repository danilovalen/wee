// The room-size popover's Shape tools (registers 693, 694): Trim, Place one and Remove one. Each searches
// first, a slice at a time, then says what it found, flashes where, and changes the room only on Apply.
import { trimRoom } from '../solve/shape.js';
import { search } from '../solve/solve.js';
import { NOTES_MAX } from '../solve/design.js';
import { place } from '../editor/edit.js';
import { TOOLS } from '../editor/palette.js';
import { S } from '../editor/state.js';
import { $, now } from './dom.js';
import { change } from './undo.js';

const SLICE_MS = 25, clone = l => JSON.parse(JSON.stringify(l));
let offer = null, token = 0;

// The answer's length, or null when the room cannot be won (or is too big to tell).
function* movesOf(level) { const r = yield* search(level, NOTES_MAX); return r.status === 'solved' ? r.moves.length : null; }

// Every empty tile tried with the tool as it is set now, the same way a tap would place it.
function* placeBest(level, ui) {
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
function* removeBest(level) {
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

function run(it, done) {
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
  $('shapeSay').textContent = text;
  $('shapeAsk').hidden = !found;
  if (found && found.x != null) S.fx.push({ type: 'flash', x: found.x, y: found.y, at: now() });
  S.redraw = true;
}
const name = t => ((TOOLS.find(x => x.id === t) || {}).label || t).toLowerCase(), PLACES = new Set(['look', 'erase', 'select', 'move', 'start']);

export function buildShape(after) {
  $('trimBtn').onclick = () => {
    say('Looking for rows and columns to take out...');
    run(trimRoom(clone(S.level), NOTES_MAX), r => r ? say(`Trimmed to ${r.level.w}x${r.level.h}, it plays the same.`, { level: r.level }) : say('Nothing can go without changing how it plays.'));
  };
  $('placeBtn').onclick = () => {
    const tool = S.ui.tool;
    if (PLACES.has(tool)) { say('Pick a piece or tile to place first.'); return; }
    say(`Trying a ${name(tool)} on every empty tile...`);
    run(placeBest(clone(S.level), { ...S.ui }), r => r ? say(`A ${name(tool)} at ${r.x}, ${r.y} makes it ${r.moves} moves instead of ${r.from ?? 'no answer'}.`, r) : say(`No ${name(tool)} makes it longer.`));
  };
  $('removeBtn').onclick = () => {
    say('Trying each piece and tile taken out...');
    run(removeBest(clone(S.level)), r => r ? say(`Without the ${name(r.what)} at ${r.x}, ${r.y} it takes ${r.moves} moves instead of ${r.from ?? 'no answer'}.`, r) : say('Taking nothing out makes it longer.'));
  };
  $('shapeYes').onclick = () => { if (!offer) return; const l = offer.level; change(() => { S.level = l; }); say(''); after(); };
  $('shapeNo').onclick = () => { token++; say(''); };
}
