// What a level can require of one-way tiles. Going through one is entering it along its arrow
// and leaving off the far side; colliding with one is a slide that ends against it, from any
// direction it does not let through. A box collides when a push ends with a one-way stopping it.
// All copy is draft.
import { replayPath } from './robot.js';
import { gateDirs } from '../rules/grid.js';
import { OPPOSITE } from '../rules/base.js';

const STEP = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const gates = room => room.cells.flatMap((c, i) => c.startsWith('gate:') ? [i] : []);
// The one-way that stopped a slide going d from (x, y), or -1. With the campaign's pieces a slide
// never ends before a one-way it could enter; the arrow check keeps a future piece honest.
// A coloured one-way is read as it points at that tick.
function blocker(room, s, x, y, d) {
  const [dx, dy] = STEP[d] || [0, 0], nx = x + dx, ny = y + dy;
  if (nx < 0 || ny < 0 || nx >= room.w || ny >= room.h) return -1;
  const ds = gateDirs(s, room.cells[ny * room.w + nx] || '');
  return ds && !ds.includes(d) ? ny * room.w + nx : -1;
}
// The way a piece left (a, b): one tile, or a slide's last tile.
const way = (a, b) => b.x > a.x ? 'right' : b.x < a.x ? 'left' : b.y > a.y ? 'down' : 'up';
const both = ways => Object.values(ways).some(set => [...set].some(d => set.has(OPPOSITE[d])));

// Per path: which one-ways the robot went through, which ways, and how often it collided with each;
// how many times a box went through one and which ways, how often each box collided with one, and
// whether one ends on one.
export function oneWayLog(room, moves) {
  const log = { robotThrough: new Set(), robotWays: {}, robotHits: {}, boxThrough: 0, boxWays: {}, boxHits: {}, boxStuck: false };
  const pass = (ways, a, b) => (ways[a.y * room.w + a.x] ||= new Set()).add(way(a, b));
  const isGate = (x, y) => (room.cells[y * room.w + x] || '').startsWith('gate:');
  let was = null, dir = null, boxes = {}, before = {}, last = {};
  const end = replayPath(room, moves, s => {
    const p = s.player;
    // Where each box stood when this slide began: a box that never moved did not collide.
    if (p.dir && !dir) before = last;
    if (was && (was.x !== p.x || was.y !== p.y) && isGate(was.x, was.y)) { log.robotThrough.add(was.y * room.w + was.x); pass(log.robotWays, was, p); }
    if (dir && !p.dir) {
      const g = blocker(room, s, p.x, p.y, dir), [dx, dy] = STEP[dir];
      if (g >= 0) log.robotHits[g] = (log.robotHits[g] || 0) + 1;
      // A push ends when the box ahead is stopped: a one-way past it is what the box collided with,
      // when the box moved in this push.
      const box = s.entities.find(e => !e.dead && e.kind === 'box' && e.x === p.x + dx && e.y === p.y + dy);
      if (box && blocker(room, s, box.x, box.y, dir) >= 0 && before[box.id] !== box.x + ',' + box.y) log.boxHits[box.id] = (log.boxHits[box.id] || 0) + 1;
    }
    was = { x: p.x, y: p.y }; dir = p.dir;
    const now = {};
    for (const e of s.entities) {
      if (e.dead || e.kind !== 'box') continue;
      const b = boxes[e.id];
      if (b && (b.x !== e.x || b.y !== e.y) && isGate(b.x, b.y)) { log.boxThrough++; pass(log.boxWays, b, e); }
      if (b && b.slide && !e.slide && blocker(room, s, e.x, e.y, b.slide) >= 0) log.boxHits[e.id] = (log.boxHits[e.id] || 0) + 1;
      now[e.id] = { x: e.x, y: e.y, slide: e.slide };
    }
    boxes = now;
    last = Object.fromEntries(s.entities.map(e => [e.id, e.x + ',' + e.y]));
  });
  log.boxStuck = end.entities.some(e => !e.dead && e.kind === 'box' && isGate(e.x, e.y));
  return log;
}

export const ONE_WAY_REQUIREMENTS = {
  robotThroughOneWayBothWays: {
    text: 'The robot goes through a one-way both ways.',
    short: [{ el: 'start' }, 'through a', { el: 'gate' }, 'both ways'],
    judge: (room, moves) => both(oneWayLog(room, moves).robotWays),
  },
  boxThroughOneWayBothWays: {
    text: 'A box goes through a one-way both ways.',
    short: [{ el: 'box' }, 'through a', { el: 'gate' }, 'both ways'],
    judge: (room, moves) => both(oneWayLog(room, moves).boxWays),
  },
  robotThroughEveryOneWay: {
    text: 'The robot goes through every one-way.',
    short: [{ el: 'start' }, 'through every', { el: 'gate' }],
    judge: (room, moves) => { const all = gates(room), l = oneWayLog(room, moves); return all.length > 0 && all.every(i => l.robotThrough.has(i)); },
  },
  robotThroughOneWay: {
    text: 'The robot goes through a one-way.',
    short: [{ el: 'start' }, 'through a', { el: 'gate' }],
    judge: (room, moves) => oneWayLog(room, moves).robotThrough.size > 0,
  },
  robotHitsEveryOneWay: {
    text: 'The robot collides with every one-way.',
    short: [{ el: 'start' }, 'collides with every', { el: 'gate' }],
    judge: (room, moves) => { const all = gates(room), l = oneWayLog(room, moves); return all.length > 0 && all.every(i => l.robotHits[i]); },
  },
  boxThroughOneWay: {
    text: 'A box goes through a one-way.',
    short: [{ el: 'box' }, 'through a', { el: 'gate' }],
    judge: (room, moves) => oneWayLog(room, moves).boxThrough > 0,
  },
  boxHitsOneWay: {
    text: 'A box collides with a one-way.',
    short: [{ el: 'box' }, 'collides with a', { el: 'gate' }],
    judge: (room, moves) => Object.values(oneWayLog(room, moves).boxHits).some(n => n >= 1),
  },
  boxHitsOneWayTwice: {
    text: 'A box collides with a one-way twice.',
    short: [{ el: 'box' }, 'collides with a', { el: 'gate' }, '×2'],
    judge: (room, moves) => Object.values(oneWayLog(room, moves).boxHits).some(n => n >= 2),
  },
  boxStuckOnOneWay: {
    text: 'A box ends on a one-way.',
    short: [{ el: 'box' }, 'ends on a', { el: 'gate' }],
    judge: (room, moves) => oneWayLog(room, moves).boxStuck,
  },
};
