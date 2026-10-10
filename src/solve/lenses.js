// What the editor's lenses draw, from every position the room can reach: how far each tile
// is from winning, a shortest way there, and every tile a beam or a piece ever covers. A
// generator, so the page can run it a slice at a time.
import { createGame } from '../rules/game.js';
import { computeBeams } from '../rules/beams.js';
import { successors, stateKey, unsearchable, MAX_STATES } from './solve.js';

const KEYS = ['up', 'right', 'down', 'left'];
const WIN = 'win';
const PIECES = ['box', 'heavy', 'mover', 'enemy', 'strong'];

// { distance: Map tile -> fewest moves to win from a stop there, hopeless: tiles where no stop
// can win, solution: the tiles a shortest way stops on, start first, beams and pieces: Sets of
// tiles, capped }. Null for a room with real-time pieces.
export function* lensData(level, max = MAX_STATES) {
  if (unsearchable({ ...level, cells: [...level.cells, 'goal'] })) return null;
  const start = createGame(level), keys = [...KEYS, ...(level.powers.cycle || level.powers.swim ? ['hide'] : [])];
  const tileOf = s => s.player.y * s.w + s.player.x;
  const beams = new Set(), pieces = new Set();
  const record = s => {
    computeBeams(s, false);
    for (const b of s.beams) for (const [x, y] of b.path.slice(1)) beams.add(y * s.w + x);
    for (const e of s.entities) if (!e.dead && PIECES.includes(e.kind)) pieces.add(e.y * s.w + e.x);
  };
  const first = stateKey(start);
  const nodes = new Map([[first, { tile: tileOf(start), parent: null, next: new Set() }]]), order = [first], waiting = new Map([[first, start]]);
  record(start);
  let capped = false, win = null;
  for (let i = 0; i < order.length && !capped; i++) {
    const k = order[i], s = waiting.get(k), node = nodes.get(k);
    waiting.delete(k);
    for (const pair of successors(s, keys)) {
      if (pair) {
        const t = pair[1];
        if (t.won) { node.next.add(WIN); if (!win) win = { from: k, tile: tileOf(t) }; }
        else {
          const tk = stateKey(t);
          node.next.add(tk);
          if (!nodes.has(tk)) {
            if (nodes.size >= max) { capped = true; break; }
            nodes.set(tk, { tile: tileOf(t), parent: k, next: new Set() });
            order.push(tk); waiting.set(tk, t);
            record(t);
          }
        }
      }
      yield nodes.size;
    }
  }
  // Moves to win from each position: a walk back from the win along every move.
  const back = new Map();
  for (const [k, n] of nodes) for (const t of n.next) (back.get(t) || back.set(t, []).get(t)).push(k);
  const toWin = new Map([[WIN, 0]]), todo = [WIN];
  for (let i = 0; i < todo.length; i++) for (const k of back.get(todo[i]) || []) if (!toWin.has(k)) { toWin.set(k, toWin.get(todo[i]) + 1); todo.push(k); }
  const distance = new Map(), seen = new Set();
  for (const [k, n] of nodes) {
    seen.add(n.tile);
    if (toWin.has(k) && !(distance.get(n.tile) <= toWin.get(k))) distance.set(n.tile, toWin.get(k));
  }
  const solution = [];
  if (win) { solution.push(win.tile); for (let k = win.from; k; k = nodes.get(k).parent) solution.unshift(nodes.get(k).tile); }
  return { distance, hopeless: [...seen].filter(t => !distance.has(t)), solution, beams, pieces, capped, positions: nodes.size };
}
