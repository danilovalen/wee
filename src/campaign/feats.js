// What one Run on a campaign level earns toward the achievements (registers 631-636): the ids it does, and
// counts toward the ones that count. Only a level's own Run counts (register 639), never the Sandbox.
import { SMALL, LONG, DOORS, SAFE, SIDE, ONE_SHOT_FROM } from './achievements.js';
import { builders } from './progression.js';
import { safety } from '../solve/safety.js';
import { overLimits, underLimits } from './rules.js';

const doors = room => room.cells.filter(c => c && (c.startsWith('door:') || c.startsWith('idoor:'))).length;
const small = room => room.w <= SMALL && room.h <= SMALL;

// v: the verdict of check(def, room). done: ids already earned, so the slow search runs only when it could add one.
export function featsOf(def, room, v, done = {}) {
  const ids = [], peak = {};
  if (!v || !v.ok || v.length == null) return { ids, peak };
  // One shot (632, 641): the berry in 1 move with every main goal met but the move count, on Level 11 or later.
  const reqs = Object.values(v.reqs || {}).every(Boolean), late = builders().findIndex(d => d.id === def.id) >= ONE_SHOT_FROM - 1;
  if (v.length === 1 && late && reqs && !overLimits(def, room).length && !underLimits(def, room).length) ids.push('oneshot');
  if (!v.won) return { ids, peak };
  if (small(room)) { peak.moveit = v.length; if (v.length >= LONG) ids.push('moveit'); }
  peak.gateway = doors(room); if (peak.gateway >= DOORS) ids.push('gateway');
  peak.silver = (v.optional || []).filter(o => o.met).length; if (peak.silver >= SIDE) ids.push('silver');
  if (v.length >= SAFE && (!('guardrails' in done) || !('deadly' in done))) {
    const r = safety(room, v.path || []);
    if (!r.capped && r.guarded) ids.push('guardrails');
    if (!r.capped && r.deadly) ids.push('deadly');
  }
  return { ids, peak };
}

// Keeps what a Run earned in the save: each id with the level it was first earned on, and the best counts.
export function record(p, def, f) {
  p.feats ||= {}; p.peak ||= {};
  for (const id of f.ids) if (!(id in p.feats)) p.feats[id] = def.id;
  for (const [k, n] of Object.entries(f.peak)) p.peak[k] = Math.max(p.peak[k] || 0, n);
  return p;
}
