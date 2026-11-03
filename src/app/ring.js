// The room's outskirts (register 672): one tile of wall all round the room, outside it, so a slide always
// ends against something drawn. It is its own canvas behind the room's, so the room keeps every tile and
// its own coordinates; a zoomed view, which may not show the room's edges, draws none.
import { T } from '../view/ink.js';
import { drawMasses } from '../view/masses.js';
import { look } from '../view/look.js';
import { S } from '../editor/state.js';
import { $ } from './dom.js';

let drawn = '';
export function syncRing() {
  const ring = $('ring'), game = $('game'), level = S.level;
  const zoomed = $('roomWrap').classList.contains('zoomed');
  const tile = game.getBoundingClientRect().width / level.w;
  ring.hidden = zoomed || !(tile > 0);
  if (ring.hidden) { drawn = ''; return; }
  const w = level.w + 2, h = level.h + 2, dpr = window.devicePixelRatio || 1;
  const key = [w, h, tile, dpr, look.palette, JSON.stringify(look.skins), game.offsetLeft, game.offsetTop].join();
  if (key === drawn) return;
  drawn = key;
  const k = tile * dpr / T;
  ring.width = Math.round(w * T * k); ring.height = Math.round(h * T * k);
  Object.assign(ring.style, { width: w * tile + 'px', height: h * tile + 'px', left: game.offsetLeft - tile + 'px', top: game.offsetTop - tile + 'px' });
  const cells = Array.from({ length: w * h }, (_, i) => { const x = i % w, y = (i - x) / w; return x === 0 || y === 0 || x === w - 1 || y === h - 1 ? 'wall' : ''; });
  const g = ring.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); g.imageSmoothingEnabled = false; g.clearRect(0, 0, w * T, h * T);
  drawMasses(g, cells, w, h);
}
