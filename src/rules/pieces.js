// Pieces that move by themselves: patrols, sliding pieces, springs, and the world step.
import { DIRS, ENEMY, MOVES, wades } from './base.js';
import { turnTurrets } from './beams.js';
import { crushes, entAt, inb, playerAt, pushTo, stepTo } from './grid.js';
import { die, kill, land, refreshDoors } from './life.js';
import { carry, entered, stick, stuckTo } from './sticky.js';

// A hide is one cycle with no direction: each on-your-move piece slides along its
// patrol until something stops it, a tile per tick (see step), and turns there.
export function hideCycle(s) {
  s.worldSteps++;
  s.move++;
  for (const e of s.entities) if (!e.dead && e.mode === 'input' && MOVES.includes(e.kind)) launch(s, e);
  turnTurrets(s, 'input');
  refreshDoors(s);
}

// A moving piece goes like you do, on ice: once started it slides a tile per tick until
// something stops it. A patrol then turns; a follower just stops.
export function rushOnce(s, e) {
  const x = e.x, y = e.y;
  moveMover(s, e, e.rushDir, true);
  if (e.x === x && e.y === y) { e.rush = false; e.rushDir = null; }
}

// Starts a piece's slide, at most once per move of yours (s.move), and not while one is going.
const launch = (s, e, d) => {
  if (e.rush || e.lastMove === s.move) return;
  e.rush = true; e.rushDir = d || null; e.lastMove = s.move;
};

// d is the way the player moved for this step, which 'follow' pieces and turrets copy.
export function worldStep(s, d) {
  s.worldSteps++;
  for (const e of s.entities) {
    if (e.dead || !MOVES.includes(e.kind) || e.slide) continue;
    if (e.mode === 'input') launch(s, e);
    else if (e.mode === 'follow') launch(s, e, d);
  }
  for (const e of s.entities) if (!e.dead && e.turret && e.turret.mode === 'follow' && e.turret.dirs.includes(d)) e.turret.aim = e.turret.dirs.indexOf(d);
  refreshDoors(s);
}

export const patrolDir = e => e.axis === 'h' ? (e.dir > 0 ? 'right' : 'left') : (e.dir > 0 ? 'down' : 'up');

// Moves one tile along its patrol, or the given way. Blocked, it stays and turns its
// patrol. A triangle turns a patrol onto the other axis.
export function moveMover(s, e, d, turned) {
  const t = stepTo(s, e.x, e.y, d || patrolDir(e), wades(e)), ridden = stuckTo(s) === e;
  let pushed = false;
  // Blocked, a patrol turns and moves the other way in the same step; a follower waits.
  const blocked = () => { if (d) return; e.dir = -e.dir; if (!turned) moveMover(s, e, null, true); };
  if (!t) { blocked(); return; }
  if (t.death) { kill(s, e, 'death'); return; }
  const o = entAt(s, t.x, t.y, e);
  let b;
  if (o) {
    if (o.kind === 'box' && (b = pushTo(s, t.x, t.y, t.d, false))) land(s, o, b);
    else { blocked(); return; }
  }
  if (playerAt(s, t.x, t.y)) {
    if (ENEMY.includes(e.kind)) {
      if (!crushes(s, e)) { blocked(); return; }
      e.x = t.x; e.y = t.y;
      die(s);
      return;
    }
    const p = s.player;
    if ((b = pushTo(s, t.x, t.y, t.d, p.swimming)) && b.death) die(s);
    else if (b) { p.x = b.x; p.y = b.y; pushed = true; s.events.push({ type: 'pushed' }); if (p.sticky) stick(s, e); entered(s); }
    else if (!crushes(s, e)) { blocked(); return; }
    else { e.x = t.x; e.y = t.y; die(s); return; }
  }
  const mx = t.x - e.x, my = t.y - e.y;
  e.x = t.x; e.y = t.y;
  if (ridden && !pushed && stuckTo(s) === e) carry(s, mx, my);
  if (!d) { e.axis = t.d === 'left' || t.d === 'right' ? 'h' : 'v'; e.dir = t.d === 'right' || t.d === 'down' ? 1 : -1; }
}

// A sliding heavy box breaks what it runs into: enemies and light boxes.
const CRUSHABLE = ['enemy', 'strong', 'box'];

// A piece sliding on its own (a thrown heavy box, anything a spring launched) goes a
// tile per tick until something stops it. A heavy box squashes enemies, light boxes and you; an
// enemy that reaches you kills you; anything else just stops.
export function slidePiece(s, e) {
  const t = stepTo(s, e.x, e.y, e.slide, wades(e));
  if (!t) { e.slide = null; return; }
  if (t.death) { kill(s, e, 'death'); return; }
  const o = entAt(s, t.x, t.y, e);
  if (o) {
    if (e.kind === 'heavy' && CRUSHABLE.includes(o.kind)) kill(s, o, 'squash');
    else { e.slide = null; return; }
  }
  const p = s.player, ridden = stuckTo(s) === e;
  if (playerAt(s, t.x, t.y) && (ridden || p.sticky) && !ENEMY.includes(e.kind)) {
    // Sticky, a sliding box that reaches you pushes you along and you ride it.
    const b = pushTo(s, t.x, t.y, t.d, p.swimming);
    if (b && b.death) { die(s); return; }
    if (b) {
      p.x = b.x; p.y = b.y; e.slide = t.d; e.x = t.x; e.y = t.y;
      if (!ridden) stick(s, e);
      entered(s);
      return;
    }
  }
  if (playerAt(s, t.x, t.y) && (!crushes(s, e) || (e.kind !== 'heavy' && !ENEMY.includes(e.kind)))) { e.slide = null; return; }
  const mx = t.x - e.x, my = t.y - e.y;
  e.x = t.x; e.y = t.y; e.slide = t.d;
  if (playerAt(s, t.x, t.y)) die(s);
  else if (ridden && stuckTo(s) === e) carry(s, mx, my);
}

// A spring launches whatever stands on the tile its face looks at, when that piece
// can move on that way.
export function fireSprings(s) {
  s.cells.forEach((c, i) => {
    if (!c.startsWith('spring:')) return;
    const d = c.slice(7), x = i % s.w + DIRS[d][0], y = Math.floor(i / s.w) + DIRS[d][1];
    if (!inb(s, x, y)) return;
    const p = s.player;
    if (playerAt(s, x, y) && p.dir !== d && stepTo(s, x, y, d, p.swimming)) {
      if (!p.dir) p.moved = 0;
      p.dir = d;
      s.events.push({ type: 'spring', x, y, d });
    }
    const e = entAt(s, x, y);
    if (e && e.kind !== 'turret' && e.slide !== d && stepTo(s, x, y, d, wades(e))) {
      e.slide = d; e.rush = false; e.rushDir = null;
      s.events.push({ type: 'spring', x, y, d });
    }
  });
}
