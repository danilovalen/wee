// The Rooms page's list: each saved room as a row with its thumbnail and tags, built a few rows at a
// time so a long list never freezes the page, filtered by mechanism with a tally of what is explored.
import { splitRoom } from '../level/room.js';
import { thumbURL } from '../view/thumb.js';
import { contains, MECHANISMS } from '../solve/tags.js';
import { $ } from './dom.js';
import { menuOn } from './tilemenu.js';

// Thumbnails and tags are worked out once per version of a room, not on every redraw.
const thumbs = new Map(), tagCache = new Map();
export const versionOf = (r, level) => r && r.id ? r.id + '@' + r.updated : JSON.stringify(level);
function thumb(level, version) {
  if (!thumbs.has(version)) thumbs.set(version, thumbURL(level));
  const img = new Image();
  img.src = thumbs.get(version); img.className = 'thumb'; img.alt = '';
  return img;
}

export function row(level, title, sub, onOpen, version) {
  const li = document.createElement('li'), b = document.createElement('button');
  b.type = 'button'; b.className = 'roomRow';
  const text = document.createElement('span'), name = document.createElement('b'), small = document.createElement('small');
  name.textContent = title; small.textContent = sub;
  text.append(name, small);
  b.append(thumb(level, version || versionOf(null, level)), text);
  b.onclick = onOpen;
  li.append(b);
  return li;
}

const when = iso => iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';

// A room's tags: what it holds, what its saved solution does, and whether it started generated.
const GENERATED = 'from:generated';
function tagsOf(r) {
  const v = versionOf(r);
  if (!tagCache.has(v)) { const { level } = splitRoom(r); tagCache.set(v, new Set([...contains(level), ...(r.uses || []), ...(r.recipe ? [GENERATED] : [])])); }
  return tagCache.get(v);
}

// Built a few rooms at a time, so a long list never freezes the page; a newer call
// abandons an older one still building.
const SLICE_MS = 12;
let building = 0;
// saved: the rooms in order; open(level, meta) opens one; examples() the rows that close the list.
export function renderList(saved, open, examples) {
  const my = ++building, filter = $('tagFilter').value, ul = $('roomList'), counts = {};
  let i = 0, shown = 0;
  ul.replaceChildren();
  const slice = () => {
    if (my !== building) return;
    const until = performance.now() + SLICE_MS;
    for (; i < saved.length && performance.now() < until; i++) {
      const r = saved[i], tags = tagsOf(r);
      for (const t of tags) counts[t] = (counts[t] || 0) + 1;
      if (filter && !tags.has(filter)) continue;
      const { meta, level } = splitRoom(r);
      const par = meta.par ? `, par ${meta.par}` : ', not checked';
      const li = row(level, meta.name || 'Untitled', `${level.w}x${level.h}${par}, ${when(meta.updated)}`, () => open(level, meta), versionOf(r));
      menuOn(li.firstChild, r);
      ul.append(li);
      shown++;
    }
    if (i < saved.length) { setTimeout(slice, 0); return; }
    if (!shown && saved.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'No room has this yet.'; ul.append(li); }
    // The example closes the same list, marked as one (register 399).
    if (!filter) ul.append(...examples());
    $('libTools').hidden = !saved.length;
    // The filter lists every mechanism with how many rooms have it; the tally shows the gaps.
    const opts = [new Option('All rooms', ''), new Option(`Started generated (${counts[GENERATED] || 0})`, GENERATED)];
    for (const [t, label] of MECHANISMS) opts.push(new Option(`${label} (${counts[t] || 0})`, t));
    $('tagFilter').replaceChildren(...opts);
    $('tagFilter').value = filter;
    const explored = MECHANISMS.filter(([t]) => counts[t]).length;
    $('exploredSum').textContent = `Explored ${explored} of ${MECHANISMS.length} mechanisms`;
    $('unexplored').replaceChildren(...MECHANISMS.filter(([t]) => !counts[t]).map(([, label]) => { const li = document.createElement('li'); li.textContent = label; return li; }));
  };
  slice();
}
