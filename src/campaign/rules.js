// A campaign level: the room it gives you, what you may place and how many, and what the
// robot's shortest paths must do. check() judges a room you built against it. All copy is draft.
import { emptyLevel } from '../level/format.js';
import { allShortest, replayPath, whyStuck } from './robot.js';

// What each palette element is in the room.
export const ELEMENTS = {
  block: { label: 'Block', cell: 'wall' },
  button: { label: 'Button', cell: 'button:red' },
  door: { label: 'Door', cell: 'door:red' },
  box: { label: 'Box', piece: 'box' },
  toggle: { label: 'Switch', cell: 'toggle:red' },
};

// The level's room: empty at its starting size, with no border (the room's edge stops the
// robot like a wall), the start top left and the goal bottom right. Both move freely.
export function roomOf(def) {
  const [w, h] = def.size, l = emptyLevel(w, h);
  for (const p of Object.keys(l.powers)) l.powers[p] = !!(def.powers || []).includes(p);
  l.start = { x: 0, y: 0 };
  l.cells[w * h - 1] = 'goal';
  return l;
}

// What you placed, by element; stray is anything the level's palette cannot have made.
export function placed(def, room) {
  const out = Object.fromEntries(Object.keys(ELEMENTS).map(k => [k, []])), stray = [];
  room.cells.forEach((c, i) => {
    if (!c || c === 'goal') return;
    const el = Object.keys(ELEMENTS).find(k => ELEMENTS[k].cell === c);
    if (el) out[el].push(i); else stray.push(i);
  });
  for (const e of room.entities) {
    const el = Object.keys(ELEMENTS).find(k => ELEMENTS[k].piece === e.kind), i = e.y * room.w + e.x;
    if (el) out[el].push(i); else stray.push(i);
  }
  return { by: out, stray };
}

// An element's name in lower case, plural unless there is one: switch, switches.
export const nameOf = (el, n) => { const w = ELEMENTS[el].label.toLowerCase(); return n === 1 ? w : /(s|sh|ch|x)$/.test(w) ? w + 'es' : w + 's'; };

// Why the room cannot be run yet: each is { msg, at? }. Empty when it can.
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
    if (max !== null && list.length > max) errs.push({ msg: max ? `Place at most ${max} ${nameOf(el, max)}.` : `This level has no ${nameOf(el, 2)}.` });
  }
  if ((def.rules || []).includes('noBoxOnButton'))
    for (const e of room.entities) if (e.kind === 'box' && room.cells[e.y * room.w + e.x].startsWith('button:')) errs.push({ msg: 'A box cannot start on a button.', at: e.y * room.w + e.x });
  return errs;
}

// Requirements on one shortest path, judged from every tick of its replay.
const STEP = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
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
  hitsClosedDoor: {
    text: 'The robot runs into a closed door.',
    // A slide that ends with a closed door on the next tile ahead: the door is what stopped it.
    judge: (room, moves) => {
      let ok = false, dir = null;
      replayPath(room, moves, s => {
        const p = s.player;
        if (dir && !p.dir) {
          const [dx, dy] = STEP[dir], c = room.cells[(p.y + dy) * room.w + p.x + dx] || '';
          if (/^door:/.test(c) && !s.open[c.slice(5)]) ok = true;
        }
        dir = p.dir;
      });
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
    text: 'Every switch turns on.',
    judge: (room, moves) => { const h = toggleHistory(room, moves); return h.all.length > 0 && h.all.every(i => h.on.has(i)); },
  },
  boxThroughOpenDoor: {
    text: 'A box passes through an open door.',
    // A closed door is solid, so a box on a door tile means it is open.
    judge: (room, moves) => {
      let ok = false;
      replayPath(room, moves, s => { if (s.entities.some(e => !e.dead && e.kind === 'box' && /^door:/.test(room.cells[e.y * room.w + e.x] || ''))) ok = true; });
      return ok;
    },
  },
  onlyBoxesFlipSwitches: {
    text: 'Only boxes turn switches on and off. The robot never crosses one.',
    judge: (room, moves) => {
      let robot = false, flipped = false;
      replayPath(room, moves, s => {
        if ((room.cells[s.player.y * room.w + s.player.x] || '').startsWith('toggle:')) robot = true;
        if (s.toggled.length) flipped = true;
      });
      return flipped && !robot;
    },
  },
  everyToggleOffAtEnd: {
    text: 'Every switch is off when the robot reaches the goal.',
    judge: (room, moves) => room.cells.some(c => c.startsWith('toggle:')) && replayPath(room, moves, () => {}).toggled.length === 0,
  },
  everyToggleOnThenOff: {
    text: 'Every switch turns on, then off again.',
    judge: (room, moves) => { const h = toggleHistory(room, moves); return h.all.length > 0 && h.all.every(i => h.onOff.has(i)); },
  },
});

export const stepsText = st => `The shortest path takes ${st.best - st.range} to ${st.best + st.range} moves.`;
export const bestText = st => `Exactly ${st.best} moves.`;

// The room's area, the size score.
export const areaOf = room => room.w * room.h;

export function costOf(def, room, costs) {
  const { by } = placed(def, room);
  return Object.entries(by).reduce((n, [el, list]) => n + list.length * (costs[el] || 0), 0);
}

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
// { ok: true, won, length, paths, fail: { path, why } | null, cost, area, optional }.
export function check(def, room, costs, opts) {
  const errors = placementErrors(def, room);
  if (errors.length) return { ok: false, errors };
  const r = allShortest(room, opts), st = def.steps;
  if (r.status === 'unsolvable') return { ok: true, won: false, fail: { path: null, ...stuckText(room) } };
  if (r.status !== 'solved') return { ok: true, won: false, fail: { path: null, why: 'The robot gave up: this room is too big to search.' } };
  const base = { ok: true, length: r.length, paths: r.paths.length, cost: costOf(def, room, costs), area: areaOf(room) };
  if (r.capped) return { ...base, won: false, fail: { path: r.paths[0], why: `There are more than ${r.paths.length} shortest paths for the robot to check.` } };
  if (r.length < st.best - st.range || r.length > st.best + st.range) return { ...base, won: false, fail: { path: r.paths[0], why: `${stepsText(st)} This one takes ${r.length}.` } };
  for (const path of r.paths) for (const id of def.require || []) {
    if (!REQUIREMENTS[id].judge(room, path)) return { ...base, won: false, fail: { path, why: `Not met: ${REQUIREMENTS[id].text}` } };
  }
  const optional = [{ text: bestText(st), met: r.length === st.best }];
  return { ...base, won: true, fail: null, path: r.paths[0], optional, met: optional.filter(o => o.met).length };
}
