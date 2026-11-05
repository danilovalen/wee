// The Shape helpers (registers 693, 694, 698): Trim and Remove one are offered in the design notes after a
// Check, each with Apply; Most moves (723) sits with the tool's options and puts the current piece where, and
// which way round (728), the room takes the most moves. Each searches first, a slice at a time, and changes
// the room only on Apply.
import { trimRoom } from '../solve/shape.js';
import { search } from '../solve/solve.js';
import { NOTES_MAX } from '../solve/design.js';
import { place, turnDoor, turnSwitch } from '../editor/edit.js';
import { TOOLS } from '../editor/palette.js';
import { S } from '../editor/state.js';
import { choosable } from './offers.js';
import { $, now } from './dom.js';

const SLICE_MS = 25, clone = l => JSON.parse(JSON.stringify(l));
const name = t => t === 'start' ? 'blob' : ((TOOLS.find(x => x.id === t) || {}).label || t).toLowerCase();
const flash = (x, y) => { S.fx.push({ type: 'flash', x, y, at: now() }); S.redraw = true; };

// The answer's length, or null when the room cannot be won (or is too big to tell).
function* movesOf(level) { const r = yield* search(level, NOTES_MAX); return r.status === 'solved' ? r.moves.length : null; }

import { variants, wayOf } from '../editor/variants.js';

