// You: one slide step at a time, dive, hide, and what each key does.
import { DIRS, ENEMY, HIDE_TICKS, OPPOSITE, POWERS, PUSHED, wades } from './base.js';
import { inBeam, laser, turnTurrets } from './beams.js';
import { cellAt, crushes, entAt, facing, gateAt, inWater, onGravel, pushTo, shift, solidCell, stepTo } from './grid.js';
import { crateAt, pushChain, pushesTile } from './crates.js';
import { die, kill, land, light, refreshDoors, respawn, smash } from './life.js';
import { burnFuses, hideCycle, worldStep } from './pieces.js';
import { STICKS, drag, entered, stick, stuckTo, unstick } from './sticky.js';
import { follow, lead, meet, partnerAt } from './glue.js';

// Boxes in a row ahead of the one you push go with it, a train (register 278): the front one moves on
// if it can and each of the rest takes the tile ahead of it. Returns where the pushed box goes, or null.
function train(s, e, dx, dy, d) {
  const list = [e];
  for (let o; (o = entAt(s, list.at(-1).x + dx, list.at(-1).y + dy, list.at(-1))) && PUSHED(o) && !o.glue && !e.glue;) list.push(o);
  if (list.length < 2) return null;
  const front = list.at(-1), go = pushTo(s, front.x, front.y, d, wades(front));
  if (!go) return null;
  const at = list.map(o => ({ x: o.x, y: o.y, d }));
  land(s, front, go);
  for (let i = list.length - 2; i >= 1; i--) land(s, list[i], at[i + 1]);
  return at[1];
}

// One player tile. Returns 'moved', 'blocked' or 'died'. A triangle turns the slide.
export function playerStep(s, d, diving) {
  const p = s.player, pd = facing(s, p.x, p.y, d), ax = p.x + DIRS[pd][0], ay = p.y + DIRS[pd][1];
  // A pushable tile ahead goes first, with whatever it pushes in turn.
  if (crateAt(s, ax, ay) && pushesTile(s, ax, ay, pd)) {
    const g = gateAt(s, p.x, p.y);
    if ((g && !g.includes(pd)) || !pushChain(s, ax, ay, pd)) return 'blocked';
  }
  const t = stepTo(s, p.x, p.y, d, p.swimming, diving);
  if (!t) return 'blocked';
  // Spikes a box covers are a box to push; bare spikes kill (register 431).
  if (t.death && !entAt(s, t.x, t.y)) { die(s); return 'died'; }
  smash(s, t);
  const nx = t.x, ny = t.y, e = entAt(s, nx, ny), g = p.stuck && !p.stuck.ride ? stuckTo(s) : null;
  const dx = nx - p.x, dy = ny - p.y, ahead = !!e && e === g;
  let pushed = null;
  if (ahead) {
    // The glued box is ahead: it goes first, or it is pushed against something and you both
    // stop, still glued.
    const b = shift(s, g.x, g.y, dx, dy, wades(g), g);
    if (!b) return 'blocked';
    if (land(s, g, b)) light(s, g);
  } else if (e && p.sticky && STICKS(e)) { stick(s, e); return 'blocked'; }
  else if (e) {
    let b;
    if (e.kind === 'enemy' && diving) kill(s, e, 'dive');
    else if (ENEMY.includes(e.kind)) { if (!crushes(s, e)) return 'blocked'; die(s); return 'died'; }
    else if (e.kind === 'heavy') {
      if (diving) { e.slide = t.d; s.events.push({ type: 'crash', x: nx, y: ny }); }
      return 'blocked';
    } else if (PUSHED(e)) {
      // A box glued to another piece: the one ahead goes first, the one behind follows.
      const led = !!partnerAt(s, e, nx + dx, ny + dy) && lead(s, e, dx, dy);
      let chained = false;
      if (!(b = pushTo(s, nx, ny, t.d, wades(e)))) {
        const o = entAt(s, nx + dx, ny + dy, e);
        if (o && meet(s, e, o)) return 'blocked';
        if (!(b = train(s, e, dx, dy, t.d))) { if (!pushChain(s, nx, ny, t.d)) return 'blocked'; chained = true; }
      }
      if (chained ? !e.dead : land(s, e, b)) { pushed = { id: e.id, d: chained ? t.d : b.d }; light(s, e); if (!led) follow(s, e, dx, dy); }
    } else return 'blocked';
  }
  p.pushing = pushed;
  p.from = { x: p.x, y: p.y };
  p.x = nx; p.y = ny; p.moved++;
  // Pushing a box off its spikes leaves them bare under you.
  if (cellAt(s, nx, ny) === 'death') { die(s); return 'died'; }
  if (p.dir) p.dir = t.d;
  if (g && !ahead) drag(s, g, dx, dy);
  entered(s);
  if (cellAt(s, nx, ny) === 'checkpoint' && (s.checkpoint.x !== nx || s.checkpoint.y !== ny)) {
    s.checkpoint = { x: nx, y: ny };
    s.events.push({ type: 'checkpoint', x: nx, y: ny });
  }
  refreshDoors(s);
  return 'moved';
}

