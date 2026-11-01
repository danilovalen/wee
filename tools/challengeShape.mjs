// What makes a challenge more than a forced chain (registers 577, 578), measured on its solution:
//   forks   ways the robot could come to rest on the star (a stopper beyond it: slot, block or edge);
//           1 means the first step back from the star is forced
//   trap    a slot the winning path slides straight across, so filling it there blocks the way
//   twoJob  a placed piece the robot comes to rest against from two different sides
//   stops   moves in the solution
// and trim(): drops slots no nearly-right placement uses, which can never add a solution.
import { placements, rowsWith, build, judge } from './challenge.mjs';
import { allShortest } from '../src/campaign/robot.js';
import { createGame } from '../src/rules/game.js';
import { move, stateKey, successors } from '../src/solve/solve.js';

const D = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const cellsOf = (ch, c) => { const out = []; ch.rows.forEach((r, y) => [...r].forEach((v, x) => { if (v === c) out.push([x, y]); })); return out; };
const at = (rows, x, y) => (y < 0 || x < 0 || y >= rows.length || x >= rows[0].length ? 'edge' : rows[y][x]);

// Every cell the robot can come to rest on.
export function restCells(level) {
  const s0 = createGame(level), seen = new Set([stateKey(s0)]), cells = new Set([`${s0.player.x},${s0.player.y}`]);
  let q = [s0];
  while (q.length && seen.size < 5000) {
    const next = [];
    for (const s of q) for (const pr of successors(s, ['up', 'right', 'down', 'left'])) {
      if (!pr || pr[1].won) continue;
      const t = pr[1], k = stateKey(t);
      if (!seen.has(k)) { seen.add(k); cells.add(`${t.player.x},${t.player.y}`); next.push(t); }
    }
    q = next;
  }
  return cells;
}

export function shape(ch, win) {
  const rows = rowsWith(ch, win), level = build(ch, rows), [star] = cellsOf(ch, 'G');
  const forks = D.filter(([dx, dy]) => at(ch.rows, star[0] + dx, star[1] + dy) !== '.').length;
  const path = allShortest(level).paths[0];
  const rests = [], passed = new Set();
  let s = createGame(level); rests.push([s.player.x, s.player.y]);
  for (const m of path) {
    s = move(s, m, t => passed.add(`${t.player.x},${t.player.y}`)) || s;
    rests.push([s.player.x, s.player.y]);
  }
  for (const [x, y] of rests) passed.delete(`${x},${y}`);
  const placed = new Set(win.map(([[x, y]]) => `${x},${y}`));
  const trap = cellsOf(ch, '+').some(([x, y]) => !placed.has(`${x},${y}`) && passed.has(`${x},${y}`));
  const twoJob = win.some(([[x, y]]) => new Set(rests.filter(([rx, ry]) => Math.abs(rx - x) + Math.abs(ry - y) === 1).map(r => r.join())).size >= 2);
  return { forks, trap, twoJob, stops: path.length };
}

// A placement is nearly right when it loses but opens a resting cell in line with the star
// (same row or column, nothing between): the player can see the star from there.
export function trim(ch, win) {
  const [star] = cellsOf(ch, 'G'), base = restCells(build(ch, rowsWith(ch, [])));
  const keep = new Set(win.map(([[x, y]]) => `${x},${y}`));
  for (const [dx, dy] of D) if (at(ch.rows, star[0] + dx, star[1] + dy) === '+') keep.add(`${star[0] + dx},${star[1] + dy}`);
  const inLine = (rows, x, y) => D.some(([dx, dy]) => { for (let i = 1, cx = x + dx, cy = y + dy; ; i++, cx += dx, cy += dy) { const c = at(rows, cx, cy); if (c === 'G') return true; if (c !== '.') return false; } });
  for (const pl of placements(ch)) {
    const rows = rowsWith(ch, pl);
    if (judge(ch, rows).won) continue;
    const fresh = [...restCells(build(ch, rows))].filter(c => !base.has(c)).map(c => c.split(',').map(Number));
    if (!fresh.some(([x, y]) => inLine(rows, x, y))) continue;
    for (const [[x, y]] of pl) if (fresh.some(([fx, fy]) => Math.abs(fx - x) + Math.abs(fy - y) === 1)) keep.add(`${x},${y}`);
  }
  return ch.rows.map((r, y) => [...r].map((c, x) => (c === '+' && !keep.has(`${x},${y}`) ? '.' : c)).join(''));
}
