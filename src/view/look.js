// Looks (registers 612, 613, 638): palettes and alternate skins, bought with stars (costs halved, 638). A palette recolours
// everything at once: each colour the game paints is mapped onto the palette as it is set on a canvas,
// and the page's CSS tokens are mapped the same way. The neon lab look (602) is the identity.

// Sixteen colours by job (register 810): everything the game draws uses one of these, as the neon lab paints them.
// A palette is sixteen colours in this order, so a colour is looked up by its slot and never matched.
export const SLOTS = ['void', 'floor', 'wallShade', 'wall', 'wallTop', 'text', 'red', 'redShade', 'orange', 'yellow', 'brown', 'green', 'greenShade', 'blue', 'violet', 'violetShade'];
export const NEON = ['#19181a', '#2d2a2e', '#403e41', '#5b595c', '#939293', '#fcfcfa', '#ff6188', '#8f2a45', '#fc9867', '#ffd866', '#857f6a', '#a9dc76', '#5a9a2b', '#78dce8', '#ab9df2', '#4b3fd6'];
// The shades each body leans on: a shade is never lighter than what it shades (808).
export const SHADES = [['wallShade', 'wall'], ['wall', 'wallTop'], ['redShade', 'red'], ['brown', 'orange'], ['brown', 'yellow'], ['greenShade', 'green'], ['violetShade', 'violet'], ['violetShade', 'blue']];

export const PALETTES = [
  { id: 'neon', name: 'Neon lab', cost: 0, colors: NEON },
  // Four greens far enough apart to read (register 620), each slot taking the one its job needs.
  { id: 'gameboy', name: 'Pocket', cost: 2, colors: ['#081820', '#081820', '#346856', '#346856', '#88c070', '#e0f8d0', '#e0f8d0', '#346856', '#e0f8d0', '#e0f8d0', '#346856', '#88c070', '#346856', '#e0f8d0', '#e0f8d0', '#346856'] },
  { id: 'pico8', name: 'Fantasy', cost: 4, colors: ['#000000', '#1d2b53', '#000000', '#5f574f', '#83769c', '#fff1e8', '#ff004d', '#7e2553', '#ffa300', '#ffec27', '#ab5236', '#00e436', '#008751', '#29adff', '#ff77a8', '#7e2553'] },
  // Sorbet (809): pastel ice-cream colours on a deep plum room.
  { id: 'sorbet', name: 'Sorbet', cost: 5, colors: ['#1c1626', '#2a2238', '#3e3352', '#5c4f73', '#8f82a8', '#fff6fb', '#ff9ec4', '#b8608a', '#ffbe98', '#ffe79a', '#c2a24a', '#a8efb8', '#5fae73', '#97e3e8', '#d0b3ff', '#8f6fc6'] },
  { id: 'cga', name: 'CGA', cost: 7, colors: ['#000000', '#0000aa', '#000000', '#555555', '#aaaaaa', '#ffffff', '#ff5555', '#aa0000', '#aa5500', '#ffff55', '#555555', '#55ff55', '#00aa00', '#55ffff', '#ff55ff', '#aa00aa'] },
  // Lemonade (809): a light palette, lemon paper with candy pieces; void is the page, the walls stay darker than the floor.
  { id: 'lemonade', name: 'Lemonade', cost: 8, colors: ['#fffbe8', '#fff2c2', '#6e5b38', '#8a7448', '#c9b072', '#4a3b26', '#ff8a5c', '#c9573a', '#ffb347', '#ffcf3f', '#a87f2a', '#7fd17a', '#4f9a4c', '#5cc4d6', '#a58cf0', '#6f58c0'] },
  { id: 'c64', name: 'Breadbin', cost: 10, colors: ['#000000', '#352879', '#000000', '#626262', '#898989', '#ffffff', '#cb7e75', '#9f4e44', '#a1683c', '#c9d487', '#6d5412', '#9ae29b', '#5cab5e', '#6abfc6', '#887ecb', '#50459b'] },
  // A light palette: the paper is the page, ink the text.
  { id: 'paper', name: 'Paper', cost: 14, colors: ['#f3efe6', '#e9e3d6', '#5d574f', '#77706a', '#b9b0a0', '#3d3c45', '#ef6f5e', '#a8443a', '#f2b843', '#f2d36b', '#9a7a52', '#8cbf63', '#5c8f3a', '#5a8bd6', '#9a7fd1', '#5f4b9a'] },
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
export const look = { palette: 'neon', skins: {} };
try { Object.assign(look, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* storage off */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(look)); } catch { /* storage off */ } };

// The sprite to draw for a name: its alternate when that object wears its other skin.
const ALT = Object.fromEntries(SKINS.flatMap(s => s.sprites.map(n => [n, s.id])));
export const skinned = name => (ALT[name] && look.skins[ALT[name]] ? name + 'Alt' : name);
export const altSkin = id => !!look.skins[id];

const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lum = ([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
const SLOT_OF = Object.fromEntries(NEON.map((h, i) => [h, i]));
// A slot colour takes the palette's own; a colour off the sixteen (a shadow's rgba) takes the slot nearest in lightness.
function mapHex(hex, p) {
  if (hex in SLOT_OF) return p.colors[SLOT_OF[hex]];
  const l = lum(rgb(hex)), i = NEON.reduce((bi, h, k) => Math.abs(lum(rgb(h)) - l) < Math.abs(lum(rgb(NEON[bi])) - l) ? k : bi, 0);
  return p.colors[i];
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
