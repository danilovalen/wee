// Three readings of a room's map (registers 708-710, 709, 717), beside the metrics in metrics.js.
// Going with the flow: a player who never steps back into a position already seen, picks at random among
// the moves that lead somewhere new, and undoes one move when there is nowhere new to go. Every try wins
// in the end; the number is how many undos it took, the median of a fixed set of seeded tries.
import { createGame } from '../rules/game.js';
import { DIRS } from '../rules/base.js';
import { search, move } from './solve.js';

export const FLOW_TRIES = 200;
const seeded = n => () => (n = (n * 1103515245 + 12345) & 0x7fffffff) / 0x80000000;
export function* flowUndos(nodes, first, tries = FLOW_TRIES) {
  const r = seeded(7), counts = [];
  for (let t = 0; t < tries; t++) {
    const seen = new Set([first]), stack = [first];
    let undos = 0;
    while (stack.length) {
      const go = nodes.get(stack[stack.length - 1]).out.filter(o => o.win || (o.key && !seen.has(o.key)));
      if (!go.length) { stack.pop(); undos++; continue; }
      const o = go[Math.floor(r() * go.length)];
      if (o.win) break;
      seen.add(o.key); stack.push(o.key);
    }
    counts.push(undos);
    if (t % 10 === 9) yield t;
  }
  return counts.sort((a, b) => a - b)[counts.length >> 1];
}

// Wrong turns (register 709): from each position on one shortest path, every move but the ones that keep
// it shortest. A detour still reaches the berry; a trap does not, and its depth is how many positions you
// can still walk through before you are stuck (0 when it kills or locks you in at once). at: where the
// deepest trap starts.
export function wrongTurns(nodes, path, toWin) {
  let turns = 0, traps = 0, deep = null;
  const reach = key => { const seen = new Set([key]), q = [key]; for (let i = 0; i < q.length; i++) for (const o of nodes.get(q[i]).out) if (o.key && !seen.has(o.key)) { seen.add(o.key); q.push(o.key); } return seen.size - 1; };
  for (let i = 0; i < path.length; i++) {
    const k = path[i], d = toWin.get(k), n = nodes.get(k), prev = path[i - 1];
    for (const o of n.out) {
      if (o.win || (o.key && (o.key === prev || toWin.get(o.key) === d - 1))) continue;
      turns++;
      if (o.key && toWin.has(o.key)) continue;
      traps++;
      const depth = o.key ? 1 + reach(o.key) : 0;
      if (!deep || depth > deep.depth) deep = { depth, at: n.at };
    }
  }
  return { turns, traps, deep };
}

// Reuse (register 717): for each move of one shortest answer, what stops the slide (a piece, a tile, or
// the room's edge). Few blocks used many times reads as reuse; one fresh block per move, as a straight path.
export function* reuse(level, max) {
  const r = yield* search(level, max);
  if (r.status !== 'solved') return null;
  const uses = new Map(), crossed = new Set();
  let s = createGame(level), overlap = 0;
  for (const m of r.moves) {
    // Path reuse (register 727): a move counts when it runs over a tile an earlier move already crossed.
    let dir = null;
    const from = s.player.y * s.w + s.player.x, here = new Set();
    const t = move(s, m, x => { if (x.player.dir) dir = x.player.dir; here.add(x.player.y * x.w + x.player.x); });
    if (!t) return null;
    if ([...here].some(i => crossed.has(i))) overlap++;
    crossed.add(from); for (const i of here) crossed.add(i);
    if (dir) {
      const [dx, dy] = DIRS[dir], x = t.player.x + dx, y = t.player.y + dy, e = t.entities.find(o => !o.dead && o.x === x && o.y === y);
      const id = e ? 'p' + e.id : x < 0 || y < 0 || x >= t.w || y >= t.h ? 'edge' : 't' + (y * t.w + x);
      uses.set(id, (uses.get(id) || 0) + 1);
    }
    s = t;
    yield uses.size;
  }
  return { moves: r.moves.length, blocks: uses.size, busiest: Math.max(0, ...uses.values()), overlap, stops: uses };
}

// Choke points (register 727): places on the way that every win goes through; take one out of the map and
// the berry cannot be reached. Only places on a shortest path can be, so only those are tried.
export function chokePoints(nodes, first, path) {
  const out = [];
  for (const k of path) {
    if (k === first) continue;
    const seen = new Set([first, k]), q = [first];
    let wins = false;
    for (let i = 0; i < q.length && !wins; i++) for (const o of nodes.get(q[i]).out) {
      if (o.win) { wins = true; break; }
      if (o.key && !seen.has(o.key)) { seen.add(o.key); q.push(o.key); }
    }
    if (!wins) out.push(nodes.get(k).at);
  }
  return out;
}
