// Tiles: floor, walls and every cell type, drawn in place.
import { INK, T, frame, pxTri } from './ink.js';
import { drawSprite } from './sprites.js';
import { drawnColour } from '../rules/wires.js';
import { gateOf, gateDirs } from '../rules/grid.js';

// bare: a block in the wall mass, so only what sits on it is drawn.

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
  if (c === 'sticky' || c === 'gravel') {
    drawSprite(g, c, 0, 0);
  } else if (c === 'water') {
    // A full tile, so a pool reads as one body; two waves drift across it.
    g.fillStyle = INK.water; g.fillRect(0, 0, T, T);
    // Waves drawn in whole 2-unit pixels.
    g.fillStyle = INK.waterHi; g.globalAlpha = 0.55;
    const k = (frame.clock / 900 + x * 0.37 + y * 0.53) % 1;
    for (const wy of [10, 22]) for (let wx = 0; wx < T; wx += 2) g.fillRect(wx, wy + 2 * Math.round(Math.sin((wx / T + k) * Math.PI * 2)), 2, 2);
    g.globalAlpha = 1;
  } else if (c.startsWith('tri:')) {
    // The solid half sits in the named corner, as stairs of whole pixels (register 621).
    g.fillStyle = INK.wall; pxTri(g, 0, 0, T, c.slice(4));
  } else if (c === 'crack') {
    // A block that will not last: cracks across its face.
    drawSprite(g, 'crack', 0, 0, { colour: bare ? 'bare' : null });
  } else if (c === 'wall') {
    drawSprite(g, 'wallFace', 0, 0);
  } else if (c === 'death') {
    drawSprite(g, 'death', 0, 0);
  } else if (c.startsWith('spring:')) {
    // A coil and a plate on the side it faces, pushed out while the spring is spent.
    const out = s && s.sprung && s.sprung.includes(y * s.w + x);
    drawSprite(g, 'spring', 0, 0, { colour: c.slice(7) + '|' + (bare ? 'bare' : '') + (out ? '|out' : '') });
  } else if (c.startsWith('gate:')) {
    // Rails along the sides it blocks, and a chevron for each way it lets through. A coloured one
    // draws its chevrons in its colour, and while that colour is pressed it lights up: tinted, ringed
    // and pointing the other way.
    const { col } = gateOf(c), on = !!(s && col && s.open[col]), ds = s ? gateDirs(s, c) : gateOf(c).dirs;
    drawSprite(g, 'gate', 0, 0, { colour: ds.join(',') + '|' + (col ? INK[col] : '') + '|' + (on ? 1 : 0) });
  } else if (c.startsWith('sensor:')) {
    // A glass block a beam goes through (register 374, his G3): solid, framed in its colour, the circle at its
    // centre filled only while a beam crosses it (register 792).
    const col = c.slice(7), lit = s && s.lit.has(y * s.w + x);
    drawSprite(g, 'sensor', 0, 0, { colour: INK[col] + '|' + (lit ? 1 : 0) });
  } else if (c === 'goal') {
    // The goal is a cyan berry (registers 593, 604).
    drawSprite(g, 'berry', 0, 0);
  } else if (c === 'checkpoint') {
    const active = s && s.checkpoint.x === x && s.checkpoint.y === y;
    drawSprite(g, 'checkpoint', 0, 0, { colour: active ? '1' : '0' });
  } else {
    const [kind, col] = c.split(':');
    g.fillStyle = INK[col]; g.strokeStyle = INK[col]; g.lineWidth = 2.5;
    if (kind === 'toggle') {
      // A switch plate: a pill in its colour with a knob, left and hollow while off, right
      // and filled while on.
      const on = s ? s.toggled.includes(y * s.w + x) : c.endsWith(':on');
      drawSprite(g, on ? 'switchOn' : 'switchOff', 0, 0, { colour: INK[col] });
    } else if (kind === 'button') {
      const down = s && pressedAt(s, x, y);
      drawSprite(g, down ? 'buttonDown' : 'buttonUp', 0, 0, { colour: INK[col] });
    } else if (kind === 'idoor') {
      // The negative of a door: dark inside, the colour on the rim and the bars. Open,
      // a dashed rim around a minus sign.
      drawSprite(g, 'idoor', 0, 0, { colour: INK[col] + '|' + (s && !s.open[col] ? 1 : 0) });
    } else {
      const open = s && s.open[col];
      drawSprite(g, open ? 'doorOpen' : 'doorShut', 0, 0, { colour: INK[col] });
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
