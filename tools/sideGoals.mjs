// Measures a level's side goals together (registers 474, 486, 506): climbs for wins as the level
// stands and with each of its own side goals added to the required ones, then reports the smallest
// winning room, the move counts, and for every pair of side goals (the exact count and the size goal
// included) one room that meets both. A pair not found is not proof it cannot be done.
// Usage: node tools/sideGoals.mjs [levels,comma] [--seconds S] [--small w,h] [--best n]
import { spawn } from 'node:child_process';
import { search } from './climb.mjs';
import { arg } from './levelDef.mjs';
import { roomsOf } from '../tests/knownRooms.mjs';
import { LEVELS } from '../src/level/campaign.js';
import { check } from '../src/campaign/rules.js';

const seconds = +arg('--seconds', 40), byId = id => LEVELS.find(l => String(l.id) === String(id));

if (process.argv.includes('--worker')) {
  const base = byId(process.argv[2]), add = arg('--with', '') ? arg('--with').split(',') : [];
  const def = { ...base, require: [...(base.require || []), ...add] }, rows = [], seen = new Set();
  search(def, { seconds, seed: +arg('--seed', 1), from: process.argv.includes('--unseeded') ? [] : roomsOf(base.id), see: (r, v, key) => {
    if (seen.has(key)) return; seen.add(key);
    const w = check(base, r);
    if (w.won) rows.push([w.length, w.area, Object.keys(w.pathGoals || {}).filter(k => w.pathGoals[k]), key]);
  } });
  console.log(JSON.stringify(rows));
} else {
  const ids = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2].split(',') : LEVELS.map(l => String(l.id));
  const jobs = ids.flatMap(id => [[id, ''], ...(byId(id).optional || []).map(o => [id, o])]);
  const one = ([id, add]) => new Promise(done => {
    let out = '';
    const p = spawn(process.execPath, [process.argv[1], id, '--seconds', String(seconds), '--worker', ...(add ? ['--with', add] : []), ...(process.argv.includes('--unseeded') ? ['--unseeded'] : [])]);
    p.stdout.on('data', d => { out += d; }); p.on('close', () => { try { done([id, JSON.parse(out.trim().split('\n').at(-1))]); } catch { done([id, []]); } });
  });
  const all = {};
  for (let i = 0; i < jobs.length; i += 4) for (const [id, rows] of await Promise.all(jobs.slice(i, i + 4).map(one))) (all[id] ||= []).push(...rows);
  const out = {};
  for (const id of ids) {
    const def = byId(id), rows = all[id] || [], counts = {};
    for (const r of rows) counts[r[0]] = (counts[r[0]] || 0) + 1;
    const smallest = rows.reduce((a, b) => !a || b[1] < a[1] || (b[1] === a[1] && b[0] < a[0]) ? b : a, null);
    const area = arg('--small') ? arg('--small').split(',').reduce((a, b) => a * b, 1) : smallest && smallest[1];
    const best = +arg('--best', def.steps.best);
    const goals = ['best', 'small', ...(def.optional || [])];
    const met = r => goals.filter(g => g === 'best' ? r[0] === best : g === 'small' ? r[1] <= area : r[2].includes(g));
    const pairs = {};
    for (const r of rows) { const m = met(r); for (let a = 0; a < m.length; a++) for (let b = a + 1; b < m.length; b++) { const k = m[a] + '+' + m[b]; if (!pairs[k] || r[1] < pairs[k][1]) pairs[k] = [r[0], r[1], r[3]]; } }
    const most = rows.reduce((a, r) => met(r).length > (a ? met(a).length : -1) ? r : a, null);
    out[id] = { wins: rows.length, counts, smallest, best, goals, pairs, most: most && [met(most), most[0], most[1], most[3]] };
    console.log(`Level ${id}: ${rows.length} wins; smallest ${smallest ? smallest[1] + ' cells (' + smallest[3] + ')' : 'none'}; pairs: ${Object.keys(pairs).join(', ') || 'NONE'}`);
  }
  console.log(JSON.stringify({ seconds, out }));
}
