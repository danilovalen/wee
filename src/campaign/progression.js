// What the campaign has opened (registers 558, 610, 611). Beating a builder level opens the next
// builder level, its own side goals and one side room; side rooms alternate, a puzzle after the first
// builder level, a challenge after the second, and so on, and solving one opens nothing but its star.
import { LEVELS } from '../level/campaign.js';
import { CHALLENGES } from '../level/challenges.js';
import { TEMPLATES } from '../level/templates.js';
import { listed } from './rules.js';

// Authored puzzles (registers 651, 660, 662): the rooms in rooms/ named "Puzzle N", so the Sandbox offers the
// same rooms as examples. Puzzle N takes the N-th puzzle slot; a slot with no such room stays empty.
const authored = n => { const t = TEMPLATES.find(r => r.name === `Puzzle ${n}`); return t ? { id: 'p' + n, name: t.name, puzzle: true, room: t.level } : null; };
export const PUZZLES = Array.from({ length: 12 }, (_, i) => authored(i + 1));
export const builders = () => LEVELS.filter(listed);
// The side room after the k-th builder level (1-based), or null.
export const sideRoom = k => (k % 2 ? PUZZLES[(k - 1) / 2] : CHALLENGES[k / 2 - 1]) || null;
// The floor plan: each builder level with the side room it opens.
export const plan = () => builders().map((def, i) => ({ def, side: sideRoom(i + 1) }));

const beaten = (p, def) => !!(p.levels && p.levels[def.id] && p.levels[def.id].beaten);
// Whether a level can be played: the first builder level always; any other once the builder level
// before it (for a side room, the one that opens it) is beaten. Levels outside the plan stay open.
export function isOpen(id, p) {
  const b = builders(), i = b.findIndex(d => d.id === id);
  if (i === 0) return true;
  if (i > 0) return beaten(p, b[i - 1]);
  const k = plan().findIndex(r => r.side && r.side.id === id);
  return k < 0 || beaten(p, b[k]);
}
// A level's side goals show once it is beaten.
export const sideGoalsOpen = (id, p) => !!(p.levels && p.levels[id] && p.levels[id].beaten);
