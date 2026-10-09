// The palette, the tile size and the small drawing helpers every view file shares.
import { TICK_MS } from '../rules/base.js';

export const AIM = { up: -Math.PI / 2, right: 0, down: Math.PI / 2, left: Math.PI };

export const T = 32;

export const INK = {
  puff: '#e3e8f2',
  goo: '#a6d62f', gooDark: '#5f7d16', idoor: '#0b0d12',
  water: '#1c4d7a', waterHi: '#5fa8e0', shock: '#fff1a8',
  armor: '#8fa3bb',
  floor: '#14171f', grid: '#1c2130', wall: '#3a4256', wallTop: '#4d5770',
  player: '#5ee0e6', start: '#5ee0e6', shadow: 'rgba(0,0,0,0.45)',
  mover: '#8e98ad', moverEdge: '#c3cad8', enemy: '#e8525c', strong: '#7a1626', strongEdge: '#ff8a93', beam: '#ff3b3b', barrel: '#5b6274', box: '#c79552', boxEdge: '#8a6232',
  heavy: '#5d6474', heavyEdge: '#2b2f39', rivet: '#9aa2b3', flag: '#f2c94c', laser: '#ff6bd6',
  red: '#e8525c', blue: '#4f8cff', yellow: '#f2c94c', green: '#46c37b',
};

export const ease = t => 1 - Math.pow(1 - t, 3);
export const lerp = (a, b, t) => a + (b - a) * t;
// The time the current frame is drawn at, for tiles that move on their own.
export const frame = { clock: 0 };

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

export const LASER_MS = 5 * TICK_MS;
export const PUFF_MS = 380;
// [along the old way, to the side, radius] for each little cloud of a puff.
export const PUFFS = [[0.9, 0, 8], [0.6, 0.6, 6.5], [0.6, -0.6, 6.5], [0.1, 0.9, 5], [0.1, -0.9, 5], [1.3, 0.35, 4.5], [1.3, -0.35, 4.5]];
