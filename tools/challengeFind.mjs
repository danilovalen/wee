// Searches random arenas for challenges (registers 562, 570-572, 577-578): the star starts out of the
// robot's reach, exactly one placement of all the given pieces gets it there, no move count. Each
// challenge asks for its own mix of what makes it more than a forced chain (tools/challengeShape.mjs).
// Usage: node tools/challengeFind.mjs [--seed S] [--only c1,c2] [--seconds N]
import { measure, judge, rowsWith } from './challenge.mjs';
import { shape, trim } from './challengeShape.mjs';

const arg = k => process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null;
let seed = +arg('--seed') || 7;
// mulberry32: the old float LCG lost precision and fell into one sequence whatever the seed.
const rand = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// want: forks (2+ ways to rest on the star), trap, twoJob, stops (at least). Every challenge is trimmed.
export const SPECS = [
  { id: 'c1', name: 'Two blocks', size: 5, fixed: ['#', '#'], pieces: ['#', '#'], open: 11, want: { forks: 2, trap: true } },
  { id: 'c2', name: 'Three blocks', size: 6, fixed: ['#', '#', '#'], pieces: ['#', '#', '#'], open: 10, want: { forks: 2, stops: 6 } },
  { id: 'c3', name: 'A box', size: 6, fixed: ['#', '#', '#'], pieces: ['B', '#'], open: 9, want: { stops: 7, trap: true } },
  { id: 'c4', name: 'The door', size: 6, fixed: ['#', '#', 'D'], pieces: ['t', '#'], open: 10, want: { stops: 6 } },
  { id: 'c5', name: 'One way', size: 6, fixed: ['#', '#', '#'], pieces: ['>', '#'], open: 10, want: { forks: 2, trap: true, stops: 7 } },
  // A box to push onto a button that holds the door open (register 696).
  { id: 'c6', name: 'The button', size: 5, fixed: ['#', '#', '#', 'D'], pieces: ['B', 'o'], open: 9, want: { stops: 4 }, needs: 'D' },
  // Register 762: one after each of Levels 15, 18, 20, 22 and 24, from the pieces those levels teach.
  { id: 'c7', name: 'Line of fire', size: 6, fixed: ['#', '#', '>'], pieces: ['e', '#'], open: 10, want: { stops: 5 } },
  { id: 'c8', name: 'The relay', size: 6, fixed: ['#', '#', 'e', 'D'], pieces: ['r', '#'], open: 10, want: { stops: 4 }, needs: 'D' },
  { id: 'c9', name: 'Lit door', size: 6, fixed: ['#', '#', 'r', 'D'], pieces: ['e', '#'], open: 10, want: { stops: 4 }, needs: 'D' },
  { id: 'c10', name: 'Over the spikes', size: 6, fixed: ['#', '#', 'x', 'x'], pieces: ['>', '#'], open: 10, want: { stops: 5 } },
  { id: 'c11', name: 'Crossfire', size: 6, fixed: ['#', 'x', 'r', 'D'], pieces: ['e', '#'], open: 10, want: { stops: 5 }, needs: 'D' },
];
const MIN_PLACEMENTS = 30;

// A random room with random slots; trim() then keeps only the slots some nearly-right placement uses
// (register 580). Choosing only such slots up front was tried: with every slot meaningful, almost no
// room keeps a single solution (c2: 0 of 1847 rooms in 30 s).
function arena(spec) {
  const n = spec.size, g = Array.from({ length: n }, () => Array(n).fill('.'));
  const put = c => { for (;;) { const x = Math.floor(rand() * n), y = Math.floor(rand() * n); if (g[y][x] === '.') { g[y][x] = c; return; } } };
  put('P'); put('G');
  for (const c of spec.fixed) put(c);
  for (let i = 0; i < spec.open; i++) put('+');
  return g.map(r => r.join(''));
}

const fits = (w, sh) => sh.forks >= (w.forks || 0) && (!w.trap || sh.trap) && (!w.twoJob || sh.twoJob) && sh.stops >= (w.stops || 0);

export function find(spec, seconds) {
  let best = null;
  for (const t0 = Date.now(); Date.now() - t0 < seconds * 1000;) {
    let ch = { id: spec.id, name: spec.name, rows: arena(spec), pieces: spec.pieces, require: [], min: 1 };
    if (judge(ch, rowsWith(ch, [])).reach) continue;
    let m = measure(ch);
    if (m.wins.length !== 1) continue;
    const sol = placementOf(ch, m.wins[0].rows);
    // needs: a door the answer must pass open; with it a wall for good, the placement must not win.
    if (spec.needs && judge(ch, rowsWith(ch, sol).map(r => r.split(spec.needs).join('#'))).won) continue;
    const sh = shape(ch, sol);
    if (!fits(spec.want, sh)) continue;
    ch = { ...ch, rows: trim(ch, sol) }; m = measure(ch);
    const slots = ch.rows.join('').split('+').length - 1;
    if (m.wins.length !== 1 || m.placements < MIN_PLACEMENTS || slots < spec.pieces.length + 3) continue;
    const score = sh.stops * 10 + sh.forks * 5 + m.placements / 10;
    if (!best || score > best.score) best = { ch, m, sh, score };
  }
  return best;
}

// The winning placement, read back from its rows.
function placementOf(ch, rows) {
  const out = [];
  ch.rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '+' && rows[y][x] !== '.') out.push([[x, y], rows[y][x]]); }));
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const only = arg('--only')?.split(','), seconds = +arg('--seconds') || 60;
  for (const spec of SPECS.filter(s => !only || only.includes(s.id))) {
    const b = find(spec, seconds);
    if (!b) { console.log(`${spec.id} ${spec.name}: none found`); continue; }
    const { ch, m, sh } = b;
    console.log(JSON.stringify({ id: ch.id, name: ch.name, rows: ch.rows, pieces: ch.pieces, require: [], min: 1 }) + `  // ${m.placements} placements, ${sh.stops} moves, forks ${sh.forks}${sh.trap ? ', trap' : ''}${sh.twoJob ? ', two-job' : ''}: ${m.wins[0].rows.join(' / ')}`);
  }
}
