// A level's row in the level list: one icon per element, as the palette draws it, wearing the pushable
// frame when that element only comes pushable (registers 402, 419, 420); the level's colours, when it
// has more than one, as dots on the title line.
import { coloursOf, pushingsOf, ELEMENTS } from '../campaign/rules.js';
import { INK } from '../view/ink.js';
import { icon } from './icons.js';

// tool: each element's palette tool (campaign.js's TOOL).
export function levelParts(def, tool) {
  const parts = document.createElement('span'); parts.className = 'campParts';
  for (const el of Object.keys(def.palette)) {
    const crate = pushingsOf(def, el).every(Boolean);
    // A one-way takes a colour only in a level that names its colours (register 241).
    const c = el === 'gate' ? icon('gate', 'red', def.colours ? 'red' : null, crate) : icon(tool[el], 'red', null, crate);
    const name = (crate ? 'pushable ' : '') + ELEMENTS[el].label.toLowerCase();
    c.dataset.part = el; if (crate) c.dataset.crate = '';
    c.title = name[0].toUpperCase() + name.slice(1); c.setAttribute('aria-label', c.title);
    parts.append(c);
  }
  return parts;
}

export function levelColours(def) {
  const cols = coloursOf(def), dots = document.createElement('span');
  dots.className = 'campDots';
  if (cols.length < 2) return dots;
  dots.title = `Colours: ${cols.join(' and ')}`; dots.setAttribute('aria-label', dots.title);
  for (const c of cols) { const d = document.createElement('i'); d.dataset.colour = c; d.style.background = INK[c]; dots.append(d); }
  return dots;
}
