// A report for a bug that only shows on a real device: the last taps and keys, and the
// game's state the moment the player left a level, to copy from the menu and paste in chat.
import { S } from '../editor/state.js';
import { $ } from './dom.js';

const LAST = 40, log = [], errors = [];
// The last errors the page met, newest last: a freeze report needs them (register 508).
export function noteError(e) { errors.push({ t: Math.round(performance.now()), msg: String(e && (e.stack || e.message) || e).slice(0, 400) }); if (errors.length > 5) errors.shift(); }
let left = null;
const name = el => !el || !el.closest ? String(el) : el.id ? '#' + el.id : el.dataset && (el.dataset.plus || el.dataset.tool || el.dataset.req) ? `[${el.dataset.plus || el.dataset.tool || el.dataset.req}]` : el.className ? '.' + String(el.className).split(' ')[0] : el.tagName;

// What sits on top of the room's middle and of each grip: the tap goes there.
function onTop() {
  const at = (x, y) => name(document.elementFromPoint(x, y)), g = $('game').getBoundingClientRect();
  const out = { room: at(g.x + g.width / 2, g.y + g.height / 2) };
  for (const b of document.querySelectorAll('[data-plus]')) {
    const r = b.getBoundingClientRect();
    out[b.dataset.plus] = getComputedStyle(b).display === 'none' ? 'hidden' : at(r.x + r.width / 2, r.y + r.height / 2);
  }
  return out;
}
const state = () => ({
  mode: S.mode, body: document.body.className, level: S.camp && S.camp.def.id, testing: !!(S.camp && S.camp.testing),
  tool: S.ui.tool, carry: S.carry, painting: S.painting, editOpen: S.before !== null && S.before !== undefined, swipe: !!S.swipe,
  demo: S.demo ? S.demo.length : null, verdictShown: !$('campVerdict').hidden, size: [S.level.w, S.level.h],
  window: [innerWidth, innerHeight, devicePixelRatio], onTop: onTop(),
});

// The game's state as the player leaves a level, before leaving resets it.
export function noteLeaving() { left = { at: Math.round(performance.now()), ...state() }; }

export function bindDebug() {
  addEventListener('error', ev => noteError(ev.error || ev.message));
  addEventListener('unhandledrejection', ev => noteError(ev.reason));
  for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'keydown']) addEventListener(type, ev => {
    log.push({ t: Math.round(performance.now()), type, on: type === 'keydown' ? ev.key : name(ev.target), mode: S.mode, ...(ev.clientX !== undefined ? { x: Math.round(ev.clientX), y: Math.round(ev.clientY) } : {}) });
    if (log.length > LAST) log.shift();
  }, true);
}

// Shown first, then offered to the clipboard: a clipboard that never answers must not hide it.
export function copyDebug() {
  const text = JSON.stringify({ format: 'wee-debug', version: 1, now: state(), leftLevel: left, events: log, errors });
  $('reportText').value = text; $('reportBox').showModal(); $('reportText').select();
  try { navigator.clipboard.writeText(text).catch(() => {}); } catch { /* no clipboard here */ }
}
