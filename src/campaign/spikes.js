// Goals about spikes (register 435). All copy is draft.
import { replayPath } from './robot.js';

// For each box in the room, over a path: whether it stood on a tile of this kind, and whether it
// later stood off it (leaving means it was there), and how near it came to one before standing on it.
export function boxesLeaving(room, moves, cell) {
  const by = new Map();
  replayPath(room, moves, s => {
    const tiles = s.cells.flatMap((c, i) => c === cell ? [[i % s.w, Math.floor(i / s.w)]] : []);
    for (const e of s.entities) {
      if (e.dead || e.kind !== 'box') continue;
      const b = by.get(e.id) || { was: false, left: false, d: Infinity };
      if (s.cells[e.y * s.w + e.x] === cell) b.was = true; else if (b.was) b.left = true;
      for (const [x, y] of tiles) b.d = Math.min(b.d, Math.abs(e.x - x) + Math.abs(e.y - y));
      by.set(e.id, b);
    }
  });
  return [...by.values()];
}
const everyBoxLeaves = (room, moves, cell) => { const bs = boxesLeaving(room, moves, cell); return bs.length > 0 && bs.every(b => b.left); };

export const SPIKE_REQUIREMENTS = {
  everyBoxLeavesSpikes: {
    text: 'Every box leaves spikes it was on.',
    short: ['every', { el: 'box' }, 'leaves', { el: 'spikes' }],
    judge: (room, moves) => everyBoxLeaves(room, moves, 'death'),
  },
  everyBoxLeavesGoal: {
    text: 'Every box leaves the goal it was on.',
    short: ['every', { el: 'box' }, 'leaves the', { el: 'goal' }],
    judge: (room, moves) => everyBoxLeaves(room, moves, 'goal'),
  },
};
