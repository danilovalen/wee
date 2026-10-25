// Partial credit for the room search (register 272): how close a path comes to a goal it misses,
// from 0 (nowhere near) toward 1, so a climb can tell "warmer" from "colder". Only the search reads
// these; the game judges goals as met or not.
import { boxMoves } from '../src/campaign/pushes.js';
import { replayPath } from '../src/campaign/robot.js';
import { REQUIREMENTS } from '../src/campaign/requirements.js';
import { stoppedPushes, boxesLeaving, tileLog, laserOverSpikes, oneWayLog } from '../src/campaign/goals/helpers.js';

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
const leaving = b => b.left ? 1 : b.was ? 0.5 : b.d === Infinity ? 0 : 0.4 / (1 + b.d);
function shareCrossed(room, moves, test) {
  const want = new Set(room.cells.flatMap((c, i) => test(c || '') ? [i] : [])), got = new Set();
  replayPath(room, moves, s => { for (const b of s.beams || []) for (const [x, y] of b.path.slice(1)) if (want.has(y * room.w + x)) got.add(y * room.w + x); });
  return want.size ? got.size / want.size : 0;
}
export const SCORES = {
  // Register 457: the share of one-ways or spikes done.
  laserOverEveryOneWay: (room, moves) => shareCrossed(room, moves, c => c.startsWith('gate:')),
  laserOverEverySpike: (room, moves) => shareCrossed(room, moves, c => c === 'death'),
  laserCrossesEverySpike: (room, moves) => { const { want, left } = laserOverSpikes(room, moves); return want.size ? [...want].filter(i => left.has(i)).length / want.size : 0; },
  robotThroughEveryOneWayBothWays: (room, moves) => {
    const gs = room.cells.flatMap((c, i) => (c || '').startsWith('gate:') ? [i] : []), w = oneWayLog(room, moves).robotWays;
    return mean(gs.map(i => !w[i] ? 0 : w[i].size >= 2 ? 1 : 0.5));
  },
  threeSpikes: room => Math.min(1, room.cells.filter(c => c === 'death').length / 3),
  // Per pushable tile, the share of tiles that did it (registers 448, 452); a half step for being on the way.
  boxPushesEveryOneWay: (room, moves) => mean(tileLog(room, moves, 'gate').map(t => t.byBox ? 1 : 0)),
  robotThroughEveryPushedOneWay: (room, moves) => mean(tileLog(room, moves, 'gate').map(t => t.robotLeft ? 1 : t.robotIn ? 0.5 : 0)),
  everyOneWayOverSpikes: (room, moves) => mean(tileLog(room, moves, 'gate').map(t => t.spikes ? 1 : 0)),
  everyDoorOverSpikes: (room, moves) => mean(tileLog(room, moves, 'door').map(t => t.spikes ? 1 : 0)),
  boxLeavesEveryDoor: (room, moves) => mean(tileLog(room, moves, 'door').map(t => t.boxLeft ? 1 : t.boxIn ? 0.5 : 0)),
  robotLeavesEveryDoor: (room, moves) => mean(tileLog(room, moves, 'door').map(t => t.robotLeft ? 1 : t.robotIn ? 0.5 : 0)),
  twoOneWays: room => Math.min(1, room.cells.filter(c => (c || '').startsWith('gate:')).length / 2),
  twoDoors: room => Math.min(1, room.cells.filter(c => (c || '').startsWith('door:')).length / 2),
  // Per box: warmer the nearer it comes to spikes or the goal, half credit on them, full once it leaves (register 435).
  everyBoxEntersSpikes: (room, moves) => mean(boxesLeaving(room, moves, 'death').map(b => b.was ? 1 : b.d === Infinity ? 0 : 0.8 / (1 + b.d))),
  everyBoxLeavesSpikes: (room, moves) => mean(boxesLeaving(room, moves, 'death').map(leaving)),
  everyBoxLeavesGoal: (room, moves) => mean(boxesLeaving(room, moves, 'goal').map(leaving)),
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
  // Half credit per kind of laser a moving box has had right ahead of it (register 373), plus how near a box came to a laser.
  boxTouchesBothLasers: (room, moves) => {
    const touched = new Set(), was = new Map();
    let near = 0;
    replayPath(room, moves, s => {
      const lasers = s.entities.filter(t => !t.dead && t.turret);
      for (const e of s.entities) {
        if (e.dead || e.kind !== 'box') continue;
        for (const t of lasers) near = Math.max(near, 1 / (1 + Math.abs(t.x - e.x) + Math.abs(t.y - e.y)));
        const p = was.get(e.id); was.set(e.id, [e.x, e.y]);
        if (!p || (p[0] === e.x && p[1] === e.y)) continue;
        const ahead = lasers.find(t => t.x === e.x + Math.sign(e.x - p[0]) && t.y === e.y + Math.sign(e.y - p[1]));
        if (ahead) touched.add(ahead.crate ? 'crate' : 'plain');
      }
    });
    return 0.4 * touched.size + 0.1 * near;
  },
  // Two relays nearer each other is warmer (register 376).
  relayHitsRelay: (room, moves) => { let d = Infinity; replayPath(room, moves, s => { const r = s.cells.flatMap((c, i) => /^sensor:/.test(c || '') ? [[i % s.w, Math.floor(i / s.w)]] : []); for (const a of r) for (const b of r) if (a !== b) d = Math.min(d, Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])); }); return d === Infinity ? 0 : 0.8 / d; },
  // The most relays lit at once, as a share; and the fewest (register 375).
  laserThroughEveryRelay: (room, moves) => { let best = 0; replayPath(room, moves, s => { const r = s.cells.flatMap((c, i) => /^sensor:/.test(c || '') ? [i] : []); if (r.length) best = Math.max(best, r.filter(i => s.lit.has(i)).length / r.length); }); return 0.9 * best; },
  laserThroughNoRelay: (room, moves) => { let best = 0; replayPath(room, moves, s => { const r = s.cells.flatMap((c, i) => /^sensor:/.test(c || '') ? [i] : []); if (r.length) best = Math.max(best, 1 - r.filter(i => s.lit.has(i)).length / r.length); }); return 0.9 * best; },
  everyToggleOffAtEnd: (room, moves) => {
    const n = room.cells.filter(c => c.startsWith('toggle:')).length;
    return n ? 1 - replayPath(room, moves, () => {}).toggled.length / n : 0;
  },
};
// A goal with no score of its own is scored from its own row (register 364): the first object it names
// (the robot, a laser's beam, a box) against the last (a door, a one-way, a button...), warmer the nearer.
const MOVERS = { start: you, laser: beamTiles, box: s => s.entities.filter(e => !e.dead && e.kind === 'box').map(e => [e.x, e.y]) };
const TARGETS = { door: 'door:', idoor: 'idoor:', gate: 'gate:', button: 'button:', toggle: 'toggle:', relay: 'sensor:', goal: 'goal' };
export function derived(id) {
  const els = (REQUIREMENTS[id]?.short || []).filter(p => typeof p === 'object').map(p => p.el);
  const mover = MOVERS[els[0]], target = els.length > 1 && TARGETS[els[els.length - 1]];
  return mover && target ? (room, moves) => nearest(room, moves, mover, target) * (els[0] === 'box' ? 0.5 : 1) : null;
}
// What a missed goal costs: 1 with no partial credit, less the closer the path came.
export const miss = (id, room, moves) => { const f = SCORES[id] || derived(id); return 1 - Math.min(0.95, f ? f(room, moves) : 0); };
