// Searches for rooms that win a campaign level, and says what it searched when it finds none.
// Each try starts from a random room (tools/roomSearch.mjs) and keeps small changes that do
// not score worse. Usage: node tools/levelSearch.mjs <level> [--seconds S] [--seed N] [--all]
// --all keeps going and prints every distinct win with its length; otherwise it stops at one.
// --require a,b and --steps min,max try the level with other requirements or other bounds on moves.
import { check } from '../src/campaign/rules.js';
import { LEVELS } from '../src/level/campaign.js';
import { searcher } from './roomSearch.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const base = LEVELS.find(l => l.id === process.argv[2]);
const def = base && { ...base, ...(arg('--require') ? { require: arg('--require').split(',') } : {}), ...(arg('--steps') ? { steps: { ...base.steps, min: +arg('--steps').split(',')[0], max: +arg('--steps').split(',')[1] } } : {}) };
if (!def) { console.log('Usage: node tools/levelSearch.mjs <level> [--seconds S] [--seed N] [--all]'); process.exit(1); }
const seconds = +arg('--seconds', 60), all = process.argv.includes('--all');
const { random, mutate, penalty, make, show } = searcher(def, +arg('--seed', 1));

const end = Date.now() + seconds * 1000, seen = new Set();
let tries = 0, best = Infinity;
while (Date.now() < end) {
  let g = random(), s = penalty(g); tries++;
  for (let i = 0; i < 300 && s > 0 && Date.now() < end; i++) { const h = mutate(g), t = penalty(h); if (t <= s) { g = h; s = t; } }
  best = Math.min(best, s);
  if (s !== 0) continue;
  const r = make(g), v = check(def, r);
  if (!v.won || seen.has(show(r))) continue;
  seen.add(show(r));
  console.log(`WIN ${v.length} moves, ${r.w}x${r.h}, area ${v.area}: ${show(r)}`);
  if (!all) break;
}
if (!seen.size) console.log(`Not found in ${tries} climbs over ${seconds}s (rooms 3x3 to 10x10, start and goal anywhere, half walled in around the start; closest penalty ${best}). That is not proof it cannot be done.`);
else console.log(`${seen.size} found in ${tries} climbs over ${seconds}s.`);
