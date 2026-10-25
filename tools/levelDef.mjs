// A campaign level as a search sees it, changed by the command line (registers 272, 462):
// --require a,b replaces its required goals, --add a,b adds to them, --steps min,max bounds the moves,
// --palette 'relay=0;door=1,1' changes piece limits (min, optional max), --from 'rows' and --seeded
// add rooms for climbs to start from.
import { LEVELS } from '../src/level/campaign.js';
import { roomsOf } from '../tests/knownRooms.mjs';

export const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
export function levelDef(id) {
  const base = LEVELS.find(l => l.id === id);
  if (!base) return null;
  const pal = arg('--palette') && Object.fromEntries(arg('--palette').split(';').map(kv => { const [k, v] = kv.split('='); const [lo, hi] = v.split(','); return [k, [+lo, hi == null || hi === '' ? null : +hi]]; }));
  const require = arg('--require') ? arg('--require').split(',') : [...(base.require || []), ...(arg('--add') ? arg('--add').split(',') : [])];
  const steps = arg('--steps') ? { ...base.steps, min: +arg('--steps').split(',')[0], max: +arg('--steps').split(',')[1] || undefined } : base.steps;
  return { ...base, ...(pal ? { palette: { ...base.palette, ...pal } } : {}), require, steps };
}
export const startRooms = id => [...(arg('--from') ? [arg('--from').split(' ')] : []), ...(process.argv.includes('--seeded') ? roomsOf(id) : [])];
