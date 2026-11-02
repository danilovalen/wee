// Prototype (register 642): the attempt that ends nearest the berry in a room the blob cannot win. Run: node tools/nearMiss.mjs
import { createGame, step, cloneGame } from '../src/rules/game.js';
import { stateKey, successors, settled } from '../src/solve/solve.js';
import { room } from '../tests/lib.mjs';
const KEYS = ['up', 'right', 'down', 'left'];
const limit = s => 4 * s.w * s.h + 40;
// Walking distance from each tile to the berry through anything but walls.
function field(s) {
  const g = s.cells.indexOf('goal'), d = new Array(s.cells.length).fill(Infinity); d[g] = 0; const q = [g];
  while (q.length) { const i = q.shift(), x = i % s.w, y = (i / s.w) | 0; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, ny = y + dy, j = ny * s.w + nx; if (nx < 0 || ny < 0 || nx >= s.w || ny >= s.h || s.cells[j] === 'wall' || d[j] <= d[i] + 1) continue; d[j] = d[i] + 1; q.push(j); } }
  // A berry no walk reaches: as the crow flies, after every tile a walk does reach.
  const gx = g % s.w, gy = (g / s.w) | 0;
  return d.map((v, i) => v < Infinity ? v : 1000 + Math.abs(i % s.w - gx) + Math.abs(((i / s.w) | 0) - gy));
}
export function nearMiss(level, max = 20000) {
  const start = createGame(level), d = field(start), seen = new Set([stateKey(start)]);
  let best = { dist: d[start.player.y * start.w + start.player.x], path: [], end: 'stop' }, frontier = [{ s: start, path: [] }];
  const offer = (dist, path, end) => { if (dist < best.dist || (dist === best.dist && !best.path.length) || (dist === best.dist && end === 'die' && best.end !== 'die' && path.length <= best.path.length + 1)) best = { dist, path, end }; };
  while (frontier.length) {
    const next = [];
    for (const { s, path } of frontier) {
      for (const k of KEYS) { // a move that kills: where it died
        const t = cloneGame(s), deaths = t.deaths; let at = null;
        step(t, [k]); for (let i = 1; i <= limit(t) && !settled(t) && t.deaths === deaths; i++) { at = { x: t.player.x, y: t.player.y }; step(t, []); }
        if (t.deaths !== deaths) { const e = t.events.findLast(e => e.type === 'die'); const p = e && e.x != null ? e : at || s.player; offer(d[p.y * s.w + p.x], [...path, k], 'die'); }
      }
      for (const pair of successors(s, KEYS)) {
        if (!pair) continue; const [k, t] = pair, key = stateKey(t);
        if (seen.has(key)) continue; seen.add(key);
        offer(d[t.player.y * t.w + t.player.x], [...path, k], 'stop');
        next.push({ s: t, path: [...path, k] });
        if (seen.size >= max) return { ...best, capped: true, states: seen.size };
      }
    }
    frontier = next;
  }
  return { ...best, states: seen.size };
}
const show = (name, rows) => { const t = performance.now(), r = nearMiss(room(rows)); console.log(name.padEnd(12), JSON.stringify({ ...r, ms: Math.round(performance.now() - t) })); };
show('door', ['#######', '#P...D.#'.slice(0, 7), '#####G#']);
show('door2', ['#########', '#P.....D#', '#######G#', '#########']);
show('spikes', ['#######', '#P.x.G#', '#######']);
show('walled', ['#######', '#P....#', '#.###.#', '#.#G#.#', '#.###.#', '#.....#', '#######']);
show('t7x7', ['P......', '.......', '...#...', '..#G#..', '...#...', '.......', '......t']);

// A real campaign room: Level 2's start, with a door the robot can never open in its way.
import { LEVELS } from '../src/level/campaign.js';
import { roomOf } from '../src/campaign/rules.js';
for (const def of LEVELS.slice(0, 22)) { const l = roomOf(def); const t = performance.now(); const r = nearMiss(l); if (r.dist) console.log('level', def.id, r.dist, r.path.length, r.end, r.states, Math.round(performance.now() - t) + 'ms'); }
show('busy', ['P.B...#', '.#..B..', '..t.#B.', 'B..#..D', '.#B..#.', '..B.B..', '#.....G'].map(r => r.replace(/G/, 'G')));
