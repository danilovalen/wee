// Proves, within a size cap, whether a level can be won in K moves or fewer: it tries every
// room of every shape up to --cells tiles (w <= h; the rules turn the same either way round),
// every placement of the start and the goal, and every tile from the level's palette, and
// prints the first win it finds. A room bigger than the cap is not covered.
// Usage: node tools/minMoves.mjs <level> [--moves 3] [--cells 12] [--count] [--part i/n]
import { check, placementErrors } from '../src/campaign/rules.js';
import { emptyLevel } from '../src/level/format.js';
import { allShortest } from '../src/campaign/robot.js';
import { LEVELS } from '../src/level/campaign.js';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const base = LEVELS.find(l => l.id === process.argv[2]);
const K = +arg('--moves', 3), cap = +arg('--cells', 12), [part, parts] = arg('--part', '0/1').split('/').map(Number);
// What a tile can hold in this level: nothing, or one palette element.
const TILE = { block: 'wall', toggle: 'toggle:red', door: 'door:red', button: 'button:red', box: 'box' };
const values = ['', ...Object.keys(base.palette).map(el => TILE[el])];
const need = values.map(v => { const el = Object.keys(TILE).find(k => TILE[k] === v); return el && base.palette[el] ? base.palette[el][0] : 0; });
const def = { ...base, steps: { ...base.steps, min: 1, max: K } };

const shapes = [];
for (let w = 1; w <= cap; w++) for (let h = w; w * h <= cap; h++) if (w * h >= 2) shapes.push([w, h]);
const total = shapes.reduce((n, [w, h]) => n + values.length ** (w * h - 2) * w * h * (w * h - 1), 0);
if (process.argv.includes('--count')) { console.log(`level ${base.id}: ${values.length} tile kinds, ${shapes.length} shapes, ${total} rooms up to ${cap} tiles`); process.exit(0); }

let tried = 0, job = 0;
const t0 = Date.now();
for (const [w, h] of shapes) {
  const n = w * h, free = n - 2;
  for (let s = 0; s < n; s++) for (let g = 0; g < n; g++) {
    if (g === s || job++ % parts !== part) continue;
    const others = [...Array(n).keys()].filter(i => i !== s && i !== g), idx = new Array(free).fill(0);
    for (;;) {
      // Too few of a required element: skip before building the room.
      const have = new Array(values.length).fill(0);
      for (let k = 0; k < free; k++) have[idx[k]]++;
      if (need.every((m, v) => have[v] >= m)) {
      const l = emptyLevel(w, h);
      for (const p of Object.keys(l.powers)) l.powers[p] = false;
      l.start = { x: s % w, y: Math.floor(s / w) }; l.cells[g] = 'goal';
      for (let k = 0; k < free; k++) {
        const v = values[idx[k]], i = others[k];
        if (v === 'box') l.entities.push({ kind: 'box', x: i % w, y: Math.floor(i / w), dir: 1, mode: 'input' }); else l.cells[i] = v;
      }
      tried++;
      // Only a room whose goal is K moves or fewer away is worth the full judgement.
      if (!placementErrors(def, l).length && allShortest(l, { maxDepth: K, maxPaths: 1 }).status === 'solved') {
        const v = check(def, l);
        if (v.won) {
          const show = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => { const i = y * w + x, c = l.cells[i]; return i === s ? 'P' : l.entities.some(e => e.x === x && e.y === y) ? 'B' : c === 'wall' ? '#' : c === 'goal' ? 'G' : c.startsWith('toggle') ? 't' : c.startsWith('door') ? 'D' : c.startsWith('button') ? 'o' : '.'; }).join('')).join(' ');
          console.log(`level ${base.id}: WON in ${v.length} moves, ${w}x${h}: ${show}`);
          process.exit(0);
        }
      }
      }
      let k = 0;
      while (k < free && ++idx[k] === values.length) idx[k++] = 0;
      if (k === free) break;
    }
  }
}
console.log(`level ${base.id}: no win in ${K} moves or fewer among ${tried} rooms (part ${part}/${parts}, every shape up to ${cap} tiles) in ${Math.round((Date.now() - t0) / 1000)}s.`);
