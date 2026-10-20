// Sizes the canvas to the room and the screen, sharp on high-density displays.
import { T } from '../view/ink.js';
import { S } from '../editor/state.js';
import { $, canvas, g } from './dom.js';
import { syncSize } from './size.js';

// A wide screen is a frame: the tool's options in a bar under the header, the verdict and
// keys in a bar at the bottom, the play buttons in that bar too. Only the room flexes. A phone
// keeps the options under the tools and the bar and buttons under the room.
// Pieces a phone moves into its sheets, and where each lives on a wide screen.
const HOMES = new Map();
const home = el => { if (!HOMES.has(el)) HOMES.set(el, { parent: el.parentElement, next: el.nextElementSibling }); return HOMES.get(el); };
let sheeted;
const SHEETED = () => sheeted || (sheeted = [[$('powers'), $('sheetPowers')], [document.querySelector('#sizePop .roomBody'), $('sheetRoom')], [$('worldMoves'), $('sheetRoom')], [$('stopsBtn'), $('sheetRoom')], [$('genBtn'), $('sheetRoom')]]);

function place(wide) {
  const after = (el, ref) => { if (ref.nextElementSibling !== el) ref.after(el); };
  const inside = (el, parent) => { if (el.parentElement !== parent) parent.append(el); };
  for (const [el, sheet] of SHEETED()) {
    const h = home(el);
    if (!wide) inside(el, sheet);
    else if (el.parentElement !== h.parent) h.parent.insertBefore(el, h.next && h.next.parentElement === h.parent ? h.next : null);
  }
  if (wide) {
    inside($('options'), $('ctx')); inside($('placeHint'), $('ctx'));
    after($('statusBar'), document.querySelector('main'));
    if ($('pad').nextElementSibling !== $('keys')) $('keys').before($('pad'));
  } else {
    inside($('options'), $('tools')); inside($('placeHint'), $('tools'));
    after($('pad'), $('lensChips'));
    after($('statusBar'), $('pad'));
  }
}

const EDGE = 14;
// The resize ears stand 18px off each side of the room (registers 298, 318, 320); above and below,
// the room keeps a little more, so an ear never touches the card over it.
const BAR = 30;
const SIDE = 18;

export function fit() {
  const level = S.level, wide = innerWidth > 700;
  place(wide);
  const area = $('roomArea');
  const side = EDGE + SIDE;
  const stage = (wide ? area.clientWidth - 2 * side : $('stage').clientWidth - 2 * side) || level.w * T;
  // A phone in play gives the room everything between the header and the play buttons; in a level
  // the room keeps its edit size instead, so nothing moves when the mode changes (register 222).
  const below = $('pad').hidden ? 0 : $('pad').offsetHeight + 16;
  const room = wide ? area.clientHeight - 2 * BAR
    : S.mode === 'play' && !S.camp ? innerHeight - $('stage').getBoundingClientRect().top - below - 2 * EDGE
      : area.clientHeight - 2 * BAR;
  const zoom = Math.max(0.2, Math.min(2.5, stage / (level.w * T), room / (level.h * T)));
  const k = (window.devicePixelRatio || 1) * zoom;
  // Setting a canvas size clears it, even to the same size, so only a real change is written.
  const cw = Math.round(level.w * T * k), ch = Math.round(level.h * T * k), css = Math.round(level.w * T * zoom) + 'px';
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  if (canvas.style.width !== css) canvas.style.width = css;
  g.setTransform(canvas.width / (level.w * T), 0, 0, canvas.height / (level.h * T), 0, 0);
  $('w').value = level.w; $('h').value = level.h;
  syncSize(level);
  S.redraw = true;
}

// Fits again whenever the room's area changes size: the well opening, a window resize.
export function watchStage() {
  new ResizeObserver(() => requestAnimationFrame(fit)).observe($('roomArea'));
}
