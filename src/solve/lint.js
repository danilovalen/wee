// Lint: warnings about a room that the rules allow but that are almost always a
// mistake, each with the tile it is about. Read-only over the level.
import { DIRS } from '../rules/base.js';
import { createGame, step } from '../rules/game.js';
import { parseMove } from './solve.js';

// A tile nothing will ever move into: outside, a block, a catcher or a spring.
const fixed = (l, x, y) => x < 0 || y < 0 || x >= l.w || y >= l.h || /^(wall|spring:)/.test(l.cells[y * l.w + x]);

export function lint(level) {
  const out = [], at = i => ({ x: i % level.w, y: Math.floor(i / level.w) });
  // What a colour drives (doors, inverted doors, coloured one-ways) and what drives it (buttons, switches,
  // relays), so a red button beside a red one-way is not called useless (register 747). Grey works through
  // its wires and is left out.
  const driven = {}, drivers = {}, NAME = { button: 'button', toggle: 'switch', sensor: 'relay' };
  level.cells.forEach((c, i) => {
    const [kind, col] = c.split(':'), gate = kind === 'gate' && c.split('@')[1];
    if (kind === 'door' || kind === 'idoor') (driven[col] ||= []).push({ i, kind });
    if (gate) (driven[gate] ||= []).push({ i, kind });
    if (NAME[kind]) (drivers[col] ||= []).push({ i, kind });
  });
  for (const col in driven) if (col !== 'wire' && !drivers[col]) {
    const { i, kind } = driven[col][0], what = kind === 'gate' ? 'one-way' : kind === 'idoor' ? 'inverted door' : 'door';
    out.push({ ...at(i), msg: `With no ${col} button, switch or relay, the ${col} ${what} never changes.` });
  }
  for (const col in drivers) if (col !== 'wire' && !driven[col]) {
    const { i, kind } = drivers[col][0];
    out.push({ ...at(i), msg: `With no ${col} door or one-way, the ${col} ${NAME[kind]} doesn't do anything.` });
  }
  for (const e of level.entities) {
    if (e.turret) for (const d of e.turret.dirs) {
      const [dx, dy] = DIRS[d];
      if (fixed(level, e.x + dx, e.y + dy)) out.push({ x: e.x, y: e.y, msg: `Aimed ${d} into a block, the laser's beam never leaves its tile.` });
    }
    if (e.kind !== 'turret' && Object.values(DIRS).every(([dx, dy]) => fixed(level, e.x + dx, e.y + dy)))
      out.push({ x: e.x, y: e.y, msg: 'A piece is walled in on every side.' });
  }
  const s = level.start;
  if (s && Object.values(DIRS).every(([dx, dy]) => fixed(level, s.x + dx, s.y + dy))) out.push({ ...s, msg: 'The start is walled in on every side.' });
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
