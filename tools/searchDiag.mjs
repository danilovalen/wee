// Why the room search misses (register 335): runs the level search's own climbs and counts what
// each scored room was: refused by the palette, unsolvable, capped, solved off the move bounds,
// or solved missing a goal (and which). Usage: node tools/searchDiag.mjs <level> [--seconds S] [--seed N]
import { LEVELS } from '../src/level/campaign.js';
import { placementErrors, bounds } from '../src/campaign/rules.js';
import { REQUIREMENTS } from '../src/campaign/requirements.js';
import { allShortest } from '../src/campaign/robot.js';
import { searcher } from './roomSearch.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const def = LEVELS.find(l => l.id === process.argv[2]);
const { random, mutate, penalty, make } = searcher(def, +arg('--seed', 1));
const seconds = +arg('--seconds', 30), end = Date.now() + seconds * 1000;
const kinds = {}, missed = {}, finals = [];
let evals = 0, ms = 0;
const note = g => {
  const r = make(g), t0 = Date.now();
  let k;
  if (placementErrors(def, r).length) k = 'refused';
  else {
    const a = allShortest(r, { maxPaths: 300 });
    if (a.status !== 'solved') k = a.status;
    else {
      const { min, max } = bounds(def.steps);
      k = a.length < min || a.length > max ? 'solved, moves out of bounds' : 'solved';
      for (const id of def.require || []) if (!a.paths.slice(0, 60).every(p => REQUIREMENTS[id].judge(r, p))) missed[id] = (missed[id] || 0) + 1;
    }
  }
  ms += Date.now() - t0; evals++;
  kinds[k] = (kinds[k] || 0) + 1;
};
while (Date.now() < end) {
  let g = random(), s = penalty(g); note(g);
  for (let i = 0; i < 300 && s > 0 && Date.now() < end; i++) { const h = mutate(g), t = penalty(h); note(h); if (t <= s) { g = h; s = t; } }
  finals.push(s);
}
const pct = n => (100 * n / evals).toFixed(1) + '%';
console.log(`level ${def.id}: ${finals.length} climbs, ${evals} rooms scored, ${(ms / evals).toFixed(1)}ms each`);
for (const [k, n] of Object.entries(kinds).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${n} (${pct(n)})`);
for (const [id, n] of Object.entries(missed).sort((a, b) => b[1] - a[1])) console.log(`  missed ${id}: ${n} of the solved`);
const ends = {}; for (const s of finals) { const b = s === 0 ? '0 (win)' : s >= 1e9 ? 'refused' : s >= 1000 ? '1000+ (no win path)' : s < 5 ? 'under 5' : s < 50 ? '5 to 50' : '50 to 1000'; ends[b] = (ends[b] || 0) + 1; }
console.log('  climbs ended at: ' + Object.entries(ends).map(([b, n]) => `${b} ${n}`).join(', '));
