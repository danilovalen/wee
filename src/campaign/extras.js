// More goals a level can ask of a path or of the room (registers 262-269). A box collides when the
// robot's push ends with something stopping the box, and the box moved in that push. All copy is draft.
import { replayPath } from './robot.js';
import { boxMoves } from './pushes.js';

const STEP = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const live = (s, x, y) => s.entities.find(e => !e.dead && e.kind === 'box' && e.x === x && e.y === y);

// Every push that ended with its box stopped: the box and the tile past it, with the state then.
export function stoppedPushes(room, moves) {
  const out = [];
  let dir = null, last = {}, before = {};
  const end = replayPath(room, moves, s => {
    const p = s.player;
    if (p.dir && !dir) before = last;
    if (dir && !p.dir) {
      const [dx, dy] = STEP[dir], box = live(s, p.x + dx, p.y + dy);
      if (box && before[box.id] !== box.x + ',' + box.y) out.push({ box, x: box.x + dx, y: box.y + dy, open: { ...s.open }, s });
    }
    dir = p.dir;
    last = Object.fromEntries(s.entities.map(e => [e.id, e.x + ',' + e.y]));
  });
  return { out, end };
}
const switches = room => room.cells.flatMap((c, i) => c.startsWith('toggle:') ? [i] : []);
const boxes = room => room.entities.filter(e => e.kind === 'box').length;

// Every laser beam at every tick of a path: its cells (the turret's own first) and the cell that stopped it.
function beams(room, moves, see) {
  replayPath(room, moves, s => { for (const b of s.beams || []) see(b, s); });
}
// Every laser in the room had a beam that passed the test at some tick.
function everyLaser(room, moves, test) {
  const all = new Set(), met = new Set();
  beams(room, moves, (b, s) => {
    for (const e of s.entities) if (e.turret && !e.dead) all.add(e.id);
    if (test(b)) met.add(b.id);
  });
  return all.size > 0 && [...all].every(id => met.has(id));
}
// The tiles a beam goes through: past the turret, and not the one where a piece or the robot stops it.
const through = (b, s) => b.path.slice(1).filter(([x, y]) => !(s.player.x === x && s.player.y === y) && !s.entities.some(e => !e.dead && !e.turret && e.x === x && e.y === y));
const relaysOf = s => s.cells.flatMap((c, i) => /^sensor:/.test(c || '') ? [i] : []);
const cellOf = (room, at) => at && at[0] >= 0 && at[1] >= 0 && at[0] < room.w && at[1] < room.h ? room.cells[at[1] * room.w + at[0]] || '' : '';

export const EXTRA_REQUIREMENTS = {
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
  robotOnButton: {
    text: 'Robot steps on a button.',
    short: [{ el: 'start' }, 'steps on a', { el: 'button' }],
    judge: (room, moves) => {
      let ok = false;
      replayPath(room, moves, s => { if ((s.cells[s.player.y * room.w + s.player.x] || '').startsWith('button:')) ok = true; });
      return ok;
    },
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
  twoTogglesOffAtEnd: {
    needs: { toggle: 2 },
    text: 'At least 2 switches off at the end.',
    short: ['2', { el: 'toggle' }, 'off at the end'],
    judge: (room, moves) => switches(room).length - replayPath(room, moves, () => {}).toggled.length >= 2,
  },
  thirdToggleOnAtEnd: {
    needs: { toggle: 3 },
    text: 'Third switch on at the end.',
    short: ['a 3rd', { el: 'toggle' }, 'on at the end'],
    judge: (room, moves) => switches(room).length >= 3 && replayPath(room, moves, () => {}).toggled.length >= 1,
  },
  aToggleOffAtEnd: {
    text: 'At least one switch off at the end.',
    short: ['a', { el: 'toggle' }, 'off at the end'],
    judge: (room, moves) => switches(room).length > replayPath(room, moves, () => {}).toggled.length,
  },
  // Register 277: a box on a coloured one-way when it turns is thrown out the other way.
  boxLaunched: {
    text: 'One-way turns and throws out the box on it.',
    short: [{ el: 'gate' }, 'throws a', { el: 'box' }, 'out'],
    judge: (room, moves) => {
      let ok = false;
      replayPath(room, moves, s => { if (s.events.some(e => e.type === 'launch' && live(s, e.x, e.y))) ok = true; });
      return ok;
    },
  },
  boxHitsBox: {
    needs: { box: 2 },
    text: 'Box collides with another box.',
    short: [{ el: 'box' }, 'collides with a', { el: 'box' }],
    judge: (room, moves) => stoppedPushes(room, moves).out.some(h => live(h.s, h.x, h.y)),
  },
  boxOnButtonAtEnd: {
    text: 'Box on a button at the end.',
    short: [{ el: 'box' }, 'on a', { el: 'button' }, 'at the end'],
    judge: (room, moves) => { const end = replayPath(room, moves, () => {}); return end.entities.some(e => !e.dead && e.kind === 'box' && /^button:/.test(end.cells[e.y * room.w + e.x] || '')); },
  },
  noBoxAtEnd: {
    text: 'No box left at the end.',
    short: ['no', { el: 'box' }, 'at the end'],
    judge: (room, moves) => boxes(room) > 0 && !replayPath(room, moves, () => {}).entities.some(e => !e.dead && e.kind === 'box'),
  },
  oneWaysThreeWays: {
    text: 'One-ways pointing at least three ways.',
    short: [{ el: 'gate' }, 'pointing 3 ways'],
    judge: room => new Set(room.cells.filter(c => c.startsWith('gate:')).flatMap(c => c.slice(5).split('@')[0].split(','))).size >= 3,
  },
  lasersTwoWays: {
    needs: { laser: 2 },
    text: 'Lasers pointing at least two ways.',
    short: [{ el: 'laser' }, 'pointing 2 ways'],
    judge: room => new Set(room.entities.filter(e => e.turret).map(e => e.turret.dirs[0])).size >= 2,
  },
  // Inverted doors (registers 311, 312): open until their colour is held.
  robotThroughIdoor: {
    text: 'Robot through an inverted door.',
    short: [{ el: 'start' }, 'through an open', { el: 'idoor' }],
    judge: (room, moves) => { let ok = false; replayPath(room, moves, s => { if (/^idoor:/.test(s.cells[s.player.y * room.w + s.player.x] || '')) ok = true; }); return ok; },
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
  boxHitsIdoor: {
    text: 'Box collides with a closed inverted door.',
    short: [{ el: 'box' }, 'collides with a closed', { el: 'idoor' }],
    judge: (room, moves) => stoppedPushes(room, moves).out.some(h => { const c = cellOf(room, [h.x, h.y]); return c.startsWith('idoor:') && c.slice(6).split('|').some(col => h.open[col]); }),
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
  boxHitsTwoDoors: {
    needs: { door: 2 },
    text: 'Box collides with two different closed doors.',
    short: [{ el: 'box' }, 'collides with 2 closed', { el: 'door' }],
    judge: (room, moves) => {
      const hit = new Set();
      for (const h of stoppedPushes(room, moves).out) {
        const c = h.x >= 0 && h.y >= 0 && h.x < room.w && h.y < room.h ? room.cells[h.y * room.w + h.x] || '' : '';
        if (c.startsWith('door:') && !c.slice(5).split('|').some(col => h.open[col])) hit.add(h.y * room.w + h.x);
      }
      return hit.size >= 2;
    },
  },
};
