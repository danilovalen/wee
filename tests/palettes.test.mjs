// Every palette keeps its things apart (register 620): text reads on the page, a wall stands off the floor,
// and the blob, the berry and a door stand off the walls and the floor. Measured as WCAG contrast ratios.
import { suite } from './lib.mjs';
import { PALETTES, paint } from '../src/view/look.js';

const { check, done } = suite('palettes');
const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const L = h => { const [r, g, b] = [1, 3, 5].map(i => lin(parseInt(h.slice(i, i + 2), 16))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const NEON = { paper: '#221f22', floor: '#2d2a2e', wall: '#5b595c', text: '#fcfcfa', blob: '#a9dc76', berry: '#78dce8', door: '#ff6188' };
for (const p of PALETTES) {
  const c = Object.fromEntries(Object.entries(NEON).map(([k, v]) => [k, p.greys ? paint(v, p) : v]));
  const low = [['text', 'paper', 4.5], ['wall', 'floor', 1.5], ...['blob', 'berry', 'door'].flatMap(f => [[f, 'floor', 1.5], [f, 'wall', 1.3]])].filter(([a, b, min]) => ratio(c[a], c[b]) < min);
  check(`${p.name} keeps its things apart`, !low.length, low.map(([a, b]) => `${a} ${c[a]} on ${b} ${c[b]}: ${ratio(c[a], c[b]).toFixed(2)}`).join('; '));
}
done();
