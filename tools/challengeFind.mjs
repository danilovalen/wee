// Searches random arenas for challenges with exactly one winning placement (register 562), so a designer
// starts from candidates the checker already passes. Each theme fixes what the arena holds and what is given.
import { measure } from './challenge.mjs';

let seed = +(process.argv[process.argv.indexOf('--seed') + 1]) || 7;
const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = a => a[Math.floor(rand() * a.length)];

const THEMES = [
  { name: 'Blocks', fixed: ['#', '#'], pieces: ['#', '#', '#'], require: [], open: 11 },  // equal pieces: more tiles for as many placements
  { name: 'Box', fixed: ['#', '#'], pieces: ['B', '#', '#'], require: [] },
  { name: 'Door', fixed: ['#', 'D'], pieces: ['t', '#', '#'], require: ['throughOpenDoor'] },
  { name: 'One-way', fixed: ['#'], pieces: ['>', '#', '#'], require: [] },
  { name: 'Two boxes', fixed: ['#'], pieces: ['B', 'B', '#'], require: [] },
];
// Enough placements that trying them all by hand is not the way through.
const MIN_PLACEMENTS = 150;

function arena(theme) {
  const w = 5, h = 5, g = Array.from({ length: h }, () => Array(w).fill('.'));
  const free = () => { for (;;) { const x = Math.floor(rand() * w), y = Math.floor(rand() * h); if (g[y][x] === '.') return [x, y]; } };
  const put = c => { const [x, y] = free(); g[y][x] = c; };
  put('P'); put('G');
  for (const c of theme.fixed) put(c);
  for (let i = 0, n = theme.open || 6 + Math.floor(rand() * 3); i < n; i++) put('+');
  return g.map(r => r.join(''));
}

export function find(count) {
  const found = [];
  const only = process.argv.includes('--theme') ? process.argv[process.argv.indexOf('--theme') + 1] : null;
  for (const theme of THEMES.filter(t => !only || t.name === only)) {
    let best = null;
    for (let tries = 0; tries < 250; tries++) {
      const ch = { name: theme.name, rows: arena(theme), pieces: theme.pieces, require: theme.require, min: 4 };
      const m = measure(ch);
      if (m.wins.length !== 1 || m.placements < MIN_PLACEMENTS) continue;
      // Harder is better: many placements that reach the star or come close, one that wins, a longer path.
      const score = m.close * 2 + m.reach + m.wins[0].length * 3;
      if (!best || score > best.score) best = { ch, m, score };
    }
    if (best) found.push(best);
    if (best) console.log(`${theme.name}: ${best.ch.rows.join(' / ')}  pieces ${best.ch.pieces.join(' ')}; ${best.m.placements} placements, ${best.m.reach} reach, ${best.m.close} close; solution ${best.m.wins[0].rows.join(' / ')} (${best.m.wins[0].length} moves)`);
    else console.log(`${theme.name}: none found`);
  }
  return found.slice(0, count);
}

if (import.meta.url === `file://${process.argv[1]}`) find(5);
