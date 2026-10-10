// Sizes the canvas to the room and the screen, sharp on high-density displays.
import { T } from '../view/ink.js';
import { S } from '../editor/state.js';
import { $, canvas, g, portrait } from './dom.js';

// A wide screen is a frame: the tool's options in a bar under the header, the verdict and
// keys in a bar at the bottom, the play buttons in that bar too. Only the room flexes. A phone
// keeps the options under the tools and the bar and buttons under the room.
function place(wide) {
  const after = (el, ref) => { if (ref.nextElementSibling !== el) ref.after(el); };
  const inside = (el, parent) => { if (el.parentElement !== parent) parent.append(el); };
  if (wide) {
    inside($('options'), $('ctx')); inside($('placeHint'), $('ctx'));
    after($('statusBar'), document.querySelector('main'));
    if ($('pad').nextElementSibling !== $('keys')) $('keys').before($('pad'));
  } else {
    inside($('options'), $('tools')); inside($('placeHint'), $('tools'));
    after($('pad'), $('roomArea'));
    after($('statusBar'), $('pad'));
  }
}

export function fit() {
  const level = S.level, wide = innerWidth > 700;
  place(wide);
  const area = $('roomArea');
  const stage = (wide ? area.clientWidth - 8 : $('stage').clientWidth) || level.w * T;
  const room = wide ? area.clientHeight - 8 : portrait() ? innerHeight * 0.62 : innerHeight - 140;
  const zoom = Math.max(0.2, Math.min(2.5, stage / (level.w * T), room / (level.h * T)));
  const k = (window.devicePixelRatio || 1) * zoom;
  // Setting a canvas size clears it, even to the same size, so only a real change is written.
  const cw = Math.round(level.w * T * k), ch = Math.round(level.h * T * k), css = Math.round(level.w * T * zoom) + 'px';
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  if (canvas.style.width !== css) canvas.style.width = css;
  g.setTransform(canvas.width / (level.w * T), 0, 0, canvas.height / (level.h * T), 0, 0);
  $('w').value = level.w; $('h').value = level.h;
  S.redraw = true;
}

// Fits again whenever the room's area changes size: the well opening, a window resize.
export function watchStage() {
  new ResizeObserver(() => requestAnimationFrame(fit)).observe($('roomArea'));
}
