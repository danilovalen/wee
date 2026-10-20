// Progress you carry yourself (register 254): a code to copy out and paste back, for a viewer that
// keeps no storage, and a reset after a yes. One code carries everything (question 4): the campaign,
// Sandbox rooms, Puzzles bests and made levels. A code from before holds the campaign alone.
import { progress, write, migrate, openList } from './campaign.js';
import { list, put } from './store.js';
import { bests, keep } from './puzzles.js';
import { madeLevels, saveMade } from './made.js';
import { $ } from './dom.js';

const enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
export const toCode = async () => enc({ campaign: progress(), rooms: await list().catch(() => []), puzzles: bests(), made: madeLevels() });
export function fromCode(code) {
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (o && o.levels) return { campaign: migrate(o) };
    return o && o.campaign && o.campaign.levels ? { ...o, campaign: migrate(o.campaign) } : null;
  } catch { return null; }
}
async function load(all) {
  write(all.campaign);
  for (const r of all.rooms || []) await put(r).catch(() => {});
  if (all.puzzles) keep(all.puzzles);
  if (all.made) saveMade(all.made);
}

export function buildProgress() {
  const box = $('progBox'), say = $('progSay'), code = $('progCode');
  const open = (text, value, load) => { say.textContent = text; code.value = value; $('progYes').hidden = !load; box.showModal(); };
  $('progCopy').onclick = async () => {
    const c = await toCode();
    open('Your progress, as a code. Keep it somewhere; Load progress takes it back.', c, false);
    code.select();
    try { navigator.clipboard.writeText(c).then(() => { say.textContent = 'Copied. Keep it somewhere; Load progress takes it back.'; }, () => {}); } catch { /* no clipboard here */ }
  };
  $('progLoad').onclick = () => open('Paste a progress code. It replaces the progress here.', '', true);
  $('progYes').onclick = async () => {
    const p = fromCode(code.value);
    if (!p) { say.textContent = 'That code does not read as progress. Copy it again, whole.'; return; }
    await load(p); box.close(); openList();
  };
  $('progNo').onclick = () => box.close();
  $('progReset').onclick = () => $('progResetBox').showModal();
  $('progResetNo').onclick = () => $('progResetBox').close();
  $('progResetYes').onclick = () => { write({ ...progress(), last: null, levels: {} }); $('progResetBox').close(); openList(); };
}
