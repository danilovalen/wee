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

export const EXTRA_REQUIREMENTS = {
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
