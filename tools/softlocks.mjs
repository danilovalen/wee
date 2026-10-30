// Measures softlocks (register 488): a softlock is a position the robot can reach, alive, from
// which the goal can no longer be reached. A "way to softlock" is one move from a position that
// can still win into one that cannot. Climbs each level for wins (tools/climb.mjs), counts the
// ways in every win found and reports, per bucket (0 ways, 1+, 2+, 3+), how many wins, the
// fewest moves, the smallest room, and which side goals came met with it.
// Usage: node tools/softlocks.mjs [levels,comma] [--seconds S]
import { spawn } from 'node:child_process';
import { search } from './climb.mjs';
import { arg, levelDef } from './levelDef.mjs';
import { roomsOf } from '../tests/knownRooms.mjs';
import { createGame } from '../src/rules/game.js';
import { stateKey, successors, MAX_STATES } from '../src/solve/solve.js';
import { LEVELS } from '../src/level/campaign.js';

const KEYS = ['up', 'right', 'down', 'left'];

// Ways into a softlock, or null when the room has more positions than the solver searches.
export function softlockWays(level) {
  const start = createGame(level), keys = [...KEYS, ...(start.powers.cycle || start.powers.swim ? ['hide'] : [])];
  const edges = new Map(), canWin = new Set(), queue = [[stateKey(start), start]];
  edges.set(queue[0][0], []);
  while (queue.length) {
    const [k, s] = queue.shift();
    for (const pair of successors(s, keys)) {
      if (!pair) continue;
      const [, t] = pair;
      if (t.won) { canWin.add(k); continue; }
      const tk = stateKey(t);
      edges.get(k).push(tk);
      if (!edges.has(tk)) { edges.set(tk, []); queue.push([tk, t]); if (edges.size > MAX_STATES) return null; }
    }
  }
  const back = new Map();
  for (const [k, out] of edges) for (const t of out) (back.get(t) || back.set(t, []).get(t)).push(k);
  const todo = [...canWin];
  while (todo.length) for (const p of back.get(todo.pop()) || []) if (!canWin.has(p)) { canWin.add(p); todo.push(p); }
  let ways = 0;
  for (const [k, out] of edges) if (canWin.has(k)) for (const t of out) if (!canWin.has(t)) ways++;
  return ways;
}

const seconds = +arg('--seconds', 40);
if (process.argv.includes('--worker')) {
  const def = levelDef(process.argv[2]), seen = new Set(), rows = [];
  search(def, { seconds, seed: 1, from: process.argv.includes('--seeded') ? roomsOf(def.id) : [], see: (r, v, key) => {
    if (seen.has(key)) return; seen.add(key);
    const ways = softlockWays(r);
    if (ways != null) rows.push([ways, v.length, r.w * r.h, v.optional.filter(o => o.met && o.id !== 'mix').map(o => o.id), key]);
  } });
  console.log(JSON.stringify(rows));
} else {
  const ids = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2].split(',') : LEVELS.map(l => String(l.id)));
  const one = id => new Promise(done => {
    let out = '';
    const p = spawn(process.execPath, [process.argv[1], id, '--seconds', String(seconds), '--worker', ...(process.argv.includes('--seeded') ? ['--seeded'] : [])]);
    p.stdout.on('data', d => { out += d; }); p.on('close', () => { try { done([id, JSON.parse(out.trim().split('\n').at(-1))]); } catch { done([id, []]); } });
  });
  const results = [];
  for (let i = 0; i < ids.length; i += 4) results.push(...await Promise.all(ids.slice(i, i + 4).map(one)));
  const out = {};
  for (const [id, rows] of results) {
    const bucket = (name, f) => {
      const r = rows.filter(f);
      if (!r.length) return [name, null];
      const fewest = r.reduce((a, b) => b[1] < a[1] ? b : a), smallest = r.reduce((a, b) => b[2] < a[2] ? b : a);
      const combos = [...new Set(r.flatMap(x => x[3]))];
      return [name, { wins: r.length, fewestMoves: fewest[1], mostMoves: Math.max(...r.map(x => x[1])), fewestRoom: fewest[4], smallestArea: smallest[2], sideGoalsWith: combos }];
    };
    out[id] = { wins: rows.length, ...Object.fromEntries([bucket('none', x => x[0] === 0), bucket('1+', x => x[0] >= 1), bucket('2+', x => x[0] >= 2), bucket('3+', x => x[0] >= 3)]) };
    const s = b => b ? `${b.wins} wins, ${b.fewestMoves}-${b.mostMoves} moves, side goals with it: ${b.sideGoalsWith.join(' ') || 'none'}` : 'not found';
    console.log(`Level ${id} (${rows.length} wins): no softlock: ${s(out[id].none)} | 1+: ${s(out[id]['1+'])} | 3+: ${s(out[id]['3+'])}`);
  }
  console.log(JSON.stringify({ seconds, out }));
}
