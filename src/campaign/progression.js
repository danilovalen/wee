// What the campaign has opened (registers 558, 610, 611). Beating a builder level opens the next
// builder level, its own side goals and one side room; side rooms alternate, a puzzle after the first
// builder level, a challenge after the second, and so on, and solving one opens nothing but its star.
import { LEVELS } from '../level/campaign.js';
import { TEMPLATES } from '../level/templates.js';
import { listed } from './rules.js';
import { PLACING, REMOVING } from './names.js';

// Authored puzzles (registers 651, 660, 662): the rooms in rooms/ named "Puzzle N", so the Sandbox offers the
// same rooms as examples. Puzzle N takes the N-th puzzle slot; a slot with no such room stays empty.
// A room may name its slot instead (puzzleSlot), keeping a name of its own: Pushback is puzzle 5, Heist 6 (759, 776).
const authored = n => { const t = TEMPLATES.find(r => r.name === `Puzzle ${n}` || r.level.puzzleSlot === n); return t ? { id: 'p' + n, name: t.name, puzzle: true, room: t.level } : null; };
export const PUZZLES = Array.from({ length: 12 }, (_, i) => authored(i + 1));
// The first row (register 955): Build 0 and Puzzle 0, open from the start; Build 0 opens Level 1.
export const INTRO = { build: LEVELS.find(d => d.intro) || null, puzzle: authored(0) };
export const builders = () => LEVELS.filter(listed);
// The side room after the k-th builder level (1-based), or null.
export const sideRoom = k => (k % 2 ? PUZZLES[(k - 1) / 2] : PLACING[k / 2 - 1]) || null;
// A challenge slot opens two side rooms at once: its placing challenge and its removal twin (register 786).
// A removal waiting for a room that meets the bar (tools/challengeAxes.mjs) is left out, not shipped weak (805).
export const twinRoom = k => { const t = k % 2 ? null : REMOVING[k / 2 - 1]; return t && !t.waiting ? t : null; };
// The floor plan: each builder level with the side room it opens, and that room's twin.
// A placing challenge waiting for a room that meets the bar gives its slot to its removal twin (799).
export const plan = () => builders().map((def, i) => { const s = sideRoom(i + 1), t = twinRoom(i + 1); return s && s.waiting ? { def, side: t, twin: null } : { def, side: s, twin: t }; });

const beaten = (p, def) => !!(p.levels && p.levels[def.id] && p.levels[def.id].beaten);
// Whether a level can be played: the builder levels up to AHEAD past the furthest one beaten, so a player
// stuck on one has others to try (register 673); a side room once the builder level that opens it is
// beaten. Levels outside the plan stay open.
export const AHEAD = 3;
export function isOpen(id, p) {
  if (id === INTRO.build?.id || id === INTRO.puzzle?.id) return true;
  const b = builders(), i = b.findIndex(d => d.id === id);
  if (i >= 0 && INTRO.build && !beaten(p, INTRO.build)) return false;
  if (i >= 0) return i < AHEAD + b.reduce((f, d, k) => beaten(p, d) ? k + 1 : f, 0);
  const k = plan().findIndex(r => (r.side && r.side.id === id) || (r.twin && r.twin.id === id));
  return k < 0 || beaten(p, b[k]);
}
// A level's side goals show once it is beaten.
export const sideGoalsOpen = (id, p) => !!(p.levels && p.levels[id] && p.levels[id].beaten);

// Levels off the plan, shown while everything is unlocked, join it in number order: each goes before the
// first planned level with a higher number (register 731).
const num = def => /^\d+$/.test(def.id) ? +def.id : Infinity;
export function listOrder(entries, extras) {
  const out = [...entries];
  for (const def of [...extras].sort((a, b) => num(a) - num(b))) {
    const i = out.findIndex(e => num(e.def) > num(def));
    out.splice(i < 0 ? out.length : i, 0, { def, side: null });
  }
  return out;
}
