// What the editor's lenses draw, from every position the room can reach: how far each tile
// is from winning, a shortest way there, every tile you pass through on the way to a stop,
// every tile a beam or a piece ever covers, the moves between stops, and where a move kills
// you. A generator, so the page can run it a slice at a time.
import { createGame } from '../rules/game.js';
import { computeBeams } from '../rules/beams.js';
import { successors, stateKey, unsearchable, MAX_STATES } from './solve.js';

const KEYS = ['up', 'right', 'down', 'left'];
const WIN = 'win';
const PIECES = ['box', 'heavy', 'bomb', 'mover', 'enemy', 'strong'];

// { distance: Map tile -> fewest moves to win from a stop there, hopeless: tiles where no stop
// can win, solution: the tiles a shortest way stops on, start first, beams and pieces: Sets of
// tiles, passes: a Set of every tile you cross in a move that works, stops: every tile a move
// ends on, moves: Map 'from>to' -> how many positions make that move, danger: a Set of tiles
// where some move kills you, capped }. Null for a room with real-time pieces.
export function* lensData(level, max = MAX_STATES) {
  if (unsearchable({ ...level, cells: [...level.cells, 'goal'] })) return null;
  const start = createGame(level), keys = [...KEYS, ...(level.powers.cycle || level.powers.swim ? ['hide'] : [])];
  const tileOf = s => s.player.y * s.w + s.player.x;
  const beams = new Set(), pieces = new Set(), passes = new Set(), stops = new Set([tileOf(start)]);
  // The tiles of the move being tried; kept only when the move works.
  let crossed = [];
  const moves = new Map(), danger = new Set();
  const onTick = s => {
    crossed.push(tileOf(s));
    for (const e of s.events) if (e.type === 'die') danger.add(e.y * s.w + e.x);
  };
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
    for (const pair of successors(s, keys, true, onTick)) {
      if (pair) for (const i of crossed) passes.add(i);
      crossed = [];
      if (pair) {
        const t = pair[1];
        stops.add(tileOf(t));
        const edge = `${node.tile}>${tileOf(t)}`;
        moves.set(edge, (moves.get(edge) || 0) + 1);
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
  const through = new Set(passes);
  for (const i of stops) passes.delete(i);
  const wins = capped ? { stop: new Map(), pass: new Map() } : yield* shortestUse(start, first, toWin, keys, tileOf);
  return { distance, hopeless: [...seen].filter(t => !distance.has(t)), solution, beams, pieces, passes, through, stops, moves, danger, wins, capped, positions: nodes.size };
}

// What the shortest wins do with each tile (registers 750, 769): stop.get(tile) and pass.get(tile) are
// 'required' when every shortest win stops on (or slides through) it and 'optional' when only some do; a
// tile no shortest win uses is in neither. Moves on a shortest win are replayed once more to know the tiles
// each crosses, then a tile is required when no shortest win gets round it.
function* shortestUse(start, first, toWin, keys, tileOf) {
  const best = toWin.get(first), stop = new Map(), pass = new Map();
  if (best === undefined) return { stop, pass };
  const states = new Map([[first, start]]), depth = new Map([[first, 0]]), q = [first], edges = [], out = new Map();
  let crossed = [];
  for (let i = 0; i < q.length; i++) {
    const k = q[i], s = states.get(k), d = depth.get(k);
    for (const pair of successors(s, keys, true, t => crossed.push(tileOf(t)))) {
      const c = crossed; crossed = [];
      if (!pair) continue;
      const t = pair[1], tk = t.won ? WIN : stateKey(t), rest = t.won ? 0 : toWin.get(tk);
      if (rest === undefined || d + 1 + rest !== best) continue;
      const end = tileOf(t), e = { to: tk, end, crossed: new Set(c.filter(x => x !== end && x !== tileOf(s))) };
      (out.get(k) || out.set(k, []).get(k)).push(edges.push(e) - 1);
      if (!t.won && !states.has(tk)) { states.set(tk, t); depth.set(tk, d + 1); q.push(tk); }
    }
    yield i;
  }
  // Can a shortest win get round the tile? A walk from the start that leaves out every move using it.
  const round = uses => { const seen = new Set([first]), todo = [first];
    for (let i = 0; i < todo.length; i++) for (const n of out.get(todo[i]) || []) { const e = edges[n]; if (uses(e)) continue; if (e.to === WIN) return true; if (!seen.has(e.to)) { seen.add(e.to); todo.push(e.to); } }
    return false; };
  const startTile = tileOf(start);
  stop.set(startTile, 'required');
  for (const e of edges) { if (!stop.has(e.end)) stop.set(e.end, null); for (const x of e.crossed) if (!pass.has(x)) pass.set(x, null); }
  for (const [t, v] of stop) if (v === null) { stop.set(t, round(e => e.end === t) ? 'optional' : 'required'); yield t; }
  for (const [t] of pass) { pass.set(t, round(e => e.crossed.has(t)) ? 'optional' : 'required'); yield t; }
  return { stop, pass };
}
