// What a level can require of the robot's shortest paths, each judged on one path from every
// tick of its replay; and a path drawn on its room. All copy is draft.
import { replayPath } from './robot.js';
import { ONE_WAY_REQUIREMENTS } from './oneWay.js';
import { EXTRA_REQUIREMENTS } from './extras.js';


// What each move of a path did to each box: a push is the robot moving the box it touches at least
// one tile (a box carried along in a train is not pushed, register 278); a hit is a slide of the robot
// (it moved) that ends against the box without moving it. Each move is replayed alone.
export function boxMoves(room, moves) {
  const at = (n, from = 0) => {
    let dir = null, tick = 0;
    const touched = new Set();
    const s = replayPath(room, moves.slice(0, n), t => { if (t.player.dir) dir = t.player.dir; if (tick++ >= from && t.player.pushing) touched.add(String(t.player.pushing.id)); });
    return { s, dir, ticks: tick, touched, boxes: Object.fromEntries(s.entities.filter(e => !e.dead && e.kind === 'box').map(e => [e.id, e.x + ',' + e.y])) };
  };
  const out = {};
  let was = at(0);
  for (let n = 1; n <= moves.length; n++) {
    const now = at(n, was.ticks), [dx, dy] = STEP[now.dir] || [0, 0], p = now.s.player;
    const ahead = now.s.entities.find(e => !e.dead && e.kind === 'box' && e.x === p.x + dx && e.y === p.y + dy);
    for (const id of Object.keys(was.boxes)) {
      const b = out[id] ||= { pushes: 0, hits: 0 };
      if (now.boxes[id] !== undefined && now.boxes[id] !== was.boxes[id]) { if (now.touched.has(id)) b.pushes++; }
      else if (ahead && String(ahead.id) === id && (p.x !== was.s.player.x || p.y !== was.s.player.y)) b.hits++;
    }
    was = now;
  }
  return Object.values(out);
}
const STEP = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
export const REQUIREMENTS = {
  throughOpenDoor: {
    text: 'Robot through an open door.',
    short: [{ el: 'start' }, 'through an open', { el: 'door' }],
    // A closed door is solid, so standing on a door tile means it is open.
    judge: (room, moves) => {
      let ok = false;
      replayPath(room, moves, s => { if (/^door:/.test(room.cells[s.player.y * room.w + s.player.x] || '')) ok = true; });
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
      replayPath(room, moves, s => { const c = room.cells[s.player.y * room.w + s.player.x] || ''; if (/^door:/.test(c)) seen.add(c.slice(5)); });
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
          const [dx, dy] = STEP[dir], c = room.cells[(p.y + dy) * room.w + p.x + dx] || '';
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
        const on = /^door:/.test(room.cells[s.player.y * room.w + s.player.x] || '');
        if (on && !was) passes++;
        was = on;
      });
      return passes >= 2;
    },
  },
  touchBlockFourTimes: {
    text: 'Robot touches the same block 4 times.',
    short: ['touch one', { el: 'block' }, '×4'],
    // A touch is a slide that ends against a block, as a collision ends against a door.
    judge: (room, moves) => {
      const touches = {};
      let dir = null;
      replayPath(room, moves, s => {
        const p = s.player;
        if (dir && !p.dir) {
          const [dx, dy] = STEP[dir], x = p.x + dx, y = p.y + dy;
          if (x >= 0 && y >= 0 && x < room.w && y < room.h && room.cells[y * room.w + x] === 'wall') touches[y * room.w + x] = (touches[y * room.w + x] || 0) + 1;
        }
        dir = p.dir;
      });
      return Object.values(touches).some(n => n >= 4);
    },
  },
  boxOffButtonAtEnd: {
    text: 'Every box off its button at the end.',
    short: ['every', { el: 'box' }, 'off the', { el: 'button' }, 'at the end'],
    judge: (room, moves) => {
      const end = replayPath(room, moves, () => {});
      return end.entities.filter(e => !e.dead && e.kind === 'box').every(e => !(room.cells[e.y * room.w + e.x] || '').startsWith('button:'));
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
};

// The toggles a path turns on, and the ones it turns on and later off again.
function toggleHistory(room, moves) {
  const on = new Set(), onOff = new Set();
  replayPath(room, moves, s => {
    for (const i of s.toggled) on.add(i);
    for (const i of on) if (!s.toggled.includes(i)) onOff.add(i);
  });
  return { on, onOff, all: room.cells.flatMap((c, i) => c.startsWith('toggle:') ? [i] : []) };
}
Object.assign(REQUIREMENTS, {
  everyToggleOn: {
    text: 'Every switch turns on.',
    short: ['every', { el: 'toggle' }, 'turns on'],
    judge: (room, moves) => { const h = toggleHistory(room, moves); return h.all.length > 0 && h.all.every(i => h.on.has(i)); },
  },
  boxThroughOpenDoor: {
    text: 'Box into an open doorway.',
    short: [{ el: 'box' }, 'into an open', { el: 'door' }],
    // A closed door is solid, so a box on a door tile means it is open.
    judge: (room, moves) => {
      let ok = false;
      replayPath(room, moves, s => { if (s.entities.some(e => !e.dead && e.kind === 'box' && /^door:/.test(room.cells[e.y * room.w + e.x] || ''))) ok = true; });
      return ok;
    },
  },
  onlyBoxesFlipSwitches: {
    text: 'Only boxes turn switches on and off; the robot never crosses one.',
    short: ['only', { el: 'box' }, 'flips', { el: 'toggle' }],
    judge: (room, moves) => {
      let robot = false, flipped = false;
      replayPath(room, moves, s => {
        if ((room.cells[s.player.y * room.w + s.player.x] || '').startsWith('toggle:')) robot = true;
        if (s.toggled.length) flipped = true;
      });
      return flipped && !robot;
    },
  },
  boxPushedThrice: {
    text: 'One box pushed in at least 3 moves.',
    short: [{ el: 'box' }, 'pushed ×3'],
    judge: (room, moves) => boxMoves(room, moves).some(b => b.pushes >= 3),
  },
  boxPushedTwiceHitOnce: {
    text: 'One box pushed in at least 2 moves, and hit once by the robot without moving.',
    short: [{ el: 'box' }, 'pushed ×2, collided ×1'],
    judge: (room, moves) => boxMoves(room, moves).some(b => b.pushes >= 2 && b.hits >= 1),
  },
  // Level 5 (register 263): each box must do both, so a second box cannot share the work.
  everyBoxPushedTwice: {
    text: 'Every box pushed in at least 2 moves.',
    short: ['every', { el: 'box' }, 'pushed 2 times'],
    judge: (room, moves) => { const b = boxMoves(room, moves); return b.length > 0 && b.every(x => x.pushes >= 2); },
  },
  everyBoxHitOnce: {
    text: 'Robot collides with every box without moving it.',
    short: [{ el: 'start' }, 'collides with every', { el: 'box' }],
    judge: (room, moves) => { const b = boxMoves(room, moves); return b.length > 0 && b.every(x => x.hits >= 1); },
  },
  everyToggleOffAtEnd: {
    text: 'Every switch off at the end.',
    short: ['every', { el: 'toggle' }, 'off at the end'],
    judge: (room, moves) => room.cells.some(c => c.startsWith('toggle:')) && replayPath(room, moves, () => {}).toggled.length === 0,
  },
  everyToggleOnThenOff: {
    text: 'Every switch turns on, then off again.',
    short: ['every', { el: 'toggle' }, 'on, then off'],
    judge: (room, moves) => { const h = toggleHistory(room, moves); return h.all.length > 0 && h.all.every(i => h.onOff.has(i)); },
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
}, ONE_WAY_REQUIREMENTS, EXTRA_REQUIREMENTS);

// A path drawn on its room: where the robot is after each move, and each box's places in order.
export function trailOf(room, moves) {
  const at = n => replayPath(room, moves.slice(0, n), () => {});
  const states = Array.from({ length: moves.length + 1 }, (_, n) => at(n));
  const robot = states.map(s => ({ x: s.player.x, y: s.player.y }));
  const boxes = states[0].entities.filter(e => e.kind === 'box').map(b => {
    const spots = [];
    for (const s of states) {
      const e = s.entities.find(e => e.id === b.id && !e.dead);
      if (e && (!spots.length || spots.at(-1).x !== e.x || spots.at(-1).y !== e.y)) spots.push({ x: e.x, y: e.y });
    }
    return spots;
  }).filter(spots => spots.length > 1);
  return { robot, boxes };
}
