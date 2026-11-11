// A campaign level: the room it gives you, what you may place and how many, and what the
// robot's shortest paths must do. check() judges a room you built against it. All copy is draft.
import { emptyLevel } from '../level/format.js';
import { allShortest } from './robot.js';
import { REQUIREMENTS } from './requirements.js';

// What each palette element is in the room.
export const ELEMENTS = {
  block: { label: 'Block', cell: 'wall' },
  button: { label: 'Button', cell: 'button:red', kind: 'button:' },
  // An inverted door is a door a tap has turned (register 676): it counts as the level's door.
  door: { label: 'Door', cell: 'door:red', kind: 'door:', also: 'idoor:' },
  box: { label: 'Box', piece: 'box' },
  toggle: { label: 'Switch', cell: 'toggle:red', kind: 'toggle:' },
  // Placed pointing right; a tap on one with its tool turns it. Any direction is the same element.
  gate: { label: 'One-way', cell: 'gate:right', kind: 'gate:' },
  // A turret on its own, firing one way; a tap with its tool turns it (register 255).
  laser: { label: 'Laser', piece: 'turret' },
  idoor: { label: 'Inverted door', cell: 'idoor:red', kind: 'idoor:' },
  // A block a beam goes through, lighting it (register 312).
  relay: { label: 'Laser relay', cell: 'sensor:red', kind: 'sensor:' },
  // Spikes, the death block: a box covers them, the robot dies on them (registers 431, 435).
  spikes: { label: 'Spikes', cell: 'death' },
  // More berries, in a level that says how many it takes (registers 702, 706, 734).
  berry: { label: 'Berry', cell: 'goal' },
};
const isEl = (k, c) => ELEMENTS[k].cell === c || (!!ELEMENTS[k].kind && c.startsWith(ELEMENTS[k].kind)) || (!!ELEMENTS[k].also && c.startsWith(ELEMENTS[k].also));
// A level's colours (def.colours, red when it names none). A one-way takes one only in a level
// that names its colours (register 241); elsewhere it has none.
export const coloursOf = def => def.colours || ['red'];
// The levels the list shows: not a hidden one, not the tutorial (on the menu, register 521), and not one
// with two colours, put away for now (register 525).
export const listed = def => !def.hidden && !def.tutorial && coloursOf(def).length < 2;
// What a piece may come in: each of the level's colours, and the first two together ('red|blue')
// where def.twoColour names the piece, 'also' beside the single ones or 'only' (register 316).
export function colouringsOf(def, el) {
  const one = coloursOf(def), two = def.twoColour && def.twoColour[el], pair = one.length > 1 ? one.slice(0, 2).join('|') : null;
  return !pair || !two ? one : two === 'only' ? [pair] : [...one, pair];
}
// Whether a piece may come pushable (true) or plain (false): plain only, unless def.pushable names it,
// 'only' pushable or 'also' both (register 336).
export function pushingsOf(def, el) {
  const p = def.pushable && def.pushable[el];
  return p === 'only' ? [true] : p === 'also' ? [false, true] : [false];
}
const COLOURED = { button: 'button', door: 'door', toggle: 'toggle', idoor: 'idoor', sensor: 'relay' };
function colourFits(def, c) {
  if (c.startsWith('gate:')) { const col = c.split('@')[1] || null; return def.colours ? colouringsOf(def, 'gate').includes(col) : col === null; }
  const [kind, col] = c.split(':');
  return !COLOURED[kind] || colouringsOf(def, COLOURED[kind]).includes(col);
}

// The level's room: empty at its starting size, with no border (the room's edge stops the
// robot like a wall), the start one diagonal step in from the top left corner and the goal one
// in from the bottom right. Both move freely.
export function roomOf(def) {
  if (def.room) return structuredClone(def.room);  // a challenge's built room (register 562)
  const [w, h] = def.size, l = emptyLevel(w, h);
  for (const p of Object.keys(l.powers)) l.powers[p] = !!(def.powers || []).includes(p);
  // A level may place its start and goal (the tutorial, register 512); otherwise one tile in from opposite corners.
  const [sx, sy] = def.start || [1, 1], [gx, gy] = def.goal || [w - 2, h - 2];
  l.start = { x: sx, y: sy };
  l.cells[gy * w + gx] = 'goal';
  return l;
}

