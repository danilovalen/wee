// The Looks page (registers 612, 613, 638): palettes and one alternate skin per object, each bought once
// with stars earned in the campaign (or worn freely while everything is unlocked).
import { $ } from './dom.js';
import { place, go, back, current } from './nav.js';
import { glyph } from './glyphs.js';
import { unlocked } from './unlock.js';
import { PALETTES, SKINS, look, paint, setPalette, setSkin } from '../view/look.js';
import { drawSprite } from '../view/sprites.js';
import { INK, T } from '../view/ink.js';
import { available, owns, affords, buy } from './wallet.js';
import { sawLooks } from './achieve.js';

// A sprite drawn exactly as named onto a small canvas, in the palette p.
const SAMPLE = { blob: [], berry: [], wallFace: [], box: [], doorShut: [INK.red], switchOff: [INK.red], buttonUp: [INK.red], laser: ['right|right'] };
function preview(name, alt) {
  const c = document.createElement('canvas'); c.width = c.height = T * 2; c.className = 'lookPic';
  const g = c.getContext('2d'); g.scale(2, 2); g.fillStyle = INK.floor; g.fillRect(0, 0, T, T);
  drawSprite(g, alt ? name + 'Alt' : name, 0, 0, { exact: true, colour: SAMPLE[name][0] ?? null });
  return c;
}
// A shut look's price: a lock while the stars fall short, a star you can spend once they cover it (register 638).
const price = cost => { const s = document.createElement('small'); s.className = 'lookCost' + (affords(cost) ? ' buy' : ''); s.innerHTML = glyph(affords(cost) ? 'star' : 'lock') + cost; return s; };
// A look that is not yours yet: one tap spends its stars and wears it.
const state = (b, key, cost) => {
  const mine = owns(key, cost);
  b.disabled = !mine && !affords(cost);
  b.classList.toggle('dot', !mine && affords(cost));
  b.dataset.owned = String(mine);
  return mine;
};

function render() {
  $('lookStars').innerHTML = glyph('star') + available();
  $('lookPalettes').replaceChildren(...PALETTES.map(p => {
    const b = document.createElement('button'), key = 'palette:' + p.id;
    b.type = 'button'; b.dataset.palette = p.id; b.classList.toggle('on', look.palette === p.id);
    const mine = state(b, key, p.cost);
    const sw = document.createElement('span'); sw.className = 'lookSwatch';
    // The palette's own colours for the floor, a wall, the blob, the berry and a door.
    sw.append(...['#221f22', '#5b595c', '#a9dc76', '#78dce8', '#ff6188'].map(h => Object.assign(document.createElement('i'), { style: `background:${p.greys ? paint(h, p) : h}` })));
    b.append(sw, Object.assign(document.createElement('b'), { textContent: p.name }), ...(mine ? [] : [price(p.cost)]));
    b.setAttribute('aria-pressed', String(look.palette === p.id));
    b.onclick = () => { if (owns(key, p.cost) || buy(key, p.cost)) setPalette(p.id); render(); };
    return b;
  }));
  $('lookSkins').replaceChildren(...SKINS.map(s => {
    const row = document.createElement('div'), alt = !!look.skins[s.id], name = s.sprites[0], key = 'skin:' + s.id;
    row.className = 'lookSkin'; row.dataset.skin = s.id;
    const pick = isAlt => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.alt = String(isAlt);
      b.classList.toggle('on', alt === isAlt); b.setAttribute('aria-pressed', String(alt === isAlt));
      const mine = isAlt ? state(b, key, s.cost) : true;
      b.setAttribute('aria-label', `${s.name}, ${isAlt ? 'other skin' : 'first skin'}`);
      b.append(preview(name, isAlt)); if (!mine) b.append(price(s.cost));
      b.onclick = () => { if (!isAlt || owns(key, s.cost) || buy(key, s.cost)) setSkin(s.id, isAlt); render(); };
      return b;
    };
    row.append(Object.assign(document.createElement('b'), { textContent: s.name }), pick(false), pick(true));
    return row;
  }));
}

export function buildLooks() {
  place('looks', { page: 'lookBox', parent: () => 'menu', enter: () => { render(); sawLooks(); } });
  $('lookStars').onclick = () => go('achievements');
  $('menuLooks').innerHTML = glyph('looks');
  $('menuLooks').onclick = () => go('looks');
  $('lookMenu').onclick = () => back('menu');
  for (const e of ['wee:look', 'wee:unlock', 'wee:stars']) addEventListener(e, () => { if (current()?.name === 'looks') render(); });
}