export function endSlide(s) {
  s.player.dir = null; s.player.moved = 0;
}

// A slide that moved the player gives the world its step, per the clock. Things that act on
// your move start when you leave your tile, not when you stop: an on-your-move turret turns
// once, and with the slide clock the world takes its one step then.
export function slideOnce(s, diving) {
  // A press counts as a move only once it does something: a step, a death, or sticking.
  const p = s.player, fresh = p.fresh, stuck = p.stuck, lit = fresh && s.entities.filter(e => !e.dead && e.fuse != null);
  p.fresh = false;
  const d = p.dir, r = playerStep(s, d, diving);
  if (fresh && (r !== 'blocked' || p.stuck !== stuck)) { s.move++; burnFuses(s, lit); }
  if (r === 'moved') {
    if (s.player.moved === 1) { turnTurrets(s, 'input'); if (s.clock === 'slide') worldStep(s, d); }
    if (s.clock === 'tile') worldStep(s, d);
    // Gravel stops a slide on it.
    if (s.player.dir && onGravel(s, s.player)) { endSlide(s); s.events.push({ type: 'grip' }); }
    return true;
  }
  if (r === 'blocked') endSlide(s);
  return false;
}

export function dive(s) {
  s.events.push({ type: 'dive', fromX: s.player.x, fromY: s.player.y });
  for (let i = 0; i < s.w * s.h && s.player.dir; i++) {
    const before = s.deaths;
    if (!slideOnce(s, true) || s.deaths !== before) break;
    if (inBeam(s)) { die(s); break; }
  }
  if (s.player.dir) endSlide(s);
  s.player.snap = true;
}

// You come back once the hide has lasted HIDE_TICKS and nothing it sent sliding is
// still going. Whatever is on your tile then squashes you.
export function unhide(s) {
  const p = s.player;
  if (++p.hideTicks < HIDE_TICKS || s.entities.some(e => !e.dead && e.rush)) return;
  p.hidden = false;
  s.events.push({ type: 'unhide' });
  if (s.entities.some(e => !e.dead && e.x === p.x && e.y === p.y && crushes(s, e)) || solidCell(s, p.x, p.y)) { s.events.push({ type: 'squash', x: p.x, y: p.y }); die(s); }
}

// Turning back mid-push, the box you were pushing slides on alone, the way it was going.
export function letGo(s) {
  const pu = s.player.pushing, e = pu && s.entities.find(o => o.id === pu.id && !o.dead);
  if (e && !e.slide) e.slide = pu.d;
}

// Besides keys, a run takes settings changed mid-play: 'power:dive:0', 'clock:slide'.
export function input(s, k) {
  const p = s.player;
  if (k.startsWith('power:')) { const [, name, on] = k.split(':'); if (POWERS.includes(name)) s.powers[name] = on === '1'; return; }
  if (k.startsWith('clock:')) { const c = k.slice(6); if (c === 'tile' || c === 'slide') s.clock = c; return; }
  if (k === 'respawn') { respawn(s); s.events.push({ type: 'respawn' }); return; }
  // The tap: with Cycle you hide, with Swim you start or stop swimming (never in
  // water), and either way the world takes one step.
  if (k === 'hide') {
    if (p.dir || p.hidden) return;
    const swim = s.powers.swim && !inWater(s, p.x, p.y);
    if (!s.powers.cycle && !swim) return;
    if (swim) { p.swimming = !p.swimming; s.events.push({ type: 'swim', on: p.swimming }); }
    if (s.powers.cycle) { p.hidden = true; p.hideTicks = 0; s.events.push({ type: 'hide' }); }
    hideCycle(s);
    return;
  }
  // 'back:left' is a side shot aimed from the tile you were drawn on when you pressed,
  // the one you just left (see aimKey).
  let from = null;
  if (k.startsWith('back:')) { k = k.slice(5); from = p.dir && p.from; }
  if (!DIRS[k] || p.hidden) return;
  // Riding, a move lets go.
  if (p.stuck && p.stuck.ride) unstick(s);
  if (!p.dir) { p.dir = k; p.moved = 0; p.fresh = true; return; }
  if (k === p.dir) { if (s.powers.dive) dive(s); }
  else if (k === OPPOSITE[p.dir]) { if (s.powers.boomerang) { letGo(s); p.dir = k; s.events.push({ type: 'boomerang', from: OPPOSITE[k] }); } }
  else if (s.powers.laser) laser(s, k, from);
}

// The screen draws you between your last tile and this one. A side shot pressed while
// you still looked nearer the last tile is sent as 'back:', so it leaves from where you
// saw yourself; replays get the same key, so they shoot the same way.
export function aimKey(s, k, alpha) {
  const p = s.player;
  const side = p.dir && DIRS[k] && k !== p.dir && k !== OPPOSITE[p.dir];
  return side && p.from && alpha < 0.5 ? 'back:' + k : k;
}
