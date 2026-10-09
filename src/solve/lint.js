// Lint: warnings about a room that the rules allow but that are almost always a
// mistake, each with the tile it is about. Read-only over the level.
import { DIRS } from '../rules/base.js';
import { createGame, step } from '../rules/game.js';
import { parseMove } from './solve.js';

// A tile nothing will ever move into: outside, a block, a catcher or a spring.
const fixed = (l, x, y) => x < 0 || y < 0 || x >= l.w || y >= l.h || /^(wall|receiver:|spring:)/.test(l.cells[y * l.w + x]);

export function lint(level) {
  const out = [], at = i => ({ x: i % level.w, y: Math.floor(i / level.w) });
  const doors = {}, switches = {};
  level.cells.forEach((c, i) => {
    const [kind, col] = c.split(':');
    if (kind === 'door' || kind === 'idoor') (doors[col] ||= []).push(i);
    if (kind === 'button' || kind === 'receiver' || kind === 'sensor') (switches[col] ||= []).push(i);
  });
  for (const col in doors) if (!switches[col]) out.push({ ...at(doors[col][0]), msg: `A ${col} door with no ${col} switch never changes.` });
  for (const col in switches) if (!doors[col]) out.push({ ...at(switches[col][0]), msg: `A ${col} switch with no ${col} door does nothing.` });
  for (const e of level.entities) {
    if (e.turret) for (const d of e.turret.dirs) {
      const [dx, dy] = DIRS[d];
      if (fixed(level, e.x + dx, e.y + dy)) out.push({ x: e.x, y: e.y, msg: `A turret fires ${d} straight into a block.` });
    }
    if (e.kind !== 'turret' && Object.values(DIRS).every(([dx, dy]) => fixed(level, e.x + dx, e.y + dy)))
      out.push({ x: e.x, y: e.y, msg: 'A piece is walled in on every side.' });
  }
  const s = level.start;
  if (Object.values(DIRS).every(([dx, dy]) => fixed(level, s.x + dx, s.y + dy))) out.push({ ...s, msg: 'The start is walled in on every side.' });
  return out;
}

// Replays a saved solution. Returns the number of the first move after which it can no
// longer win, or 0 when it still wins.
export function brokenAt(level, moves) {
  const s = createGame(level);
  const busy = () => s.player.dir || s.player.hidden || s.entities.some(e => !e.dead && (e.rush || e.slide));
  for (let n = 0; n < moves.length; n++) {
    const { k, at, then } = parseMove(moves[n]);
    const deaths = s.deaths;
    step(s, [k]);
    for (let i = 1; i <= 4 * s.w * s.h + 40 && busy(); i++) step(s, i === at ? [then] : []);
    if (s.deaths !== deaths) return n + 1;
  }
  return s.won ? 0 : moves.length;
}
