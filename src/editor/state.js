// The one shared state of the page: the level being edited, the editor's settings and
// the run being played. Every app file reads and writes it here, never in a copy.
import { emptyLevel } from '../level/format.js';
import { newHistory } from './history.js';

// A new room takes the screen's shape: taller than wide on a phone held upright.
export function starterLevel(tall) {
  const l = tall ? emptyLevel(12, 14) : emptyLevel(20, 12);
  for (let x = 0; x < l.w; x++) { l.cells[x] = 'wall'; l.cells[(l.h - 1) * l.w + x] = 'wall'; }
  for (let y = 0; y < l.h; y++) { l.cells[y * l.w] = 'wall'; l.cells[y * l.w + l.w - 1] = 'wall'; }
  return l;
}

export const S = {
  level: null,
  ui: { group: 'basic', tool: 'look', axis: 'h', mode: 'input', colour: 'red', aim: ['right'], corner: 'se', pass: ['right'], face: 'up' },
  mode: 'edit', game: null, prev: null, pending: [], acc: 0, last: 0, fx: [], hover: null, painting: 0, swipe: null,
  played: null, keylog: [], history: newHistory(), before: null, check: null, demo: null, demoWait: null, lookAt: null, playFrom: null, stops: null, sel: null, clip: null, paste: null, redraw: true, drawnAt: 0, draws: 0, genPrev: null,
};
