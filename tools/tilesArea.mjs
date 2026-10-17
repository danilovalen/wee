// Measures, per level, whether fewer tiles and a smaller area pull the same way: it climbs
// toward winning rooms under several weightings of the two, keeps every distinct win, and
// prints the Pareto front (the wins no other win beats on both). One room on the front means
// the best at one is the best at the other. Found, not proven: the front is the best seen.
// Usage: node tools/tilesArea.mjs [level ...] [--seconds S] [--seed N]
// --seconds is per weighting per level (default 30); there are five weightings.
import { check, placed } from '../src/campaign/rules.js';
import { LEVELS } from '../src/level/campaign.js';
import { searcher } from './roomSearch.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const flags = new Set(['--seconds', '--seed']);
const ids = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !flags.has(all[i - 1]));
const seconds = +arg('--seconds', 30), seed = +arg('--seed', 1);
// What counts as a tile: everything placed, the start and the goal excepted.
const tilesOf = (def, r) => Object.values(placed(def, r).by).reduce((n, l) => n + l.length, 0);
const WEIGHTS = [['tiles first', (t, a) => t * 1000 + a], ['area first', (t, a) => a * 1000 + t], ['even', (t, a) => t + a], ['tiles x3', (t, a) => 3 * t + a], ['area x3', (t, a) => t + 3 * a]];

for (const def of LEVELS.filter(l => !ids.length || ids.includes(l.id))) {
  const s = searcher(def, seed), wins = new Map();
  const score = g => { const p = s.penalty(g); if (p) return { p }; const r = s.make(g); return { p, t: tilesOf(def, r), a: r.w * r.h }; };
  for (const [, f] of WEIGHTS) {
    const end = Date.now() + seconds * 1000;
    while (Date.now() < end) {
      let g = s.random(), c = score(g);
      for (let i = 0; i < 1500 && Date.now() < end; i++) {
        const h = s.mutate(g), d = score(h);
        const better = d.p < c.p || (d.p === c.p && (d.p > 0 || f(d.t, d.a) <= f(c.t, c.a)));
        if (!better) continue;
        g = h; c = d;
        if (c.p) continue;
        const r = s.make(g), key = s.show(r);
        if (!wins.has(key) && check(def, r).won) wins.set(key, { tiles: c.t, area: c.a, size: `${r.w}x${r.h}`, room: key });
      }
    }
  }
  const all = [...wins.values()].sort((x, y) => x.tiles - y.tiles || x.area - y.area);
  const front = all.filter((w, i) => all.slice(0, i).every(o => o.area > w.area));
  console.log(`\nLevel ${def.id}: ${all.length} distinct wins found in ${WEIGHTS.length} x ${seconds}s.`);
  if (!all.length) { console.log('  None found. That is not proof there are none.'); continue; }
  console.log(`  Fewest tiles found: ${all[0].tiles}. Smallest area found: ${Math.min(...all.map(w => w.area))}.`);
  console.log(front.length === 1 ? '  One room is best at both: tiles and area pull the same way here.' : `  ${front.length} rooms trade one for the other:`);
  for (const w of front) console.log(`  ${w.tiles} tiles, area ${w.area} (${w.size}): ${w.room}`);
}
