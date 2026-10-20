// A campaign level: the room it gives you, what you may place and how many, and what the
// robot's shortest paths must do. check() judges a room you built against it. All copy is draft.
import { emptyLevel } from '../level/format.js';
import { allShortest, whyStuck } from './robot.js';
import { REQUIREMENTS } from './requirements.js';

// What each palette element is in the room.
export const ELEMENTS = {
  block: { label: 'Block', cell: 'wall' },
  button: { label: 'Button', cell: 'button:red', kind: 'button:' },
  door: { label: 'Door', cell: 'door:red', kind: 'door:' },
  box: { label: 'Box', piece: 'box' },
  toggle: { label: 'Switch', cell: 'toggle:red', kind: 'toggle:' },
  // Placed pointing right; a tap on one with its tool turns it. Any direction is the same element.
  gate: { label: 'One-way', cell: 'gate:right', kind: 'gate:' },
  // A turret on its own, firing one way; a tap with its tool turns it (register 255).
  laser: { label: 'Laser', piece: 'turret' },
  idoor: { label: 'Inverted door', cell: 'idoor:red', kind: 'idoor:' },
  // A block a beam goes through, lighting it (register 312).
  relay: { label: 'Laser relay', cell: 'sensor:red', kind: 'sensor:' },
  // Open while either colour is held, like an OR (register 313).
  ddoor: { label: 'Two-colour door', cell: 'door:red|blue', kind: 'door:', two: true },
};
// A plain door and a two-colour one share 'door:'; the '|' tells them apart.
const isEl = (k, c) => ELEMENTS[k].cell === c || (!!ELEMENTS[k].kind && c.startsWith(ELEMENTS[k].kind) && c.includes('|') === !!ELEMENTS[k].two);
// A level's colours (def.colours, red when it names none). A one-way takes one only in a level
// that names its colours (register 241); elsewhere it has none.
export const coloursOf = def => def.colours || ['red'];
function colourFits(def, c) {
  if (c.startsWith('gate:')) { const col = c.split('@')[1] || null; return def.colours ? def.colours.includes(col) : col === null; }
  const [kind, col] = c.split(':');
  return !['button', 'door', 'toggle', 'idoor', 'sensor'].includes(kind) || col.split('|').every(c2 => coloursOf(def).includes(c2));
}

// The level's room: empty at its starting size, with no border (the room's edge stops the
// robot like a wall), the start one diagonal step in from the top left corner and the goal one
// in from the bottom right. Both move freely.
export function roomOf(def) {
  const [w, h] = def.size, l = emptyLevel(w, h);
  for (const p of Object.keys(l.powers)) l.powers[p] = !!(def.powers || []).includes(p);
  l.start = { x: 1, y: 1 };
  l.cells[(h - 2) * w + w - 2] = 'goal';
  return l;
}

// What you placed, by element; stray is anything the level's palette cannot have made.
export function placed(def, room) {
  const out = Object.fromEntries(Object.keys(ELEMENTS).map(k => [k, []])), stray = [];
  room.cells.forEach((c, i) => {
    if (!c || c === 'goal') return;
    const el = Object.keys(ELEMENTS).find(k => isEl(k, c));
    if (el && colourFits(def, c)) out[el].push(i); else stray.push(i);
  });
  for (const e of room.entities) {
    const el = Object.keys(ELEMENTS).find(k => ELEMENTS[k].piece === e.kind), i = e.y * room.w + e.x;
    if (el) out[el].push(i); else stray.push(i);
  }
  return { by: out, stray };
}

// An element's name in lower case, plural unless there is one: switch, switches.
export const nameOf = (el, n) => { const w = ELEMENTS[el].label.toLowerCase(); return n === 1 ? w : /(s|sh|ch|x)$/.test(w) ? w + 'es' : w + 's'; };

export const START_ON = 'Nothing can start on a button or a switch.';
// Why the room cannot be run yet: each is { msg, at? }. Empty when it can.
// The maximums a room goes over: each a goal row, missed at Run.
export function overLimits(def, room) {
  const { by } = placed(def, room);
  return Object.entries(by).flatMap(([el, list]) => { const max = (def.palette[el] || [0, 0])[1]; return max && list.length > max ? [{ el, msg: `Place at most ${max} ${nameOf(el, max)}.` }] : []; });
}

