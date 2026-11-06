// Looks (registers 612, 613, 638): palettes and alternate skins, bought with stars (costs halved, 638). A palette recolours
// everything at once: each colour the game paints is mapped onto the palette as it is set on a canvas,
// and the page's CSS tokens are mapped the same way. The neon lab look (602) is the identity.

// Twenty colours by job (registers 810, 811): eight greys for the room (hi lights a bevel, text is for words), six colours each with a darker shade of
// its own hue. Everything the game draws uses one of these, as the neon lab paints them; a palette is twenty
// colours in this order, so a colour is looked up by its slot and never matched.
export const SLOTS = ['void', 'floor', 'deep', 'wall', 'mid', 'top', 'hi', 'text', 'red', 'redShade', 'orange', 'orangeShade', 'yellow', 'yellowShade', 'green', 'greenShade', 'blue', 'blueShade', 'violet', 'violetShade'];
export const NEON = ['#19181a', '#2d2a2e', '#403e41', '#5b595c', '#727072', '#939293', '#e8eef6', '#fcfcfa', '#ff6188', '#8f2a45', '#fc9867', '#c4643a', '#ffd866', '#b08a5c', '#a9dc76', '#5a9a2b', '#78dce8', '#3f9aa6', '#ab9df2', '#4b3fd6'];
// Each pair is [darker, lighter]: the wall greys step up, and a shade is never lighter than its colour (808, 811).
export const SHADES = [['deep', 'wall'], ['wall', 'mid'], ['mid', 'top'], ['top', 'hi'], ['redShade', 'red'], ['orangeShade', 'orange'], ['yellowShade', 'yellow'], ['greenShade', 'green'], ['blueShade', 'blue'], ['violetShade', 'violet']];

export const PALETTES = [
  // Daylight (register 814): the main palette, after wee's first light look: a pale room, light walls with dark
  // edges, dark text, and pieces dark enough to stand off both the floor and the walls.
  { id: 'day', name: 'Daylight', cost: 0, colors: ['#e6e9ee', '#f4f6f9', '#5b6070', '#c3c9d5', '#d0d5df', '#dde1e8', '#ffffff', '#2a2730', '#ff5a73', '#c2405a', '#ff8a3d', '#c96a1e', '#e89a00', '#a8740a', '#3cc47e', '#23905a', '#3d8ef0', '#2f6cc0', '#7b6cff', '#4b3fd6'] },
  // Neon lab takes the place Pocket had (registers 812, 813): its four greens hid the button and wire colours.
  { id: 'neon', name: 'Neon lab', cost: 2, colors: NEON },
  // Grue (register 815): Pocket's green and blue-green as the room and the page, every piece in full colour.
  { id: 'grue', name: 'Grue', cost: 3, colors: ['#081820', '#0f2a2c', '#1c3f3c', '#346856', '#4a7e66', '#6a9e6c', '#e0f8d0', '#e0f8d0', '#ff6b6b', '#b03a46', '#ffa04d', '#c46a22', '#ffd84d', '#b8902a', '#b8f05a', '#6aa82a', '#5ad8ff', '#2a8fb8', '#c08cff', '#7a4fc8'] },
  { id: 'pico8', name: 'Fantasy', cost: 4, colors: ['#000000', '#1d2b53', '#000000', '#5f574f', '#83769c', '#83769c', '#fff1e8', '#fff1e8', '#ff004d', '#7e2553', '#ffa300', '#ab5236', '#ffec27', '#ab5236', '#00e436', '#008751', '#29adff', '#1d2b53', '#ff77a8', '#7e2553'] },
  // Sorbet (809): pastel ice-cream colours on a deep plum room.
  { id: 'sorbet', name: 'Sorbet', cost: 5, colors: ['#1c1626', '#2a2238', '#3e3352', '#5c4f73', '#75678e', '#8f82a8', '#f6eeff', '#fff6fb', '#ff9ec4', '#b8608a', '#ffbe98', '#c27a52', '#ffe79a', '#c2a24a', '#a8efb8', '#5fae73', '#97e3e8', '#4fa4ab', '#d0b3ff', '#8f6fc6'] },
  { id: 'cga', name: 'CGA', cost: 7, colors: ['#000000', '#0000aa', '#000000', '#555555', '#555555', '#aaaaaa', '#ffffff', '#ffffff', '#ff5555', '#aa0000', '#aa5500', '#555555', '#ffff55', '#aa5500', '#55ff55', '#00aa00', '#55ffff', '#00aaaa', '#ff55ff', '#aa00aa'] },
  // Lemonade (809): a light palette, lemon paper with candy pieces; void is the page, the walls darker than the floor.
  { id: 'lemonade', name: 'Lemonade', cost: 8, colors: ['#fffbe8', '#fff2c2', '#6e5b38', '#8a7448', '#a68f5c', '#c9b072', '#fffdf2', '#4a3b26', '#ff6f61', '#c24a3d', '#ffb347', '#c97a2a', '#ffcf3f', '#a87f2a', '#7fd17a', '#4f9a4c', '#5cc4d6', '#2f8ea0', '#a58cf0', '#6f58c0'] },
  { id: 'c64', name: 'Breadbin', cost: 10, colors: ['#000000', '#352879', '#000000', '#626262', '#777777', '#898989', '#ffffff', '#ffffff', '#cb7e75', '#9f4e44', '#a1683c', '#6d5412', '#c9d487', '#6d5412', '#9ae29b', '#5cab5e', '#6abfc6', '#50459b', '#887ecb', '#50459b'] },
  // A light palette: the paper is the page, ink the text.
  { id: 'paper', name: 'Paper', cost: 14, colors: ['#f3efe6', '#e9e3d6', '#5d574f', '#77706a', '#948c80', '#b9b0a0', '#fbf9f4', '#3d3c45', '#ef6f5e', '#a8443a', '#f2a05a', '#b0662a', '#f2b843', '#9a7a52', '#8cbf63', '#5c8f3a', '#5a8bd6', '#34588f', '#9a7fd1', '#5f4b9a'] },
];

