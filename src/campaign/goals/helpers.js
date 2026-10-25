// What the goals read of a path, shared by every goal file (register 462): one replay per path
// (src/campaign/robot.js), followed here as pushes, beams, one-ways, boxes and tiles.
import { replayPath } from '../robot.js';
import { gateDirs } from '../../rules/grid.js';
import { OPPOSITE } from '../../rules/base.js';

export const STEP = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };

// The toggles a path turns on, and the ones it turns on and later off again.
export function toggleHistory(room, moves) {
  const on = new Set(), onOff = new Set();
  replayPath(room, moves, s => {
    for (const i of s.toggled) on.add(i);
    for (const i of on) if (!s.toggled.includes(i)) onOff.add(i);
  });
  return { on, onOff, all: room.cells.flatMap((c, i) => c.startsWith('toggle:') ? [i] : []) };
}

export const live = (s, x, y) => s.entities.find(e => !e.dead && e.kind === 'box' && e.x === x && e.y === y);

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
export const switches = room => room.cells.flatMap((c, i) => c.startsWith('toggle:') ? [i] : []);
export const boxCount = room => room.entities.filter(e => e.kind === 'box').length;

// Every laser beam at every tick of a path: its cells (the turret's own first) and the cell that stopped it.
export function beams(room, moves, see) {
  replayPath(room, moves, s => { for (const b of s.beams || []) see(b, s); });
}
// Every laser in the room had a beam that passed the test at some tick.
export function everyLaser(room, moves, test) {
  const all = new Set(), met = new Set();
  beams(room, moves, (b, s) => {
    for (const e of s.entities) if (e.turret && !e.dead) all.add(e.id);
    if (test(b)) met.add(b.id);
  });
  return all.size > 0 && [...all].every(id => met.has(id));
}
// The tiles a beam goes through: past the turret, and not the one where a piece or the robot stops it.
export const through = (b, s) => b.path.slice(1).filter(([x, y]) => !(s.player.x === x && s.player.y === y) && !s.entities.some(e => !e.dead && !e.turret && e.x === x && e.y === y));
export const relaysOf = s => s.cells.flatMap((c, i) => /^sensor:/.test(c || '') ? [i] : []);
export const cellOf = (room, at) => at && at[0] >= 0 && at[1] >= 0 && at[0] < room.w && at[1] < room.h ? room.cells[at[1] * room.w + at[0]] || '' : '';

export const gates = room => room.cells.flatMap((c, i) => c.startsWith('gate:') ? [i] : []);
// The one-way that stopped a slide going d from (x, y), or -1. With the campaign's pieces a slide
// never ends before a one-way it could enter; the arrow check keeps a future piece honest.
// A coloured one-way is read as it points at that tick.
export function blocker(room, s, x, y, d) {
  const [dx, dy] = STEP[d] || [0, 0], nx = x + dx, ny = y + dy;
  if (nx < 0 || ny < 0 || nx >= room.w || ny >= room.h) return -1;
  const ds = gateDirs(s, room.cells[ny * room.w + nx] || '');
  return ds && !ds.includes(d) ? ny * room.w + nx : -1;
}
// The way a piece left (a, b): one tile, or a slide's last tile.
export const way = (a, b) => b.x > a.x ? 'right' : b.x < a.x ? 'left' : b.y > a.y ? 'down' : 'up';
export const both = ways => Object.values(ways).some(set => [...set].some(d => set.has(OPPOSITE[d])));

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

// For each box in the room, over a path: whether it stood on a tile of this kind, and whether it
// later stood off it (leaving means it was there), and how near it came to one before standing on it.
export function boxesLeaving(room, moves, cell) {
  const by = new Map();
  replayPath(room, moves, s => {
    const tiles = s.cells.flatMap((c, i) => c === cell ? [[i % s.w, Math.floor(i / s.w)]] : []);
    for (const e of s.entities) {
      if (e.dead || e.kind !== 'box') continue;
      const b = by.get(e.id) || { was: false, left: false, d: Infinity };
      if (s.cells[e.y * s.w + e.x] === cell) b.was = true; else if (b.was) b.left = true;
      for (const [x, y] of tiles) b.d = Math.min(b.d, Math.abs(e.x - x) + Math.abs(e.y - y));
      by.set(e.id, b);
    }
  });
  return [...by.values()];
}
export const everyBoxLeaves = (room, moves, cell) => { const bs = boxesLeaving(room, moves, cell); return bs.length > 0 && bs.every(b => b.left); };

export const KIND = { gate: 'gate:', door: 'door:' };
// Per pushable tile of a kind, over a path, followed by its id (register 461): whether a box pushed it,
// whether it stood over spikes, and whether the robot and a box each stood in it and later off it.
export function tileLog(room, moves, kind) {
  const log = new Map();
  replayPath(room, moves, s => {
    for (const t of s.tiles) {
      if (!t.cell.startsWith(KIND[kind])) continue;
      const l = log.get(t.id) || { byBox: false, spikes: false, robotIn: false, robotLeft: false, boxIn: false, boxLeft: false };
      log.set(t.id, l);
      if (s.ground[t.y * s.w + t.x] === 'death') l.spikes = true;
      const you = s.player.x === t.x && s.player.y === t.y, box = s.entities.some(e => !e.dead && e.kind === 'box' && e.x === t.x && e.y === t.y);
      if (you) l.robotIn = true; else if (l.robotIn) l.robotLeft = true;
      if (box) l.boxIn = true; else if (l.boxIn) l.boxLeft = true;
    }
    for (const ev of s.events) if (ev.type === 'tilePush' && ev.by === 'box' && log.has(ev.id)) log.get(ev.id).byBox = true;
  });
  return [...log.values()];
}
export const everyTile = (room, moves, kind, f) => { const ts = tileLog(room, moves, kind); return ts.length > 0 && ts.every(f); };
export const countKind = (room, kind) => room.cells.filter(c => (c || '').startsWith(KIND[kind])).length;

export const cellsWhere = (room, test) => room.cells.flatMap((c, i) => test(c || '') ? [i] : []);
export const isGate = c => c.startsWith('gate:');
export const isSpike = c => c === 'death';
// Which of the room's tiles of a kind a beam crossed at some tick.
export function crossed(room, moves, test) {
  const want = new Set(cellsWhere(room, test)), got = new Set();
  replayPath(room, moves, s => { for (const b of s.beams || []) for (const [x, y] of b.path.slice(1)) if (want.has(y * room.w + x)) got.add(y * room.w + x); });
  return { want, got };
}
// Which spikes a pushable laser stood on and later left.
export function laserOverSpikes(room, moves) {
  const want = new Set(cellsWhere(room, isSpike)), on = new Map(), left = new Set();
  replayPath(room, moves, s => {
    for (const e of s.entities) {
      if (e.dead || e.kind !== 'turret' || !e.crate) continue;
      const i = e.y * room.w + e.x, was = on.get(e.id);
      if (was != null && was !== i) left.add(was);
      on.set(e.id, want.has(i) ? i : was != null && was !== i ? null : was);
    }
  });
  return { want, left };
}
export const allDone = ({ want, got, left }) => want.size > 0 && [...want].every(i => (got || left).has(i));
