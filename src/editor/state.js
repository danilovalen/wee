// The one shared state of the page: the level being edited, the editor's settings and
// the run being played. Every app file reads and writes it here, never in a copy.
import { emptyLevel } from '../level/format.js';
import { newHistory } from './history.js';

// A new room takes the screen's shape: taller than wide on a phone held upright.
// A new room is open floor: the room's edge stops the robot, so it needs no wall border (register 380).
export function starterLevel(tall) {
  return tall ? emptyLevel(12, 14) : emptyLevel(20, 12);
}

export const S = {
  level: null,
  ui: { group: 'basic', tool: 'look', axis: 'h', dir: 1, start: 'right', mode: 'input', colour: 'red', aim: ['right'], corner: 'se', pass: ['right'], face: 'up', wire: 'teal' },
  mode: 'edit', game: null, prev: null, pending: [], acc: 0, last: 0, fx: [], hover: null, painting: 0, swipe: null,
  played: null, keylog: [], history: newHistory(), before: null, check: null, demo: null, demoWait: null, lookAt: null, playFrom: null, stops: null, lens: { open: false, opened: false, pick: {}, follow: true }, lensData: null, sel: null, moving: null, clip: null, paste: null, redraw: true, drawnAt: 0, draws: 0, genPrev: null, design: null,
  // simple: the Sandbox a person builds in (register 302), with the campaign's elements and tools.
  simple: false,
  // puzzle: the Puzzles room being played by hand, { id, fewest }, or null.
  puzzle: null,
};
