// Every palette keeps its things apart (register 620): text reads on the page, a wall stands off the floor,
// and the blob, the berry and a door stand off the walls and the floor. Measured as WCAG contrast ratios.
// Sixteen colours (register 810): the source writes only the sixteen slot colours, every palette has sixteen,
// and no shade comes out lighter than what it shades (808).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { suite } from './lib.mjs';
import { PALETTES, NEON, SLOTS, SHADES, paint } from '../src/view/look.js';

const { check, done } = suite('palettes');
const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const L = h => { const [r, g, b] = [1, 3, 5].map(i => lin(parseInt(h.slice(i, i + 2), 16))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const S = Object.fromEntries(SLOTS.map((s, i) => [s, NEON[i]]));
const ROLE = { paper: S.void, floor: S.floor, wall: S.wall, text: S.text, blob: S.violet, berry: S.blue, door: S.red };
for (const p of PALETTES) {
  const c = Object.fromEntries(Object.entries(ROLE).map(([k, v]) => [k, paint(v, p)]));
  const low = [['text', 'paper', 4.5], ['wall', 'floor', 1.5], ...['blob', 'berry', 'door'].flatMap(f => [[f, 'floor', 1.5], [f, 'wall', 1.3]])].filter(([a, b, min]) => ratio(c[a], c[b]) < min);
  check(`${p.name} keeps its things apart`, !low.length, low.map(([a, b]) => `${a} ${c[a]} on ${b} ${c[b]}: ${ratio(c[a], c[b]).toFixed(2)}`).join('; '));
  check(`${p.name} has sixteen colours, one per slot`, p.colors.length === SLOTS.length && p.colors.every(h => /^#[0-9a-f]{6}$/.test(h)), String(p.colors.length));
  const lit = SHADES.filter(([s, b]) => L(p.colors[SLOTS.indexOf(s)]) > L(p.colors[SLOTS.indexOf(b)]));
  check(`${p.name} keeps every shade no lighter than what it shades`, !lit.length, lit.map(([s, b]) => `${s} over ${b}`).join(', '));
  check(`${p.name} paints each slot colour as its own`, NEON.every((h, i) => paint(h, p) === p.colors[i]));
}
// Every colour the source writes is one of the sixteen; the palettes themselves live in look.js.
const files = [];
const walk = d => { for (const f of readdirSync(d)) { const p = `${d}/${f}`; if (statSync(p).isDirectory()) walk(p); else if (/\.(js|css|html)$/.test(f)) files.push(p); } };
walk(new URL('../src', import.meta.url).pathname);
files.push(new URL('../style.css', import.meta.url).pathname, new URL('../index.html', import.meta.url).pathname);
const off = [];
for (const f of files.filter(f => !f.endsWith('src/view/look.js'))) for (const m of readFileSync(f, 'utf8').matchAll(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b(?![0-9a-fA-F])/g)) {
  const h = m[0].length === 4 ? '#' + [...m[0].slice(1)].map(x => x + x).join('') : m[0].toLowerCase();
  if (!NEON.includes(h)) off.push(`${m[0]} in ${f.split('/').slice(-2).join('/')}`);
}
check('the source writes only the sixteen slot colours (810)', !off.length, off.slice(0, 8).join(', '));
// The page's own CSS is recoloured through its tokens only, so a colour written as rgb() there is never recoloured:
// only black and white, the same on every palette, may be (the menu's fade stayed the neon page's dark).
const css = ['style.css', 'index.html'].flatMap(f => [...readFileSync(new URL('../' + f, import.meta.url), 'utf8').matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)].map(m => `${m[1]},${m[2]},${m[3]}`)).filter(c => c !== '0,0,0' && c !== '255,255,255');
check('the page writes no fixed colour as rgb(), only black or white (810)', !css.length, css.join(' | '));
// And a colour code there sits only in a token's own definition, which applyPalette recolours (the logo stayed neon).
const sheet = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const loose = [...sheet.matchAll(/#[0-9a-fA-F]{3,6}\b/g)].filter(m => !/--[\w-]+\s*:\s*$/.test(sheet.slice(Math.max(0, m.index - 40), m.index))).map(m => `${m[0]} at line ${sheet.slice(0, m.index).split('\n').length}`);
check('the page writes colour codes only in its tokens (810)', !loose.length, loose.slice(0, 6).join(', '));
done();
