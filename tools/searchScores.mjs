// Partial credit for the room search (register 272): how close a path comes to a goal it misses,
// from 0 (nowhere near) toward 1, so a climb can tell "warmer" from "colder". Only the search reads
// these; the game judges goals as met or not.
import { boxMoves } from '../src/campaign/pushes.js';
import { stoppedPushes } from '../src/campaign/extras.js';
import { replayPath } from '../src/campaign/robot.js';

// The nearest any of pick(s)'s points comes, over a path, to a tile whose kind starts with prefix:
// 0.8 standing on one, falling off with distance (register 335).
function nearest(room, moves, pick, prefix) {
  let d = Infinity;
  replayPath(room, moves, s => {
    const tiles = s.cells.flatMap((c, i) => c.startsWith(prefix) ? [[i % s.w, Math.floor(i / s.w)]] : []);
    for (const [x, y] of pick(s)) for (const [tx, ty] of tiles) d = Math.min(d, Math.abs(x - tx) + Math.abs(y - ty));
  });
  return d === Infinity ? 0 : 0.8 / (1 + d);
}
const you = s => [[s.player.x, s.player.y]];
const stops = s => (s.beams || []).map(b => b.stop).filter(Boolean);
const beamTiles = s => (s.beams || []).flatMap(b => b.path.slice(1));
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
  robotThroughIdoor: (room, moves) => nearest(room, moves, you, 'idoor:'),
  throughOpenDoor: (room, moves) => nearest(room, moves, you, 'door:'),
  laserStoppedByIdoor: (room, moves) => nearest(room, moves, stops, 'idoor:'),
  laserThroughADoor: (room, moves) => nearest(room, moves, beamTiles, 'door:'),
  boxHitsIdoor: (room, moves) => nearest(room, moves, s => s.entities.filter(e => !e.dead && e.kind === 'box').map(e => [e.x, e.y]), 'idoor:') * 0.5,
  laserPushedThrice: (room, moves) => Math.max(0, ...boxMoves(room, moves, 'turret').map(b => Math.min(b.pushes, 3) / 3)) * 0.9,
  allRelaysLitAtEnd: (room, moves) => { const end = replayPath(room, moves, () => {}), relays = end.cells.flatMap((c, i) => c.startsWith('sensor:') ? [i] : []); return relays.length ? 0.9 * relays.filter(i => end.lit.has(i)).length / relays.length : 0; },
  everyToggleOffAtEnd: (room, moves) => {
    const n = room.cells.filter(c => c.startsWith('toggle:')).length;
    return n ? 1 - replayPath(room, moves, () => {}).toggled.length / n : 0;
  },
};
// What a missed goal costs: 1 with no partial credit, less the closer the path came.
export const miss = (id, room, moves) => 1 - Math.min(0.95, SCORES[id] ? SCORES[id](room, moves) : 0);
