// Design notes: what each power, piece and tile does to a room's answer, where the room
// traps you, and how many shortest routes it has. Each is a generator, so the page can run
// it a slice at a time. An answer is a number of moves, or 'unsolvable' or 'capped'.
import { createGame } from '../rules/game.js';
import { NEEDS, POWERS } from '../rules/base.js';
import { search, successors, stateKey, unsearchable, MAX_STATES } from './solve.js';

const KEYS = ['up', 'right', 'down', 'left'];
const WIN = 'win';
const answer = r => r.status === 'solved' ? r.moves.length : r.status;

// The answer with each power that is on switched off, one at a time.
export function* powerCheck(level, max) {
  const out = [];
  for (const p of POWERS) {
    if (!level.powers[p] || NEEDS[p]) continue;
    out.push({ power: p, without: answer(yield* search({ ...level, powers: { ...level.powers, [p]: false } }, max)) });
  }
  return out;
}

// The answer with each piece, and each tile other than a wall or the goal, taken out.
export function* elementCheck(level, max) {
  const out = [];
  for (let i = 0; i < level.entities.length; i++) {
    const e = level.entities[i];
    out.push({ x: e.x, y: e.y, what: e.kind, without: answer(yield* search({ ...level, entities: level.entities.filter((_, j) => j !== i) }, max)) });
  }
  for (let i = 0; i < level.cells.length; i++) {
    const c = level.cells[i];
    if (!c || c === 'wall' || c === 'goal') continue;
    const cells = [...level.cells]; cells[i] = '';
    out.push({ x: i % level.w, y: Math.floor(i / level.w), what: c.split(':')[0], without: answer(yield* search({ ...level, cells }, max)) });
  }
  return out;
}

// Every position the room can reach, as a graph: how many can no longer reach the goal,
// the tiles where every stop is such a dead end, and how many shortest routes there are.
// Null when the room has real-time pieces or more positions than max.
export function* routes(level, max = MAX_STATES) {
  if (unsearchable({ ...level, cells: [...level.cells, 'goal'] })) return null;
  const start = createGame(level), keys = [...KEYS, ...(level.powers.cycle || level.powers.swim ? ['hide'] : [])];
  const first = stateKey(start), tileOf = s => s.player.y * s.w + s.player.x;
  const nodes = new Map([[first, { tile: tileOf(start), dist: 0, next: new Set() }]]), order = [first], waiting = new Map([[first, start]]);
  for (let i = 0; i < order.length; i++) {
    const k = order[i], s = waiting.get(k), node = nodes.get(k);
    waiting.delete(k);
    for (const pair of successors(s, keys)) {
      if (pair) {
        const t = pair[1], tk = t.won ? WIN : stateKey(t);
        node.next.add(tk);
        if (!t.won && !nodes.has(tk)) {
          if (nodes.size >= max) return null;
          nodes.set(tk, { tile: tileOf(t), dist: node.dist + 1, next: new Set() });
          order.push(tk); waiting.set(tk, t);
        }
      }
      yield nodes.size;
    }
  }
  const back = new Map();
  for (const [k, n] of nodes) for (const t of n.next) (back.get(t) || back.set(t, []).get(t)).push(k);
  const alive = new Set([WIN]), todo = [WIN];
  while (todo.length) for (const k of back.get(todo.pop()) || []) if (!alive.has(k)) { alive.add(k); todo.push(k); }
  const ways = new Map([[first, 1]]);
  let par = Infinity, count = 0;
  for (const k of order) {
    const n = nodes.get(k), w = ways.get(k) || 0;
    for (const t of n.next) {
      if (t === WIN) { if (n.dist + 1 < par) { par = n.dist + 1; count = 0; } if (n.dist + 1 === par) count += w; }
      else if (nodes.get(t).dist === n.dist + 1) ways.set(t, (ways.get(t) || 0) + w);
    }
  }
  const tiles = new Map();
  for (const [k, n] of nodes) { const t = tiles.get(n.tile) || { dead: true }; t.dead = t.dead && !alive.has(k); tiles.set(n.tile, t); }
  return {
    positions: nodes.size,
    dead: [...nodes.keys()].filter(k => !alive.has(k)).length,
    traps: [...tiles].filter(([, t]) => t.dead).map(([i]) => i),
    par: par === Infinity ? null : par,
    routes: count,
  };
}
