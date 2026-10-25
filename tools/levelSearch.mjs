// Searches for rooms that win a campaign level, and says what it searched when it finds none.
// Each climb starts from a known room, a near-miss it kept, or a random room (tools/climb.mjs);
// after a win it keeps going for fewer moves and a smaller room. Usage: node tools/levelSearch.mjs <level> [--seconds S] [--seed N] [--all]
// --all keeps going and prints every distinct win with its length; otherwise it stops at one.
// --require, --add, --steps, --palette, --from and --seeded change the level (tools/levelDef.mjs).
import { search } from './climb.mjs';
import { arg, levelDef, startRooms } from './levelDef.mjs';

const def = levelDef(process.argv[2]);
if (!def) { console.log('Usage: node tools/levelSearch.mjs <level> [--seconds S] [--seed N] [--all]'); process.exit(1); }
const seconds = +arg('--seconds', 60), all = process.argv.includes('--all');
const from = startRooms(def.id);
let found = 0;
const { climbs, best } = search(def, {
  seconds, seed: +arg('--seed', 1), from, until: () => !all && found > 0,
  see: (r, v, key) => { found++; console.log(`WIN ${v.length} moves, ${r.w}x${r.h}, area ${v.area}: ${key}`); },
});
if (!found) console.log(`Not found in ${climbs} climbs over ${seconds}s (rooms 3x3 up to 16 a side and 120 tiles, start and goal anywhere, half walled in around the start; closest penalty ${best.toFixed(2)}). That is not proof it cannot be done.`);
else console.log(`${found} found in ${climbs} climbs.`);
