// Draws a level (edit mode) or a running game (play mode) on the canvas.
// Motion is drawn between the previous tick and this one; nothing here changes state.

import { DIRS, JUMP_TICKS, TICK_MS } from './sim.js';

export const T = 32;

export const INK = {
  floor: '#14171f', grid: '#1c2130', wall: '#3a4256', wallTop: '#4d5770',
  player: '#5ee0e6', start: '#5ee0e6', shadow: 'rgba(0,0,0,0.45)',
  mover: '#8e98ad', moverEdge: '#c3cad8', enemy: '#e8525c', box: '#c79552', boxEdge: '#8a6232',
  heavy: '#5d6474', heavyEdge: '#2b2f39', rivet: '#9aa2b3', flag: '#f2c94c', laser: '#ff6bd6',
  red: '#e8525c', blue: '#4f8cff', yellow: '#f2c94c', green: '#46c37b',
};

const ease = t => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function drawCell(g, c, x, y, s, scale = 1) {
  if (!c) return;
  const px = x * T, py = y * T;
  g.save();
  g.translate(px + T / 2, py + T / 2); g.scale(scale, scale); g.translate(-T / 2, -T / 2);
  if (c === 'wall') {
    g.fillStyle = INK.wall; roundRect(g, 1, 1, T - 2, T - 2, 5); g.fill();
    g.fillStyle = INK.wallTop; roundRect(g, 1, 1, T - 2, 7, 4); g.fill();
  } else if (c === 'checkpoint') {
    const active = s && s.checkpoint.x === x && s.checkpoint.y === y;
    g.strokeStyle = INK.moverEdge; g.lineWidth = 2;
    g.beginPath(); g.moveTo(11, 26); g.lineTo(11, 6); g.stroke();
    g.fillStyle = active ? INK.flag : '#6b6150';
    g.beginPath(); g.moveTo(12, 6); g.lineTo(25, 10.5); g.lineTo(12, 15); g.fill();
  } else {
    const [kind, col] = c.split(':');
    g.fillStyle = INK[col]; g.strokeStyle = INK[col]; g.lineWidth = 2.5;
    if (kind === 'button') {
      const down = s && pressedAt(s, x, y);
      g.globalAlpha = 0.35; g.beginPath(); g.arc(16, 16, 11, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      g.beginPath(); g.arc(16, down ? 17 : 15, down ? 6 : 8, 0, Math.PI * 2); g.fill();
    } else {
      const open = s && s.open[col];
      if (open) { g.setLineDash([4, 4]); roundRect(g, 3, 3, T - 6, T - 6, 4); g.stroke(); g.setLineDash([]); }
      else {
        roundRect(g, 2, 2, T - 4, T - 4, 4); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.3)';
        for (const bx of [9, 15, 21]) g.fillRect(bx, 4, 2, T - 8);
      }
    }
  }
  g.restore();
}

function pressedAt(s, x, y) {
  return (s.player.x === x && s.player.y === y && s.player.air === 0) ||
    s.entities.some(e => !e.dead && e.x === x && e.y === y);
}

