// More goals a level can ask of a path or of the room (registers 262-269). A box collides when the
// robot's push ends with something stopping the box, and the box moved in that push. All copy is draft.
import { replayPath } from './robot.js';

const STEP = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const live = (s, x, y) => s.entities.find(e => !e.dead && e.kind === 'box' && e.x === x && e.y === y);

// Every push that ended with its box stopped: the box and the tile past it, with the state then.
export function stoppedPushes(room, moves) {
  const out = [];
  let dir = null, last = {}, before = {};
  const end = replayPath(room, moves, s => {
    const p = s.player;
    if (p.dir && !dir) before = last;
    if (dir && !p.dir) {
      const [dx, dy] = STEP[dir], box = live(s, p.x + dx, p.y + dy);
      if (box && before[box.id] !== box.x + ',' + box.y) out.push({ box, x: box.x + dx, y: box.y + dy, open: { ...s.open }, s });
    }
    dir = p.dir;
    last = Object.fromEntries(s.entities.map(e => [e.id, e.x + ',' + e.y]));
  });
  return { out, end };
}
const switches = room => room.cells.flatMap((c, i) => c.startsWith('toggle:') ? [i] : []);
const boxes = room => room.entities.filter(e => e.kind === 'box').length;

// Every laser beam at every tick of a path: its cells (the turret's own first) and the cell that stopped it.
function beams(room, moves, see) {
  replayPath(room, moves, s => { for (const b of s.beams || []) see(b, s); });
}
// Every laser in the room had a beam that passed the test at some tick.
function everyLaser(room, moves, test) {
  const all = new Set(), met = new Set();
  beams(room, moves, (b, s) => {
    for (const e of s.entities) if (e.turret && !e.dead) all.add(e.id);
    if (test(b)) met.add(b.id);
  });
  return all.size > 0 && [...all].every(id => met.has(id));
}
const cellOf = (room, at) => at && at[0] >= 0 && at[1] >= 0 && at[0] < room.w && at[1] < room.h ? room.cells[at[1] * room.w + at[0]] || '' : '';