// Every empty tile tried with the tool, every way round, the same way a tap would place it.
export function* placeBest(level, ui) {
  const base = yield* movesOf(level), set = variants(ui);
  let best = null;
  for (let y = 0; y < level.h; y++) for (let x = 0; x < level.w; x++) {
    const i = y * level.w + x;
    if (level.cells[i] || level.entities.some(e => e.x === x && e.y === y) || (level.start && level.start.x === x && level.start.y === y)) continue;
    let asBlock;
    for (const u of set) {
      const l = clone(level);
      if (!place(l, u, x, y, 'place').length) continue;
      if (u.inverted) turnDoor(l, x, y);
      if (u.on) turnSwitch(l, x, y);
      const n = yield* movesOf(l);
      if (n == null || n <= (best ? best.moves : base ?? 0)) continue;
      // A laser only counts when its beam does a job: one a plain block on that tile would match, such as a laser
      // aimed into a wall, is not offered (register 765). A one-way that blocks one side is a one-way's job.
      if (u.tool === 'turret') {
        if (asBlock === undefined) { const w = clone(level); place(w, { ...u, tool: 'wall' }, x, y, 'place'); asBlock = yield* movesOf(w); }
        if (asBlock === n) continue;
      }
      best = { level: l, moves: n, x, y, ui: u };
    }
  }
  return best ? { ...best, from: base } : { none: true, from: base };
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
export const trimText = r => r ? `Trim to ${r.level.w}x${r.level.h}: the room plays the same.` : 'Trim: every row and column is needed.';
export const removeText = r => r ? `Take out the ${name(r.what)} at ${r.x}, ${r.y} and the answer takes ${r.moves} moves instead of ${r.from}.` : "Whichever piece or tile you take out, the answer doesn't get longer.";
// The blob is moved, not added (register 724); a piece that points says which way (728).
// Condition first, said to the player (registers 700, 753), naming the picked colour (764).
const placeText = (t, r, had) => {
  const moves = n => `${n} ${n === 1 ? 'move' : 'moves'}`;
  if (t === 'start') return r.none ? (had ? 'The blob is already where the answer takes the most moves.' : 'Wherever you place the blob, the room stays unsolved.')
    : r.from == null ? `Place the blob at ${r.x}, ${r.y} and the answer takes ${moves(r.moves)}.` : `Move the blob to ${r.x}, ${r.y} and the answer takes ${moves(r.moves)} instead of ${r.from}.`;
  if (r.none) return `Wherever you place ${pieceName(t, S.ui)}${t === 'door' ? ', plain or inverted,' : t === 'toggle' ? ', off or on,' : variants(S.ui).length > 1 ? ', facing any way,' : ''} the ${r.from == null ? 'room stays unsolved' : `answer stays ${moves(r.from)}`}.`;
  const way = wayOf(r.ui), what = way ? `${pieceName(t, r.ui)}, ${way},` : pieceName(t, r.ui);
  return r.from == null ? `Place ${what} at ${r.x}, ${r.y} and the answer takes ${moves(r.moves)}.` : `Place ${what} at ${r.x}, ${r.y} and the answer takes ${moves(r.moves)} instead of ${r.from}.`;
};
const COLOURED = ['button', 'toggle', 'door', 'idoor', 'sensor'];
// "a red switch", "a grey button", "a plain one-way", "a block".
function pieceName(t, ui) {
  const col = COLOURED.includes(t) ? (ui.colour === 'wire' ? 'grey' : ui.colour) : t === 'gate' ? (ui.gateColour === 'wire' ? 'grey' : ui.gateColour || 'plain') : null;
  const words = [col, t === 'door' && ui.inverted ? 'inverted door' : name(t)].filter(Boolean).join(' ') + (t === 'toggle' && ui.on ? ' that starts on' : '');
  return (/^[aeiou]/.test(words) ? 'an ' : 'a ') + words;
}

// Apply hands the new room to the editor, which makes it one undo step and refits (panels.js), and only
// while the room is still the one the change was found in (register 726).
const stampOf = l => JSON.stringify(l);
const applyRoom = (level, from) => dispatchEvent(new CustomEvent('wee:apply', { detail: { level, from } }));
// A design note that offers a change: chosen, it shows on the room; Apply makes it (registers 745, 746).
export function offerLine(text, found) {
  const from = stampOf(S.level);
  if (!found) return Object.assign(document.createElement('li'), { textContent: text });
  return choosable(text, { level: found.level, spots: found.x != null ? [{ x: found.x, y: found.y }] : [], apply: () => applyRoom(found.level, from) });
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
// The answer sits under the button that asked (register 724).
function say(text, found = null) {
  offer = found && { ...found, from: stampOf(S.level) };
  $('placeSay').textContent = text; $('placeSay').hidden = !text;
  $('shapeAsk').hidden = !found; $('placeBtn').hidden = !!found;
  if (found) flash(found.x, found.y);
  S.redraw = true;
}
// The offered piece, drawn at half strength where it would go, the way it would face (register 728).
export function offerGhost() {
  if (!offer || offer.from !== stampOf(S.level) || offer.ui?.tool === 'start' || !offer.ui) return null;
  const { level: l, x, y } = offer, cell = l.cells[y * l.w + x] || '', e = l.entities.find(o => o.x === x && o.y === y);
  return { paste: { w: 1, h: 1, cells: [cell], entities: e ? [{ ...e, x: 0, y: 0 }] : [] }, x, y, bare: true };
}

export function buildShape() {
  $('placeBtn').onclick = () => {
    const tool = S.ui.tool;
    const had = !!S.level.start;
    asked = askKey();
    say(tool === 'start' ? 'Trying the blob on every empty tile...' : `Trying ${pieceName(tool, S.ui)} on every empty tile, every way round...`);
    run(placeBest(clone(S.level), { ...S.ui }), r => say(placeText(tool, r, had), r.none ? null : r));
  };
  // Apply also sets the tool the way the offer faces, so the next tap places it that way round.
  $('shapeYes').onclick = () => { if (!offer) return; const { level, from, ui } = offer; if (ui) for (const k of ['pass', 'aim', 'corner', 'face', 'axis', 'dir']) S.ui[k] = ui[k]; say(''); applyRoom(level, from); };
  $('shapeNo').onclick = () => { token++; say(''); };
}

// Any change to the room drops an offer found in the room before it (register 726).
// So does picking another tool or setting it another way (754): the answer was for the tool that asked.
let asked = null;
const askKey = () => JSON.stringify([S.ui.tool, S.ui.colour, S.ui.gateColour, !!S.ui.crate]);
export function syncShape() {
  if ((offer && offer.from !== stampOf(S.level)) || (asked && asked !== askKey())) { token++; asked = null; say(''); }
}
