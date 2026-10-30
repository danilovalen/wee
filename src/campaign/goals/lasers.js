// Goals about lasers and relays: where beams go, what stops them, and pushable lasers (registers
// 255, 256, 457). All copy is draft.
import { replayPath } from '../robot.js';
import { boxMoves } from '../pushes.js';
import { STEP, stoppedPushes, beams, everyLaser, through, relaysOf, cellOf, isGate, crossed, laserOverSpikes, allDone, isSpike, boxIds, idsOf, robotStops } from './helpers.js';

export const LASER_GOALS = {
  // Lasers (registers 255, 256).
  laserThroughOpenDoor: {
    text: 'Every laser through an open door.',
    short: ['every', { el: 'laser' }, 'through an open', { el: 'door' }],
    judge: (room, moves) => everyLaser(room, moves, b => b.path.slice(1).some(at => cellOf(room, at).startsWith('door:'))),
  },
  laserThroughADoor: {
    text: 'Laser through an open door.',
    short: [{ el: 'laser' }, 'through an open', { el: 'door' }],
    judge: (room, moves) => { let ok = false; beams(room, moves, (b, s) => { if (through(b, s).some(at => cellOf(room, at).startsWith('door:'))) ok = true; }); return ok; },
  },
  laserThroughGoal: {
    text: 'Laser through the goal.',
    short: [{ el: 'laser' }, 'through the', { el: 'goal' }],
    judge: (room, moves) => { let ok = false; beams(room, moves, (b, s) => { if (through(b, s).some(at => cellOf(room, at) === 'goal')) ok = true; }); return ok; },
  },
  // Register 373: a box, moving, has a laser right ahead of it: one it stops against, or one it shoves along.
  // Met once that has happened with a plain laser and with a pushable one.
  boxTouchesBothLasers: {
    needs: { laser: 2 },
    text: 'Box touches a laser and a pushable laser.',
    short: [{ el: 'box' }, 'touches a', { el: 'laser' }, 'and a pushable one'],
    judge: (room, moves) => {
      const touched = new Set(), was = new Map();
      replayPath(room, moves, s => {
        for (const e of s.entities) {
          if (e.dead || e.kind !== 'box') continue;
          const p = was.get(e.id);
          was.set(e.id, [e.x, e.y]);
          if (!p || (p[0] === e.x && p[1] === e.y)) continue;
          const ahead = s.entities.find(t => !t.dead && t.turret && t.x === e.x + Math.sign(e.x - p[0]) && t.y === e.y + Math.sign(e.y - p[1]));
          if (ahead) touched.add(ahead.crate ? 'crate' : 'plain');
        }
      });
      return touched.size === 2;
    },
  },
  laserThroughButton: {
    text: 'Laser through a button.',
    short: [{ el: 'laser' }, 'through a', { el: 'button' }],
    judge: (room, moves) => { let ok = false; beams(room, moves, (b, s) => { if (through(b, s).some(at => cellOf(room, at).startsWith('button:'))) ok = true; }); return ok; },
  },
  laserThroughTwoDoors: {
    needs: { door: 2 },
    text: 'Laser through two open doors at once.',
    short: [{ el: 'laser' }, 'through 2 open', { el: 'door' }],
    judge: (room, moves) => {
      let ok = false;
      beams(room, moves, b => { if (new Set(b.path.slice(1).filter(at => cellOf(room, at).startsWith('door:')).map(String)).size >= 2) ok = true; });
      return ok;
    },
  },
  laserBlockedByDoor: {
    text: 'Every laser stopped by a closed door.',
    short: ['every', { el: 'laser' }, 'stopped by a closed', { el: 'door' }],
    judge: (room, moves) => everyLaser(room, moves, b => cellOf(room, b.stop).startsWith('door:')),
  },
  laserThroughOneWay: {
    text: 'Laser through a one-way.',
    short: [{ el: 'laser' }, 'through a', { el: 'gate' }],
    judge: (room, moves) => {
      let ok = false;
      beams(room, moves, b => { if (b.path.slice(1).some(at => cellOf(room, at).startsWith('gate:'))) ok = true; });
      return ok;
    },
  },
  laserBlockedByOneWay: {
    text: 'Laser stopped by a one-way.',
    short: [{ el: 'laser' }, 'stopped by a', { el: 'gate' }],
    judge: (room, moves) => {
      let ok = false;
      beams(room, moves, b => { if (cellOf(room, b.stop).startsWith('gate:')) ok = true; });
      return ok;
    },
  },
  lasersTwoWays: {
    needs: { laser: 2 },
    text: 'Lasers pointing at least two ways.',
    short: [{ el: 'laser' }, 'pointing 2 ways'],
    judge: room => new Set(room.entities.filter(e => e.turret).map(e => e.turret.dirs[0])).size >= 2,
  },
  // Register 371: the robot's slide ends against a relay, and so does a pushed box: the relay is solid.
  robotAndBoxHitRelay: {
    text: 'Robot and a box both collide with a relay.',
    short: [{ el: 'start' }, 'and', { el: 'box' }, 'collide with a', { el: 'relay' }],
    judge: (room, moves) => {
      let robot = false, dir = null;
      replayPath(room, moves, s => {
        const p = s.player;
        if (dir && !p.dir) { const [dx, dy] = STEP[dir]; if (cellOf(room, [p.x + dx, p.y + dy]).startsWith('sensor:')) robot = true; }
        dir = p.dir;
      });
      return robot && stoppedPushes(room, moves).out.some(h => cellOf(room, [h.x, h.y]).startsWith('sensor:'));
    },
  },
  laserStoppedByIdoor: {
    text: 'Laser stopped by a closed inverted door.',
    short: [{ el: 'laser' }, 'stopped by a closed', { el: 'idoor' }],
    judge: (room, moves) => { let ok = false; beams(room, moves, b => { if (cellOf(room, b.stop).startsWith('idoor:')) ok = true; }); return ok; },
  },
  // Register 329: when the run ends, a beam lights every relay in the room.
  allRelaysLitAtEnd: {
    text: 'Every laser relay lit at the end.',
    short: ['every', { el: 'relay' }, 'lit at the end'],
    judge: (room, moves) => { const end = replayPath(room, moves, () => {}), relays = end.cells.flatMap((c, i) => c.startsWith('sensor:') ? [i] : []); return relays.length > 0 && relays.every(i => end.lit.has(i)); },
  },
  // Register 375 (level 20): two moments of one run, read from which relays the beams light at each tick.
  // Relays can be pushed, so they are found again at every tick.
  laserThroughNoRelay: {
    text: 'At one moment, a laser goes through no relay.',
    short: [{ el: 'laser' }, 'through no', { el: 'relay' }],
    judge: (room, moves) => { let ok = false; replayPath(room, moves, s => { const r = relaysOf(s); if (r.length && r.every(i => !s.lit.has(i))) ok = true; }); return ok; },
  },
  laserThroughEveryRelay: {
    text: 'At one moment, a laser goes through every relay.',
    short: [{ el: 'laser' }, 'through every', { el: 'relay' }],
    judge: (room, moves) => { let ok = false; replayPath(room, moves, s => { const r = relaysOf(s); if (r.length && r.every(i => s.lit.has(i))) ok = true; }); return ok; },
  },
  // Register 376: a relay pushed one tile has another relay right ahead of it (they go on as a train).
  relayHitsRelay: {
    text: 'A relay collides with another relay.',
    short: [{ el: 'relay' }, 'collides with a', { el: 'relay' }],
    judge: (room, moves) => {
      let ok = false, before = null;
      replayPath(room, moves, s => {
        const now = new Set(relaysOf(s)), d = s.player.dir;
        if (before && d) {
          const [dx, dy] = STEP[d];
          for (const i of now) if (!before.has(i) && now.has(i + dy * room.w + dx) && (i % room.w) + dx >= 0 && (i % room.w) + dx < room.w) ok = true;
        }
        before = now;
      });
      return ok;
    },
  },
  threeRelays: {
    needs: { relay: 3 },
    text: 'At least 3 relays in the room.',
    short: ['at least 3', { el: 'relay' }],
    judge: room => room.cells.filter(c => /^sensor:/.test(c || '')).length >= 3,
  },
  // Register 341: one laser pushed in 3 moves (a push slides it at least one tile).
  laserPushedThrice: {
    text: 'One laser pushed in at least 3 moves.',
    short: [{ el: 'laser' }, 'pushed ×3'],
    judge: (room, moves) => boxMoves(room, moves, 'turret').some(b => b.pushes >= 3),
  },
  // The beam goes through a door, then lights a relay of one of that door's colours: it holds the
  // door it passes through (register 313). A relay before the door would open it for any beam.
  laserHoldsOwnDoor: {
    text: 'Laser through a door that its own relay holds open.',
    short: [{ el: 'laser' }, 'holds its own', { el: 'door' }],
    judge: (room, moves) => {
      let ok = false;
      beams(room, moves, (b, s) => {
        const at = through(b, s).map(p => cellOf(room, p));
        at.forEach((c, i) => { if (c.startsWith('door:') && at.slice(i + 1).some(r => r.startsWith('sensor:') && r.slice(7).split('|').some(col => c.slice(5).split('|').includes(col)))) ok = true; });
      });
      return ok;
    },
  },
  laserOverEveryOneWay: {
    text: 'A laser goes over every one-way.',
    short: [{ el: 'laser' }, 'over every', { el: 'gate' }],
    judge: (room, moves) => allDone(crossed(room, moves, isGate)),
  },
  laserOverEverySpike: {
    text: 'A laser goes over every spike.',
    short: [{ el: 'laser' }, 'over every', { el: 'spikes' }],
    judge: (room, moves) => allDone(crossed(room, moves, isSpike)),
  },
  laserCrossesEverySpike: {
    text: 'A pushable laser crosses every spike.',
    short: [{ el: 'laser' }, 'crosses every', { el: 'spikes' }],
    judge: (room, moves) => allDone(laserOverSpikes(room, moves)),
  },
  // Register 494 (level 14): the robot's slides end against each laser at least twice.
  robotHitsEveryLaserTwice: {
    text: 'Robot collides with every laser 2 or more times.',
    short: [{ el: 'start' }, 'collides with every', { el: 'laser' }, '×2'],
    judge: (room, moves) => {
      const ids = idsOf(room, e => !!e.turret), hits = {};
      robotStops(room, moves, (s, x, y) => { const t = s.entities.find(e => !e.dead && e.turret && e.x === x && e.y === y); if (t) hits[t.id] = (hits[t.id] || 0) + 1; });
      return ids.length > 0 && ids.every(id => (hits[id] || 0) >= 2);
    },
  },
  // Register 495: each box stands in a fixed laser's beam (it stops the beam) and later stands out of every one.
  everyBoxLeavesBeam: {
    text: 'Every box leaves a laser beam.',
    short: ['every', { el: 'box' }, 'leaves a', { el: 'laser' }, 'beam'],
    judge: (room, moves) => {
      const ids = boxIds(room), was = new Set(), left = new Set();
      replayPath(room, moves, s => {
        const fixed = new Set(s.entities.filter(e => !e.dead && e.turret && !e.crate).map(e => e.id));
        const stops = new Set((s.beams || []).filter(b => fixed.has(b.id) && b.stop).map(b => b.stop.join()));
        for (const e of s.entities) { if (e.dead || e.kind !== 'box') continue; if (stops.has(e.x + ',' + e.y)) was.add(e.id); else if (was.has(e.id)) left.add(e.id); }
      });
      return ids.length > 0 && ids.every(id => left.has(id));
    },
  },
  // Register 498: a box stands on a tile with a relay on both sides of it (left and right, or above and below).
  boxBetweenTwoRelays: {
    text: 'Box goes between two relays.',
    short: [{ el: 'box' }, 'between two', { el: 'relay' }],
    judge: (room, moves) => {
      let ok = false;
      const relay = (s, x, y) => x >= 0 && y >= 0 && x < room.w && y < room.h && /^sensor:/.test(s.cells[y * room.w + x] || '');
      replayPath(room, moves, s => { for (const e of s.entities) if (!e.dead && e.kind === 'box' && ((relay(s, e.x - 1, e.y) && relay(s, e.x + 1, e.y)) || (relay(s, e.x, e.y - 1) && relay(s, e.x, e.y + 1)))) ok = true; });
      return ok;
    },
  },
  // Register 499: in one run, a beam goes through an open door and a beam is stopped by a closed one.
  laserThroughAndStoppedByDoor: {
    text: 'Laser through an open door, and stopped by a closed one.',
    short: [{ el: 'laser' }, 'through an open and stopped by a closed', { el: 'door' }],
    judge: (room, moves) => {
      let through_ = false, stopped = false;
      beams(room, moves, (b, s) => { if (through(b, s).some(at => /^door:/.test(s.cells[at[1] * room.w + at[0]] || ''))) through_ = true; if (/^door:/.test(cellOf(room, b.stop))) stopped = true; });
      return through_ && stopped;
    },
  },
  // Register 500: the room had relays and a closing door crushed every one (register 505).
  noRelayAtEnd: {
    text: 'No relay left at the end.',
    short: ['no', { el: 'relay' }, 'at the end'],
    judge: (room, moves) => room.cells.some(c => /^sensor:/.test(c || '')) && !replayPath(room, moves, () => {}).cells.some(c => /^sensor:/.test(c || '')),
  },
};
