// The palette, the tile size and the small drawing helpers every view file shares.
import { TICK_MS } from '../rules/base.js';

export const AIM = { up: -Math.PI / 2, right: 0, down: Math.PI / 2, left: Math.PI };

export const T = 32;

// Fog (docs/MANGA_THEME.md): a neutral gray room, and every thing in it its own saturated pastel.
export const INK = {
  puff: '#9fd8ff',
  goo: '#9be15d', gooDark: '#5a9a2b', idoor: '#33363f', goal: '#ffd866',
  water: '#5aa9ff', waterHi: '#c2e2ff', shock: '#fff3a8',
  armor: '#b9c7e6',
  floor: '#2d2a2e', grid: '#363337', wall: '#5b595c', wallTop: '#727072', crack: '#403e41',
  player: '#ab9df2', start: '#ab9df2', robotDark: '#4b3fd6', robotTip: '#ff6b81', robotVisor: '#2a2440', robotEye: '#7ef0ff', shadow: 'rgba(0,0,0,0.35)',
  mover: '#3fd8c4', moverEdge: '#b4f7ee', enemy: '#ff6b81', strong: '#d6456a', strongEdge: '#ffb0c0', beam: '#ff6188', zap: '#ff5722', zapCore: '#ffd8c4', barrel: '#8f86d9', box: '#857f6a', boxEdge: '#5e5a4a',
  heavy: '#9b8cff', heavyEdge: '#5b4fc8', bomb: '#3d4256', bombHi: '#7d8399', fuse: '#b08a5c', spark: '#ff9a3d', blast: '#ff8a3d', rivet: '#e2ddff', flag: '#ffd84d', laser: '#ff7ad9',
  red: '#ff6188', blue: '#78dce8', yellow: '#ffd866', green: '#a9dc76',
  // Grey pieces read wires (register 347); the wires' own three colours are none of the doors'.
  wire: '#8f97a8', teal: '#0d9488', violet: '#7c3aed', charcoal: '#3f3f46',
  mark: '#939293', deathBg: '#5c2a3a', deathSpike: '#ffb0c0', gateBg: '#403e41', gateArrow: '#a9dc76', unlit: '#5b595c', spring: '#ffc23d', gravel: '#dcb88f', gravelDot: '#a98058', gravelHi: '#f4e1c6',
};

export const ease = t => 1 - Math.pow(1 - t, 3);
export const lerp = (a, b, t) => a + (b - a) * t;
// The time the current frame is drawn at, for tiles that move on their own.
// avatar: who plays, the robot (campaign) or you, a circle (register 302).
export const frame = { clock: 0, avatar: 'robot' };

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

export const LASER_MS = 5 * TICK_MS;
export const PUFF_MS = 380;
// [along the old way, to the side, radius] for each little cloud of a puff.
export const PUFFS = [[0.9, 0, 8], [0.6, 0.6, 6.5], [0.6, -0.6, 6.5], [0.1, 0.9, 5], [0.1, -0.9, 5], [1.3, 0.35, 4.5], [1.3, -0.35, 4.5]];
