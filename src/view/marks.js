// A map room's marks drawn over the room (register 932): a level spot's name on its gravel with a
// notch on the side its card goes, and a sign as a paper label on its tile.
import { T } from './ink.js';
import { P } from './crayonSprites.js';

const PAPER = P.hi, INK = P.deep;
const NOTCH = { up: [T / 2 - 4, 0, 8, 3], down: [T / 2 - 4, T - 3, 8, 3], left: [0, T / 2 - 4, 3, 8], right: [T - 3, T / 2 - 4, 3, 8] };

export function drawMarks(g, level) {
  if (!level.spots && !level.signs) return;
  g.save();
  g.font = `700 ${Math.round(T * 0.28)}px Departure, monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const s of level.spots || []) {
    const x = s.x * T, y = s.y * T, w = Math.min(T - 4, g.measureText(s.for).width + 6);
    g.fillStyle = INK; g.fillRect(x + (T - w) / 2, y + T / 2 - 6, w, 12);
    g.fillStyle = PAPER; g.fillText(s.for, x + T / 2, y + T / 2 + 1, T - 6);
    const [nx, ny, nw, nh] = NOTCH[s.card]; g.fillStyle = INK; g.fillRect(x + nx, y + ny, nw, nh);
  }
  g.textAlign = 'left';
  for (const s of level.signs || []) {
    const x = s.x * T + 2, y = s.y * T + T / 2 - 8, w = g.measureText(s.text).width + 8;
    g.fillStyle = INK; g.fillRect(x - 1, y - 1, w + 2, 18);
    g.fillStyle = PAPER; g.fillRect(x, y, w, 16);
    g.fillStyle = INK; g.fillText(s.text, x + 4, y + 9);
  }
  g.restore();
}