// The objects that have an alternate skin, each with the sprites it swaps and its cost.
export const SKINS = [
  { id: 'hero', name: 'Hero', cost: 1, sprites: ['blob'] },
  { id: 'berry', name: 'Berry', cost: 2, sprites: ['berry'] },
  { id: 'block', name: 'Block', cost: 3, sprites: ['wallFace'] },
  { id: 'box', name: 'Box', cost: 5, sprites: ['box'] },
  { id: 'door', name: 'Door', cost: 6, sprites: ['doorShut', 'doorOpen'] },
  { id: 'switch', name: 'Switch', cost: 8, sprites: ['switchOff', 'switchOn'] },
  { id: 'button', name: 'Button', cost: 9, sprites: ['buttonUp', 'buttonDown'] },
  { id: 'laser', name: 'Laser', cost: 12, sprites: ['laser'] },
];

const KEY = 'wee.look';
export const look = { palette: 'day', skins: {} };
try { Object.assign(look, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* storage off */ }
// Smokes that measure drawn pixels against the neon inks draw in Neon lab (register 814 made Daylight the default).
if (globalThis.__neonLook) look.palette = 'neon';
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(look)); } catch { /* storage off */ } };

// The sprite to draw for a name: its alternate when that object wears its other skin.
const ALT = Object.fromEntries(SKINS.flatMap(s => s.sprites.map(n => [n, s.id])));
export const skinned = name => (ALT[name] && look.skins[ALT[name]] ? name + 'Alt' : name);
export const altSkin = id => !!look.skins[id];

