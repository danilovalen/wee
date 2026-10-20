// Partial credit for the room search (register 272): how close a path comes to a goal it misses,
// from 0 (nowhere near) toward 1, so a climb can tell "warmer" from "colder". Only the search reads
// these; the game judges goals as met or not.
import { boxMoves } from '../src/campaign/pushes.js';
import { stoppedPushes } from '../src/campaign/extras.js';
import { replayPath } from '../src/campaign/robot.js';

const mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
export const SCORES = {
  everyBoxPushedTwice: (room, moves) => mean(boxMoves(room, moves).map(b => Math.min(b.pushes, 2) / 2)),
  everyBoxHitOnce: (room, moves) => mean(boxMoves(room, moves).map(b => b.hits >= 1 ? 1 : 0)),
  // The nearer a stopped box ends to another box, the warmer.
  boxHitsBox: (room, moves) => {
    const { out } = stoppedPushes(room, moves);
    let best = 0;
    for (const h of out) for (const e of h.s.entities) {
      if (e.dead || e.kind !== 'box' || e === h.box) continue;
      best = Math.max(best, 1 / (1 + Math.abs(e.x - h.x) + Math.abs(e.y - h.y)));
    }
    return out.length ? 0.1 + 0.8 * best : 0;
  },
  everyToggleOffAtEnd: (room, moves) => {
    const n = room.cells.filter(c => c.startsWith('toggle:')).length;
    return n ? 1 - replayPath(room, moves, () => {}).toggled.length / n : 0;
  },
};
// What a missed goal costs: 1 with no partial credit, less the closer the path came.
export const miss = (id, room, moves) => 1 - Math.min(0.95, SCORES[id] ? SCORES[id](room, moves) : 0);
