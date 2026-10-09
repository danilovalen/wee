// A whole frame: the level in edit mode, or a running game in play mode, with motion
// drawn between the previous tick and this one. Nothing here changes state.
import { DIRS } from '../rules/base.js';
import { INK, LASER_MS, PUFFS, PUFF_MS, T, frame, ease, lerp } from './ink.js';
import { drawPiece, drawPlayer } from './pieces.js';
import { drawCell, drawFloor } from './tiles.js';

// fx: [{type, at(ms), ...}] effects started by game events or edits.
export function drawEdit(g, level, hover, fx, now) {
  frame.clock = now;
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
  frame.clock = now;
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
  // A sticky piece wears goo on top; a glued pair is joined by a goo bridge.
  g.fillStyle = INK.goo; g.strokeStyle = INK.goo; g.lineCap = 'round';
  for (const e of s.entities) {
    if (e.dead) continue;
    const [px, py] = pos(e.id, e.x, e.y), k = (now % 900) / 900;
    if (e.sticky) {
      g.beginPath(); g.ellipse(px + 16, py + 7, 8, 3, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(px + 11, py + 9 + 3 * k, 2, 2 + 2 * k, 0, 0, Math.PI * 2); g.fill();
    }
    const o = e.glue > e.id && s.entities.find(q => q.id === e.glue && !q.dead);
    if (o) {
      const [ox, oy] = pos(o.id, o.x, o.y);
      const ux = Math.sign(o.x - e.x), uy = Math.sign(o.y - e.y);
      g.lineWidth = 7; g.beginPath(); g.moveTo(px + 16 + ux * 11, py + 16 + uy * 11); g.lineTo(ox + 16 - ux * 11, oy + 16 - uy * 11); g.stroke();
    }
  }
  g.lineCap = 'butt';
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
  // A boomerang kicks up a puff of cloud where you turned, blown the way you were going.
  for (const f of fx) if (f.type === 'boomerang' && f.from && now - f.at < PUFF_MS) {
    const t = (now - f.at) / PUFF_MS, [fx0, fy0] = DIRS[f.from], cx = f.x * T + T / 2, cy = f.y * T + T / 2;
    // One path for the whole cloud, so overlapping puffs read as one soft shape.
    const k = ease(t);
    g.fillStyle = INK.puff; g.globalAlpha = 0.65 * (1 - t);
    g.beginPath();
    for (const [along, side, r0] of PUFFS) {
      const x = cx + (fx0 * along + -fy0 * side) * (6 + 10 * k), y = cy + (fy0 * along + fx0 * side) * (6 + 10 * k), r = r0 * (0.7 + 0.6 * k);
      g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2);
    }
    g.fill('nonzero');
    g.globalAlpha = 1;
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
  // Stuck, a goo strand ties you to what you ride or drag.
  const st = p.stuck && s.entities.find(e => e.id === p.stuck.id && !e.dead);
  if (st) {
    const [ex, ey] = pos(st.id, st.x, st.y);
    g.strokeStyle = INK.goo; g.lineWidth = 5; g.lineCap = 'round';
    const ux = Math.sign(ex - px), uy = Math.sign(ey - py);
    g.beginPath(); g.moveTo(px + T / 2 + ux * 9, py + T / 2 + uy * 9); g.lineTo(ex + T / 2 - ux * 13, ey + T / 2 - uy * 13); g.stroke(); g.lineCap = 'butt';
  }
  drawPlayer(g, px, py, p.hidden, scale, 1, s.powers.armored, swim, p.sticky);
  g.restore();
}
