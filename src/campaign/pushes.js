// How each move of a path pushed or hit each box, in its own module so both goal files can count it.
import { replayPath } from './robot.js';

const STEP = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
// What each move of a path did to each box: a push is the robot moving the box it touches at least
// one tile (a box carried along in a train is not pushed, register 278); a hit is a slide of the robot
// (it moved) that ends against the box without moving it. Each move is replayed alone. kind counts
// another piece the same way: a pushable laser is 'turret' (register 341).
export function boxMoves(room, moves, kind = 'box') {
  const at = (n, from = 0) => {
    let dir = null, tick = 0;
    const touched = new Set();
    const s = replayPath(room, moves.slice(0, n), t => { if (t.player.dir) dir = t.player.dir; if (tick++ >= from && t.player.pushing) touched.add(String(t.player.pushing.id)); });
    return { s, dir, ticks: tick, touched, boxes: Object.fromEntries(s.entities.filter(e => !e.dead && e.kind === kind).map(e => [e.id, e.x + ',' + e.y])) };
  };
  const out = {};
  let was = at(0);
  for (let n = 1; n <= moves.length; n++) {
    const now = at(n, was.ticks), [dx, dy] = STEP[now.dir] || [0, 0], p = now.s.player;
    const ahead = now.s.entities.find(e => !e.dead && e.kind === kind && e.x === p.x + dx && e.y === p.y + dy);
    for (const id of Object.keys(was.boxes)) {
      const b = out[id] ||= { pushes: 0, hits: 0 };
      if (now.boxes[id] !== undefined && now.boxes[id] !== was.boxes[id]) { if (now.touched.has(id)) b.pushes++; }
      else if (ahead && String(ahead.id) === id && (p.x !== was.s.player.x || p.y !== was.s.player.y)) b.hits++;
    }
    was = now;
  }
  return Object.values(out);
}
