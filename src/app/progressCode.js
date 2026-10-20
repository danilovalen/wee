// Progress you carry yourself (register 254): a code to copy out and paste back, for a viewer that
// keeps no storage, and a reset after a yes.
import { progress, write, migrate, openList } from './campaign.js';
import { $ } from './dom.js';

export const toCode = p => btoa(unescape(encodeURIComponent(JSON.stringify(p))));
export function fromCode(code) {
  try { const p = JSON.parse(decodeURIComponent(escape(atob(code.trim())))); return p && p.levels ? migrate(p) : null; } catch { return null; }
}

export function buildProgress() {
  const box = $('progBox'), say = $('progSay'), code = $('progCode');
  const open = (text, value, load) => { say.textContent = text; code.value = value; $('progYes').hidden = !load; box.showModal(); };
  $('progCopy').onclick = () => {
    const c = toCode(progress());
    open('Your progress, as a code. Keep it somewhere; Load progress takes it back.', c, false);
    code.select();
    try { navigator.clipboard.writeText(c).then(() => { say.textContent = 'Copied. Keep it somewhere; Load progress takes it back.'; }, () => {}); } catch { /* no clipboard here */ }
  };
  $('progLoad').onclick = () => open('Paste a progress code. It replaces the progress here.', '', true);
  $('progYes').onclick = () => {
    const p = fromCode(code.value);
    if (!p) { say.textContent = 'That code does not read as progress. Copy it again, whole.'; return; }
    write(p); box.close(); openList();
  };
  $('progNo').onclick = () => box.close();
  $('progReset').onclick = () => $('progResetBox').showModal();
  $('progResetNo').onclick = () => $('progResetBox').close();
  $('progResetYes').onclick = () => { write({ ...progress(), last: null, levels: {} }); $('progResetBox').close(); openList(); };
}
