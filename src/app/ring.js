// The room's outskirts (register 672): one tile of wall all round the room, outside it, so a slide always
// ends against something drawn. It is its own canvas behind the room's, so the room keeps every tile and
// its own coordinates; zoomed in, it frames the view instead (register 940). The ring knows the
// room's own blocks, so a block on the room's edge joins it as one mass (register 682); the room itself is
// then cleared, so the ring draws nothing over it.
import { T } from '../view/ink.js';
import { drawMasses, ringCells } from '../view/masses.js';
import { look } from '../view/look.js';
import { lineOf } from '../view/crayon.js';
import { P } from '../view/crayonSprites.js';
import { S } from '../editor/state.js';
import { $ } from './dom.js';

let drawn = '';
// As the room draws them: a crate stands alone; a block placed on a challenge joins the ring (register 794).
const cellsOf = level => ringCells(level, new Set((level.crates || []).map(c => c.y * level.w + c.x)));
// Zoomed in, the ring stays round the view at the fitted tile size (register 940): a plain frame, as the
// view's own edges are not the room's.
let fitted = 0;
const frameOf = (w, h) => ({ w, h, cells: [] });
const frameCells = (w, h) => Array.from({ length: w * h }, (_, i) => i % w === 0 || i % w === w - 1 || i < w || i >= w * (h - 1) ? 'wall' : '');
export function syncRing() {
  const ring = $('ring'), game = $('game'), real = S.level;
  const zoomed = $('roomWrap').classList.contains('zoomed'), r = game.getBoundingClientRect();
  if (!zoomed) fitted = r.width / real.w;
  const tile = fitted, level = zoomed ? frameOf(Math.round(r.width / tile), Math.round(r.height / tile)) : real;
  ring.hidden = !(tile > 0) || !level.w;
  if (ring.hidden) { drawn = ''; return; }
  const w = level.w + 2, h = level.h + 2, dpr = window.devicePixelRatio || 1, cells = zoomed ? frameCells(w, h) : cellsOf(level);
  const key = [w, h, cells.join('|'), tile, dpr, look.palette, JSON.stringify(look.skins), game.offsetLeft, game.offsetTop].join();
  if (key === drawn) return;
  drawn = key;
  const k = tile * dpr / T;
  ring.width = Math.round(w * T * k); ring.height = Math.round(h * T * k);
  Object.assign(ring.style, { width: w * tile + 'px', height: h * tile + 'px', left: game.offsetLeft - tile + 'px', top: game.offsetTop - tile + 'px' });
  // The ring's outer line, drawn by the page in the wall's own line colour (register 883).
  ring.style.setProperty('--wall-line', lineOf(P.wall));
  const g = ring.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); g.imageSmoothingEnabled = false; g.clearRect(0, 0, w * T, h * T);
  drawMasses(g, cells, w, h);
  g.clearRect(T, T, level.w * T, level.h * T);
}
