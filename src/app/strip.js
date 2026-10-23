// The Sandbox's tool strip (registers 381-384): one slot per group, showing the tool last used from it,
// with a mark when the group holds more. A tap picks that tool and opens the group's flyout (register 406),
// the palette showing only that group: beside the slot on a wide screen, rising out of it on a phone; a
// tap on the open slot shuts it. Levels keep their single buttons.
import { STRIP, stripOf, TOOLS } from '../editor/palette.js';
import { S } from '../editor/state.js';
import { $ } from './dom.js';
import { icon } from './icons.js';

const HOLD_MS = 450;
// Wide screens keep the chosen tool's options in the bar over the room (#ctx, src/app/fit.js); in a
// Sandbox its colours and Pushable chip join them there.
const BAR = ['campTop'];
const TINTED = ['button', 'toggle', 'door', 'idoor', 'sensor'];
let A = null, open = null, before = null;

export const inSandbox = () => !S.camp && !S.puzzle;
const wide = () => matchMedia('(min-width: 701px)').matches;
const members = g => STRIP.find(([id]) => id === g)[2].filter(t => A.offered().includes(t));
const lastOf = g => { const m = members(g), l = S.ui.last && S.ui.last[g]; return m.includes(l) ? l : m[0]; };
const label = t => TOOLS.find(o => o.id === t).label;
function setOpen(g) { open = g; A.sync(); }

// actions: offered() (the tool ids this Sandbox has), pick(tool), sync().
export function buildStrip(actions) {
  A = actions;
  for (const [g, name] of STRIP) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'slot'; b.dataset.slot = g; b.setAttribute('aria-label', name);
    b.append(Object.assign(document.createElement('span'), { className: 'slotIcon' }), Object.assign(document.createElement('i'), { className: 'more' }));
    let timer = null, held = false;
    b.addEventListener('pointerdown', () => { held = false; clearTimeout(timer); timer = setTimeout(() => { held = true; if (members(g).length > 1) setOpen(g); }, HOLD_MS); });
    for (const t of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(t, () => clearTimeout(timer));
    b.oncontextmenu = ev => { ev.preventDefault(); if (members(g).length > 1) setOpen(g); };
    b.onclick = () => {
      if (held) { held = false; return; }
      if (open === g) { setOpen(null); return; }
      // The pick must not read as a choice from the flyout, which would shut it again.
      open = members(g).length > 1 ? g : null; before = lastOf(g); A.pick(before);
    };
    $('strip').append(b);
  }
  document.addEventListener('pointerdown', ev => { if (open && !ev.target.closest('#strip, #palette')) setOpen(null); }, true);
  addEventListener('keydown', ev => { if (ev.key === 'Escape' && open) setOpen(null); });
  addEventListener('resize', () => { if (inSandbox()) placeBar(); place(); });
}

// The options bar over the room (wide screens), or the panel's own place (a phone, and every level).
function placeBar() {
  const into = inSandbox() && wide() ? $('ctx') : null;
  for (const id of [...BAR].reverse()) {
    const el = $(id);
    el.home ||= el.parentNode.insertBefore(document.createComment(id), el);
    if (into && el.parentNode !== into) into.prepend(el);
    else if (!into && el.parentNode !== el.home.parentNode) el.home.after(el);
  }
}

// The flyout sits by its slot: to its right on a wide screen; on a phone straight above it, joined to it.
function place() {
  const pal = $('palette');
  if (!open) { pal.style.left = pal.style.top = pal.style.bottom = ''; return; }
  const slot = document.querySelector(`#strip [data-slot="${open}"]`).getBoundingClientRect();
  if (wide()) { pal.style.left = slot.right + 6 + 'px'; pal.style.top = slot.top + 'px'; pal.style.bottom = ''; return; }
  const w = pal.offsetWidth, left = Math.max(6, Math.min(innerWidth - w - 6, slot.left + slot.width / 2 - w / 2));
  pal.style.left = left + 'px'; pal.style.top = ''; pal.style.bottom = innerHeight - slot.top + 'px';
  pal.style.setProperty('--tab', slot.left + slot.width / 2 - left + 'px');
}

export function syncStrip() {
  const on = inSandbox(), pal = $('palette');
  document.body.classList.toggle('sandbox', on);
  placeBar();
  // The panel's blur makes it the frame a fixed child is placed in, so in a Sandbox the flyout lives on the page.
  pal.home ||= pal.parentNode.insertBefore(document.createComment('palette'), pal);
  if (on && pal.parentNode !== document.body) document.body.append(pal);
  else if (!on && pal.parentNode === document.body) pal.home.after(pal);
  if (!on) { open = null; pal.classList.remove('fly'); return; }
  const tool = S.ui.tool, mine = (stripOf(tool) || [])[0];
  S.ui.last ||= {};
  if (mine) S.ui.last[mine] = tool;
  // Choosing a tool from the flyout closes it.
  if (open && before !== null && before !== tool) open = null;
  before = tool;
  if (open && members(open).length < 2) open = null;
  for (const b of document.querySelectorAll('#strip [data-slot]')) {
    const g = b.dataset.slot, m = members(g), t = g === mine ? tool : lastOf(g);
    b.hidden = !m.length;
    if (!m.length) continue;
    const key = t + (TINTED.includes(t) ? S.ui.colour : '');
    if (b.dataset.shows !== key) {
      b.dataset.shows = key;
      b.querySelector('.slotIcon').replaceChildren(icon(t, TINTED.includes(t) && !S.ui.colour.includes('|') && S.ui.colour !== 'wire' ? S.ui.colour : 'red'));
    }
    b.dataset.picks = t;
    b.title = STRIP.find(([id]) => id === g)[1] + ': ' + label(t) + (m.length > 1 ? ', tap for more' : '');
    b.querySelector('.more').hidden = m.length < 2;
    b.classList.toggle('on', g === mine);
    b.classList.toggle('open', g === open);
    b.setAttribute('aria-expanded', String(g === open));
  }
  pal.classList.toggle('fly', !!open);
  // The flyout lists its group in the strip's order, not the palette's.
  for (const b of pal.querySelectorAll('[data-tool]')) { const i = open ? members(open).indexOf(b.dataset.tool) : -1; b.hidden = i < 0; b.style.order = i < 0 ? '' : String(i); }
  for (const h of pal.querySelectorAll('.ghead')) h.hidden = true;
  requestAnimationFrame(place);
}