// What you placed, by element; stray is anything the level's palette cannot have made.
export function placed(def, room) {
  const out = Object.fromEntries(Object.keys(ELEMENTS).map(k => [k, []])), stray = [];
  // A challenge counts only what is on its open tiles: the rest of its room is fixed (register 562).
  const open = def.challenge ? new Set(def.challenge.open.map(([x, y]) => y * room.w + x)) : null, mine = i => !open || open.has(i);
  room.cells.forEach((c, i) => {
    if (!c || c === 'goal' || !mine(i)) return;
    const el = Object.keys(ELEMENTS).find(k => isEl(k, c));
    const crate = !!room.crates?.some(k => k.y * room.w + k.x === i);
    if (el && colourFits(def, c) && pushingsOf(def, el).includes(crate)) out[el].push(i); else stray.push(i);
  });
  for (const e of room.entities) {
    const el = Object.keys(ELEMENTS).find(k => ELEMENTS[k].piece === e.kind), i = e.y * room.w + e.x;
    if (!mine(i)) continue;
    if (el && pushingsOf(def, el).includes(!!e.crate)) out[el].push(i); else stray.push(i);
  }
  return { by: out, stray };
}

// An element's name in lower case, plural unless there is one: switch, switches.
export const nameOf = (el, n) => { const w = ELEMENTS[el].label.toLowerCase(); return n === 1 ? w : /(s|sh|ch|x)$/.test(w) ? w + 'es' : w + 's'; };

export const START_ON = 'Nothing can start on a button, a switch or spikes.';
// Why the room cannot be run yet: each is { msg, at? }. Empty when it can.
// The maximums a room goes over: each a goal row, missed at Run.
// A removal challenge says it as taking out (register 787): too many left is "take out N more".
const out = def => def.challenge && def.challenge.remove;
export function overLimits(def, room) {
  const { by } = placed(def, room);
  return Object.entries(by).flatMap(([el, list]) => {
    const max = (def.palette[el] || [0, 0])[1];
    if (out(def) && el in out(def)) return list.length > max ? [{ el, msg: `Take out ${list.length - max} more ${nameOf(el, list.length - max)}.` }] : [];
    return max && list.length > max ? [{ el, msg: `Place at most ${max} ${nameOf(el, max)}.` }] : [];
  });
}
// The minimums a room falls short of: judged at Run like the maximums, never a reason not to run (register 321).
export function underLimits(def, room) {
  const { by } = placed(def, room);
  return Object.entries(by).flatMap(([el, list]) => {
    const min = (def.palette[el] || [0, 0])[0];
    if (out(def) && el in out(def)) return list.length < min ? [{ el, msg: `Take out only ${out(def)[el]} ${nameOf(el, out(def)[el])}.` }] : [];
    return list.length < min ? [{ el, msg: `Place at least ${min} ${nameOf(el, min)}.` }] : [];
  });
}

export function placementErrors(def, room) {
  const errs = [], { by, stray } = placed(def, room);
  for (const i of stray) errs.push({ msg: 'This level does not have that.', at: i });
  if (!room.start) errs.push({ msg: 'Place Wee.' });
  const goals = room.cells.filter(c => c === 'goal').length;
  if (!goals) errs.push({ msg: 'Place the berry.' });
  // A level takes more than one berry only when it says how many (registers 702, 706).
  if (goals > (def.berries || 1)) errs.push({ msg: def.berries ? `This level takes at most ${def.berries} berries.` : 'Place only one berry.' });
  for (const [el, list] of Object.entries(by)) {
    // A null maximum is no limit: cost is what keeps the count down.
    const max = (def.palette[el] || [0, 0])[1];
    // A maximum above 0 is a goal, judged at Run, not a rule that stops building (register 306).
    if (max === 0 && list.length) errs.push({ msg: `This level has no ${nameOf(el, 2)}.` });
  }
  // Nothing starts on a button, a switch or spikes, in every level: no box, and not the robot (register 435).
  const under = (x, y) => /^(button|toggle):|^death$/.test(room.cells[y * room.w + x] || '');
  for (const e of room.entities) if (under(e.x, e.y)) errs.push({ msg: START_ON, at: e.y * room.w + e.x });
  if (room.start && under(room.start.x, room.start.y)) errs.push({ msg: START_ON, at: room.start.y * room.w + room.start.x });
  return errs;
}


