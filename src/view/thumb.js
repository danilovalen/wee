// A room's thumbnail, drawn as the room draws it (register 687): its tiles, pieces and the ring of wall round
// it, at a quarter scale on whole pixels, so a card shows the room itself and stays crisp. Returns a data URL.
import { T } from './ink.js';
import { drawEdit } from './scene.js';
import { drawMasses, ringCells } from './masses.js';

const K = 0.25;

export function thumbURL(level) {
  const w = level.w + 2, h = level.h + 2, c = document.createElement('canvas');
  c.width = w * T * K; c.height = h * T * K;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false; g.scale(K, K);
  drawMasses(g, ringCells(level, new Set((level.crates || []).map(p => p.y * level.w + p.x))), w, h);
  g.translate(T, T); g.clearRect(0, 0, level.w * T, level.h * T);
  drawEdit(g, level, null, [], 0);
  return c.toDataURL();
}
