// Goals about one-ways. Going through one is entering it along its arrow and leaving off the far
// side; colliding with one is a slide that ends against it, from any direction it does not let
// through. Pushable one-ways are followed as they move (registers 448, 461). All copy is draft.
import { OPPOSITE } from '../../rules/base.js';
import { gates, both, oneWayLog, everyTile, countKind, cellsWhere, isGate, boxIds } from './helpers.js';

export const ONE_WAY_GOALS = {
  robotThroughOneWayBothWays: {
    text: 'Robot through a one-way both ways.',
    short: [{ el: 'start' }, 'through a', { el: 'gate' }, 'both ways'],
    judge: (room, moves) => both(oneWayLog(room, moves).robotWays),
  },
  boxThroughOneWayBothWays: {
    text: 'Box through a one-way both ways.',
    short: [{ el: 'box' }, 'through a', { el: 'gate' }, 'both ways'],
    judge: (room, moves) => both(oneWayLog(room, moves).boxWays),
  },
  robotThroughEveryOneWay: {
    text: 'Robot through every one-way.',
    short: [{ el: 'start' }, 'through every', { el: 'gate' }],
    judge: (room, moves) => { const all = gates(room), l = oneWayLog(room, moves); return all.length > 0 && all.every(i => l.robotThrough.has(i)); },
  },
  robotThroughOneWay: {
    text: 'Robot through a one-way.',
    short: [{ el: 'start' }, 'through a', { el: 'gate' }],
    judge: (room, moves) => oneWayLog(room, moves).robotThrough.size > 0,
  },
  robotHitsEveryOneWay: {
    text: 'Robot collides with every one-way.',
    short: [{ el: 'start' }, 'collides with every', { el: 'gate' }],
    judge: (room, moves) => { const all = gates(room), l = oneWayLog(room, moves); return all.length > 0 && all.every(i => l.robotHits[i]); },
  },
  boxThroughOneWay: {
    text: 'Box through a one-way.',
    short: [{ el: 'box' }, 'through a', { el: 'gate' }],
    judge: (room, moves) => oneWayLog(room, moves).boxThrough > 0,
  },
  boxHitsOneWay: {
    text: 'Box collides with a one-way.',
    short: [{ el: 'box' }, 'collides with a', { el: 'gate' }],
    judge: (room, moves) => Object.values(oneWayLog(room, moves).boxHits).some(n => n >= 1),
  },
  boxHitsOneWayTwice: {
    text: 'Box collides with a one-way twice.',
    short: [{ el: 'box' }, 'collides with a', { el: 'gate' }, '×2'],
    judge: (room, moves) => Object.values(oneWayLog(room, moves).boxHits).some(n => n >= 2),
  },
  boxStuckOnOneWay: {
    text: 'Box ends on a one-way.',
    short: [{ el: 'box' }, 'ends on a', { el: 'gate' }],
    judge: (room, moves) => oneWayLog(room, moves).boxStuck,
  },
  oneWaysThreeWays: {
    text: 'One-ways pointing at least three ways.',
    short: [{ el: 'gate' }, 'pointing 3 ways'],
    judge: room => new Set(room.cells.filter(c => c.startsWith('gate:')).flatMap(c => c.slice(5).split('@')[0].split(','))).size >= 3,
  },
  boxPushesEveryOneWay: {
    text: 'A box pushes every one-way.',
    short: [{ el: 'box' }, 'pushes every', { el: 'gate' }],
    judge: (room, moves) => everyTile(room, moves, 'gate', t => t.byBox),
  },
  robotThroughEveryPushedOneWay: {
    text: 'Robot through every one-way.',
    short: [{ el: 'start' }, 'through every', { el: 'gate' }],
    judge: (room, moves) => everyTile(room, moves, 'gate', t => t.robotLeft),
  },
  everyOneWayOverSpikes: {
    text: 'Every one-way goes over spikes.',
    short: ['every', { el: 'gate' }, 'over', { el: 'spikes' }],
    judge: (room, moves) => everyTile(room, moves, 'gate', t => t.spikes),
  },
  twoOneWays: {
    needs: { gate: 2 },
    text: 'At least 2 one-ways in the room.',
    short: ['at least 2', { el: 'gate' }],
    judge: room => countKind(room, 'gate') >= 2,
  },
  robotThroughEveryOneWayBothWays: {
    text: 'Robot through every one-way both ways.',
    short: [{ el: 'start' }, 'through every', { el: 'gate' }, 'both ways'],
    judge: (room, moves) => {
      const gs = cellsWhere(room, isGate), w = oneWayLog(room, moves).robotWays;
      return gs.length > 0 && gs.every(i => w[i] && [...w[i]].some(d => w[i].has(OPPOSITE[d])));
    },
  },
  threeOneWays: {
    needs: { gate: 3 },
    text: 'At least 3 one-ways in the room.',
    short: ['at least 3', { el: 'gate' }],
    judge: room => countKind(room, 'gate') >= 3,
  },
  // Register 502: the arrows the room's one-ways point, counted as directions.
  oneWaysTwoWays: {
    needs: { gate: 2 },
    text: 'One-ways pointing at least two ways.',
    short: [{ el: 'gate' }, 'pointing 2 ways'],
    judge: room => new Set(room.cells.filter(c => c.startsWith('gate:')).flatMap(c => c.slice(5).split('@')[0].split(','))).size >= 2,
  },
  // Register 489 (level 10): the box goals, for every box.
  everyBoxThroughOneWay: {
    text: 'Every box through a one-way.',
    short: ['every', { el: 'box' }, 'through a', { el: 'gate' }],
    judge: (room, moves) => { const ids = boxIds(room), l = oneWayLog(room, moves); return ids.length > 0 && ids.every(id => l.boxThroughIds.has(id)); },
  },
  everyBoxHitsOneWay: {
    text: 'Every box collides with a one-way.',
    short: ['every', { el: 'box' }, 'collides with a', { el: 'gate' }],
    judge: (room, moves) => { const ids = boxIds(room), l = oneWayLog(room, moves); return ids.length > 0 && ids.every(id => l.boxHits[id]); },
  },
  everyBoxStuckOnOneWay: {
    text: 'Every box ends on a one-way.',
    short: ['every', { el: 'box' }, 'ends on a', { el: 'gate' }],
    judge: (room, moves) => oneWayLog(room, moves).boxesStuck,
  },
  // Register 491: boxes collide with one-ways while moving three different ways.
  boxHitsOneWayThreeWays: {
    text: 'Box collides with a one-way from three directions.',
    short: [{ el: 'box' }, 'collides with a', { el: 'gate' }, 'from 3 directions'],
    judge: (room, moves) => oneWayLog(room, moves).boxHitDirs.size >= 3,
  },
  // Register 504: a pushable laser collides with each one-way at least twice.
  laserBoxHitsEveryOneWayTwice: {
    text: 'Laser box collides with every one-way 2 or more times.',
    short: [{ el: 'laser' }, 'collides with every', { el: 'gate' }, '×2'],
    judge: (room, moves) => { const all = gates(room), h = oneWayLog(room, moves, 'turret').gateHits; return all.length > 0 && all.every(i => (h[i] || 0) >= 2); },
  },
};
