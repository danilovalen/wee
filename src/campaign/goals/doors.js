// Goals about doors and inverted doors: going through, colliding, closing, and pushable doors over
// spikes (registers 243, 257, 452). All copy is draft.
import { replayPath } from '../robot.js';
import { STEP, stoppedPushes, cellOf, everyTile, countKind } from './helpers.js';

export const DOOR_GOALS = {
  throughOpenDoor: {
    text: 'Robot through an open door.',
    short: [{ el: 'start' }, 'through an open', { el: 'door' }],
    // A closed door is solid, so standing on a door tile means it is open.
    judge: (room, moves) => {
      let ok = false;
      replayPath(room, moves, s => { if (/^door:/.test(s.cells[s.player.y * room.w + s.player.x] || '')) ok = true; });
      return ok;
    },
  },
  throughDoorsOfTwoColours: {
    needs: { door: 2 },
    text: 'Robot through doors of two colours.',
    short: [{ el: 'start' }, 'through', { el: 'door' }, 'of two colours'],
    // Standing on a door tile means it is open (register 243).
    judge: (room, moves) => {
      const seen = new Set();
      replayPath(room, moves, s => { const c = s.cells[s.player.y * room.w + s.player.x] || ''; if (/^door:/.test(c)) seen.add(c.slice(5)); });
      return seen.size >= 2;
    },
  },
  hitsClosedDoor: {
    text: 'Robot collides with a closed door.',
    short: [{ el: 'start' }, 'collides with a closed', { el: 'door' }],
    // A slide that ends with a closed door on the next tile ahead: the door is what stopped it.
    judge: (room, moves) => {
      let ok = false, dir = null;
      replayPath(room, moves, s => {
        const p = s.player;
        if (dir && !p.dir) {
          const [dx, dy] = STEP[dir], c = s.cells[(p.y + dy) * room.w + p.x + dx] || '';
          if (/^door:/.test(c) && !c.slice(5).split('|').some(col => s.open[col])) ok = true;
        }
        dir = p.dir;
      });
      return ok;
    },
  },
  throughOpenDoorTwice: {
    // Two passes, not two doors (register 257): the row says so.
    text: 'Robot through an open door twice, the same door or another.',
    short: [{ el: 'start' }, '2 passes through an open', { el: 'door' }],
    // One pass is stepping onto a door tile from a tile that is not one: a slide across two
    // doors side by side passes once.
    judge: (room, moves) => {
      let passes = 0, was = false;
      replayPath(room, moves, s => {
        const on = /^door:/.test(s.cells[s.player.y * room.w + s.player.x] || '');
        if (on && !was) passes++;
        was = on;
      });
      return passes >= 2;
    },
  },
  doorClosedAtEnd: {
    text: 'Every door closed at the end.',
    short: ['every', { el: 'door' }, 'closed at the end'],
    judge: (room, moves) => {
      const end = replayPath(room, moves, () => {});
      return !Object.values(end.open).some(Boolean);
    },
  },
  boxThroughOpenDoor: {
    text: 'Box into an open doorway.',
    short: [{ el: 'box' }, 'into an open', { el: 'door' }],
    // A closed door is solid, so a box on a door tile means it is open.
    judge: (room, moves) => {
      let ok = false;
      replayPath(room, moves, s => { if (s.entities.some(e => !e.dead && e.kind === 'box' && /^door:/.test(s.cells[e.y * room.w + e.x] || ''))) ok = true; });
      return ok;
    },
  },
  boxCrossesOpenDoor: {
    text: 'Box through an open door and out the other side.',
    short: [{ el: 'box' }, 'crosses an open', { el: 'door' }],
    // Like a one-way: in through the door and off the far side; a box left on the door tile has not crossed.
    judge: (room, moves) => {
      const isDoor = (x, y) => /^door:/.test(room.cells[y * room.w + x] || '');
      let ok = false, was = {};
      replayPath(room, moves, s => {
        const now = {};
        for (const e of s.entities) {
          if (e.dead || e.kind !== 'box') continue;
          const b = was[e.id], here = isDoor(e.x, e.y);
          if (!b) { now[e.id] = { x: e.x, y: e.y, din: null }; continue; }
          const d = [e.x - b.x, e.y - b.y], moved = d[0] || d[1];
          if (moved && b.din && !here && d[0] === b.din[0] && d[1] === b.din[1]) ok = true;
          now[e.id] = { x: e.x, y: e.y, din: here ? (moved ? (b.din || d) : b.din) : null };
        }
        was = now;
      });
      return ok;
    },
  },
  boxCrushedByDoor: {
    text: 'Box crushed by a closing door.',
    short: [{ el: 'box' }, 'crushed by a', { el: 'door' }],
    // A plain box does not hold a door open: a door closing on its doorway destroys the box in it.
    judge: (room, moves) => {
      const boxes = new Set(room.entities.filter(e => e.kind === 'box').map((e, i) => e.id ?? i));
      let ok = false;
      replayPath(room, moves, s => { if (s.events.some(ev => ev.type === 'kill' && ev.how === 'door' && s.entities.some(e => e.id === ev.id && e.kind === 'box'))) ok = true; });
      return ok && boxes.size > 0;
    },
  },
  // Inverted doors (registers 311, 312): open until their colour is held.
  robotThroughIdoor: {
    text: 'Robot through an inverted door.',
    short: [{ el: 'start' }, 'through an open', { el: 'idoor' }],
    judge: (room, moves) => { let ok = false; replayPath(room, moves, s => { if (/^idoor:/.test(s.cells[s.player.y * room.w + s.player.x] || '')) ok = true; }); return ok; },
  },
  boxHitsIdoor: {
    text: 'Box collides with a closed inverted door.',
    short: [{ el: 'box' }, 'collides with a closed', { el: 'idoor' }],
    judge: (room, moves) => stoppedPushes(room, moves).out.some(h => { const c = cellOf(room, [h.x, h.y]); return c.startsWith('idoor:') && c.slice(6).split('|').some(col => h.open[col]); }),
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
  everyDoorOverSpikes: {
    text: 'Every door goes over spikes.',
    short: ['every', { el: 'door' }, 'over', { el: 'spikes' }],
    judge: (room, moves) => everyTile(room, moves, 'door', t => t.spikes),
  },
  boxLeavesEveryDoor: {
    text: 'A box leaves every door.',
    short: [{ el: 'box' }, 'leaves every', { el: 'door' }],
    judge: (room, moves) => everyTile(room, moves, 'door', t => t.boxLeft),
  },
  robotLeavesEveryDoor: {
    text: 'Robot leaves every door.',
    short: [{ el: 'start' }, 'leaves every', { el: 'door' }],
    judge: (room, moves) => everyTile(room, moves, 'door', t => t.robotLeft),
  },
  twoDoors: {
    needs: { door: 2 },
    text: 'At least 2 doors in the room.',
    short: ['at least 2', { el: 'door' }],
    judge: room => countKind(room, 'door') >= 2,
  },
};
