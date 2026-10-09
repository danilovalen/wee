// Tiles: floor, walls and every cell type, drawn in place.
import { INK, T, frame, roundRect } from './ink.js';

export function drawCell(g, c, x, y, s, scale = 1) {
  if (!c) return;
  const px = x * T, py = y * T;
  g.save();
  g.translate(px + T / 2, py + T / 2); g.scale(scale, scale); g.translate(-T / 2, -T / 2);
  if (c === 'sticky') {
    // A lumpy green puddle with a couple of bubbles.
    g.fillStyle = INK.gooDark;
    g.beginPath(); g.ellipse(16, 17, 12, 9, 0, 0, Math.PI * 2); g.ellipse(9, 13, 5, 4, 0, 0, Math.PI * 2); g.ellipse(23, 21, 5, 4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = INK.goo;
    g.beginPath(); g.ellipse(16, 16, 10, 7, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath(); g.arc(12, 14, 1.8, 0, Math.PI * 2); g.arc(20, 18, 1.2, 0, Math.PI * 2); g.fill();
  } else if (c === 'water') {
    // A full tile, so a pool reads as one body; two waves drift across it.
    g.fillStyle = INK.water; g.fillRect(0, 0, T, T);
    g.strokeStyle = INK.waterHi; g.globalAlpha = 0.55; g.lineWidth = 1.5;
    const k = (frame.clock / 900 + x * 0.37 + y * 0.53) % 1;
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
    } else if (kind === 'idoor') {
      // The negative of a door: dark inside, the colour on the rim and the bars. Open,
      // a dashed rim around a minus sign.
      const open = s && !s.open[col];
      if (open) {
        g.setLineDash([4, 4]); roundRect(g, 3, 3, T - 6, T - 6, 4); g.stroke(); g.setLineDash([]);
        roundRect(g, 11, 14, 10, 4, 1.5); g.fill();
      } else {
        g.fillStyle = INK.idoor; roundRect(g, 2, 2, T - 4, T - 4, 4); g.fill(); g.stroke();
        g.fillStyle = INK[col];
        for (const bx of [9, 15, 21]) g.fillRect(bx, 5, 2, T - 10);
      }
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

export function pressedAt(s, x, y) {
  return (s.player.x === x && s.player.y === y && !s.player.hidden) ||
    s.entities.some(e => !e.dead && e.x === x && e.y === y);
}

export function drawFloor(g, w, h) {
  g.fillStyle = INK.floor; g.fillRect(0, 0, w * T, h * T);
  g.strokeStyle = INK.grid; g.lineWidth = 1;
  g.beginPath();
  for (let x = 1; x < w; x++) { g.moveTo(x * T + 0.5, 0); g.lineTo(x * T + 0.5, h * T); }
  for (let y = 1; y < h; y++) { g.moveTo(0, y * T + 0.5); g.lineTo(w * T, y * T + 0.5); }
  g.stroke();
}
