// A listed level is named by its place in the list, so the numbers run 1, 2, 3 with no gap where a
// level is put away (register 528). Its id, its file and the progress kept under it do not change.
import { LEVELS } from '../level/campaign.js';
import { listed } from './rules.js';
import { CHALLENGES } from '../level/challenges.js';

export const shownName = def => { const i = LEVELS.filter(listed).findIndex(l => l.id === def.id); return i >= 0 ? `Level ${i + 1}` : def.name; };
// Each challenge slot holds a placing challenge and a removal one (registers 786, 787): the placing ones are
// numbered C1, C2, C3 down the plan (735), the removal ones R1, R2, R3 beside them; ids stay.
export const PLACING = CHALLENGES.filter(c => !c.challenge.remove);
export const REMOVING = CHALLENGES.filter(c => c.challenge.remove);
// A challenge waiting for a room that meets the bar is not shown, so the numbers skip it and run with no gap.
const shown = list => list.filter(c => !c.waiting);
export const challengeName = def => def.challenge.remove ? `R${shown(REMOVING).findIndex(c => c.id === def.id) + 1}` : `C${shown(PLACING).findIndex(c => c.id === def.id) + 1}`;
