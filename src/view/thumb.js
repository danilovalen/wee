// A room's thumbnail: one small square per tile in the tile's main colour, so a list of
// many rooms costs little to draw. Returns a data URL.
import { INK } from './ink.js';

const PX = 4;
const CELL = { wall: INK.wall, water: INK.water, sticky: INK.goo, goal: INK.goal, death: '#000000', checkpoint: INK.flag };
const PIECE = { box: INK.box, heavy: INK.heavy, mover: INK.mover, enemy: INK.enemy, strong: INK.strong, turret: INK.barrel };

export function thumbURL(level) {
  const c = document.createElement('canvas');
  c.width = level.w * PX; c.height = level.h * PX;
  const g = c.getContext('2d');
  g.fillStyle = INK.floor; g.fillRect(0, 0, c.width, c.height);
  level.cells.forEach((cell, i) => {
    if (!cell) return;
    const [kind, col] = cell.split(':');
    const ink = CELL[kind] || INK[col] || INK.mover;
    g.fillStyle = ink;
    g.fillRect((i % level.w) * PX, Math.floor(i / level.w) * PX, PX, PX);
  });
  for (const e of level.entities) { g.fillStyle = PIECE[e.kind] || INK.mover; g.fillRect(e.x * PX + 1, e.y * PX + 1, PX - 2, PX - 2); }
  g.fillStyle = INK.player; g.fillRect(level.start.x * PX + 1, level.start.y * PX + 1, PX - 2, PX - 2);
  return c.toDataURL();
}
