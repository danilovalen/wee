// Looks (registers 612, 613): palettes and alternate skins, bought with stars. A palette recolours
// everything at once: each colour the game paints is mapped onto the palette as it is set on a canvas,
// and the page's CSS tokens are mapped the same way. The neon lab look (602) is the identity.

// The neon lab's greys from darkest to lightest: a grey is mapped by its rank here, so a palette with
// fewer greys keeps their order (floor under walls under text).
const NEON_GREYS = ['#19181a', '#221f22', '#2d2a2e', '#363337', '#403e41', '#4d4b4e', '#5b595c', '#666466', '#727072', '#939293', '#c1c0c0', '#fcfcfa'];

// greys: dark to light, in the order the neon greys map onto them (a light palette lists its paper
// first). hues: where a saturated colour goes, the nearest one; without hues it is mapped by its lightness.
export const PALETTES = [
  { id: 'neon', name: 'Neon lab', cost: 0 },
  { id: 'gameboy', name: 'Pocket', cost: 3, greys: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'] },
  { id: 'pico8', name: 'Fantasy', cost: 8, greys: ['#000000', '#1d2b53', '#5f574f', '#c2c3c7', '#fff1e8'], hues: ['#7e2553', '#008751', '#ab5236', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'] },
  { id: 'cga', name: 'CGA', cost: 14, greys: ['#000000', '#555555', '#aaaaaa', '#ffffff'], hues: ['#0000aa', '#00aa00', '#00aaaa', '#aa0000', '#aa00aa', '#aa5500', '#5555ff', '#55ff55', '#55ffff', '#ff5555', '#ff55ff', '#ffff55'] },
  { id: 'c64', name: 'Breadbin', cost: 20, greys: ['#000000', '#626262', '#898989', '#adadad', '#ffffff'], hues: ['#9f4e44', '#cb7e75', '#6d5412', '#a1683c', '#c9d487', '#9ae29b', '#5cab5e', '#6abfc6', '#887ecb', '#50459b', '#a057a3'] },
  { id: 'paper', name: 'Paper', cost: 28, greys: ['#f3efe6', '#e9e3d6', '#ddd5c4', '#c9c0ac', '#a59e8f', '#3d3c45'], hues: ['#ef6f5e', '#3bb3a6', '#f2b843', '#5a8bd6', '#8cbf63', '#9a7fd1', '#e7709d'] },
];

// The objects that have an alternate skin, each with the sprites it swaps and its cost.
export const SKINS = [
  { id: 'hero', name: 'Hero', cost: 2, sprites: ['blob'] },
  { id: 'berry', name: 'Berry', cost: 4, sprites: ['berry'] },
  { id: 'block', name: 'Block', cost: 6, sprites: ['wallFace'] },
  { id: 'box', name: 'Box', cost: 9, sprites: ['box'] },
  { id: 'door', name: 'Door', cost: 12, sprites: ['doorShut', 'doorOpen'] },
  { id: 'switch', name: 'Switch', cost: 16, sprites: ['switchOff', 'switchOn'] },
  { id: 'button', name: 'Button', cost: 18, sprites: ['buttonUp', 'buttonDown'] },
  { id: 'laser', name: 'Laser', cost: 24, sprites: ['laser'] },
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
const dist = (a, b) => { const m = (a[0] + b[0]) / 2, d = a.map((v, i) => v - b[i]); return (2 + m / 256) * d[0] ** 2 + 4 * d[1] ** 2 + (2 + (255 - m) / 256) * d[2] ** 2; };
const NEON_LUM = NEON_GREYS.map(h => lum(rgb(h)));

function mapHex(hex, p) {
  const c = rgb(hex), sat = (Math.max(...c) - Math.min(...c)) / 255;
  if (p.hues && sat > 0.22) return p.hues.reduce((best, h) => dist(rgb(h), c) < dist(rgb(best), c) ? h : best);
  // A grey (or any colour on a palette without hues) takes the rank of the neon grey nearest in lightness.
  const l = lum(c), rank = NEON_LUM.reduce((bi, v, i) => Math.abs(v - l) < Math.abs(NEON_LUM[bi] - l) ? i : bi, 0);
  return p.greys[Math.round(rank * (p.greys.length - 1) / (NEON_GREYS.length - 1))];
}
const cache = new Map();
// Any CSS colour string a canvas or a token takes: #rgb, #rrggbb or rgb()/rgba(); anything else passes.
export function paint(v, p = current()) {
  if (!p || !p.greys || typeof v !== 'string') return v;
  const k = p.id + v;
  if (cache.has(k)) return cache.get(k);
  let out = v, m;
  if (/^#[0-9a-f]{6}$/i.test(v)) out = mapHex(v.toLowerCase(), p);
  else if (/^#[0-9a-f]{3}$/i.test(v)) out = mapHex('#' + [...v.slice(1)].map(x => x + x).join('').toLowerCase(), p);
  else if ((m = v.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/))) {
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
  for (const t of TOKENS) { if (p.greys && base[t]) root.style.setProperty(t, paint(base[t], p)); else root.style.removeProperty(t); }
  root.dataset.palette = p.id;
}

export function setPalette(id) { look.palette = id; save(); applyPalette(); dispatchEvent(new CustomEvent('wee:look')); }
export function setSkin(id, alt) { if (alt) look.skins[id] = true; else delete look.skins[id]; save(); dispatchEvent(new CustomEvent('wee:look')); }
