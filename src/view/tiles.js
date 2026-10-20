// Tiles: floor, walls and every cell type, drawn in place.
import { INK, T, frame, roundRect } from './ink.js';
import { drawnColour } from '../rules/wires.js';
import { gateOf, gateDirs } from '../rules/grid.js';

// bare: a block in the wall mass, so only what sits on it is drawn.
// Gravel's grit: the same scatter of dark and light stones on every tile, at (X, Y).
export function grit(g, X, Y) {
  for (const [x, y, r, hi] of [[7, 8, 1.6, 0], [18, 6, 1.3, 1], [25, 12, 1.7, 0], [11, 17, 1.2, 1], [21, 21, 1.6, 0], [6, 25, 1.4, 0], [15, 27, 1.2, 1], [27, 26, 1.3, 0]]) {
    g.fillStyle = hi ? INK.gravelHi : INK.gravelDot; g.beginPath(); g.arc(X + x, Y + y, r, 0, Math.PI * 2); g.fill();
  }
}

// The relay's star: eight points, outer radius 12, inner 10.5, each corner rounded, scaled by k.
const STAR = Array.from({ length: 16 }, (_, i) => { const r = i % 2 ? 10.5 : 12, t = -Math.PI / 2 + i * Math.PI / 8; return [Math.cos(t) * r, Math.sin(t) * r]; });
function star(g, k) {
  const P = STAR.map(([x, y]) => [x * k, y * k]), mid = i => { const a = P[i], b = P[(i + 1) % 16]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
  g.beginPath(); g.moveTo(...mid(15));
  for (let i = 0; i < 16; i++) g.arcTo(P[i][0], P[i][1], ...mid(i), 1.8 * k);
  g.closePath();
}

export function drawCell(g, c, x, y, s, scale = 1, bare = false) {
  if (!c) return;
  // In a run, a grey piece's colours are its wires' networks ('w0'): drawn grey, open while any is.
  if (/[:|@]w(\d+|none)/.test(c)) {
    const cut = Math.max(c.indexOf(':'), c.indexOf('@')) + 1, d = drawnColour(c.slice(cut).split('|'), s && s.open);
    const open = d.on !== undefined ? { ...(s && s.open), wire: d.on } : s && s.open;
    return drawCell(g, c.slice(0, cut) + d.cols.join('|'), x, y, s && { ...s, open }, scale, bare);
  }
  // A piece of two colours is drawn twice, each colour on its half, both showing the pair's state:
  // open, or turned, while either colour is (registers 313, 316).
  const bar = c.indexOf('|');
  if (bar > 0) {
    const cut = Math.max(c.lastIndexOf(':', bar), c.lastIndexOf('@', bar)) + 1, cols = c.slice(cut).split('|');
    const any = !!s && cols.some(k => s.open[k]), st = s && { ...s, open: { ...s.open, [cols[0]]: any, [cols[1]]: any } };
    cols.forEach((k, i) => {
      g.save(); g.translate(x * T + T / 2, y * T + T / 2); g.scale(scale, scale);
      g.beginPath(); g.rect(i ? 0 : -T / 2, -T / 2, T / 2, T); g.clip();
      g.scale(1 / scale, 1 / scale); g.translate(-(x * T + T / 2), -(y * T + T / 2));
      drawCell(g, c.slice(0, cut) + k, x, y, st, scale, bare);
      g.restore();
    });
    return;
  }
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
  } else if (c === 'gravel') {
    g.fillStyle = INK.gravel; roundRect(g, 1, 1, T - 2, T - 2, 6); g.fill();
    grit(g, 0, 0);
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
  } else if (c === 'crack') {
    // A block that will not last: cracks across its face.
    if (!bare) { g.fillStyle = INK.wall; roundRect(g, 1, 1, T - 2, T - 2, 5); g.fill(); }
    g.strokeStyle = INK.crack; g.lineWidth = 2; g.lineJoin = 'round'; g.beginPath();
    g.moveTo(5, 12); g.lineTo(12, 15); g.lineTo(15, 9); g.lineTo(22, 13); g.lineTo(27, 10);
    g.moveTo(12, 15); g.lineTo(14, 23); g.lineTo(9, 28); g.moveTo(14, 23); g.lineTo(21, 21); g.lineTo(26, 27);
    g.stroke();
  } else if (c === 'wall') {
    g.fillStyle = INK.wall; roundRect(g, 1, 1, T - 2, T - 2, 5); g.fill();
    g.fillStyle = INK.wallTop; roundRect(g, 1, 1, T - 2, 7, 4); g.fill();
  } else if (c === 'death') {
    // Spikes on a dark red slab.
    g.fillStyle = INK.deathBg; roundRect(g, 1, 1, T - 2, T - 2, 4); g.fill();
    g.fillStyle = INK.deathSpike;
    for (const [cx, cy] of [[9, 9], [23, 9], [16, 16], [9, 23], [23, 23]]) {
      g.beginPath(); g.moveTo(cx, cy - 5); g.lineTo(cx + 4, cy + 4); g.lineTo(cx - 4, cy + 4); g.closePath(); g.fill();
    }
  } else if (c.startsWith('spring:')) {
    // A block with a coil and a plate on the side it faces.
    const d = c.slice(7);
    if (!bare) { g.fillStyle = INK.wall; roundRect(g, 1, 1, T - 2, T - 2, 5); g.fill(); }
    g.save(); g.translate(16, 16); g.rotate({ right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[d]);
    g.strokeStyle = INK.spring; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-8, 0);
    for (let i = 0; i < 4; i++) { g.lineTo(-6 + i * 4, -6); g.lineTo(-4 + i * 4, 6); }
    g.lineTo(9, 0); g.stroke();
    g.fillStyle = INK.spring; g.fillRect(10, -10, 4, 20);
    g.restore();
  } else if (c.startsWith('gate:')) {
    // Rails along the sides it blocks, and a chevron for each way it lets through. A coloured one
    // draws its chevrons in its colour, and while that colour is pressed it lights up: tinted, ringed
    // and pointing the other way.
    const { col } = gateOf(c), on = !!(s && col && s.open[col]), ds = s ? gateDirs(s, c) : gateOf(c).dirs;
    const across = ds.includes('left') || ds.includes('right'), upDown = ds.includes('up') || ds.includes('down');
    g.fillStyle = INK.gateBg; g.fillRect(1, 1, T - 2, T - 2);
    if (on) { g.fillStyle = INK[col]; g.globalAlpha = 0.3; g.fillRect(1, 1, T - 2, T - 2); g.globalAlpha = 1; }
    g.fillStyle = INK.wall;
    if (!upDown) { g.fillRect(1, 1, T - 2, 5); g.fillRect(1, T - 6, T - 2, 5); }
    if (!across) { g.fillRect(1, 1, 5, T - 2); g.fillRect(T - 6, 1, 5, T - 2); }
    if (on) { g.strokeStyle = INK[col]; g.lineWidth = 2; roundRect(g, 2, 2, T - 4, T - 4, 4); g.stroke(); }
    g.strokeStyle = col ? INK[col] : INK.gateArrow; g.lineWidth = on ? 3.2 : 2.6; g.lineJoin = 'round';
    for (const d of ds) {
      g.save(); g.translate(16, 16); g.rotate({ right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[d]);
      g.beginPath(); g.moveTo(2, -6); g.lineTo(8, 0); g.lineTo(2, 6); g.stroke();
      g.restore();
    }
  } else if (c.startsWith('sensor:')) {
    // A block a beam goes through, lighting it: a soft eight-point star in its colour, its core filled
    // while lit (registers 339, 340: a diamond read as a mirror).
    const col = c.slice(7), lit = s && s.lit.has(y * s.w + x);
    g.translate(16, 16); g.lineJoin = 'round';
    g.strokeStyle = g.fillStyle = INK[col]; g.lineWidth = 2.5; star(g, 1); g.stroke();
    g.globalAlpha = lit ? 1 : 0.25; star(g, 0.5); g.fill();
    if (lit) { g.globalAlpha = 0.3; star(g, 1.25); g.fill(); }
    g.globalAlpha = 1;
  } else if (c.startsWith('receiver:')) {
    // A catcher: a block with a coloured eye that glows while a beam holds it.
    const col = c.slice(9), lit = s && s.lit.has(y * s.w + x);
    if (!bare) { g.fillStyle = INK.wall; roundRect(g, 1, 1, T - 2, T - 2, 5); g.fill(); }
    // A grey catcher glows white, or lit and unlit would both read grey.
    g.fillStyle = lit ? (col === 'wire' ? '#ffffff' : INK[col]) : INK.unlit;
    g.beginPath(); g.arc(16, 16, 8.5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = INK[col]; g.lineWidth = 3; g.stroke();
    if (lit) { g.globalAlpha = 0.35; g.fillStyle = INK[col]; g.beginPath(); g.arc(16, 16, 14, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
  } else if (c === 'goal') {
    // A gold ring with a star in it, pulsing slowly.
    const k = 0.5 + 0.5 * Math.sin(frame.clock / 400);
    g.strokeStyle = INK.goal; g.lineWidth = 2.5; g.globalAlpha = 0.55 + 0.45 * k;
    g.beginPath(); g.arc(16, 16, 12, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
    g.fillStyle = INK.goal; g.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 3.2 : 7.5, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(16 + Math.cos(a) * r, 16 + Math.sin(a) * r); }
    g.fill();
  } else if (c === 'checkpoint') {
    const active = s && s.checkpoint.x === x && s.checkpoint.y === y;
    g.strokeStyle = INK.moverEdge; g.lineWidth = 2;
    g.beginPath(); g.moveTo(11, 26); g.lineTo(11, 6); g.stroke();
    g.fillStyle = active ? INK.flag : '#6b6150';
    g.beginPath(); g.moveTo(12, 6); g.lineTo(25, 10.5); g.lineTo(12, 15); g.fill();
  } else {
    const [kind, col] = c.split(':');
    g.fillStyle = INK[col]; g.strokeStyle = INK[col]; g.lineWidth = 2.5;
    if (kind === 'toggle') {
      // A switch plate: a pill in its colour with a knob, left and hollow while off, right
      // and filled while on.
      const on = s && s.toggled.includes(y * s.w + x);
      g.globalAlpha = on ? 1 : 0.35; roundRect(g, 5, 10, 22, 12, 6); g.fill(); g.globalAlpha = 1;
      roundRect(g, 5, 10, 22, 12, 6); g.stroke();
      g.fillStyle = on ? '#fff' : INK[col];
      g.beginPath(); g.arc(on ? 21 : 11, 16, 4, 0, Math.PI * 2); g.fill();
    } else if (kind === 'button') {
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
