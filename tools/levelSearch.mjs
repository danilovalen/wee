// Searches for rooms that win a campaign level, and says what it searched when it finds none.
// Each climb starts from a known room, a near-miss it kept, or a random room (tools/climb.mjs);
// after a win it keeps going for fewer moves and a smaller room. Usage: node tools/levelSearch.mjs <level> [--seconds S] [--seed N] [--all]
// --all keeps going and prints every distinct win with its length; otherwise it stops at one.
// --require a,b and --steps min,max try the level with other requirements or other bounds on moves;
// --palette 'relay=0;door=1,1' tries it with other piece limits (min, optional max);
// --from 'rows' and --seeded add rooms that a fifth of the climbs start from.
import { LEVELS } from '../src/level/campaign.js';
import { search } from './climb.mjs';
import { roomsOf } from '../tests/knownRooms.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const base = LEVELS.find(l => l.id === process.argv[2]);
const pal = arg('--palette') && Object.fromEntries(arg('--palette').split(';').map(kv => { const [k, v] = kv.split('='); const [lo, hi] = v.split(','); return [k, [+lo, hi == null || hi === '' ? null : +hi]]; }));
const def = base && { ...base, ...(pal ? { palette: { ...base.palette, ...pal } } : {}), ...(arg('--require') ? { require: arg('--require').split(',') } : {}), ...(arg('--steps') ? { steps: { ...base.steps, min: +arg('--steps').split(',')[0], max: +arg('--steps').split(',')[1] } } : {}) };
if (!def) { console.log('Usage: node tools/levelSearch.mjs <level> [--seconds S] [--seed N] [--all]'); process.exit(1); }
const seconds = +arg('--seconds', 60), all = process.argv.includes('--all');
// --from 'rows ...' adds a room to climb from (the legend of roomSearch's show()); --seeded adds the
// level's known winning rooms (tests/knownRooms.mjs). The climb itself is tools/climb.mjs.
const from = [...(arg('--from') ? [arg('--from').split(' ')] : []), ...(process.argv.includes('--seeded') ? roomsOf(def.id) : [])];
let found = 0;
const { climbs, best } = search(def, {
  seconds, seed: +arg('--seed', 1), from, until: () => !all && found > 0,
  see: (r, v, key) => { found++; console.log(`WIN ${v.length} moves, ${r.w}x${r.h}, area ${v.area}: ${key}`); },
});
if (!found) console.log(`Not found in ${climbs} climbs over ${seconds}s (rooms 3x3 up to 16 a side and 120 tiles, start and goal anywhere, half walled in around the start; closest penalty ${best.toFixed(2)}). That is not proof it cannot be done.`);
else console.log(`${found} found in ${climbs} climbs.`);
