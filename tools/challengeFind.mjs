// Searches random arenas for challenges (registers 562, 570-572): the star starts out of the robot's
// reach, and exactly one placement of all the given pieces gets it there. No move count: the only goal
// is the star. A block is a stopper (the robot slides until something stops it), so blocks alone work.
// Usage: node tools/challengeFind.mjs [--seed S] [--theme Name] [--seconds N]
import { measure, judge, rowsWith } from './challenge.mjs';

const arg = k => process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null;
let seed = +arg('--seed') || 7;
const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

export const THEMES = [
  { name: 'Two blocks', fixed: ['#', '#'], pieces: ['#', '#'], open: 11 },
  { name: 'Three blocks', fixed: ['#', '#'], pieces: ['#', '#', '#'], open: 9 },
  { name: 'A box', fixed: ['#', '#'], pieces: ['B', '#'], open: 9 },
  { name: 'The door', fixed: ['#', 'D'], pieces: ['t', '#'], open: 9 },
  { name: 'One way', fixed: ['#', '#'], pieces: ['>', '#'], open: 8 },
];
// Enough placements that trying them all by hand is not the way through; equal pieces count once per set of tiles.
const MIN_PLACEMENTS = 50;

function arena(theme) {
  const g = Array.from({ length: 5 }, () => Array(5).fill('.'));
  const put = c => { for (;;) { const x = Math.floor(rand() * 5), y = Math.floor(rand() * 5); if (g[y][x] === '.') { g[y][x] = c; return; } } };
  put('P'); put('G');
  for (const c of theme.fixed) put(c);
  for (let i = 0; i < theme.open; i++) put('+');
  return g.map(r => r.join(''));
}

export function find(theme, seconds) {
  let best = null;
  for (const t0 = Date.now(); Date.now() - t0 < seconds * 1000;) {
    const ch = { name: theme.name, rows: arena(theme), pieces: theme.pieces, require: [], min: 1 };
    if (judge(ch, rowsWith(ch, [])).reach) continue;
    const m = measure(ch);
    if (m.wins.length !== 1 || m.placements < MIN_PLACEMENTS) continue;
    // Longer solutions and more placements read as harder; both are cheap proxies for a playtest.
    const score = m.wins[0].length * 10 + m.placements / 20;
    if (!best || score > best.score) best = { ch, m, score };
  }
  return best;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const only = arg('--theme'), seconds = +arg('--seconds') || 40;
  for (const theme of THEMES.filter(t => !only || t.name === only)) {
    const b = find(theme, seconds);
    console.log(b ? JSON.stringify({ name: theme.name, rows: b.ch.rows, pieces: theme.pieces, require: [], min: 1 }) + `  // ${b.m.placements} placements, ${b.m.wins[0].length} moves: ${b.m.wins[0].rows.join(' / ')}` : `${theme.name}: none found`);
  }
}
