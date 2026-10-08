// Draws a level (edit mode) or a running game (play mode) on the canvas.
// Motion is drawn between the previous tick and this one; nothing here changes state.

import { DIRS, TICK_MS } from './sim.js';

const AIM = { up: -Math.PI / 2, right: 0, down: Math.PI / 2, left: Math.PI };

export const T = 32;

export const INK = {
  water: '#1c4d7a', waterHi: '#5fa8e0', shock: '#fff1a8',
  armor: '#8fa3bb',
  floor: '#14171f', grid: '#1c2130', wall: '#3a4256', wallTop: '#4d5770',
  player: '#5ee0e6', start: '#5ee0e6', shadow: 'rgba(0,0,0,0.45)',
  mover: '#8e98ad', moverEdge: '#c3cad8', enemy: '#e8525c', strong: '#7a1626', strongEdge: '#ff8a93', beam: '#ff3b3b', barrel: '#5b6274', box: '#c79552', boxEdge: '#8a6232',
  heavy: '#5d6474', heavyEdge: '#2b2f39', rivet: '#9aa2b3', flag: '#f2c94c', laser: '#ff6bd6',
  red: '#e8525c', blue: '#4f8cff', yellow: '#f2c94c', green: '#46c37b',
};

const ease = t => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;
// The time the current frame is drawn at, for tiles that move on their own.
let clock = 0;

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
  if (c === 'water') {
    // A full tile, so a pool reads as one body; two waves drift across it.
    g.fillStyle = INK.water; g.fillRect(0, 0, T, T);
    g.strokeStyle = INK.waterHi; g.globalAlpha = 0.55; g.lineWidth = 1.5;
    const k = (clock / 900 + x * 0.37 + y * 0.53) % 1;
    for (const wy of [10, 22]) {
      g.beginPath();
      for (let wx = 0; wx <= T; wx += 4) g.lineTo(wx, wy + Math.sin((wx / T + k) * Math.PI * 2) * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
  } else if (c.startsWith('tri:')) {
    // The solid half sits in the named corner; the slope is the bright edge.
    const k = c.slice(4), pts = { nw: [[1, 1], [T - 1, 1], [1, T - 1]], ne: [[1, 1], [T - 1, 1], [T - 1, T - 1]], sw: [[1, 1], [1, T - 1], [T - 1, T - 1]], se: [[T - 1, 1], [T - 1, T - 1], [1, T - 1]] }[k];
    g.fillStyle = INK.wall; g.beginPath(); g.moveTo(...pts[0]); g.lineTo(...pts[1]); g.lineTo(...pts[2]); g.closePath(); g.fill();
    g.strokeStyle = INK.wallTop; g.lineWidth = 3; g.beginPath();
    if (k === 'nw') { g.moveTo(T - 1, 1); g.lineTo(1, T - 1); }
    else if (k === 'se') { g.moveTo(T - 1, 1); g.lineTo(1, T - 1); }
    else { g.moveTo(1, 1); g.lineTo(T - 1, T - 1); }
    g.stroke();
  } else if (c === 'wall') {
    g.fillStyle = INK.wall; roundRect(g, 1, 1, T - 2, T - 2, 5); g.fill();
    g.fillStyle = INK.wallTop; roundRect(g, 1, 1, T - 2, 7, 4); g.fill();
  } else if (c === 'death') {
    // Spikes on a dark red slab.
    g.fillStyle = '#3a0d14'; roundRect(g, 1, 1, T - 2, T - 2, 4); g.fill();
    g.fillStyle = '#e8525c';
    for (const [cx, cy] of [[9, 9], [23, 9], [16, 16], [9, 23], [23, 23]]) {
      g.beginPath(); g.moveTo(cx, cy - 5); g.lineTo(cx + 4, cy + 4); g.lineTo(cx - 4, cy + 4); g.closePath(); g.fill();
    }
  } else if (c.startsWith('spring:')) {
    // A block with a coil and a plate on the side it faces.
    const d = c.slice(7);
    g.fillStyle = INK.wall; roundRect(g, 1, 1, T - 2, T - 2, 5); g.fill();
    g.save(); g.translate(16, 16); g.rotate({ right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[d]);
    g.strokeStyle = '#f2c94c'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-8, 0);
    for (let i = 0; i < 4; i++) { g.lineTo(-6 + i * 4, -6); g.lineTo(-4 + i * 4, 6); }
    g.lineTo(9, 0); g.stroke();
    g.fillStyle = '#f2c94c'; g.fillRect(10, -10, 4, 20);
    g.restore();
  } else if (c.startsWith('gate:')) {
    // Rails along the sides it blocks, and a chevron for each way it lets through.
    const ds = c.slice(5).split(','), across = ds.includes('left') || ds.includes('right'), upDown = ds.includes('up') || ds.includes('down');
    g.fillStyle = '#1d2230'; g.fillRect(1, 1, T - 2, T - 2);
    g.fillStyle = INK.wall;
    if (!upDown) { g.fillRect(1, 1, T - 2, 5); g.fillRect(1, T - 6, T - 2, 5); }
    if (!across) { g.fillRect(1, 1, 5, T - 2); g.fillRect(T - 6, 1, 5, T - 2); }
    g.strokeStyle = '#7fe3a0'; g.lineWidth = 2.6; g.lineJoin = 'round';
    for (const d of ds) {
      g.save(); g.translate(16, 16); g.rotate({ right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[d]);
      g.beginPath(); g.moveTo(2, -6); g.lineTo(8, 0); g.lineTo(2, 6); g.stroke();
      g.restore();
    }
  } else if (c.startsWith('sensor:')) {
    // A floor plate a beam lights as it crosses: a coloured diamond that glows while lit.
    const col = c.slice(7), lit = s && s.lit.has(y * s.w + x);
    g.translate(16, 16); g.rotate(Math.PI / 4);
    g.strokeStyle = INK[col]; g.lineWidth = 2.5; g.strokeRect(-8, -8, 16, 16);
    g.fillStyle = INK[col]; g.globalAlpha = lit ? 1 : 0.25; g.fillRect(-4, -4, 8, 8); g.globalAlpha = 1;
    if (lit) { g.globalAlpha = 0.3; g.fillRect(-12, -12, 24, 24); g.globalAlpha = 1; }
  } else if (c.startsWith('receiver:')) {
    // A catcher: a block with a coloured eye that glows while a beam holds it.
    const col = c.slice(9), lit = s && s.lit.has(y * s.w + x);
    g.fillStyle = INK.wall; roundRect(g, 1, 1, T - 2, T - 2, 5); g.fill();
    g.fillStyle = lit ? INK[col] : '#11141b';
    g.beginPath(); g.arc(16, 16, 8.5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = INK[col]; g.lineWidth = 3; g.stroke();
    if (lit) { g.globalAlpha = 0.35; g.fillStyle = INK[col]; g.beginPath(); g.arc(16, 16, 14, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
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
  return (s.player.x === x && s.player.y === y && !s.player.hidden) ||
    s.entities.some(e => !e.dead && e.x === x && e.y === y);
}

// The mode badge: a clock for real time, a step mark for on input, a double chevron for follow.
function modeBadge(g, mode, bx = 24, by = 8) {
  g.save(); g.translate(bx, by);
  g.fillStyle = '#0b0d12'; g.beginPath(); g.arc(0, 0, 5.5, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#e9edf5'; g.fillStyle = '#e9edf5'; g.lineWidth = 1.4;
  if (mode === 'realtime') {
    g.beginPath(); g.arc(0, 0, 3.6, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -2.4); g.moveTo(0, 0); g.lineTo(1.8, 0.8); g.stroke();
  } else if (mode === 'follow') {
    g.beginPath(); g.moveTo(-3, -2.5); g.lineTo(-0.5, 0); g.lineTo(-3, 2.5); g.moveTo(0.5, -2.5); g.lineTo(3, 0); g.lineTo(0.5, 2.5); g.stroke();
  } else {
    g.beginPath(); g.moveTo(-2.5, 2); g.lineTo(0, -2.5); g.lineTo(2.5, 2); g.closePath(); g.fill();
  }
  g.restore();
}

// A turret head: one barrel per direction it fires; the next to fire is lit.
function drawTurret(g, t, badge, mounted) {
  const next = t.dirs[(t.aim || 0) % t.dirs.length];
  g.save();
  if (mounted) { g.translate(16, 16); g.scale(0.62, 0.62); g.translate(-16, -16); }
  for (const d of t.dirs) {
    g.save(); g.translate(16, 16); g.rotate(AIM[d]);
    g.fillStyle = d === next ? INK.beam : INK.barrel;
    roundRect(g, 4, -3, 11, 6, 2); g.fill();
    g.restore();
  }
  g.fillStyle = '#20242f'; g.beginPath(); g.arc(16, 16, 7, 0, Math.PI * 2); g.fill();
  g.strokeStyle = INK.beam; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = INK.beam; g.beginPath(); g.arc(16, 16, 2.2, 0, Math.PI * 2); g.fill();
  g.restore();
  if (badge) modeBadge(g, t.mode, badge[0], badge[1]);
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
  } else if (e.kind === 'strong') {
    g.fillStyle = INK.strong; roundRect(g, 2, 3, T - 4, T - 5, 7); g.fill();
    g.strokeStyle = INK.strongEdge; g.lineWidth = 2; g.stroke();
    g.fillStyle = INK.strongEdge;
    g.beginPath(); g.moveTo(6, 6); g.lineTo(9, 0); g.lineTo(12, 5); g.moveTo(20, 5); g.lineTo(23, 0); g.lineTo(26, 6); g.fill();
    const [lx, ly] = e.axis === 'h' ? [e.dir * 2.5, 0] : [0, e.dir * 2.5];
    g.fillStyle = '#ffd34d';
    g.fillRect(9 + lx, 13 + ly, 5, 3); g.fillRect(18 + lx, 13 + ly, 5, 3);
    modeBadge(g, e.mode);
  } else if (e.kind === 'turret') {
    g.fillStyle = INK.wall; roundRect(g, 1, 1, T - 2, T - 2, 5); g.fill();
    g.fillStyle = INK.wallTop; roundRect(g, 1, 1, T - 2, 7, 4); g.fill();
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
  if (e.turret) drawTurret(g, e.turret, e.kind === 'turret' ? [24, 8] : [8, 24], e.kind !== 'turret');
  g.restore();
}

// Hidden, you are a dashed outline with your eyes peeking: drawn over whatever passes
// on top of you, so you can still be found. Swimming on land you wear a blue drop;
// under water you waver, tinted, with a ripple.
function drawPlayer(g, px, py, hidden, scale, alpha = 1, armored = false, swim = null) {
  g.save(); g.globalAlpha = alpha;
  g.translate(px + T / 2, py + T / 2); g.scale(scale, scale);
  const under = swim === 'under';
  if (under) {
    const w = Math.sin(clock / 170);
    g.strokeStyle = INK.waterHi; g.lineWidth = 1.5;
    const rp = (clock % 1100) / 1100;
    g.globalAlpha = alpha * 0.6 * (1 - rp); g.beginPath(); g.arc(0, 0, 11 + 6 * rp, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = alpha * 0.8;
    g.translate(w * 1.5, 0); g.scale(1 + 0.07 * w, 1 - 0.07 * w);
  }
  if (hidden) {
    g.strokeStyle = INK.player; g.lineWidth = 2; g.setLineDash([3, 3]);
    g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
  } else { g.fillStyle = INK.player; g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.fill(); }
  if (armored) {
    // A steel rim with four rivets.
    g.strokeStyle = INK.armor; g.lineWidth = 3.5;
    g.beginPath(); g.arc(0, 0, 11.5, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#e8eef6';
    for (const a of [0.25, 0.75, 1.25, 1.75]) { g.beginPath(); g.arc(Math.cos(a * Math.PI) * 11.5, Math.sin(a * Math.PI) * 11.5, 1.6, 0, Math.PI * 2); g.fill(); }
  }
  g.fillStyle = '#0b2a2c'; g.beginPath(); g.arc(-3.5, -2, 2.2, 0, Math.PI * 2); g.arc(3.5, -2, 2.2, 0, Math.PI * 2); g.fill();
  if (under) {
    g.globalAlpha = alpha * 0.45; g.fillStyle = INK.waterHi;
    g.beginPath(); g.arc(0, 0, 10.5, 0, Math.PI * 2); g.fill();
  } else if (swim === 'on') {
    g.fillStyle = INK.waterHi;
    g.beginPath(); g.moveTo(9, -16); g.quadraticCurveTo(14, -9, 9, -7); g.quadraticCurveTo(4, -9, 9, -16); g.fill();
  }
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
  clock = now;
  drawFloor(g, level.w, level.h);
  const pop = (x, y) => {
    const f = fx.find(f => f.type === 'place' && f.x === x && f.y === y);
    return f ? 0.6 + 0.4 * ease(Math.min(1, (now - f.at) / 160)) : 1;
  };
  level.cells.forEach((c, i) => drawCell(g, c, i % level.w, Math.floor(i / level.w), null, pop(i % level.w, Math.floor(i / level.w))));
  for (const e of level.entities) drawPiece(g, e, e.x * T, e.y * T, pop(e.x, e.y));
  drawPlayer(g, level.start.x * T, level.start.y * T, false, pop(level.start.x, level.start.y) * 0.9, 0.9, level.powers.armored);
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
  clock = now;
  const shake = fx.find(f => f.type === 'crash' && now - f.at < 180);
  g.save();
  if (shake) { const k = 3 * (1 - (now - shake.at) / 180); g.translate(Math.sin(now * 0.12) * k, Math.cos(now * 0.15) * k); }
  drawFloor(g, s.w, s.h);
  s.cells.forEach((c, i) => drawCell(g, c, i % s.w, Math.floor(i / s.w), s));
  // A shocked pool crackles: a flicker over every cell of it, a turret's for as long
  // as its beam touches, yours for a moment.
  const crackle = (cells, k) => {
    g.strokeStyle = INK.shock; g.lineWidth = 1.5;
    for (const i of cells) {
      const x = (i % s.w) * T, y = Math.floor(i / s.w) * T, j = Math.floor(now / 70) + i;
      g.globalAlpha = k * (0.35 + 0.35 * ((j * 7) % 3) / 2);
      g.beginPath(); g.moveTo(x + 4, y + 8 + (j % 3) * 4); g.lineTo(x + 12, y + 14); g.lineTo(x + 18, y + 9 + (j % 2) * 6); g.lineTo(x + 28, y + 18); g.stroke();
    }
    g.globalAlpha = 1;
  };
  crackle(s.shocked, 1);
  for (const f of fx) if (f.type === 'laser' && f.shocked && now - f.at < LASER_MS) crackle(f.shocked, 1 - (now - f.at) / LASER_MS);
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
    const t = (now - f.at) / LASER_MS, c = ([x, y]) => [x * T + T / 2, y * T + T / 2];
    g.strokeStyle = INK.laser; g.globalAlpha = 1 - t; g.lineWidth = 5 * (1 - t) + 1;
    g.lineJoin = 'round';
    g.beginPath();
    f.path.forEach((p, i) => { const [x, y] = c(p); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    if (f.wall) { const [x, y] = c(f.path[f.path.length - 1]), [dx, dy] = DIRS[f.end]; g.lineTo(x + dx * T / 2, y + dy * T / 2); }
    g.stroke(); g.globalAlpha = 1;
  }
  // Turret beams are on all the time: a core line with a soft glow and a slow flicker.
  for (const b of s.beams) {
    const c = ([x, y]) => [x * T + T / 2, y * T + T / 2];
    const line = () => {
      g.beginPath();
      b.path.forEach((p, i) => { const [x, y] = c(p); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
      if (b.wall || b.stop) { const [x, y] = c(b.path[b.path.length - 1]), [dx, dy] = DIRS[b.end]; g.lineTo(x + dx * T / 2, y + dy * T / 2); }
      g.stroke();
    };
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.strokeStyle = INK.beam; g.globalAlpha = 0.25 + 0.08 * Math.sin(now / 90); g.lineWidth = 9; line();
    g.globalAlpha = 1; g.lineWidth = 2.5; g.strokeStyle = '#ffd0d0'; line();
    g.lineCap = 'butt';
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
  const born = fx.find(f => (f.type === 'die' || f.type === 'respawn') && now - f.at < 220);
  const scale = born ? 0.3 + 0.7 * ease((now - born.at) / 220) : 1;
  for (const f of fx) if (f.type === 'die' && now - f.at < 300) {
    const t = (now - f.at) / 300;
    g.strokeStyle = INK.player; g.globalAlpha = 1 - t; g.lineWidth = 2;
    g.beginPath(); g.arc(f.x * T + T / 2, f.y * T + T / 2, 8 + 18 * t, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
  }
  const swim = !p.swimming ? null : s.cells[p.y * s.w + p.x] === 'water' ? 'under' : 'on';
  drawPlayer(g, px, py, p.hidden, scale, 1, s.powers.armored, swim);
  g.restore();
}

export const LASER_MS = 5 * TICK_MS;
