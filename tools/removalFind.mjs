// Removal challenges (register 787): a room full of pieces; the card says how many of each kind to take out,
// and exactly one choice of pieces wins. Same bar as the placing challenges (tools/challengeFind.mjs): the
// room as given cannot be won, there are at least MIN_CHOICES ways to choose, one wins, and its answer is
// not short. Usage: node tools/removalFind.mjs [--only r1,r2] [--seconds N] [--seed S]
import { judge, choices, without, measureRemoval } from './challenge.mjs';
import { removalAxes, fails } from './challengeAxes.mjs';

const arg = k => process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null;
let seed = +arg('--seed') || 11;
const rand = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const TURNS = { '>': ['>', '<', '^', 'v'], e: ['n', 'e', 's', 'w'] };
const KIND = c => ({ '<': '>', '^': '>', v: '>', n: 'e', s: 'e', w: 'e' })[c] || c;

// Each slot's removal twin, from the pieces its placing challenge uses: many of each, a few to take out.
export const SPECS = [
  { id: 'r1', name: 'Orchard', size: 5, fixed: [], many: { '#': 10 }, remove: { '#': 3 }, moves: 4 },
  { id: 'r4', name: 'Harbor', size: 6, fixed: ['D'], many: { '#': 8, t: 2 }, remove: { '#': 2, t: 1 }, moves: 4 },
  { id: 'r2', name: 'Meadow', size: 6, fixed: [], many: { '#': 10 }, remove: { '#': 3 }, moves: 5 },
  { id: 'r6', name: 'Canyon', size: 5, fixed: ['D'], many: { '#': 7, B: 2, o: 1 }, remove: { '#': 2, B: 1 }, moves: 4 },
  { id: 'r3', name: 'Glade', size: 6, fixed: [], many: { '#': 8, B: 4 }, remove: { '#': 2, B: 1 }, moves: 5 },
  { id: 'r5', name: 'Summit', size: 6, fixed: [], many: { '#': 8, '>': 5 }, remove: { '#': 2, '>': 1 }, moves: 5 },
  { id: 'r7', name: 'Marsh', size: 6, fixed: [], many: { '#': 8, e: 2, '>': 1 }, remove: { '#': 2, e: 1 }, moves: 5 },
  { id: 'r8', name: 'Grotto', size: 6, fixed: ['D', 'e'], many: { '#': 7, r: 2 }, remove: { '#': 2, r: 1 }, moves: 4 },
  { id: 'r9', name: 'Delta', size: 6, fixed: ['D', 'r'], many: { '#': 7, e: 2 }, remove: { '#': 2, e: 1 }, moves: 4 },
  { id: 'r10', name: 'Ridge', size: 6, fixed: [], many: { '#': 7, x: 5, '>': 1 }, remove: { '#': 2, x: 1 }, moves: 5 },
  { id: 'r11', name: 'Basin', size: 6, fixed: ['D', 'r'], many: { '#': 5, x: 4, e: 3 }, remove: { '#': 1, x: 1, e: 1 }, moves: 5 },
];
const MIN_CHOICES = 30;
// The number of ways to choose is the product, over kinds, of (pieces of that kind) choose (to take out).

// Built backwards: a room with only the pieces that stay, which wins, then the ones to take out dropped in.
export const __arena = spec => arena(spec);
function arena(spec) {
  const n = spec.size, g = Array.from({ length: n }, () => Array(n).fill('.'));
  const put = c => { for (;;) { const x = Math.floor(rand() * n), y = Math.floor(rand() * n); if (g[y][x] === '.') { g[y][x] = c; return; } } };
  const piece = c => { const w = TURNS[c]; return w ? w[Math.floor(rand() * w.length)] : c; };
  put('P'); put('G');
  for (const c of spec.fixed) put(c);
  for (const [c, k] of Object.entries(spec.many)) for (let i = 0; i < k - (spec.remove[c] || 0); i++) put(piece(c));
  const keep = g.map(r => r.join(''));
  for (const [c, k] of Object.entries(spec.remove)) for (let i = 0; i < k; i++) put(piece(c));
  return { keep, rows: g.map(r => r.join('')) };
}
export function find(spec, seconds) {
  let best = null;
  for (const t0 = Date.now(); Date.now() - t0 < seconds * 1000;) {
    const { keep, rows } = arena(spec), ch = { id: spec.id, name: spec.name, rows, remove: spec.remove, require: [], min: 1 };
    const kept = judge(ch, keep);
    if (!kept.won || kept.length < spec.moves || judge(ch, ch.rows).reach) continue;
    const m = measureRemoval(ch);
    if (m.choices < MIN_CHOICES || m.wins.length !== 1 || m.wins[0].length < spec.moves) continue;
    // The axes every shipped removal passes (tools/challengeAxes.mjs): nothing idle, depth after the first right
    // piece, and no piece to take out that a greedy player sees at a glance (registers 800, 801, 805).
    const ax = removalAxes(ch);
    if (fails(ax).length) continue;
    const score = m.wins[0].length * 10 + ax.residual * 2 + m.choices / 10;
    if (!best || score > best.score) best = { ch, m, score };
  }
  return best;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const only = arg('--only')?.split(','), seconds = +arg('--seconds') || 60;
  for (const spec of SPECS.filter(s => !only || only.includes(s.id))) {
    const b = find(spec, seconds);
    if (!b) { console.log(`${spec.id} ${spec.name}: none found`); continue; }
    const { ch, m } = b;
    console.log(JSON.stringify({ id: ch.id, name: ch.name, rows: ch.rows, remove: ch.remove, require: [], min: 1 }) + `  // ${m.choices} choices, ${m.wins[0].length} moves, take out ${JSON.stringify(m.wins[0].tiles)}`);
  }
}
