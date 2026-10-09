// Sizes the canvas to the room and the screen, sharp on high-density displays.
import { T } from '../view/ink.js';
import { S } from '../editor/state.js';
import { $, canvas, g, portrait } from './dom.js';

export function fit() {
  const level = S.level;
  const stage = $('stage').clientWidth || level.w * T;
  const room = portrait() ? innerHeight * 0.62 : innerHeight - 140;
  const zoom = Math.min(2.5, stage / (level.w * T), room / (level.h * T));
  const k = (window.devicePixelRatio || 1) * zoom;
  canvas.width = Math.round(level.w * T * k); canvas.height = Math.round(level.h * T * k);
  canvas.style.width = Math.round(level.w * T * zoom) + 'px';
  g.setTransform(canvas.width / (level.w * T), 0, 0, canvas.height / (level.h * T), 0, 0);
  $('w').value = level.w; $('h').value = level.h;
  S.redraw = true;
}
