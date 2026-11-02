// The closest attempt in a room the blob cannot win (register 642): of every place it can stop and every
// move that kills it, the one that ends nearest the berry, by the shortest way there. Nearest is walking
// distance through anything but walls, or as the crow flies when walls shut the berry in. On a tie, an
// attempt beats standing still and a crash beats a stop. Returns { path, end: 'stop' | 'die', at }.
import { createGame, step, cloneGame } from '../rules/game.js';
import { stateKey, successors, settled, MAX_STATES } from './solve.js';

const KEYS = ['up', 'right', 'down', 'left'];
const limit = s => 4 * s.w * s.h + 40;

function field(s) {
  const g = s.cells.indexOf('goal'), d = new Array(s.cells.length).fill(Infinity);
  if (g < 0) return d.fill(0);
  d[g] = 0;
  for (const q = [g]; q.length;) {
    const i = q.shift(), x = i % s.w, y = (i / s.w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, j = ny * s.w + nx;
      if (nx < 0 || ny < 0 || nx >= s.w || ny >= s.h || s.cells[j] === 'wall' || d[j] <= d[i] + 1) continue;
      d[j] = d[i] + 1; q.push(j);
    }
  }
  const gx = g % s.w, gy = (g / s.w) | 0;
  return d.map((v, i) => v < Infinity ? v : 1000 + Math.abs(i % s.w - gx) + Math.abs(((i / s.w) | 0) - gy));
}

export function nearMiss(level, max = MAX_STATES) {
  const start = createGame(level), d = field(start), keys = [...KEYS, ...(start.powers.cycle || start.powers.swim ? ['hide'] : [])];
  const seen = new Set([stateKey(start)]), here = t => ({ x: t.player.x, y: t.player.y });
  let best = { dist: d[start.player.y * start.w + start.player.x], path: [], end: 'stop', at: here(start) };
  const offer = (dist, path, end, at) => {
    const better = dist < best.dist || (dist === best.dist && (!best.path.length || (end === 'die' && best.end !== 'die')));
    if (better) best = { dist, path, end, at };
  };
  let frontier = [{ s: start, path: [] }];
  while (frontier.length) {
    const next = [];
    for (const { s, path } of frontier) {
      for (const k of KEYS) {
        const t = cloneGame(s), deaths = t.deaths;
        step(t, [k]);
        for (let i = 1; i <= limit(t) && !settled(t) && t.deaths === deaths; i++) step(t, []);
        if (t.deaths !== deaths) { const e = t.events.findLast(e => e.type === 'die') || s.player; offer(d[e.y * s.w + e.x], [...path, k], 'die', { x: e.x, y: e.y }); }
      }
      for (const pair of successors(s, keys)) {
        if (!pair) continue;
        const [k, t] = pair, key = stateKey(t);
        if (seen.has(key)) continue;
        seen.add(key);
        offer(d[t.player.y * t.w + t.player.x], [...path, k], 'stop', here(t));
        if (seen.size >= max) return { path: best.path, end: best.end, at: best.at };
        next.push({ s: t, path: [...path, k] });
      }
    }
    frontier = next;
  }
  return { path: best.path, end: best.end, at: best.at };
}