// Every room in every level needs at least 4 moves: one rule for the campaign, said first.
// A tool may narrow a search with steps.min and steps.max; a level sets neither.
export const MIN_MOVES = 4;
export const bounds = st => ({ min: st.min ?? MIN_MOVES, max: st.max ?? Infinity });
export const stepsText = st => `The shortest path takes at least ${bounds(st).min} moves.`;
export const bestText = st => `Exactly ${st.best} moves.`;
// The same, as the goal card's rows say them.
export const rangeShort = st => `≥${bounds(st).min} moves`;
// A level's optional goals: the exact count and the room size (every level), the level's own
// path goals (def.optional: requirement ids, met only when every shortest path meets them),
// then mix, any two of the others in one run. Not every pair, let alone all, need fit one room.
export function optionalGoals(def) {
  // A level from the Level maker may leave out the exact count or the size goal (register 302).
  const own = [
    ...(def.steps.best != null ? [{ id: 'best', parts: [{ mark: 'path' }, `=${def.steps.best}`], text: bestText(def.steps), met: v => v.length === def.steps.best }] : []),
    // The size goal is the room's area (register 327); tiles placed are the score instead (register 328).
    ...(def.small ? [{ id: 'small', parts: [`≤${def.small[0]}×${def.small[1]}`], text: `A room of ${def.small[0]}×${def.small[1]} or smaller.`, met: v => v.area <= def.small[0] * def.small[1] }] : []),
    ...(def.optional || []).map(id => ({ id, parts: REQUIREMENTS[id].short, text: REQUIREMENTS[id].text, met: v => !!(v.pathGoals && v.pathGoals[id]) })),
  ];
  return own.length < 2 ? own : [...own, { id: 'mix', parts: ['×2 at once'], text: 'Two of the other optional goals in the same run.', mix: 2 }];
}
// The fewest tiles a win took, then the fewest for each optional goal met: 'fewest tiles 3; exactly 7: 5'.
export function scoreText(def, best) {
  if (!best || best.win == null) return '';
  const name = o => o.parts.every(p => typeof p === 'string') ? o.parts.join(' ') : o.text.replace(/\.$/, '').toLowerCase().replace(/\bwee\b/g, 'Wee');
  const each = optionalGoals(def).filter(o => !o.mix && best[o.id] != null).map(o => `${name(o)}: ${best[o.id]}`);
  return `, fewest tiles ${best.win}` + (each.length ? `; ${each.join('; ')}` : '');
}
// Each optional goal judged on one run's verdict; mix counts the others.
export function optionalResults(def, v) {
  const goals = optionalGoals(def), own = goals.filter(o => !o.mix).map(o => ({ id: o.id, text: o.text, met: !!o.met(v) }));
  const n = own.filter(o => o.met).length;
  return [...own, ...goals.filter(o => o.mix).map(o => ({ id: o.id, text: o.text, met: n >= o.mix }))];
}

// The room's area, the size goal; and the tiles placed in it (the start and the goal not counted), the score.
export const areaOf = room => room.w * room.h;
export const tilesOf = (def, room) => Object.values(placed(def, room).by).reduce((n, l) => n + l.length, 0);

// A failed Run says only that the berry cannot be reached: naming the door that never opens or the laser in
// the way hands over the solution (registers 793, 795, 796).
export const STUCK = 'Wee cannot reach the berry.';

// The whole verdict. { ok: false, errors } when the room cannot run; otherwise
// { ok: true, won, length, paths, fail: { path, why } | null, area, optional: [{ id, text, met }] }.
export function check(def, room, opts) {
  const errors = placementErrors(def, room);
  if (errors.length) return { ok: false, errors };
  const r = allShortest(room, opts), st = def.steps;
  if (r.status === 'unsolvable') return { ok: true, won: false, fail: { path: null, why: STUCK, at: [] } };
  if (r.status !== 'solved') return { ok: true, won: false, fail: { path: null, why: 'To let Wee search this room, make it smaller.' } };
  const base = { ok: true, length: r.length, paths: r.paths.length, area: areaOf(room), tiles: tilesOf(def, room) };
  if (r.capped) return { ...base, won: false, fail: { path: r.paths[0], why: `There are more than ${r.paths.length} shortest paths for Wee to check.` } };
  // Each requirement holds on every shortest path or it is not met; the card marks each one.
  const failed = {};
  for (const path of r.paths) for (const id of def.require || []) if (!(id in failed) && !REQUIREMENTS[id].judge(room, path)) failed[id] = path;
  base.reqs = Object.fromEntries((def.require || []).map(id => [id, !(id in failed)]));
  base.pathGoals = Object.fromEntries((def.optional || []).map(id => [id, r.paths.every(path => REQUIREMENTS[id].judge(room, path))]));
  const { min, max } = bounds(st);
  base.inRange = r.length >= min && r.length <= max;
  // For each goal that failed, one shortest path that missed it: the card can draw it.
  base.missed = { ...failed };
  for (const id of def.optional || []) if (!base.pathGoals[id]) base.missed[id] = r.paths.find(path => !REQUIREMENTS[id].judge(room, path));
  if (!base.inRange) base.missed.steps = r.paths[0];
  if (!base.inRange) return { ...base, won: false, fail: { path: r.paths[0], why: r.length < min ? `The shortest path takes ${r.length} moves, and it must take at least ${min}.` : `The shortest path takes ${r.length} moves, and it may take at most ${max}.` } };
  const over = overLimits(def, room)[0] || underLimits(def, room)[0];
  if (over) return { ...base, won: false, fail: { path: r.paths[0], why: `Not met: ${over.msg}` } };
  const first = (def.require || []).find(id => id in failed);
  if (first) return { ...base, won: false, fail: { path: failed[first], why: `Not met: ${REQUIREMENTS[first].text}` } };
  const optional = optionalResults(def, base);
  return { ...base, won: true, fail: null, path: r.paths[0], optional, met: optional.filter(o => o.met).length };
}
