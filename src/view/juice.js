// The good feels (register 647, docs/JUICE_PLAN.md): small reactions drawn over the room in whole art
// pixels. A placed piece throws four sparks, an erased one breaks into dust, the blob kicks up dust where it
// stops, and what it stops against flashes white for a frame. The blob's own squash is squashOf().
import { T, INK } from './ink.js';
import { DIRS } from '../rules/base.js';

const P = 2, snap = v => Math.round(v / P) * P;
export const JUICE_MS = { eat: 520, win: 900, place: 220, erase: 320, land: 260, hit: 90, launch: 90 };
const ease = t => 1 - (1 - t) * (1 - t);
// Under reduced motion nothing here moves.
const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const dot = (g, x, y, s = P * 2) => g.fillRect(snap(x), snap(y), s, s);

export function drawJuice(g, fx, now) {
  if (still()) return;
  for (const f of fx) {
    const ms = JUICE_MS[f.type], t = ms ? (now - f.at) / ms : 1;
    if (t < 0 || t >= 1) continue;
    const cx = f.x * T + T / 2, cy = f.y * T + T / 2;
    // An eaten berry flashes its tile and bursts in a ring of cyan sparks; the last one, which wins, bursts
    // twice as far in gold and cyan (registers 702, 790).
    if (f.type === 'eat' || f.type === 'win') {
      const big = f.type === 'win', n = big ? 16 : 10, r = T / 3 + (big ? 2 : 1.2) * T * ease(t);
      if (t < 0.3) { g.fillStyle = '#fcfcfa'; g.globalAlpha = 0.6 * (1 - t / 0.3); g.fillRect(f.x * T + P, f.y * T + P, T - 2 * P, T - 2 * P); }
      g.globalAlpha = 1 - t;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        g.fillStyle = big && i % 2 ? '#ffd866' : '#78dce8';
        dot(g, cx + Math.cos(a) * r - P, cy + Math.sin(a) * r - P, P * (t < 0.5 ? 2 : 1));
        if (big) dot(g, cx + Math.cos(a + Math.PI / n) * r * 0.6 - P, cy + Math.sin(a + Math.PI / n) * r * 0.6 - P);
      }
    } else if (f.type === 'place') {
      g.fillStyle = '#fcfcfa'; g.globalAlpha = 1 - t;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) dot(g, cx + sx * (T / 2 + 10 * ease(t)) - P, cy + sy * (T / 2 + 10 * ease(t)) - P, P * (t < 0.5 ? 2 : 1));
    } else if (f.type === 'erase') {
      g.fillStyle = '#939293'; g.globalAlpha = 1 - t;
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.4, r = 4 + 14 * ease(t); dot(g, cx + Math.cos(a) * r - P, cy + Math.sin(a) * r + 10 * t * t - P); }
    } else if (f.type === 'land' && DIRS[f.dir]) {
      // Dust at the side it hit, spreading along that wall.
      const [dx, dy] = DIRS[f.dir], ex = cx + dx * (T / 2 - 4), ey = cy + dy * (T / 2 - 4);
      g.fillStyle = '#939293'; g.globalAlpha = 0.8 * (1 - t);
      for (const s of [-1, 1]) dot(g, ex + dy * s * (6 + 8 * ease(t)) - dx * 4 * t - P, ey + dx * s * (6 + 8 * ease(t)) - dy * 4 * t - P);
    } else if (f.type === 'hit') {
      g.fillStyle = '#fcfcfa'; g.globalAlpha = 0.55 * (1 - t);
      g.fillRect(f.x * T + P, f.y * T + P, T - 2 * P, T - 2 * P);
    }
  }
  g.globalAlpha = 1;
}

// The blob stretches along its slide as it sets off and squashes against what stops it: [along, across].
export function squashOf(fx, now) {
  if (still()) return null;
  // Eating a berry, the blob gulps: it swells and settles, more for the last one (register 790).
  for (const f of fx) {
    const t = (now - f.at) / (JUICE_MS[f.type] || 1);
    if ((f.type === 'eat' || f.type === 'win') && t >= 0 && t < 0.5) { const k = 1 + (f.type === 'win' ? 0.3 : 0.18) * Math.sin(t * 2 * Math.PI); return { dir: 'up', along: k, across: k }; }
  }
  for (const f of fx) {
    const ms = JUICE_MS[f.type], t = (now - f.at) / ms;
    if (!(t >= 0 && t < 1) || !DIRS[f.dir]) continue;
    if (f.type === 'launch') return { dir: f.dir, along: 1.12, across: 0.9 };
    if (f.type === 'land') { const k = Math.sin(t * Math.PI); return { dir: f.dir, along: 1 - 0.2 * k, across: 1 + 0.14 * k }; }
  }
  return null;
}

// What a tick did that the feel reacts to: setting off, coming to rest (and what against), a door turning.
export function motionFx(game, before, wasDir, openBefore, t, fx) {
  const p = game.player;
  if (!wasDir && p.dir) fx.push({ type: 'launch', dir: p.dir, x: p.x, y: p.y, at: t });
  if (wasDir && !p.dir && !game.won && !p.hidden) {
    fx.push({ type: 'land', dir: wasDir, x: p.x, y: p.y, at: t });
    const [dx, dy] = DIRS[wasDir] || [0, 0], ax = p.x + dx, ay = p.y + dy, c = ax >= 0 && ay >= 0 && ax < game.w && ay < game.h ? game.cells[ay * game.w + ax] || '' : null;
    if (c != null && (/^(wall|crack|door:|idoor:)/.test(c) || game.entities.some(e => !e.dead && e.x === ax && e.y === ay))) fx.push({ type: 'hit', x: ax, y: ay, at: t });
  }
  const now = JSON.stringify(game.open);
  if (now !== openBefore) fx.push({ type: 'doors', open: Object.values(game.open).filter(Boolean).length > Object.values(JSON.parse(openBefore)).filter(Boolean).length, at: t });
}
