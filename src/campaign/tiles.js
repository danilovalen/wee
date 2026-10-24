// Goals about pushable one-ways and doors, followed as they move (registers 448, 452). All copy is draft.
import { replayPath } from './robot.js';

const KIND = { gate: 'gate:', door: 'door:' };
// Per pushable tile of a kind, over a path: whether a box pushed it, whether it stood over spikes,
// and whether the robot and a box each stood in it and later stood off it.
export function tileLog(room, moves, kind) {
  const at = new Map();
  for (const c of room.crates || []) if ((room.cells[c.y * room.w + c.x] || '').startsWith(KIND[kind])) at.set(c.y * room.w + c.x, { byBox: false, spikes: false, robotIn: false, robotLeft: false, boxIn: false, boxLeft: false });
  replayPath(room, moves, s => {
    for (const ev of s.events) {
      if (ev.type !== 'tilePush') continue;
      const from = ev.y * s.w + ev.x, t = at.get(from);
      if (!t) continue;
      const [dx, dy] = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }[ev.d];
      at.delete(from); at.set(from + dy * s.w + dx, t);
      if (ev.by === 'box') t.byBox = true;
    }
    for (const [i, t] of at) {
      if (s.spikes && s.spikes.has(i)) t.spikes = true;
      const x = i % s.w, y = Math.floor(i / s.w), you = s.player.x === x && s.player.y === y;
      const box = s.entities.some(e => !e.dead && e.kind === 'box' && e.x === x && e.y === y);
      if (you) t.robotIn = true; else if (t.robotIn) t.robotLeft = true;
      if (box) t.boxIn = true; else if (t.boxIn) t.boxLeft = true;
    }
  });
  return [...at.values()];
}
const every = (room, moves, kind, f) => { const ts = tileLog(room, moves, kind); return ts.length > 0 && ts.every(f); };
const count = (room, kind) => room.cells.filter(c => (c || '').startsWith(KIND[kind])).length;

export const TILE_REQUIREMENTS = {
  boxPushesEveryOneWay: {
    text: 'A box pushes every one-way.',
    short: [{ el: 'box' }, 'pushes every', { el: 'gate' }],
    judge: (room, moves) => every(room, moves, 'gate', t => t.byBox),
  },
  robotThroughEveryPushedOneWay: {
    text: 'Robot through every one-way.',
    short: [{ el: 'start' }, 'through every', { el: 'gate' }],
    judge: (room, moves) => every(room, moves, 'gate', t => t.robotLeft),
  },
  everyOneWayOverSpikes: {
    text: 'Every one-way goes over spikes.',
    short: ['every', { el: 'gate' }, 'over', { el: 'spikes' }],
    judge: (room, moves) => every(room, moves, 'gate', t => t.spikes),
  },
  twoOneWays: {
    needs: { gate: 2 },
    text: 'At least 2 one-ways in the room.',
    short: ['at least 2', { el: 'gate' }],
    judge: room => count(room, 'gate') >= 2,
  },
  everyDoorOverSpikes: {
    text: 'Every door goes over spikes.',
    short: ['every', { el: 'door' }, 'over', { el: 'spikes' }],
    judge: (room, moves) => every(room, moves, 'door', t => t.spikes),
  },
  boxLeavesEveryDoor: {
    text: 'A box leaves every door.',
    short: [{ el: 'box' }, 'leaves every', { el: 'door' }],
    judge: (room, moves) => every(room, moves, 'door', t => t.boxLeft),
  },
  robotLeavesEveryDoor: {
    text: 'Robot leaves every door.',
    short: [{ el: 'start' }, 'leaves every', { el: 'door' }],
    judge: (room, moves) => every(room, moves, 'door', t => t.robotLeft),
  },
  twoDoors: {
    needs: { door: 2 },
    text: 'At least 2 doors in the room.',
    short: ['at least 2', { el: 'door' }],
    judge: room => count(room, 'door') >= 2,
  },
};