// The mode badge: a clock for real time, a step mark for on input.
function modeBadge(g, mode) {
  g.save(); g.translate(24, 8);
  g.fillStyle = '#0b0d12'; g.beginPath(); g.arc(0, 0, 5.5, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#e9edf5'; g.fillStyle = '#e9edf5'; g.lineWidth = 1.4;
  if (mode === 'realtime') {
    g.beginPath(); g.arc(0, 0, 3.6, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -2.4); g.moveTo(0, 0); g.lineTo(1.8, 0.8); g.stroke();
  } else {
    g.beginPath(); g.moveTo(-2.5, 2); g.lineTo(0, -2.5); g.lineTo(2.5, 2); g.closePath(); g.fill();
  }
  g.restore();
}

export function drawPiece(g, e, px, py, scale = 1, alpha = 1) {
  g.save();
  g.globalAlpha = alpha;
  g.translate(px + T / 2, py + T / 2); g.scale(scale, scale); g.translate(-T / 2, -T / 2);
  if (e.kind === 'mover') {
    g.fillStyle = INK.mover; roundRect(g, 2, 2, T - 4, T - 4, 6); g.fill();
    g.strokeStyle = INK.moverEdge; g.lineWidth = 2; g.stroke();
    g.strokeStyle = '#3b4252'; g.lineWidth = 2.5;
    g.beginPath();
    if (e.axis === 'h') { g.moveTo(10, 12); g.lineTo(6, 16); g.lineTo(10, 20); g.moveTo(22, 12); g.lineTo(26, 16); g.lineTo(22, 20); }
    else { g.moveTo(12, 10); g.lineTo(16, 6); g.lineTo(20, 10); g.moveTo(12, 22); g.lineTo(16, 26); g.lineTo(20, 22); }
    g.stroke();
    modeBadge(g, e.mode);
  } else if (e.kind === 'enemy') {
    g.fillStyle = INK.enemy;
    g.beginPath(); g.moveTo(16, 3); g.lineTo(29, 16); g.lineTo(16, 29); g.lineTo(3, 16); g.closePath(); g.fill();
    const [lx, ly] = e.axis === 'h' ? [e.dir * 2.5, 0] : [0, e.dir * 2.5];
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(12 + lx, 15 + ly, 3, 0, Math.PI * 2); g.arc(20 + lx, 15 + ly, 3, 0, Math.PI * 2); g.fill();
    modeBadge(g, e.mode);
  } else if (e.kind === 'box') {
    g.fillStyle = INK.box; roundRect(g, 4, 4, T - 8, T - 8, 3); g.fill();
    g.strokeStyle = INK.boxEdge; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.moveTo(7, 7); g.lineTo(25, 25); g.moveTo(25, 7); g.lineTo(7, 25); g.stroke();
  } else if (e.kind === 'heavy') {
    g.fillStyle = INK.heavy; roundRect(g, 2, 2, T - 4, T - 4, 3); g.fill();
    g.strokeStyle = INK.heavyEdge; g.lineWidth = 3; g.stroke();
    g.fillStyle = INK.rivet;
    for (const [rx, ry] of [[7, 7], [25, 7], [7, 25], [25, 25]]) { g.beginPath(); g.arc(rx, ry, 2, 0, Math.PI * 2); g.fill(); }
  }
  g.restore();
}

function drawPlayer(g, px, py, lift, scale, alpha = 1) {
  if (lift > 0) {
    g.fillStyle = INK.shadow;
    g.beginPath(); g.ellipse(px + T / 2 + 2, py + T / 2 + 6, 11 * (1 - lift * 0.35), 6.5 * (1 - lift * 0.35), 0, 0, Math.PI * 2); g.fill();
  }
  const k = scale * (1 + lift * 0.45);
  g.save(); g.globalAlpha = alpha;
  g.translate(px + T / 2 - lift * 4, py + T / 2 - lift * 9); g.scale(k, k);
  g.fillStyle = INK.player; g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#0b2a2c'; g.beginPath(); g.arc(-3.5, -2, 2.2, 0, Math.PI * 2); g.arc(3.5, -2, 2.2, 0, Math.PI * 2); g.fill();
  g.restore();
}

function drawFloor(g, w, h) {
  g.fillStyle = INK.floor; g.fillRect(0, 0, w * T, h * T);
  g.strokeStyle = INK.grid; g.lineWidth = 1;
  g.beginPath();
  for (let x = 1; x < w; x++) { g.moveTo(x * T + 0.5, 0); g.lineTo(x * T + 0.5, h * T); }
  for (let y = 1; y < h; y++) { g.moveTo(0, y * T + 0.5); g.lineTo(w * T, y * T + 0.5); }
  g.stroke();
}

// fx: [{type, at(ms), ...}] effects started by game events or edits.
export function drawEdit(g, level, hover, fx, now) {
  drawFloor(g, level.w, level.h);
  const pop = (x, y) => {
    const f = fx.find(f => f.type === 'place' && f.x === x && f.y === y);
    return f ? 0.6 + 0.4 * ease(Math.min(1, (now - f.at) / 160)) : 1;
  };
  level.cells.forEach((c, i) => drawCell(g, c, i % level.w, Math.floor(i / level.w), null, pop(i % level.w, Math.floor(i / level.w))));
  for (const e of level.entities) drawPiece(g, e, e.x * T, e.y * T, pop(e.x, e.y));
  drawPlayer(g, level.start.x * T, level.start.y * T, 0, pop(level.start.x, level.start.y) * 0.9, 0.9);
  for (const f of fx) if (f.type === 'erase' && now - f.at < 160) {
    const t = (now - f.at) / 160;
    if (f.cell) drawCell(g, f.cell, f.x, f.y, null, 1 - ease(t) * 0.8);
    if (f.piece) drawPiece(g, f.piece, f.x * T, f.y * T, 1 - ease(t) * 0.8, 1 - t);
  }
  if (hover) {
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2;
    g.strokeRect(hover.x * T + 1, hover.y * T + 1, T - 2, T - 2);
  }
}

// prev: positions before the last tick; alpha: 0..1 progress into the next tick.
export function drawPlay(g, s, prev, alpha, fx, now) {
  const shake = fx.find(f => f.type === 'crash' && now - f.at < 180);
  g.save();
  if (shake) { const k = 3 * (1 - (now - shake.at) / 180); g.translate(Math.sin(now * 0.12) * k, Math.cos(now * 0.15) * k); }
  drawFloor(g, s.w, s.h);
  s.cells.forEach((c, i) => drawCell(g, c, i % s.w, Math.floor(i / s.w), s));
  const a = ease(alpha);
  const pos = (id, x, y) => {
    const p = prev.ents[id];
    if (!p || Math.abs(p.x - x) + Math.abs(p.y - y) > 1) return [x * T, y * T];
    return [lerp(p.x, x, a) * T, lerp(p.y, y, a) * T];
  };
  for (const e of s.entities) {
    if (!e.dead) { const [px, py] = pos(e.id, e.x, e.y); drawPiece(g, e, px, py); continue; }
    const f = fx.find(f => f.type === 'kill' && f.id === e.id);
    if (f && now - f.at < 260) {
      const t = (now - f.at) / 260;
      drawPiece(g, e, e.x * T, e.y * T, 1 + 0.3 * t, 1 - t);
    }
  }
  for (const f of fx) if (f.type === 'laser' && now - f.at < LASER_MS) {
    const [dx, dy] = DIRS[f.d], t = (now - f.at) / LASER_MS;
    g.strokeStyle = INK.laser; g.globalAlpha = 1 - t; g.lineWidth = 5 * (1 - t) + 1;
    g.beginPath();
    g.moveTo(f.x * T + T / 2, f.y * T + T / 2);
    g.lineTo((f.x + dx * (f.len + 0.5)) * T + T / 2 - dx * T / 2, (f.y + dy * (f.len + 0.5)) * T + T / 2 - dy * T / 2);
    g.stroke(); g.globalAlpha = 1;
  }
  for (const f of fx) if (f.type === 'dive' && now - f.at < 200) {
    const t = (now - f.at) / 200;
    g.strokeStyle = INK.player; g.globalAlpha = 0.6 * (1 - t); g.lineWidth = 14 * (1 - t) + 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(f.fromX * T + T / 2, f.fromY * T + T / 2); g.lineTo(f.toX * T + T / 2, f.toY * T + T / 2); g.stroke();
    g.globalAlpha = 1; g.lineCap = 'butt';
  }
  const p = s.player, pp = prev.player;
  let px = p.x * T, py = p.y * T;
  if (pp && !p.snap && Math.abs(pp.x - p.x) + Math.abs(pp.y - p.y) <= 1) { px = lerp(pp.x, p.x, a) * T; py = lerp(pp.y, p.y, a) * T; }
  const airT = p.air > 0 ? (JUMP_TICKS - p.air + alpha) / JUMP_TICKS : 0;
  const lift = p.air > 0 ? Math.sin(Math.PI * Math.min(1, airT)) : 0;
  const born = fx.find(f => (f.type === 'die' || f.type === 'respawn') && now - f.at < 220);
  const scale = born ? 0.3 + 0.7 * ease((now - born.at) / 220) : 1;
  for (const f of fx) if (f.type === 'die' && now - f.at < 300) {
    const t = (now - f.at) / 300;
    g.strokeStyle = INK.player; g.globalAlpha = 1 - t; g.lineWidth = 2;
    g.beginPath(); g.arc(f.x * T + T / 2, f.y * T + T / 2, 8 + 18 * t, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
  }
  drawPlayer(g, px, py, lift, scale);
  g.restore();
}

export const LASER_MS = 5 * TICK_MS;
