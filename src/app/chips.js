// The lens chips under the room, one per group, each drawing its own small legend, and the
// hover line in the status bar: what is on a tile and what the lenses know about it. All copy
// is draft.
import { describe } from '../editor/edit.js';
import { S } from '../editor/state.js';
import { INK } from '../view/ink.js';
import { $, touch } from './dom.js';
import { LENS_GROUPS, LENS_TIPS, lensOn, isOn, isAuto, cycleLens, lensLine, tileFacts, toggleLens } from './lenses.js';

// A 26 by 12 mark per lens, the same marks the room draws.
const ARROW = (c, w = 1.6) => `<path d="M2 6H20" stroke="${c}" stroke-width="${w}"/><path d="M24 6l-5-3.5v7z" fill="${c}"/>`;
export const MARK = {
  off: `<path d="M6 6H20" stroke="currentColor" stroke-opacity=".4" stroke-width="1.5"/>`,
  distance: `<defs><linearGradient id="chipDist"><stop offset="0" stop-color="hsl(120,75%,45%)"/><stop offset="1" stop-color="hsl(0,75%,45%)"/></linearGradient></defs><rect x="1" y="2" width="24" height="8" rx="2" fill="url(#chipDist)"/>`,
  beams: `<rect x="1" y="2" width="24" height="8" rx="2" fill="${INK.zap}" fill-opacity=".55"/>`,
  pieces: `<rect x="1" y="2" width="24" height="8" rx="2" fill="${INK.box}" fill-opacity=".6"/>`,
  stops: `<circle cx="13" cy="6" r="3.5" fill="${INK.player}"/>`,
  passes: `<circle cx="7" cy="6" r="3.5" fill="${INK.player}"/><circle cx="15" cy="6" r="1.6" fill="${INK.player}"/><circle cx="21" cy="6" r="1.6" fill="${INK.player}"/>`,
  solution: ARROW(INK.goal, 2.2),
  moves: `<g opacity=".7">${ARROW(INK.player, 1.2)}</g>`,
  traps: `<rect x="8" y="1" width="10" height="10" fill="none" stroke="${INK.beam}" stroke-width="1.8"/>`,
  danger: `<rect x="8" y="1" width="10" height="10" fill="none" stroke="#ff9f43" stroke-width="1.8"/><path d="M10 3l6 6M16 3l-6 6" stroke="#ff9f43" stroke-width="1.6"/>`,
};
const NAME = Object.fromEntries(LENS_GROUPS.flatMap(g => g.lenses));

// Every lens as its own on/off icon in the header, right of Undo and Redo, a group to a run with a line
// between groups (registers 749, 770). On a phone they fold into one Lenses button.
export function buildChips() {
  const runs = LENS_GROUPS.map(gr => {
    const d = Object.assign(document.createElement('div'), { className: 'lensSide' }); d.dataset.join = ''; d.dataset.group = gr.id;
    for (const [id] of gr.lenses) {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'lensIcon' });
      b.id = 'lens-' + id; b.dataset.lensIcon = id; b.dataset.group = gr.id;
      b.innerHTML = `<svg viewBox="0 0 26 12" aria-hidden="true">${MARK[id]}</svg>`;
      b.onclick = () => toggleLens(id);
      d.append(b);
    }
    return d;
  });
  const sep = () => Object.assign(document.createElement('span'), { className: 'lensSep' });
  $('lensBar').replaceChildren(...runs.flatMap((r, k) => k ? [sep(), r] : [r]));
  $('redo').after($('lensFold'), $('lensBar'));
  $('lensFold').onclick = () => { const open = !$('lensBar').classList.contains('open'); $('lensBar').classList.toggle('open', open); $('lensFold').setAttribute('aria-expanded', String(open)); };
  $('lensChips').replaceChildren(...LENS_GROUPS.map(gr => {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'chip' });
    b.dataset.chip = gr.id;
    b.onclick = () => cycleLens(gr.id);
    return b;
  }));
}

let shown = '', barShown = '';
export function syncChips() {
  // Lenses are for building: gone in a campaign level or a puzzle, and only hidden while playing, so the header
  // keeps its place (registers 760, 680).
  const here = !S.camp && !S.puzzle, bar = here && S.mode === 'edit';
  const barKey = bar + LENS_GROUPS.flatMap(g => g.lenses.map(([id]) => `${isOn(id)}${isOn(id) ? lensLine(id) : ''}`)).join();
  if (barKey !== barShown) {
    barShown = barKey;
    $('lensBar').hidden = $('lensFold').hidden = !here;
    $('lensBar').classList.toggle('idle', !bar); $('lensFold').classList.toggle('idle', !bar);
    for (const b of document.querySelectorAll('[data-lens-icon]')) {
      const id = b.dataset.lensIcon, on = isOn(id), name = NAME[id];
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      b.title = `${name}: ${on ? lensLine(id) : LENS_TIPS[id]}`; b.setAttribute('aria-label', `${name} lens`);
    }
  }
  const show = false;
  const key = show + LENS_GROUPS.map(g => `${lensOn(g.id)}${isAuto(g.id)}${lensLine(lensOn(g.id) || '')}`).join();
  if (key !== shown) {
    shown = key;
    $('lensChips').hidden = !show;
    for (const gr of LENS_GROUPS) {
      const b = document.querySelector(`[data-chip=${gr.id}]`), id = lensOn(gr.id);
      b.classList.toggle('on', !!id);
      b.classList.toggle('auto', isAuto(gr.id));
      b.title = `${id ? lensLine(id) : `${gr.label} is off.`}${isAuto(gr.id) ? ' Opened by the tool in hand.' : ''} Key ${gr.key}.`;
      b.innerHTML = `<span class="g">${gr.label}</span><svg viewBox="0 0 26 12" aria-hidden="true">${MARK[id || 'off']}</svg><span class="n">${id ? NAME[id] : 'Off'}</span>`;
    }
  }
  syncInfo();
}

// The hover line: a mouse over a tile in edit mode. A finger has the Look tool for this.
let info = '';
function syncInfo() {
  const h = S.mode === 'edit' && !touch ? S.hover : null;
  const text = h ? `Tile ${h.x}, ${h.y}: ${[describe(S.level, h.x, h.y), ...tileFacts(h.y * S.level.w + h.x)].join(', ')}` : '';
  if (text !== info) $('info').textContent = info = text;
}
