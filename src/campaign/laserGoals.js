// Goals about beams and pushable lasers over one-ways and spikes (register 457). All copy is draft.
import { replayPath } from './robot.js';
import { oneWayLog } from './oneWay.js';
import { OPPOSITE } from '../rules/base.js';

const tiles = (room, test) => room.cells.flatMap((c, i) => test(c || '') ? [i] : []);
const isGate = c => c.startsWith('gate:'), isSpike = c => c === 'death';
// Which of the room's tiles of a kind a beam crossed at some tick.
function crossed(room, moves, test) {
  const want = new Set(tiles(room, test)), got = new Set();
  replayPath(room, moves, s => { for (const b of s.beams || []) for (const [x, y] of b.path.slice(1)) if (want.has(y * room.w + x)) got.add(y * room.w + x); });
  return { want, got };
}
// Which spikes a pushable laser stood on and later left.
export function laserOverSpikes(room, moves) {
  const want = new Set(tiles(room, isSpike)), on = new Map(), left = new Set();
  replayPath(room, moves, s => {
    for (const e of s.entities) {
      if (e.dead || e.kind !== 'turret' || !e.crate) continue;
      const i = e.y * room.w + e.x, was = on.get(e.id);
      if (was != null && was !== i) left.add(was);
      on.set(e.id, want.has(i) ? i : was != null && was !== i ? null : was);
    }
  });
  return { want, left };
}
const all = ({ want, got, left }) => want.size > 0 && [...want].every(i => (got || left).has(i));

export const LASER_REQUIREMENTS = {
  laserOverEveryOneWay: {
    text: 'A laser goes over every one-way.',
    short: [{ el: 'laser' }, 'over every', { el: 'gate' }],
    judge: (room, moves) => all(crossed(room, moves, isGate)),
  },
  robotThroughEveryOneWayBothWays: {
    text: 'Robot through every one-way both ways.',
    short: [{ el: 'start' }, 'through every', { el: 'gate' }, 'both ways'],
    judge: (room, moves) => {
      const gs = tiles(room, isGate), w = oneWayLog(room, moves).robotWays;
      return gs.length > 0 && gs.every(i => w[i] && [...w[i]].some(d => w[i].has(OPPOSITE[d])));
    },
  },
  laserOverEverySpike: {
    text: 'A laser goes over every spike.',
    short: [{ el: 'laser' }, 'over every', { el: 'spikes' }],
    judge: (room, moves) => all(crossed(room, moves, isSpike)),
  },
  laserCrossesEverySpike: {
    text: 'A pushable laser crosses every spike.',
    short: [{ el: 'laser' }, 'crosses every', { el: 'spikes' }],
    judge: (room, moves) => all(laserOverSpikes(room, moves)),
  },
  threeSpikes: {
    needs: { spikes: 3 },
    text: 'At least 3 spikes in the room.',
    short: ['at least 3', { el: 'spikes' }],
    judge: room => tiles(room, isSpike).length >= 3,
  },
};
