// How forgiving a solved room is (registers 634, 635): every position the blob can reach with plain moves,
// and from each, where each move goes. A move loses when it kills the blob or never settles; a position is
// a soft lock when the berry can no longer be reached from it. Mid-slide powers are not tried here.
import { createGame, step, cloneGame } from '../rules/game.js';
import { stateKey, settled, move } from './solve.js';

const KEYS = ['up', 'right', 'down', 'left'];
const limit = s => 4 * s.w * s.h + 40;

function outcome(s, k, before) {
  const t = cloneGame(s), deaths = t.deaths;
  step(t, [k]);
  for (let i = 1; i <= limit(t) && !settled(t); i++) step(t, []);
  if (t.deaths !== deaths || !settled(t)) return { lose: true };
  if (t.won) return { win: true };
  const key = stateKey(t);
  return key === before ? { noop: true } : { key, t };
}

// { capped } when the room has more than max positions; otherwise { guarded, deadly }: guarded when no
// reachable move loses and no reachable position is a soft lock; deadly when, along path, every move
// other than the path's own (a move that changes nothing aside) loses or soft-locks.
export function safety(level, path, max = 3000) {
  const start = createGame(level), keys = [...KEYS, ...(start.powers.cycle || start.powers.swim ? ['hide'] : [])];
  const nodes = new Map(), queue = [start];
  nodes.set(stateKey(start), { out: [] });
  while (queue.length) {
    const s = queue.shift(), before = stateKey(s), node = nodes.get(before);
    for (const k of keys) {
      const o = outcome(s, k, before);
      node.out.push(o.key ? { key: o.key } : o);
      if (o.key && !nodes.has(o.key)) {
        if (nodes.size >= max) return { capped: true };
        nodes.set(o.key, { out: [] }); queue.push(o.t);
      }
    }
  }
  // Positions the berry can still be reached from, grown backwards from the ones a move wins from.
  const good = new Set([...nodes].filter(([, n]) => n.out.some(o => o.win)).map(([k]) => k));
  for (let grew = true; grew;) {
    grew = false;
    for (const [k, n] of nodes) if (!good.has(k) && n.out.some(o => o.key && good.has(o.key))) { good.add(k); grew = true; }
  }
  const guarded = [...nodes.values()].every(n => n.out.every(o => !o.lose)) && good.size === nodes.size;
  let deadly = path.length > 0, s = start;
  for (const m of path) {
    if (!deadly) break;
    const before = stateKey(s), t = move(s, m, null, before), next = t && !t.won ? stateKey(t) : null;
    for (const k of keys) {
      if (k === m) continue;
      const o = outcome(s, k, before);
      if (o.noop || o.lose || (o.key && (o.key === next || !good.has(o.key)))) continue;
      deadly = false; break;
    }
    if (!t) break;
    s = t;
  }
  return { capped: false, guarded, deadly };
}
