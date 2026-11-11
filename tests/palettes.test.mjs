// Every palette keeps its things apart (register 620): text reads on the page, a wall stands off the floor,
// and the blob, the berry and a door stand off the walls and the floor. Measured as WCAG contrast ratios.
// Sixteen colours (register 810): the source writes only the twenty slot colours, every palette has twenty,
// and no shade comes out lighter than what it shades (808).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { suite } from './lib.mjs';
import { PALETTES, NEON, SLOTS, SHADES, paint, look } from '../src/view/look.js';
import { FIXED, resolve, lt, dk, lineOf } from '../src/view/crayon.js';

const { check, done } = suite('palettes');
const mixHex = (a, b, t) => '#' + [1, 3, 5].map(i => { const v = parseInt(a.slice(i, i + 2), 16), w = parseInt(b.slice(i, i + 2), 16); return Math.round(v + (w - v) * t).toString(16).padStart(2, '0'); }).join('');
const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const L = h => { const [r, g, b] = [1, 3, 5].map(i => lin(parseInt(h.slice(i, i + 2), 16))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const S = Object.fromEntries(SLOTS.map((s, i) => [s, NEON[i]]));
// Every rule colour is a role (register 843): the blob is violet, a berry blue, and a door any of the six.
const HUE = ['red', 'orange', 'yellow', 'green', 'blue', 'violet'];
const ROLE = { paper: S.void, floor: S.floor, wall: S.wall, text: S.text, ...Object.fromEntries(HUE.map(h => [h, S[h]])) };
// How far apart two colours look (CIE76): a palette may move hues about, but no two rule colours may come close.
const lab = h => { const [r, g, b] = [1, 3, 5].map(i => lin(parseInt(h.slice(i, i + 2), 16))), f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116, [x, y, z] = [(0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883].map(f); return [116 * y - 16, 500 * (x - y), 200 * (y - z)]; };
const apart = (a, b) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));
const NEAR = 28;
for (const p of PALETTES) {
  const c = Object.fromEntries(Object.entries(ROLE).map(([k, v]) => [k, paint(v, p)]));
  // A piece stands off a wall by its colour or by its line, the dark tint drawn round it (docs/THEME.md rule 2).
  const off = (a, b) => b === 'wall' && HUE.includes(a) ? Math.max(ratio(c[a], c[b]), ratio(lineOf(S[a]).slice(0, 7), c[b])) : ratio(c[a], c[b]);
  look.palette = p.id;
  const low = [['text', 'paper', 4.5], ['wall', 'floor', 1.5], ...HUE.flatMap(f => [[f, 'floor', 1.5], [f, 'wall', 1.3]])].filter(([a, b, min]) => off(a, b) < min);
  check(`${p.name} keeps its things apart`, !low.length, low.map(([a, b]) => `${a} ${c[a]} on ${b} ${c[b]}: ${ratio(c[a], c[b]).toFixed(2)}`).join('; '));
  const near = HUE.flatMap((a, i) => HUE.slice(i + 1).map(b => [a, b, apart(c[a], c[b])])).filter(x => x[2] < NEAR);
  check(`${p.name} keeps its six rule colours apart from each other (843)`, !near.length, near.map(([a, b, d]) => `${a} and ${b}: ${d.toFixed(0)}`).join('; '));
  check(`${p.name} has twenty colours, one per slot`, p.colors.length === SLOTS.length && p.colors.every(h => /^#[0-9a-f]{6}$/.test(h)), String(p.colors.length));
  const lit = SHADES.filter(([s, b]) => L(p.colors[SLOTS.indexOf(s)]) > L(p.colors[SLOTS.indexOf(b)]));
  check(`${p.name} keeps every shade no lighter than what it shades`, !lit.length, lit.map(([s, b]) => `${s} over ${b}`).join(', '));
  check(`${p.name} paints each slot colour as its own`, NEON.every((h, i) => paint(h, p) === p.colors[i]));
}
// Every colour the source writes is one of the twenty; the palettes themselves live in look.js.
const files = [];
const walk = d => { for (const f of readdirSync(d)) { const p = `${d}/${f}`; if (statSync(p).isDirectory()) walk(p); else if (/\.(js|css|html)$/.test(f)) files.push(p); } };
walk(new URL('../src', import.meta.url).pathname);
files.push(new URL('../style.css', import.meta.url).pathname, new URL('../index.html', import.meta.url).pathname);
const off = [];
for (const f of files.filter(f => !f.endsWith('src/view/look.js'))) for (const m of readFileSync(f, 'utf8').matchAll(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b(?![0-9a-fA-F])/g)) {
  const h = m[0].length === 4 ? '#' + [...m[0].slice(1)].map(x => x + x).join('') : m[0].toLowerCase();
  if (!NEON.includes(h) && !(f.endsWith('src/view/crayon.js') && Object.values(FIXED).includes(h))) off.push(`${m[0]} in ${f.split('/').slice(-2).join('/')}`);
}
// The crayon look's own few (the line's dark, white, an eye, a cheek) are named in one place, crayon.js FIXED.
check('the source writes only the twenty slot colours, and the look\'s own named few (810, 811)', !off.length, off.slice(0, 8).join(', '));
// The page's own CSS is recoloured through its tokens only, so a colour written as rgb() there is never recoloured:
// only black and white, the same on every palette, may be (the menu's fade stayed the neon page's dark).
const css = ['style.css', 'index.html'].flatMap(f => [...readFileSync(new URL('../' + f, import.meta.url), 'utf8').matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)].map(m => `${m[1]},${m[2]},${m[3]}`)).filter(c => c !== '0,0,0' && c !== '255,255,255');
check('the page writes no fixed colour as rgb(), only black or white (810, 811)', !css.length, css.join(' | '));
// And a colour code there sits only in a token's own definition, which applyPalette recolours (the logo stayed neon).
const sheet = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const loose = [...sheet.matchAll(/#[0-9a-fA-F]{3,6}\b/g)].filter(m => !/--[\w-]+\s*:\s*$/.test(sheet.slice(Math.max(0, m.index - 40), m.index))).map(m => `${m[0]} at line ${sheet.slice(0, m.index).split('\n').length}`);
check('the page writes colour codes only in its tokens (810, 811)', !loose.length, loose.slice(0, 6).join(', '));
// Every bevel in the sprites (register 811): a shade and a light are tones worked out from the face itself
// (crayon.js), so on every palette the light is lighter than the face and the shade darker, in the face's hue.
// Checked on what is painted: every slot colour of every palette, toned both ways.
const lum = h => L(h.slice(0, 7));
for (const p of PALETTES) {
  look.palette = p.id;
  const flat = NEON.filter(h => !(lum(resolve(lt(h, 0.4))) >= lum(resolve(h)) && lum(resolve(h)) >= lum(resolve(dk(h, 0.25)))));
  check(`${p.name} keeps every bevel light over face over shade (811)`, !flat.length, flat.join(', '));
}
look.palette = PALETTES[0].id;
// A colour mixed at run time keeps its hue (811): a body darkened or lightened the way a door's rail and glint are
// lands on its own shade, its body or a grey on every palette, never on another colour's.
const HUES = ['red', 'orange', 'yellow', 'green', 'blue', 'violet'], GREYS = SLOTS.slice(0, 8);
for (const p of PALETTES.filter(p => p.colors !== NEON)) {
  const stray = HUES.flatMap(h => [[h, S.void], [h, S.hi], [h, S.text]]).filter(([h, to]) => { const got = paint(mixHex(S[h], to, 0.45), p), ok = [h, h + 'Shade', ...GREYS].map(k => p.colors[SLOTS.indexOf(k)]); return !ok.includes(got); }).map(([h, to]) => `${h} toward ${to}`);
  check(`${p.name} keeps a darkened colour in its own hue (811)`, !stray.length, stray.join(', '));
}
done();
