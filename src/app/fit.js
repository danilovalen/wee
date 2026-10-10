// Sizes the canvas to the room and the screen, sharp on high-density displays.
import { T } from '../view/ink.js';
import { S } from '../editor/state.js';
import { $, canvas, g, portrait } from './dom.js';

// On a wide screen the tool options and the hint sit under the room, so the tool column
// never grows past the screen; on a phone they stay under the tools.
function placeOptions(wide) {
  const home = wide ? $('stage') : $('tools');
  for (const id of ['options', 'placeHint']) if ($(id).parentElement !== home) home.append($(id));
}

export function fit() {
  const level = S.level, wide = innerWidth > 700;
  placeOptions(wide);
  const stage = $('stage').clientWidth || level.w * T;
  const room = wide ? roomHeight() : portrait() ? innerHeight * 0.62 : innerHeight - 140;
  const zoom = Math.min(2.5, stage / (level.w * T), room / (level.h * T));
  const k = (window.devicePixelRatio || 1) * zoom;
  // Setting a canvas size clears it, even to the same size, so only a real change is written.
  const cw = Math.round(level.w * T * k), ch = Math.round(level.h * T * k), css = Math.round(level.w * T * zoom) + 'px';
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  if (canvas.style.width !== css) canvas.style.width = css;
  g.setTransform(canvas.width / (level.w * T), 0, 0, canvas.height / (level.h * T), 0, 0);
  $('w').value = level.w; $('h').value = level.h;
  S.redraw = true;
}

// On a wide screen the room takes the height left over by everything under it (hints, the
// Check line, design notes, the play pad), but never less than 40% of the column.
const MIN_SHARE = 0.4;
function roomHeight() {
  const stage = $('stage'), top = canvas.getBoundingClientRect().top, bottom = canvas.getBoundingClientRect().bottom;
  let below = 0;
  for (const el of stage.children) {
    if (el === canvas || el.tagName === 'DIALOG' || !el.offsetParent) continue;
    below = Math.max(below, el.getBoundingClientRect().bottom + parseFloat(getComputedStyle(el).marginBottom) - bottom);
  }
  const main = stage.parentElement, space = main.getBoundingClientRect().bottom - parseFloat(getComputedStyle(main).paddingBottom) - top - 4;
  return Math.max(space - below, space * MIN_SHARE);
}

// Fits again whenever something under the room appears, goes or changes size.
export function watchStage() {
  const ro = new ResizeObserver(() => requestAnimationFrame(fit));
  for (const el of [...$('stage').children, $('options'), $('placeHint')]) if (el !== canvas) ro.observe(el);
}
