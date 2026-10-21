// Measures the room search (register 364): per level and seed, how long the first win took, how many
// distinct wins it found, and the fewest moves and smallest area among them. Cold: no known rooms.
// Usage: node tools/searchBench.mjs [--engine old|new] [--levels 15,16] [--seeds 1,2] [--seconds S]
import { check } from '../src/campaign/rules.js';
import { LEVELS } from '../src/level/campaign.js';
import { searcher } from './roomSearch.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const engine = arg('--engine', 'new'), seconds = +arg('--seconds', 30);
const ids = arg('--levels', '15,16,17,18,19').split(','), seeds = arg('--seeds', '1,2,3').split(',').map(Number);

// The search as it was before register 364: a fresh random room, 300 single edits, stop at a win.
function old(def, seed, secs, see) {
  const { random, mutate, penalty, make, show } = searcher(def, seed, { aim: false }), end = Date.now() + secs * 1000;
  while (Date.now() < end) {
    let g = random(), s = penalty(g);
    for (let i = 0; i < 300 && s > 0 && Date.now() < end; i++) { const h = mutate(g), t = penalty(h); if (t <= s) { g = h; s = t; } }
    if (s === 0) { const r = make(g), v = check(def, r); if (v.won) see(show(r), v.length, r.w * r.h); }
  }
}
const run = engine === 'old' ? old : (await import('./climb.mjs')).benchRun;
const rows = [];
for (const id of ids) {
  const def = LEVELS.find(l => l.id === id);
  for (const seed of seeds) {
    const t0 = Date.now(), wins = new Map();
    let first = null;
    run(def, seed, seconds, (key, moves, area) => { if (first === null) first = (Date.now() - t0) / 1000; if (!wins.has(key)) wins.set(key, { moves, area }); });
    const all = [...wins.values()];
    rows.push({ id, seed, first, wins: all.length, moves: all.length ? Math.min(...all.map(w => w.moves)) : null, area: all.length ? Math.min(...all.map(w => w.area)) : null });
    const r = rows.at(-1);
    console.log(`level ${id} seed ${seed}: ${r.wins ? `first win ${r.first.toFixed(1)}s, ${r.wins} wins, fewest moves ${r.moves}, smallest area ${r.area}` : 'no win'}`);
  }
}
const won = rows.filter(r => r.wins);
console.log(`${engine}: ${won.length}/${rows.length} runs won in ${seconds}s each` + (won.length ? `; median first win ${won.map(r => r.first).sort((a, b) => a - b)[Math.floor(won.length / 2)].toFixed(1)}s` : ''));
