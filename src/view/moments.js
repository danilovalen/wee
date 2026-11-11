// Harsh moments (docs/THEME.md rule 20, register 842): the marks a room keeps, the blob as its death left it,
// and the one shake. Nothing here changes a rule: a mark is paint under the pieces.
import { T, frame } from './ink.js';
import { DIRS } from '../rules/base.js';
import { drawSprite } from './sprites.js';
import { altSkin, look } from './look.js';
import { P } from './crayonSprites.js';

// The room keeps this many marks; the oldest go first.
export const STAIN_MAX = 60;
export const HITSTOP_MS = 90;
// How long the blob flinches before it lies as its death left it.
export const FLINCH_MS = 110;
const blobHex = () => (altSkin('hero') ? P.green : P.violet);
const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// How the blob died, from one tick's events and the room it died in: what the rules name ('spring',
// 'spikes', 'laser'), a crush (a door, a box), a blast, or a plain hit. dir: the way a spring pushed.
export function deathOf(events, game) {
  const die = events.find(e => e.type === 'die');
  if (!die) return null;
  let how = die.how || (events.some(e => e.type === 'squash') ? 'crush' : events.some(e => e.type === 'blast') ? 'blast' : 'hit'), dir = null;
  if (how === 'spring') {
    // The spring that did it faces the blob from the tile behind it.
    for (const [d, [dx, dy]] of Object.entries(DIRS)) if (game.cells[(die.y - dy) * game.w + die.x - dx] === 'spring:' + d && die.x - dx >= 0 && die.x - dx < game.w) dir = d;
    if (!dir) how = 'crush';
  }
  return { how, dir, x: die.x, y: die.y };
}
// What one tick leaves on the floor. before: the pieces as they stood, so a killed one is found.
// What the blob carries off a tile onto bare floor (register 842): water, goo, gravel dust.
const TRACKS = { water: P.blue, sticky: P.green, gravel: P.wood };
export function tracksOf(game, from, to) {
  const out = [], dx = Math.sign(to.x - from.x), dy = Math.sign(to.y - from.y);
  if ((dx && dy) || (!dx && !dy)) return out;
  const dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up', at = (x, y) => game.cells[y * game.w + x];
  for (let x = from.x, y = from.y; x !== to.x || y !== to.y; x += dx, y += dy) if (TRACKS[at(x, y)] && at(x + dx, y + dy) === '') out.push({ x: x + dx, y: y + dy, key: `print|${TRACKS[at(x, y)]}|${dir}` });
  return out;
}
export function stainsOf(events, game, before, death) {
  const out = [], hex = blobHex();
  if (death) out.push({ x: death.x, y: death.y, key: death.how === 'spring' ? `splat|${hex}|${death.dir}` : death.how === 'spikes' ? `scraps|${hex}` : death.how === 'laser' || death.how === 'blast' ? 'soot' : `puddle|${hex}` });
  for (const e of events) {
    if (e.type === 'blast') out.push({ x: e.x, y: e.y, key: 'scorch' });
    else if (e.type === 'eat') out.push({ x: e.x, y: e.y, key: `juice|${P.blue}` });
    else if (e.type === 'break') out.push({ x: e.x, y: e.y, key: 'rubble' });
    else if (e.type === 'kill' && e.how !== 'blast') { const p = before.find(q => q.id === e.id); if (p) out.push({ x: p.x, y: p.y, key: p.kind === 'box' || p.kind === 'heavy' ? 'flat' : `puddle|${P.red}` }); }
  }
  return out;
}
// The same mark on the same tile is kept once.
export function keepStains(list, more) { const all = [...list]; for (const m of more) if (!all.some(s => s.x === m.x && s.y === m.y && s.key === m.key)) all.push(m); return all.slice(Math.max(0, all.length - STAIN_MAX)); }

export function drawStains(g) {
  if (!frame.stains.length) return;
  g.save(); g.globalAlpha = 0.85;
  for (const s of frame.stains) drawSprite(g, 'stain', s.x * T, s.y * T, { colour: s.key, exact: true });
  g.restore();
}
// The blob where it died, as its death left it.
export const poseAt = (death, now) => (death.at !== undefined && now - death.at < FLINCH_MS ? 'flinch' : death.how);
export const drawDead = (g, px, py) => drawSprite(g, 'blobDead', px, py, { colour: `${poseAt(frame.dead, frame.clock)}|${frame.dead.dir || ''}|${blobHex()}`, exact: true });

// The shake: the one time the room moves (rule 20). A crush shakes along its axis, a blast or a break all
// ways. The setting scales it (full, reduced, off); under reduced motion nothing moves.
const SHAKE = { crash: [3, 180], break: [3, 180], blast: [4, 220], crush: [4, 200] };
export function shakeOf(fx, now) {
  const k = look.shake === 'off' || still() ? 0 : look.shake === 'reduced' ? 0.4 : 1;
  if (!k) return [0, 0];
  for (const f of fx) {
    const spec = f.type === 'die' && f.death ? SHAKE.crush : SHAKE[f.type];
    if (!spec || now - f.at >= spec[1] || (f.type === 'die' && !['spring', 'crush', 'blast'].includes(f.death && f.death.how))) continue;
    const a = Math.round(spec[0] * k * (1 - (now - f.at) / spec[1])), wave = Math.sin(now * 0.12) >= 0 ? 1 : -1;
    const d = f.death && f.death.dir ? DIRS[f.death.dir] : null;
    return d ? [d[0] * a * wave, d[1] * a * wave] : [a * wave, a * (Math.cos(now * 0.15) >= 0 ? 1 : -1)];
  }
  return [0, 0];
}
