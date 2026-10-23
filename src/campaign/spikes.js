// Goals about spikes (register 435). All copy is draft.
import { replayPath } from './robot.js';

// A box that stood on a tile of this kind and later stands off it (register 435): leaving means it was there.
function boxLeaves(moves, room, cell) {
  let ok = false;
  const was = new Set();
  replayPath(room, moves, s => {
    for (const e of s.entities) {
      if (e.dead || e.kind !== 'box') continue;
      if (s.cells[e.y * s.w + e.x] === cell) was.add(e.id); else if (was.has(e.id)) ok = true;
    }
  });
  return ok;
}

export const SPIKE_REQUIREMENTS = {
  boxLeavesSpikes: {
    text: 'A box leaves spikes it was on.',
    short: [{ el: 'box' }, 'leaves', { el: 'spikes' }],
    judge: (room, moves) => boxLeaves(moves, room, 'death'),
  },
  boxLeavesGoal: {
    text: 'A box leaves the goal it was on.',
    short: [{ el: 'box' }, 'leaves the', { el: 'goal' }],
    judge: (room, moves) => boxLeaves(moves, room, 'goal'),
  },
};
