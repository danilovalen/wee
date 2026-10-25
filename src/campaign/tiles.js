// Goals about pushable one-ways and doors, followed as they move (registers 448, 452). All copy is draft.
import { replayPath } from './robot.js';

const KIND = { gate: 'gate:', door: 'door:' };
// Per pushable tile of a kind, over a path, followed by its id (register 461): whether a box pushed it,
// whether it stood over spikes, and whether the robot and a box each stood in it and later off it.
export function tileLog(room, moves, kind) {
  const log = new Map();
  replayPath(room, moves, s => {
    for (const t of s.tiles) {
      if (!t.cell.startsWith(KIND[kind])) continue;
      const l = log.get(t.id) || { byBox: false, spikes: false, robotIn: false, robotLeft: false, boxIn: false, boxLeft: false };
      log.set(t.id, l);
      if (s.ground[t.y * s.w + t.x] === 'death') l.spikes = true;
      const you = s.player.x === t.x && s.player.y === t.y, box = s.entities.some(e => !e.dead && e.kind === 'box' && e.x === t.x && e.y === t.y);
      if (you) l.robotIn = true; else if (l.robotIn) l.robotLeft = true;
      if (box) l.boxIn = true; else if (l.boxIn) l.boxLeft = true;
    }
    for (const ev of s.events) if (ev.type === 'tilePush' && ev.by === 'box' && log.has(ev.id)) log.get(ev.id).byBox = true;
  });
  return [...log.values()];
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