export const EXTRA_REQUIREMENTS = {
  // Lasers (registers 255, 256).
  laserThroughOpenDoor: {
    text: 'Every laser goes through an open door.',
    short: ['every', { el: 'laser' }, 'through an open', { el: 'door' }],
    judge: (room, moves) => everyLaser(room, moves, b => b.path.slice(1).some(at => cellOf(room, at).startsWith('door:'))),
  },
  laserThroughADoor: {
    text: 'A laser goes through an open door.',
    short: [{ el: 'laser' }, 'through an open', { el: 'door' }],
    judge: (room, moves) => { let ok = false; beams(room, moves, b => { if (b.path.slice(1).some(at => cellOf(room, at).startsWith('door:'))) ok = true; }); return ok; },
  },
  laserThroughEveryButton: {
    text: 'A laser goes through every button.',
    short: [{ el: 'laser' }, 'through every', { el: 'button' }],
    judge: (room, moves) => {
      const want = new Set(room.cells.flatMap((c, i) => c.startsWith('button:') ? [i % room.w + ',' + Math.floor(i / room.w)] : [])), seen = new Set();
      beams(room, moves, b => { for (const at of b.path.slice(1)) if (want.has(String(at))) seen.add(String(at)); });
      return want.size > 0 && seen.size === want.size;
    },
  },
  robotOnButton: {
    text: 'The robot steps on a button.',
    short: [{ el: 'start' }, 'steps on a', { el: 'button' }],
    judge: (room, moves) => {
      let ok = false;
      replayPath(room, moves, s => { if ((room.cells[s.player.y * room.w + s.player.x] || '').startsWith('button:')) ok = true; });
      return ok;
    },
  },
  laserThroughTwoDoors: {
    text: 'A laser goes through two open doors at once.',
    short: [{ el: 'laser' }, 'through 2 open', { el: 'door' }],
    judge: (room, moves) => {
      let ok = false;
      beams(room, moves, b => { if (new Set(b.path.slice(1).filter(at => cellOf(room, at).startsWith('door:')).map(String)).size >= 2) ok = true; });
      return ok;
    },
  },
  laserBlockedByDoor: {
    text: 'A closed door stops every laser.',
    short: ['every', { el: 'laser' }, 'stopped by a closed', { el: 'door' }],
    judge: (room, moves) => everyLaser(room, moves, b => cellOf(room, b.stop).startsWith('door:')),
  },
  laserThroughOneWay: {
    text: 'A laser goes through a one-way.',
    short: [{ el: 'laser' }, 'through a', { el: 'gate' }],
    judge: (room, moves) => {
      let ok = false;
      beams(room, moves, b => { if (b.path.slice(1).some(at => cellOf(room, at).startsWith('gate:'))) ok = true; });
      return ok;
    },
  },
  laserBlockedByOneWay: {
    text: 'A one-way stops a laser.',
    short: [{ el: 'laser' }, 'stopped by a', { el: 'gate' }],
    judge: (room, moves) => {
      let ok = false;
      beams(room, moves, b => { if (cellOf(room, b.stop).startsWith('gate:')) ok = true; });
      return ok;
    },
  },
  twoTogglesOffAtEnd: {
    text: 'At least 2 switches are off when the robot reaches the goal.',
    short: ['2', { el: 'toggle' }, 'off at the end'],
    judge: (room, moves) => switches(room).length - replayPath(room, moves, () => {}).toggled.length >= 2,
  },
  thirdToggleOnAtEnd: {
    text: 'A third switch is on when the robot reaches the goal.',
    short: ['a 3rd', { el: 'toggle' }, 'on at the end'],
    judge: (room, moves) => switches(room).length >= 3 && replayPath(room, moves, () => {}).toggled.length >= 1,
  },
  aToggleOffAtEnd: {
    text: 'At least one switch is off when the robot reaches the goal.',
    short: ['a', { el: 'toggle' }, 'off at the end'],
    judge: (room, moves) => switches(room).length > replayPath(room, moves, () => {}).toggled.length,
  },
  // Register 277: a box on a coloured one-way when it turns is thrown out the other way.
  boxLaunched: {
    text: 'A one-way turns with a box on it and throws the box out.',
    short: [{ el: 'gate' }, 'throws a', { el: 'box' }, 'out'],
    judge: (room, moves) => {
      let ok = false;
      replayPath(room, moves, s => { if (s.events.some(e => e.type === 'launch' && live(s, e.x, e.y))) ok = true; });
      return ok;
    },
  },
  boxHitsBox: {
    text: 'A box collides with another box.',
    short: [{ el: 'box' }, 'collides with a', { el: 'box' }],
    judge: (room, moves) => stoppedPushes(room, moves).out.some(h => live(h.s, h.x, h.y)),
  },
  boxOnButtonAtEnd: {
    text: 'A box is on a button when the robot reaches the goal.',
    short: [{ el: 'box' }, 'on a', { el: 'button' }, 'at the end'],
    judge: (room, moves) => replayPath(room, moves, () => {}).entities.some(e => !e.dead && e.kind === 'box' && /^button:/.test(room.cells[e.y * room.w + e.x] || '')),
  },
  noBoxAtEnd: {
    text: 'No box is left when the robot reaches the goal.',
    short: ['no', { el: 'box' }, 'at the end'],
    judge: (room, moves) => boxes(room) > 0 && !replayPath(room, moves, () => {}).entities.some(e => !e.dead && e.kind === 'box'),
  },
  oneWaysThreeWays: {
    text: 'The one-ways point at least three different ways.',
    short: [{ el: 'gate' }, 'pointing 3 ways'],
    judge: room => new Set(room.cells.filter(c => c.startsWith('gate:')).flatMap(c => c.slice(5).split('@')[0].split(','))).size >= 3,
  },
  lasersTwoWays: {
    text: 'The lasers point at least two different ways.',
    short: [{ el: 'laser' }, 'pointing 2 ways'],
    judge: room => new Set(room.entities.filter(e => e.turret).map(e => e.turret.dirs[0])).size >= 2,
  },
  boxHitsTwoDoors: {
    text: 'A box collides with two different closed doors.',
    short: [{ el: 'box' }, 'collides with 2 closed', { el: 'door' }],
    judge: (room, moves) => {
      const hit = new Set();
      for (const h of stoppedPushes(room, moves).out) {
        const c = h.x >= 0 && h.y >= 0 && h.x < room.w && h.y < room.h ? room.cells[h.y * room.w + h.x] || '' : '';
        if (c.startsWith('door:') && !h.open[c.slice(5)]) hit.add(h.y * room.w + h.x);
      }
      return hit.size >= 2;
    },
  },
};
