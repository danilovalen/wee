// A listed level is named by its place in the list, so the numbers run 1, 2, 3 with no gap where a
// level is put away (register 528). Its id, its file and the progress kept under it do not change.
import { LEVELS } from '../level/campaign.js';
import { listed } from './rules.js';

export const shownName = def => { const i = LEVELS.filter(listed).findIndex(l => l.id === def.id); return i >= 0 ? `Level ${i + 1}` : def.name; };
