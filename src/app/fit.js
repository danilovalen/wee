// Sizes the canvas to the room and the screen, sharp on high-density displays.
import { T } from '../view/ink.js';
import { S } from '../editor/state.js';
import { $, canvas, g, portrait } from './dom.js';

// On a wide screen the tool options and the hint sit under the room, so the tool column
// never grows past the screen; on a phone they stay under the tools.
const UNDER_ROOM = 170;
function placeOptions(wide) {
  const home = wide ? $('stage') : $('tools');
  for (const id of ['options', 'placeHint']) if ($(id).parentElement !== home) home.append($(id));
}

export function fit() {
  const level = S.level, wide = innerWidth > 900;
  placeOptions(wide);
  const stage = $('stage').clientWidth || level.w * T;
  const room = portrait() ? innerHeight * 0.62 : wide ? innerHeight - canvas.getBoundingClientRect().top - UNDER_ROOM : innerHeight - 140;
  const zoom = Math.min(2.5, stage / (level.w * T), room / (level.h * T));
  const k = (window.devicePixelRatio || 1) * zoom;
  canvas.width = Math.round(level.w * T * k); canvas.height = Math.round(level.h * T * k);
  canvas.style.width = Math.round(level.w * T * zoom) + 'px';
  g.setTransform(canvas.width / (level.w * T), 0, 0, canvas.height / (level.h * T), 0, 0);
  $('w').value = level.w; $('h').value = level.h;
  S.redraw = true;
}
