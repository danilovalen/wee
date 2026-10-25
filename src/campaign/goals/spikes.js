// Goals about spikes and leaving tiles: leaving means having stood there (registers 435, 444). All
// copy is draft.
import { boxesLeaving, everyBoxLeaves, cellsWhere, isSpike } from './helpers.js';

export const SPIKE_GOALS = {
  everyBoxEntersSpikes: {
    text: 'Every box goes onto spikes.',
    short: ['every', { el: 'box' }, 'onto', { el: 'spikes' }],
    judge: (room, moves) => { const bs = boxesLeaving(room, moves, 'death'); return bs.length > 0 && bs.every(b => b.was); },
  },
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
  threeSpikes: {
    needs: { spikes: 3 },
    text: 'At least 3 spikes in the room.',
    short: ['at least 3', { el: 'spikes' }],
    judge: room => cellsWhere(room, isSpike).length >= 3,
  },
};
