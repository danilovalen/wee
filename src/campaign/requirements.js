// What a level can require of the robot's shortest paths, each judged on one path from every
// tick of its replay, grouped by subject in src/campaign/goals/; and a path drawn on its room.
import { replayPath } from './robot.js';
import { DOOR_GOALS } from './goals/doors.js';
import { SWITCH_GOALS } from './goals/switches.js';
import { BOX_GOALS } from './goals/boxes.js';
import { ONE_WAY_GOALS } from './goals/oneWays.js';
import { LASER_GOALS } from './goals/lasers.js';
import { SPIKE_GOALS } from './goals/spikes.js';

export const REQUIREMENTS = { ...DOOR_GOALS, ...SWITCH_GOALS, ...BOX_GOALS, ...ONE_WAY_GOALS, ...LASER_GOALS, ...SPIKE_GOALS };

// A path drawn on its room: where the robot is after each move, and each box's places in order.
export function trailOf(room, moves) {
  const at = n => replayPath(room, moves.slice(0, n), () => {});
  const states = Array.from({ length: moves.length + 1 }, (_, n) => at(n));
  const robot = states.map(s => ({ x: s.player.x, y: s.player.y }));
  const boxes = states[0].entities.filter(e => e.kind === 'box').map(b => {
    const spots = [];
    for (const s of states) {
      const e = s.entities.find(e => e.id === b.id && !e.dead);
      if (e && (!spots.length || spots.at(-1).x !== e.x || spots.at(-1).y !== e.y)) spots.push({ x: e.x, y: e.y });
    }
    return spots;
  }).filter(spots => spots.length > 1);
  return { robot, boxes };
}
