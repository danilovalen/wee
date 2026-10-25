// Measures a campaign level (register 462): several climbs in parallel, then how many wins each
// move count had, and the smallest room found for each count. Prints a summary and one JSON line to
// keep with the register row it answers.
// Usage: node tools/measureLevel.mjs <level> [--seconds S] [--runs N] [--seed N] and levelDef.mjs's options.
// A run of its own (--worker) climbs one seed and prints its wins as JSON.
import { spawn } from 'node:child_process';
import { search } from './climb.mjs';
import { arg, levelDef, startRooms } from './levelDef.mjs';

const id = process.argv[2], def = levelDef(id);
if (!def) { console.log('Usage: node tools/measureLevel.mjs <level> [--seconds S] [--runs N] [--seed N] [--require a,b] [--add a,b] [--steps min,max] [--palette ...] [--from rows] [--seeded]'); process.exit(1); }
const seconds = +arg('--seconds', 120), seed = +arg('--seed', 1);

if (process.argv.includes('--worker')) {
  const wins = [];
  search(def, { seconds, seed, from: startRooms(def.id), see: (r, v, key) => wins.push([v.length, r.w * r.h, key]) });
  console.log(JSON.stringify(wins));
} else {
  const runs = +arg('--runs', 3), rest = process.argv.slice(3).filter((a, i, all) => !['--runs', '--seed'].includes(a) && !['--runs', '--seed'].includes(all[i - 1]));
  const one = s => new Promise(done => {
    let out = '';
    const p = spawn(process.execPath, [process.argv[1], id, ...rest, '--seed', String(s), '--worker']);
    p.stdout.on('data', d => { out += d; }); p.on('close', () => { try { done(JSON.parse(out.trim().split('\n').at(-1))); } catch { done([]); } });
  });
  const all = (await Promise.all(Array.from({ length: runs }, (_, k) => one(seed + k)))).flat();
  const counts = {}, smallest = {};
  for (const w of all) { counts[w[0]] = (counts[w[0]] || 0) + 1; if (!smallest[w[0]] || w[1] < smallest[w[0]][1]) smallest[w[0]] = w; }
  console.log(`Level ${id}: ${all.length} wins over ${runs} runs of ${seconds}s (seeds ${seed}..${seed + runs - 1}); required: ${def.require.join(', ') || 'none'}.`);
  if (!all.length) console.log('None found. That is not proof it cannot be done.');
  for (const m of Object.keys(counts).map(Number).sort((a, b) => a - b)) console.log(`  ${String(m).padStart(3)} moves: ${String(counts[m]).padStart(5)} wins, smallest ${smallest[m][1]} tiles: ${smallest[m][2]}`);
  console.log(JSON.stringify({ level: id, require: def.require, seconds, runs, seed, wins: all.length, counts, smallest }));
}
