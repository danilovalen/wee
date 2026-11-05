// A run as a list of positions, one per move (register 758): the keys are played again from the room as
// play began, and the whole game is kept each time everything comes to rest after a move. The rules are
// deterministic, so the same keys always give the same frames.
import { createGame, step, cloneGame } from '../rules/game.js';
import { settled } from './solve.js';

export function runFrames(level, log, ticks) {
  const s = createGame(level), out = [{ game: cloneGame(s), tick: 0 }];
  const at = new Map();
  for (const { t, k } of log) (at.get(t) || at.set(t, []).get(t)).push(k);
  let moved = false;
  for (let t = 0; t < ticks; t++) {
    const keys = at.get(t) || [];
    step(s, keys);
    if (keys.some(k => !/^(power|clock):/.test(k)) || !settled(s)) moved = true;
    // A move ends once everything is still again; a win ends it too, whatever is still moving.
    if (moved && (settled(s) || s.won)) { out.push({ game: cloneGame(s), tick: t + 1 }); moved = false; }
    if (s.won) break;
  }
  if (moved) out.push({ game: cloneGame(s), tick: ticks });
  return out;
}

// The room as a run stands at one frame (Edit from here, register 758): the blob starts where it is, each
// piece and pushable tile where it stands, broken blocks and eaten berries gone. Switches and doors start as
// the room set them.
export function levelAt(level, s) {
  const out = JSON.parse(JSON.stringify(level)), ground = s.ground || level.cells;
  out.cells = ground.map((c, i) => s.broken.includes(i) || (c === 'goal' && s.eaten.includes(i)) ? '' : c);
  for (const t of s.tiles || []) out.cells[t.y * level.w + t.x] = t.cell;
  if (level.crates) out.crates = (s.tiles || []).map(t => ({ ...level.crates[t.id], x: t.x, y: t.y }));
  out.entities = s.entities.filter(e => !e.dead).map(e => ({ ...level.entities[e.id - 1], x: e.x, y: e.y }));
  out.start = { x: s.player.x, y: s.player.y };
  return out;
}
