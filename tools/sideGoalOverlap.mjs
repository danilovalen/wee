// Side goals the main goals already give (owner, 2026-11-04): for each listed level, collect distinct
// winning rooms (every win meets the required goals) and count how many also meet each side goal.
// A side goal met by nearly every win comes free with the main goal. A sample, not a proof: the search
// leans to short, small rooms. Usage: node tools/sideGoalOverlap.mjs [level ...] [--seconds S] [--seed N]
import { search } from './climb.mjs';
import { arg, levelDef, startRooms } from './levelDef.mjs';
import { LEVELS } from '../src/level/campaign.js';
import { listed, optionalResults } from '../src/campaign/rules.js';

const seconds = +arg('--seconds', 40), seed = +arg('--seed', 1);
const ids = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !(all[i - 1] || '').startsWith('--'));
for (const id of ids.length ? ids : LEVELS.filter(listed).map(l => l.id)) {
  const def = levelDef(id), counts = new Map();
  let wins = 0;
  search(def, { seconds, seed, from: startRooms(id), until: () => false, see: (r, v) => {
    wins++;
    for (const o of optionalResults(def, v)) if (o.id !== 'mix') counts.set(o.id, (counts.get(o.id) || 0) + (o.met ? 1 : 0));
  } });
  const parts = [...counts].map(([k, n]) => `${k} ${wins ? Math.round(100 * n / wins) : 0}%`);
  console.log(`${id}\twins ${wins}\t${parts.join('\t')}`);
}