export function placementErrors(def, room) {
  const errs = [], { by, stray } = placed(def, room);
  for (const i of stray) errs.push({ msg: 'This level does not have that.', at: i });
  if (!room.start) errs.push({ msg: 'Place the start.' });
  const goals = room.cells.filter(c => c === 'goal').length;
  if (!goals) errs.push({ msg: 'Place the goal.' });
  if (goals > 1) errs.push({ msg: 'Place only one goal.' });
  for (const [el, list] of Object.entries(by)) {
    // A null maximum is no limit: cost is what keeps the count down.
    const [min, max] = def.palette[el] || [0, 0];
    if (list.length < min) errs.push({ msg: `Place at least ${min} ${nameOf(el, min)}.` });
    // A maximum above 0 is a goal, judged at Run, not a rule that stops building (register 306).
    if (max === 0 && list.length) errs.push({ msg: `This level has no ${nameOf(el, 2)}.` });
  }
  // Nothing starts on a button or a switch, in every level: no box, and not the robot.
  const under = (x, y) => /^(button|toggle):/.test(room.cells[y * room.w + x] || '');
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
export const rangeShort = st => `at least ${bounds(st).min} moves`;
export const bestShort = st => `exactly ${st.best}`;
// A level's optional goals: the exact count and the room size (every level), the level's own
// path goals (def.optional: requirement ids, met only when every shortest path meets them),
// then mix, any two of the others in one run. Not every pair, let alone all, need fit one room.
export function optionalGoals(def) {
  // A level from the Level maker may leave out the exact count or the size goal (register 302).
  const own = [
    ...(def.steps.best != null ? [{ id: 'best', parts: [bestShort(def.steps)], text: bestText(def.steps), met: v => v.length === def.steps.best }] : []),
    // The size goal counts tiles placed, the start and the goal not counted (register 314).
    ...(def.tiles != null ? [{ id: 'small', parts: [`${def.tiles} ${def.tiles === 1 ? 'tile' : 'tiles'} or fewer`], text: `${def.tiles} ${def.tiles === 1 ? 'tile' : 'tiles'} or fewer.`, met: v => v.tiles <= def.tiles }] : []),
    ...(def.optional || []).map(id => ({ id, parts: REQUIREMENTS[id].short, text: REQUIREMENTS[id].text, met: v => !!(v.pathGoals && v.pathGoals[id]) })),
  ];
  return own.length < 2 ? own : [...own, { id: 'mix', parts: ['any 2 optional goals at once'], text: 'Two of the other optional goals in the same run.', mix: 2 }];
}
// Each optional goal judged on one run's verdict; mix counts the others.
export function optionalResults(def, v) {
  const goals = optionalGoals(def), own = goals.filter(o => !o.mix).map(o => ({ id: o.id, text: o.text, met: !!o.met(v) }));
  const n = own.filter(o => o.met).length;
  return [...own, ...goals.filter(o => o.mix).map(o => ({ id: o.id, text: o.text, met: n >= o.mix }))];
}

// The room's area, and the tiles placed in it (the start and the goal not counted), the size score.
export const areaOf = room => room.w * room.h;
export const tilesOf = (def, room) => Object.values(placed(def, room).by).reduce((n, l) => n + l.length, 0);

// Why the robot cannot reach the goal, in words, with the tiles to point at. Copy is a draft.
// Per kind: its name, its plural, and how one, several or none of them fail to hold.
const HOLD = {
  button: ['button', 'buttons', 'is never pressed', 'are never pressed', 'is ever pressed'],
  toggle: ['switch', 'switches', 'never turns on', 'never turn on', 'ever turns on'],
  receiver: ['laser catcher', 'laser catchers', 'is never lit', 'are never lit', 'is ever lit'],
  sensor: ['laser relay', 'laser relays', 'is never lit', 'are never lit', 'is ever lit'],
};
export function stuckText(room) {
  const w = whyStuck(room), xy = i => ({ x: i % room.w, y: Math.floor(i / room.w) });
  if (w.capped) return { why: 'The robot cannot reach the goal, and the room is too big to say why.', at: [] };
  // A move that ends with the robot hit says so, and shows the lasers (register 286).
  const lasers = () => room.entities.filter(e => e.turret).map(e => ({ x: e.x, y: e.y }));
  if (!w.door && w.hit) return { why: 'The robot cannot reach the goal: a laser hits it on the way.', at: lasers() };
  if (!w.door) return { why: 'The robot cannot reach the goal from anywhere it can get to.', at: [] };
  const doors = room.cells.flatMap((c, i) => c === 'door:' + w.door ? [xy(i)] : []);
  const own = room.cells.flatMap((c, i) => /^(button|toggle|receiver|sensor):/.test(c) && c.endsWith(':' + w.door) ? [i] : []);
  const head = `The robot cannot reach the goal: the ${w.door} door never opens`;
  if (!own.length) return { why: `${head}, because nothing ${w.door} opens it.`, at: doors };
  if (w.apart) return { why: `${head}. It needs everything ${w.door} held at once, and that never happens.`, at: [...doors, ...own.map(xy)] };
  // Said per kind, so a door held by a button and a switch names the one that fails.
  const kindOf = i => room.cells[i].split(':')[0], kinds = [...new Set(w.stuck.map(kindOf))];
  const which = kinds.map(k => {
    const [one, many, is, are, none] = HOLD[k], n = w.stuck.filter(i => kindOf(i) === k).length, all = own.filter(i => kindOf(i) === k).length;
    return all === 1 ? `its ${one} ${is}` : n === all ? `none of its ${all} ${many} ${none}` : `${n} of its ${all} ${many} ${n === 1 ? is : are}`;
  }).join(' and ');
  return { why: `${head}, because ${which}.`, at: [...doors, ...w.stuck.map(xy)] };
}

// The whole verdict. { ok: false, errors } when the room cannot run; otherwise
// { ok: true, won, length, paths, fail: { path, why } | null, area, optional: [{ id, text, met }] }.
export function check(def, room, opts) {
  const errors = placementErrors(def, room);
  if (errors.length) return { ok: false, errors };
  const r = allShortest(room, opts), st = def.steps;
  if (r.status === 'unsolvable') return { ok: true, won: false, fail: { path: null, ...stuckText(room) } };
  if (r.status !== 'solved') return { ok: true, won: false, fail: { path: null, why: 'To let the robot search this room, make it smaller.' } };
  const base = { ok: true, length: r.length, paths: r.paths.length, area: areaOf(room), tiles: tilesOf(def, room) };
  if (r.capped) return { ...base, won: false, fail: { path: r.paths[0], why: `There are more than ${r.paths.length} shortest paths for the robot to check.` } };
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
  const over = overLimits(def, room)[0];
  if (over) return { ...base, won: false, fail: { path: r.paths[0], why: `Not met: ${over.msg}` } };
  const first = (def.require || []).find(id => id in failed);
  if (first) return { ...base, won: false, fail: { path: failed[first], why: `Not met: ${REQUIREMENTS[first].text}` } };
  const optional = optionalResults(def, base);
  return { ...base, won: true, fail: null, path: r.paths[0], optional, met: optional.filter(o => o.met).length };
}
