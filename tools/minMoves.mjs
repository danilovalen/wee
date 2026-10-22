// Proves, within a size cap, whether a level can be won in K moves or fewer: every room of every shape
// up to --cells tiles (w <= h; the rules turn the same either way round), every start and goal, and
// every way to fill the other tiles from the level's palette, lasers and one-ways in all four
// directions and pushable where the level says (register 364). Rooms are built as the room search
// builds them. --pieces N caps the pieces placed, blocks included, so bigger rooms can be covered;
// a room needing more pieces, or a second colour, is not covered. Prints the first win, or says none.
// Usage: node tools/minMoves.mjs <level> [--moves 3] [--cells 12] [--pieces N] [--count] [--part i/n]
import { check, placementErrors, colouringsOf, pushingsOf } from '../src/campaign/rules.js';
import { allShortest } from '../src/campaign/robot.js';
import { LEVELS } from '../src/level/campaign.js';
import { searcher } from './roomSearch.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const base = LEVELS.find(l => l.id === process.argv[2]);
if (!base) { console.log('Usage: node tools/minMoves.mjs <level> [--moves 3] [--cells 12] [--pieces N] [--count] [--part i/n]'); process.exit(1); }
const K = +arg('--moves', 3), cap = +arg('--cells', 12), [part, parts] = arg('--part', '0/1').split('/').map(Number);
const def = { ...base, steps: { ...base.steps, max: K } };
const { make, show } = searcher(def, 1);
const DIRS = ['up', 'right', 'down', 'left'];
// What one tile can hold: one palette element, in each direction it can face, in the level's first colour.
const VALUES = Object.keys(def.palette).flatMap(el => el === 'gate' ? DIRS.map(d => [el, d]) : el === 'laser' ? DIRS.flatMap(d => pushingsOf(def, 'laser').map(p => [el, d, p ? 'crate' : null])) : [[el, null]]);
const need = Object.entries(def.palette).map(([el, [min]]) => [el, min]);
const maxPieces = Math.min(+arg('--pieces', Infinity), cap);

const shapes = [];
for (let w = 1; w <= cap; w++) for (let h = w; w * h <= cap; h++) if (w * h >= 2) shapes.push([w, h]);
const choose = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1); return c; };
const total = shapes.reduce((t, [w, h]) => { const n = w * h; let r = 0; for (let c = 0; c <= Math.min(maxPieces, n - 2); c++) r += choose(n - 2, c) * VALUES.length ** c; return t + n * (n - 1) * r; }, 0);
if (process.argv.includes('--count')) { console.log(`level ${base.id}: ${VALUES.length} tile kinds, ${shapes.length} shapes, ${total} rooms up to ${cap} tiles${isFinite(maxPieces) ? ` and ${maxPieces} pieces` : ''}`); process.exit(0); }

// Every k-subset of 0..n-1, in order.
function* subsets(n, k, from = 0, acc = []) {
  if (acc.length === k) { yield acc; return; }
  for (let i = from; i <= n - (k - acc.length); i++) yield* subsets(n, k, i + 1, [...acc, i]);
}
let tried = 0, job = 0;
const t0 = Date.now();
for (const [w, h] of shapes) {
  const n = w * h;
  for (let s = 0; s < n; s++) for (let g = 0; g < n; g++) {
    if (g === s || job++ % parts !== part) continue;
    const others = [...Array(n).keys()].filter(i => i !== s && i !== g);
    for (let c = 0; c <= Math.min(maxPieces, others.length); c++) for (const at of subsets(others.length, c)) {
      const idx = new Array(c).fill(0);
      for (;;) {
        const items = at.map((o, k) => { const [el, d, crate] = VALUES[idx[k]], i = others[o]; return [el, i % w, Math.floor(i / w), d, el === 'laser' ? crate : colouringsOf(def, el)[0] || null]; });
        if (need.every(([el, min]) => items.filter(it => it[0] === el).length >= min)) {
          const r = make({ w, h, start: { x: s % w, y: Math.floor(s / w) }, goal: { x: g % w, y: Math.floor(g / w) }, items });
          tried++;
          // Only a room whose goal is K moves or fewer away is worth the full judgement.
          if (!placementErrors(def, r).length && allShortest(r, { maxDepth: K, maxPaths: 1 }).status === 'solved') {
            const v = check(def, r);
            if (v.won) { console.log(`level ${base.id}: WON in ${v.length} moves, ${w}x${h}: ${show(r)}`); process.exit(0); }
          }
        }
        let k = 0;
        while (k < c && ++idx[k] === VALUES.length) idx[k++] = 0;
        if (k === c) break;
      }
    }
  }
}
console.log(`level ${base.id}: no win in ${K} moves or fewer among ${tried} rooms (part ${part}/${parts}, every shape up to ${cap} tiles${isFinite(maxPieces) ? `, up to ${maxPieces} pieces` : ''}) in ${Math.round((Date.now() - t0) / 1000)}s.`);