const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const SLOT_OF = Object.fromEntries(NEON.map((h, i) => [h, i]));
// A slot colour takes the palette's own. A colour mixed at run time (a door's rail, a light's glow) keeps its hue
// (811): a grey picks the grey nearest in lightness; a colour picks its family by hue, then the step nearest in
// lightness among that colour's shade, the colour and the highlight. A red's rail or glint never turns another hue.
const L = c => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const hueOf = c => { const mx = Math.max(...c), mn = Math.min(...c), d = mx - mn; if (!d) return 0; const h = mx === c[0] ? ((c[1] - c[2]) / d) % 6 : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4; return (h * 60 + 360) % 360; };
const gap = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };
const GREY = SLOTS.slice(0, 8).map((_, i) => i), BODY = ['red', 'orange', 'yellow', 'green', 'blue', 'violet'].map(k => SLOTS.indexOf(k));
const closest = (list, c) => list.reduce((bi, i) => Math.abs(L(rgb(NEON[i])) - L(c)) < Math.abs(L(rgb(NEON[bi])) - L(c)) ? i : bi, list[0]);
function mapHex(hex, p) {
  if (hex in SLOT_OF) return p.colors[SLOT_OF[hex]];
  const c = rgb(hex);
  if (Math.max(...c) - Math.min(...c) < 40) return p.colors[closest(GREY, c)];
  const body = BODY.reduce((bi, i) => gap(hueOf(rgb(NEON[i])), hueOf(c)) < gap(hueOf(rgb(NEON[bi])), hueOf(c)) ? i : bi, BODY[0]);
  return p.colors[closest([body + 1, body, SLOTS.indexOf('hi')], c)];
}
const cache = new Map();
// Any CSS colour string a canvas or a token takes: #rgb, #rrggbb or rgb()/rgba(); anything else passes.
export function paint(v, p = current()) {
  if (!p || p.colors === NEON || typeof v !== 'string') return v;
  const k = p.id + v;
  if (cache.has(k)) return cache.get(k);
  let out = v, m;
  if (/^#[0-9a-f]{6}$/i.test(v)) out = mapHex(v.toLowerCase(), p);
  else if (/^#[0-9a-f]{3}$/i.test(v)) out = mapHex('#' + [...v.slice(1)].map(x => x + x).join('').toLowerCase(), p);
  else if ((m = v.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/))) {
    // A black shadow stays black on every palette: on a light one the darkest slot is the page.
    if (+m[1] === 0 && +m[2] === 0 && +m[3] === 0) { cache.set(k, v); return v; }
    const h = mapHex('#' + [m[1], m[2], m[3]].map(x => Math.round(+x).toString(16).padStart(2, '0')).join(''), p);
    out = m[4] === undefined ? h : `rgba(${rgb(h).join(', ')}, ${m[4]})`;
  }
  cache.set(k, out);
  return out;
}
export const current = () => PALETTES.find(p => p.id === look.palette) || PALETTES[0];
// Pocket is gone (812): a save that wore it wears the main palette.
if (!PALETTES.some(p => p.id === look.palette)) look.palette = PALETTES[0].id;

// Every colour set on any canvas passes through paint(): one hook, so no drawing needs to know.
const proto = typeof CanvasRenderingContext2D !== 'undefined' ? CanvasRenderingContext2D.prototype : null;
if (proto) for (const prop of ['fillStyle', 'strokeStyle', 'shadowColor']) {
  const d = Object.getOwnPropertyDescriptor(proto, prop);
  if (d && d.set) Object.defineProperty(proto, prop, { ...d, set(v) { d.set.call(this, paint(v)); } });
}

// The page's colour tokens, mapped the same way; their neon values are read once, before any is set.
const TOKENS = ['--paper', '--panel', '--rule', '--ink', '--soft', '--accent', '--on-accent', '--sticker', '--selectable', '--ice', '--mid', '--lite', '--gold', '--gold-ink', '--good', '--bad', '--cyan', '--orange', '--kept', '--shade', '--field', '--field-rule', '--inset-rim'];
let base = null;
export function applyPalette() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!base) { const cs = getComputedStyle(root); base = Object.fromEntries(TOKENS.map(t => [t, cs.getPropertyValue(t).trim()])); }
  const p = current();
  for (const t of TOKENS) { if (p.colors !== NEON && base[t]) root.style.setProperty(t, paint(base[t], p)); else root.style.removeProperty(t); }
  root.dataset.palette = p.id;
}

export function setPalette(id) { look.palette = id; save(); applyPalette(); dispatchEvent(new CustomEvent('wee:look')); }
export function setBoil(v) { look.boil = v; save(); dispatchEvent(new CustomEvent('wee:look')); }
export function setSkin(id, alt) { if (alt) look.skins[id] = true; else delete look.skins[id]; save(); dispatchEvent(new CustomEvent('wee:look')); }
