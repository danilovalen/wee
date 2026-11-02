// The Looks page (registers 612, 613): palettes and one alternate skin per object, each opened by a
// number of stars earned in the campaign (or by the session's unlock-all). Nothing is spent: a look
// opens for good once the stars reach its cost.
import { $ } from './dom.js';
import { place, go, back } from './nav.js';
import { glyph } from './glyphs.js';
import { progress } from './progress.js';
import { unlocked } from './unlock.js';
import { PALETTES, SKINS, look, paint, setPalette, setSkin } from '../view/look.js';
import { drawSprite } from '../view/sprites.js';
import { INK, T } from '../view/ink.js';

// Every star the campaign has given: one per beaten level and one per side goal met.
export const totalStars = (p = progress()) => Object.values(p.levels || {}).reduce((n, r) => n + (r && r.beaten ? 1 : 0) + Object.values((r && r.goals) || {}).filter(Boolean).length, 0);
const open = cost => unlocked() || totalStars() >= cost;

// A sprite drawn exactly as named onto a small canvas, in the palette p.
const SAMPLE = { blob: [], berry: [], wallFace: [], box: [], doorShut: [INK.red], switchOff: [INK.red], buttonUp: [INK.red], laser: ['right|right'] };
function preview(name, alt) {
  const c = document.createElement('canvas'); c.width = c.height = T * 2; c.className = 'lookPic';
  const g = c.getContext('2d'); g.scale(2, 2); g.fillStyle = INK.floor; g.fillRect(0, 0, T, T);
  drawSprite(g, alt ? name + 'Alt' : name, 0, 0, { exact: true, colour: SAMPLE[name][0] ?? null });
  return c;
}
const lock = cost => { const s = document.createElement('small'); s.className = 'lookCost'; s.innerHTML = glyph('lock') + cost; return s; };

function render() {
  $('lookStars').innerHTML = glyph('star') + totalStars();
  $('lookPalettes').replaceChildren(...PALETTES.map(p => {
    const b = document.createElement('button'), ok = open(p.cost);
    b.type = 'button'; b.dataset.palette = p.id; b.disabled = !ok; b.classList.toggle('on', look.palette === p.id);
    const sw = document.createElement('span'); sw.className = 'lookSwatch';
    // The palette's own colours for the floor, a wall, the blob, the berry and a door.
    sw.append(...['#221f22', '#5b595c', '#a9dc76', '#78dce8', '#ff6188'].map(h => Object.assign(document.createElement('i'), { style: `background:${p.greys ? paint(h, p) : h}` })));
    b.append(sw, Object.assign(document.createElement('b'), { textContent: p.name }), ...(ok ? [] : [lock(p.cost)]));
    b.setAttribute('aria-pressed', String(look.palette === p.id));
    b.onclick = () => setPalette(p.id);
    return b;
  }));
  $('lookSkins').replaceChildren(...SKINS.map(s => {
    const row = document.createElement('div'), ok = open(s.cost), alt = !!look.skins[s.id], name = s.sprites[0];
    row.className = 'lookSkin'; row.dataset.skin = s.id;
    const pick = (isAlt, enabled) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.alt = String(isAlt);
      b.classList.toggle('on', alt === isAlt); b.setAttribute('aria-pressed', String(alt === isAlt)); b.disabled = !enabled;
      b.setAttribute('aria-label', `${s.name}, ${isAlt ? 'other skin' : 'first skin'}`);
      b.append(preview(name, isAlt)); if (!enabled) b.append(lock(s.cost));
      b.onclick = () => setSkin(s.id, isAlt);
      return b;
    };
    row.append(Object.assign(document.createElement('b'), { textContent: s.name }), pick(false, true), pick(true, ok));
    return row;
  }));
}

export function buildLooks() {
  place('looks', { page: 'lookBox', parent: () => 'menu', enter: render });
  $('menuLooks').innerHTML = glyph('looks');
  $('menuLooks').onclick = () => go('looks');
  $('lookMenu').onclick = () => back('menu');
  addEventListener('wee:look', () => { if (!$('lookBox').hidden && $('lookBox').open) render(); });
  addEventListener('wee:unlock', () => { if ($('lookBox').open) render(); });
}
