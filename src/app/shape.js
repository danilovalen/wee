// The Shape helpers (registers 693, 694, 698): Trim and Remove one are offered in the design notes after a
// Check, each with Apply; Most moves (723) sits with the tool's options and puts the current piece where, and
// which way round (728), the room takes the most moves. Each searches first, a slice at a time, and changes
// the room only on Apply.
import { trimRoom } from '../solve/shape.js';
import { search } from '../solve/solve.js';
import { NOTES_MAX } from '../solve/design.js';
import { place } from '../editor/edit.js';
import { TOOLS } from '../editor/palette.js';
import { S } from '../editor/state.js';
import { $, now } from './dom.js';
import { CLOCKWISE, CORNERS } from '../rules/base.js';

const SLICE_MS = 25, clone = l => JSON.parse(JSON.stringify(l));
const name = t => t === 'start' ? 'blob' : ((TOOLS.find(x => x.id === t) || {}).label || t).toLowerCase();
const flash = (x, y) => { S.fx.push({ type: 'flash', x, y, at: now() }); S.redraw = true; };

// The answer's length, or null when the room cannot be won (or is too big to tell).
function* movesOf(level) { const r = yield* search(level, NOTES_MAX); return r.status === 'solved' ? r.moves.length : null; }

// Every way round a piece can be set (register 728): a one-way's and a turret's directions turned, a
// slope's corner, a spring's face, a mover's axis and way. One setting for a piece that has no direction.
const turn = list => [0, 1, 2, 3].map(k => list.map(d => CLOCKWISE[(CLOCKWISE.indexOf(d) + k) % 4]));
export function variants(ui) {
  const t = ui.tool, all = t === 'gate' ? turn(ui.pass).map(pass => ({ ...ui, pass })) : t === 'turret' ? turn(ui.aim).map(aim => ({ ...ui, aim }))
    : t === 'tri' ? CORNERS.map(corner => ({ ...ui, corner })) : t === 'spring' ? CLOCKWISE.map(face => ({ ...ui, face }))
      : ['mover', 'enemy', 'strong'].includes(t) ? [['h', 1], ['h', -1], ['v', 1], ['v', -1]].map(([axis, dir]) => ({ ...ui, axis, dir })) : [ui];
  const seen = new Set();
  return all.filter(u => { const k = JSON.stringify([u.pass && CLOCKWISE.filter(d => u.pass.includes(d)), u.aim && CLOCKWISE.filter(d => u.aim.includes(d)), u.corner, u.face, u.axis, u.dir]); return !seen.has(k) && seen.add(k); });
}
// Which way round, in words, for the sentence.
const WAY = { up: 'up', right: 'right', down: 'down', left: 'left', nw: 'up and left', ne: 'up and right', sw: 'down and left', se: 'down and right' };
const ways = l => CLOCKWISE.filter(d => l.includes(d)).join(' and ');
export function wayOf(ui) {
  const t = ui.tool;
  if (t === 'gate') return `pointing ${ways(ui.pass)}`;
  if (t === 'turret') return `aiming ${ways(ui.aim)}`;
  if (t === 'tri') return `facing ${WAY[ui.corner]}`;
  if (t === 'spring') return `facing ${ui.face}`;
  if (['mover', 'enemy', 'strong'].includes(t)) return `moving ${ui.axis === 'h' ? (ui.dir > 0 ? 'right' : 'left') : (ui.dir > 0 ? 'down' : 'up')}`;
  return '';
}

// Every empty tile tried with the tool, every way round, the same way a tap would place it.
export function* placeBest(level, ui) {
  const base = yield* movesOf(level), set = variants(ui);
  let best = null;
  for (let y = 0; y < level.h; y++) for (let x = 0; x < level.w; x++) {
    const i = y * level.w + x;
    if (level.cells[i] || level.entities.some(e => e.x === x && e.y === y) || (level.start && level.start.x === x && level.start.y === y)) continue;
    for (const u of set) {
      const l = clone(level);
      if (!place(l, u, x, y, 'place').length) continue;
      const n = yield* movesOf(l);
      if (n != null && n > (best ? best.moves : base ?? 0)) best = { level: l, moves: n, x, y, ui: u };
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
  if (r.none) return `Wherever you place ${pieceName(t, S.ui, true)}${variants(S.ui).length > 1 ? ', facing any way,' : ''} the ${r.from == null ? 'room stays unsolved' : `answer stays ${moves(r.from)}`}.`;
  const way = wayOf(r.ui), what = way ? `${pieceName(t, r.ui)}, ${way},` : pieceName(t, r.ui);
  return r.from == null ? `Place ${what} at ${r.x}, ${r.y} and the answer takes ${moves(r.moves)}.` : `Place ${what} at ${r.x}, ${r.y} and the answer takes ${moves(r.moves)} instead of ${r.from}.`;
};
const COLOURED = ['button', 'toggle', 'door', 'idoor', 'sensor'];
// "a red switch", "a grey button", "a plain one-way", "a block".
function pieceName(t, ui) {
  const col = COLOURED.includes(t) ? (ui.colour === 'wire' ? 'grey' : ui.colour) : t === 'gate' ? (ui.gateColour === 'wire' ? 'grey' : ui.gateColour || 'plain') : null;
  const words = [col, name(t)].filter(Boolean).join(' ');
  return (/^[aeiou]/.test(words) ? 'an ' : 'a ') + words;
}

// Apply hands the new room to the editor, which makes it one undo step and refits (panels.js), and only
// while the room is still the one the change was found in (register 726).
const stampOf = l => JSON.stringify(l);
const applyRoom = (level, from) => dispatchEvent(new CustomEvent('wee:apply', { detail: { level, from } }));
// A design note that offers a change: its text flashes where, and Apply makes it.
export function offerLine(text, found) {
  const li = document.createElement('li'), from = stampOf(S.level);
  if (!found) { li.textContent = text; return li; }
  const say = Object.assign(document.createElement('button'), { type: 'button', textContent: text });
  li.append(say);
  say.onclick = () => found.x != null && flash(found.x, found.y);
  const apply = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Apply', className: 'apply' });
  apply.onclick = () => applyRoom(found.level, from);
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
    say(tool === 'start' ? 'Trying the blob on every empty tile...' : `Trying a ${name(tool)} on every empty tile, every way round...`);
    run(placeBest(clone(S.level), { ...S.ui }), r => say(placeText(tool, r, had), r.none ? null : r));
  };
  // Apply also sets the tool the way the offer faces, so the next tap places it that way round.
  $('shapeYes').onclick = () => { if (!offer) return; const { level, from, ui } = offer; if (ui) for (const k of ['pass', 'aim', 'corner', 'face', 'axis', 'dir']) S.ui[k] = ui[k]; say(''); applyRoom(level, from); };
  $('shapeNo').onclick = () => { token++; say(''); };
}

// Any change to the room drops an offer found in the room before it (register 726).
export function syncShape() {
  if (offer && offer.from !== stampOf(S.level)) { token++; say(''); }
}
