// A level's elements on its row in the level list, as the palette draws them: one icon per colour and
// per pushable version, the versions of one element kept together (register 402).
import { colouringsOf, pushingsOf, ELEMENTS } from '../campaign/rules.js';
import { icon } from './icons.js';

const COLOURED = ['button', 'door', 'toggle', 'idoor', 'relay'];

// tool: each element's palette tool (campaign.js's TOOL).
export function levelParts(def, tool) {
  const parts = document.createElement('span'); parts.className = 'campParts';
  for (const el of Object.keys(def.palette)) {
    const g = document.createElement('span'); g.className = 'campPart';
    // A one-way takes a colour only in a level that names its colours (register 241).
    const cols = COLOURED.includes(el) || (el === 'gate' && def.colours) ? colouringsOf(def, el) : [null];
    for (const col of cols) for (const crate of pushingsOf(def, el)) {
      const c = el === 'gate' ? icon('gate', 'red', col, crate) : icon(tool[el], col || 'red', null, crate);
      const name = [crate ? 'pushable' : '', col ? col.replace('|', ' and ') : '', ELEMENTS[el].label.toLowerCase()].filter(Boolean).join(' ');
      c.dataset.part = el; if (col) c.dataset.colour = col; if (crate) c.dataset.crate = '';
      c.title = name[0].toUpperCase() + name.slice(1); c.setAttribute('aria-label', c.title);
      g.append(c);
    }
    parts.append(g);
  }
  return parts;
}
