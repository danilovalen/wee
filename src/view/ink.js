// The palette, the tile size and the small drawing helpers every view file shares.
import { TICK_MS } from '../rules/base.js';

export const AIM = { up: -Math.PI / 2, right: 0, down: Math.PI / 2, left: Math.PI };

export const T = 32;

// Fog (docs/MANGA_THEME.md): a neutral gray room, and every thing in it its own saturated pastel.
export const INK = {
  puff: '#ffffff',
  goo: '#9be15d', gooDark: '#5a9a2b', idoor: '#33363f', goal: '#ffc23d',
  water: '#5aa9ff', waterHi: '#c2e2ff', shock: '#fff3a8',
  armor: '#b9c7e6',
  floor: '#e4e7ec', grid: '#d6dae2', wall: '#a9b0bf', wallTop: '#c3c9d5',
  player: '#4cc9ff', start: '#4cc9ff', shadow: 'rgba(40,44,60,0.22)',
  mover: '#3fd8c4', moverEdge: '#b4f7ee', enemy: '#ff6b81', strong: '#d6456a', strongEdge: '#ffb0c0', beam: '#ff4d6d', barrel: '#8f86d9', box: '#ffa94d', boxEdge: '#c97326',
  heavy: '#9b8cff', heavyEdge: '#5b4fc8', rivet: '#e2ddff', flag: '#ffd84d', laser: '#ff7ad9',
  red: '#ff6b81', blue: '#5aa9ff', yellow: '#ffd84d', green: '#5edc9a',
  mark: '#3a3f4c', deathBg: '#7a2747', deathSpike: '#ffb0c0', gateBg: '#3a3f4c', gateArrow: '#5edc9a', unlit: '#5b6070', spring: '#ffc23d',
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
