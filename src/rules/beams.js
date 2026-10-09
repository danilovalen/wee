// Lasers: your shot, turret beams, relays, catchers and shocked water.
import { DIRS } from './base.js';
import { cellAt, entAt, facing, inWater, inb, playerAt, stepTo } from './grid.js';
import { die, kill } from './life.js';

// A beam from (x, y) heading d, turned by triangles. hit(piece) says whether it
// passes on. Returns the cells it crossed, whether geometry stopped it (and the
// cell that did), and whether it reached you.
export function trace(s, x, y, d, hit, hitsPlayer) {
  const path = [[x, y]];
  let cx = x, cy = y, cd = d, wall = true, stop = null, player = false;
  for (let i = 0; i < s.w * s.h * 2; i++) {
    const t = stepTo(s, cx, cy, cd);
    if (!t || t.death) { cd = facing(s, cx, cy, cd); stop = [cx + DIRS[cd][0], cy + DIRS[cd][1]]; break; }
    path.push([t.x, t.y]);
    if (hitsPlayer && playerAt(s, t.x, t.y)) { wall = false; player = true; break; }
    const o = entAt(s, t.x, t.y);
    if (o && !hit(o)) { wall = false; break; }
    cx = t.x; cy = t.y; cd = t.d;
  }
  return { path, wall, end: cd, stop, player };
}

// Any laser kills a weak enemy and goes on. Everything else stops it, and a strong
// enemy takes no harm from it.
export function laserHit(s, o, how) {
  if (o.kind === 'enemy') { kill(s, o, how); return true; }
  return false;
}

export function laser(s, d, from) {
  const o = from || s.player;
  const r = trace(s, o.x, o.y, d, o => laserHit(s, o, 'laser'), false);
  const pools = shockPools(s, r.path);
  s.events.push({ type: 'laser', d, ...r, shocked: [...pools] });
  if (shockHarms(s, pools, 'laser')) die(s);
}

// Every body of water a beam touches: the cells joined to it side by side.
export function shockPools(s, path) {
  const out = new Set(), todo = path.filter(([x, y]) => inWater(s, x, y)).map(([x, y]) => y * s.w + x);
  while (todo.length) {
    const i = todo.pop();
    if (out.has(i)) continue;
    out.add(i);
    const x = i % s.w, y = (i - x) / s.w;
    for (const [dx, dy] of Object.values(DIRS)) if (inWater(s, x + dx, y + dy)) todo.push((y + dy) * s.w + x + dx);
  }
  return out;
}

// A shocked pool hurts what is in it as a direct hit would. Returns whether it reached you.
export function shockHarms(s, pools, how) {
  for (const e of s.entities) if (!e.dead && pools.has(e.y * s.w + e.x)) laserHit(s, e, how);
  return pools.has(s.player.y * s.w + s.player.x) && !s.player.hidden;
}

export const aimOf = t => t.dirs[t.aim % t.dirs.length];

export function turnTurrets(s, mode) {
  for (const e of s.entities) if (!e.dead && e.turret && e.turret.mode === mode) e.turret.aim++;
}

// Every turret beam is on all the time, recomputed each tick. With harm, it kills
// you (unless you are hidden) and weak enemies. A beam that ends on a receiver lights
// it; so does one crossing a sensor nothing stands on.
export function computeBeams(s, harm) {
  s.beams = []; s.lit = new Set(); s.shocked = new Set();
  let hitYou = false;
  for (const e of s.entities) {
    if (e.dead || !e.turret) continue;
    const r = trace(s, e.x, e.y, aimOf(e.turret), o => harm ? laserHit(s, o, 'turret') : o.kind === 'enemy', true);
    if (r.stop && inb(s, ...r.stop) && cellAt(s, ...r.stop).startsWith('receiver:')) s.lit.add(r.stop[1] * s.w + r.stop[0]);
    for (const [x, y] of r.path) if (cellAt(s, x, y).startsWith('sensor:') && !entAt(s, x, y) && !playerAt(s, x, y)) s.lit.add(y * s.w + x);
    if (r.player) hitYou = true;
    for (const i of shockPools(s, r.path)) s.shocked.add(i);
    s.beams.push({ id: e.id, d: aimOf(e.turret), ...r });
  }
  if (harm && shockHarms(s, s.shocked, 'turret')) hitYou = true;
  if (harm && hitYou) die(s);
}
