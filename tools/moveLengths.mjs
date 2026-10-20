// Which shortest-path lengths a room of w x h can have, with only blocks, a start and a goal (register 343).
// Usage: node tools/moveLengths.mjs <w> <h>. Checks its own fast slide search against the game solver.
import { solve } from '../src/solve/solve.js';
import { emptyLevel } from '../src/level/format.js';
const [w, h] = process.argv.slice(2).map(Number), n = w * h, D = [[1,0],[-1,0],[0,1],[0,-1]];
function bfs(walls, st, gl) {
  const dist = new Map([[st, 0]]); let q = [st];
  for (let d = 0; q.length; d++) { const nq = [];
    for (const p of q) for (const [dx, dy] of D) { let x = p % w, y = (p - x) / w;
      while (true) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h || walls & (1 << (ny * w + nx))) break; x = nx; y = ny; }
      const r = y * w + x; if (r === gl) return d + 1; if (!dist.has(r)) { dist.set(r, d + 1); nq.push(r); } }
    q = nq; }
  return 0;
}
const best = {}, sample = {};
for (let walls = 0; walls < 1 << n; walls++) for (let st = 0; st < n; st++) { if (walls & (1 << st)) continue;
  for (let gl = 0; gl < n; gl++) { if (gl === st || walls & (1 << gl)) continue; const L = bfs(walls, st, gl); if (!L) continue;
    const cells = n - bin(walls); best[L] = Math.min(best[L] ?? 99, cells); sample[L] ??= [walls, st, gl]; } }
function bin(x) { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; }
console.log(`${w}x${h}: lengths found ${Object.keys(best).join(',')}`);
// check the fast BFS against the game's own solver on one room per length
for (const [L, [walls, st, gl]] of Object.entries(sample)) { const l = emptyLevel(w, h); for (const k of Object.keys(l.powers)) l.powers[k] = false;
  for (let i = 0; i < n; i++) if (walls & (1 << i)) l.cells[i] = 'wall'; l.cells[gl] = 'goal'; l.start = { x: st % w, y: Math.floor(st / w) };
  const r = solve(l); if (!r || (r.moves || r.path || []).length !== +L) console.log('MISMATCH', L, JSON.stringify(r).slice(0, 120)); }
