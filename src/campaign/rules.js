// A campaign level: the room it gives you, what you may place and how many, and what the
// robot's shortest paths must do. check() judges a room you built against it. All copy is draft.
import { emptyLevel } from '../level/format.js';
import { allShortest, replayPath } from './robot.js';

// What each palette element is in the room.
export const ELEMENTS = {
  block: { label: 'Block', cell: 'wall' },
  button: { label: 'Button', cell: 'button:red' },
  door: { label: 'Door', cell: 'door:red' },
  box: { label: 'Box', piece: 'box' },
  toggle: { label: 'Toggle', cell: 'toggle:red' },
};

// The level's room from its rows: # block, P robot start, G goal, . floor.
export function roomOf(def) {
  const h = def.rows.length, w = def.rows[0].length, l = emptyLevel(w, h);
  for (const p of Object.keys(l.powers)) l.powers[p] = !!(def.powers || []).includes(p);
  l.start = null;
  def.rows.forEach((row, y) => [...row].forEach((c, x) => {
    const i = y * w + x;
    if (c === '#') l.cells[i] = 'wall';
    if (c === 'G') l.cells[i] = 'goal';
    if (c === 'P') l.start = { x, y };
  }));
  return l;
}

// What you placed: every cell or piece that differs from the level's room, by element.
export function placed(def, room) {
  const base = roomOf(def), out = Object.fromEntries(Object.keys(ELEMENTS).map(k => [k, []])), stray = [];
  room.cells.forEach((c, i) => {
    if (c === base.cells[i]) return;
    const el = Object.keys(ELEMENTS).find(k => ELEMENTS[k].cell === c);
    if (el && !base.cells[i]) out[el].push(i); else stray.push(i);
  });
  for (const e of room.entities) {
    const el = Object.keys(ELEMENTS).find(k => ELEMENTS[k].piece === e.kind), i = e.y * room.w + e.x;
    if (el) out[el].push(i); else stray.push(i);
  }
  return { by: out, stray };
}

// Why the room cannot be run yet: each is { msg, at? }. Empty when it can.
export function placementErrors(def, room) {
  const base = roomOf(def), errs = [];
  if (room.w !== base.w || room.h !== base.h) return [{ msg: `The room must stay ${base.w}x${base.h}.` }];
  const { by, stray } = placed(def, room);
  for (const i of stray) errs.push({ msg: 'This level does not let you change that tile.', at: i });
  if (!room.start || room.start.x !== base.start.x || room.start.y !== base.start.y) errs.push({ msg: 'The robot starts where the level puts it.' });
  const si = base.start.y * base.w + base.start.x;
  if (room.cells[si] || room.entities.some(e => e.y * room.w + e.x === si)) errs.push({ msg: 'Leave the robot\'s start empty.', at: si });
  for (const [el, list] of Object.entries(by)) {
    const [min, max] = def.palette[el] || [0, 0];
    if (list.length < min) errs.push({ msg: `Place at least ${min} ${ELEMENTS[el].label.toLowerCase()}${min === 1 ? '' : 's'}.` });
    if (list.length > max) errs.push({ msg: max ? `Place at most ${max} ${ELEMENTS[el].label.toLowerCase()}${max === 1 ? '' : 's'}.` : `This level has no ${ELEMENTS[el].label.toLowerCase()}s.` });
  }
  if ((def.rules || []).includes('noBoxOnButton'))
    for (const e of room.entities) if (e.kind === 'box' && room.cells[e.y * room.w + e.x].startsWith('button:')) errs.push({ msg: 'A box cannot start on a button.', at: e.y * room.w + e.x });
  return errs;
}

// Requirements on one shortest path, judged from every tick of its replay.
export const REQUIREMENTS = {
  throughOpenDoor: {
    text: 'The robot passes through an open door.',
    // A closed door is solid, so standing on a door tile means it is open.
    judge: (room, moves) => {
      let ok = false;
      replayPath(room, moves, s => { if (/^door:/.test(room.cells[s.player.y * room.w + s.player.x] || '')) ok = true; });
      return ok;
    },
  },
  doorClosedAtEnd: {
    text: 'Every door is closed when the robot reaches the goal.',
    judge: (room, moves) => {
      const end = replayPath(room, moves, () => {});
      return !Object.values(end.open).some(Boolean);
    },
  },
};

// The toggles a path turns on, and the ones it turns on and later off again.
function toggleHistory(room, moves) {
  const on = new Set(), onOff = new Set();
  replayPath(room, moves, s => {
    for (const i of s.toggled) on.add(i);
    for (const i of on) if (!s.toggled.includes(i)) onOff.add(i);
  });
  return { on, onOff, all: room.cells.flatMap((c, i) => c.startsWith('toggle:') ? [i] : []) };
}
Object.assign(REQUIREMENTS, {
  everyToggleOn: {
    text: 'Every toggle turns on.',
    judge: (room, moves) => { const h = toggleHistory(room, moves); return h.all.length > 0 && h.all.every(i => h.on.has(i)); },
  },
  everyToggleOnThenOff: {
    text: 'Every toggle turns on, then off again.',
    judge: (room, moves) => { const h = toggleHistory(room, moves); return h.all.length > 0 && h.all.every(i => h.onOff.has(i)); },
  },
});

export const stepsText = st => `The shortest path takes ${st.best - st.range} to ${st.best + st.range} moves.`;
export const bestText = st => `Exactly ${st.best} moves.`;

// The tiles a room occupies: anything not floor, the start included.
export function tilesOf(room) {
  const at = new Set();
  room.cells.forEach((c, i) => { if (c) at.add(i); });
  for (const e of room.entities) at.add(e.y * room.w + e.x);
  if (room.start) at.add(room.start.y * room.w + room.start.x);
  return at.size;
}

export function costOf(def, room, costs) {
  const { by } = placed(def, room);
  return Object.entries(by).reduce((n, [el, list]) => n + list.length * (costs[el] || 0), 0);
}

// The whole verdict. { ok: false, errors } when the room cannot run; otherwise
// { ok: true, won, length, paths, fail: { path, why } | null, cost, tiles, optional }.
export function check(def, room, costs, opts) {
  const errors = placementErrors(def, room);
  if (errors.length) return { ok: false, errors };
  const r = allShortest(room, opts), st = def.steps;
  if (r.status !== 'solved') return { ok: true, won: false, fail: { path: null, why: r.status === 'unsolvable' ? 'The robot cannot reach the goal.' : 'The robot gave up: this room is too big to search.' } };
  const base = { ok: true, length: r.length, paths: r.paths.length, cost: costOf(def, room, costs), tiles: tilesOf(room) };
  if (r.capped) return { ...base, won: false, fail: { path: r.paths[0], why: `There are more than ${r.paths.length} shortest paths for the robot to check.` } };
  if (r.length < st.best - st.range || r.length > st.best + st.range) return { ...base, won: false, fail: { path: r.paths[0], why: `${stepsText(st)} This one takes ${r.length}.` } };
  for (const path of r.paths) for (const id of def.require || []) {
    if (!REQUIREMENTS[id].judge(room, path)) return { ...base, won: false, fail: { path, why: `Not met: ${REQUIREMENTS[id].text}` } };
  }
  const optional = [{ text: bestText(st), met: r.length === st.best }];
  return { ...base, won: true, fail: null, path: r.paths[0], optional, met: optional.filter(o => o.met).length };
}
