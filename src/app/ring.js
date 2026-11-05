// The room's outskirts (register 672): one tile of wall all round the room, outside it, so a slide always
// ends against something drawn. It is its own canvas behind the room's, so the room keeps every tile and
// its own coordinates; zoomed in, the view draws it instead (`drawRingIn`). The ring knows the
// room's own blocks, so a block on the room's edge joins it as one mass (register 682); the room itself is
// then cleared, so the ring draws nothing over it.
import { T } from '../view/ink.js';
import { drawMasses, ringCells } from '../view/masses.js';
import { look } from '../view/look.js';
import { S } from '../editor/state.js';
import { $ } from './dom.js';

let drawn = '';
// As the room draws them: a crate stands alone; a block placed on a challenge joins the ring (register 794).
const cellsOf = level => ringCells(level, new Set((level.crates || []).map(c => c.y * level.w + c.x)));
// Zoomed in, the ring is drawn in the view itself, one tile out from the room, before the room (register 802).
export function drawRingIn(g, level) {
  if (!$('roomWrap').classList.contains('zoomed')) return;
  g.save(); g.translate(-T, -T); drawMasses(g, cellsOf(level), level.w + 2, level.h + 2); g.restore();
}
export function syncRing() {
  const ring = $('ring'), game = $('game'), level = S.level;
  const zoomed = $('roomWrap').classList.contains('zoomed');
  const tile = game.getBoundingClientRect().width / level.w;
  ring.hidden = zoomed || !(tile > 0);
  if (ring.hidden) { drawn = ''; return; }
  const w = level.w + 2, h = level.h + 2, dpr = window.devicePixelRatio || 1, cells = cellsOf(level);
  const key = [w, h, cells.join('|'), tile, dpr, look.palette, JSON.stringify(look.skins), game.offsetLeft, game.offsetTop].join();
  if (key === drawn) return;
  drawn = key;
  const k = tile * dpr / T;
  ring.width = Math.round(w * T * k); ring.height = Math.round(h * T * k);
  Object.assign(ring.style, { width: w * tile + 'px', height: h * tile + 'px', left: game.offsetLeft - tile + 'px', top: game.offsetTop - tile + 'px' });
  const g = ring.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); g.imageSmoothingEnabled = false; g.clearRect(0, 0, w * T, h * T);
  drawMasses(g, cells, w, h);
  g.clearRect(T, T, level.w * T, level.h * T);
}
