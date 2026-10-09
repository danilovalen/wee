// The Select tool: drag a box, then Copy, Cut, Delete or Rotate it; Paste shows the copy
// as a ghost under the pointer and stamps it on a click or tap. One undo step each.
import { copyRegion, clearRegion, rotateClip, pasteRegion, norm } from '../level/region.js';
import { S } from '../editor/state.js';
import { change } from './undo.js';
import { $ } from './dom.js';

let A = null; // { syncPanel }
export function buildSelect(actions) {
  A = actions;
  $('selCopy').onclick = copy;
  $('selCut').onclick = cut;
  $('selDelete').onclick = del;
  $('selRotate').onclick = rotate;
  $('selPaste').onclick = startPaste;
}

const say = t => { $('placeHint').textContent = t; };
export function syncSelect() {
  const has = !!S.sel;
  for (const id of ['selCopy', 'selCut', 'selDelete']) $(id).disabled = !has;
  $('selRotate').disabled = !has && !S.paste;
  $('selPaste').disabled = !S.clip;
  $('selPaste').textContent = S.paste ? 'Done' : 'Paste';
}

// Pointer: a press starts a box (or stamps, when pasting); a drag grows it.
export function selectDown(c) {
  if (S.paste) { change(() => { S.level = pasteRegion(S.level, S.paste, c.x, c.y); }); A.syncPanel(); return; }
  S.sel = { x0: c.x, y0: c.y, x1: c.x, y1: c.y };
  syncSelect();
}
export function selectMove(c) { if (S.sel && !S.paste) { S.sel.x1 = c.x; S.sel.y1 = c.y; } }

function copy() {
  if (!S.sel) return;
  S.clip = copyRegion(S.level, S.sel);
  say(`Copied ${S.clip.w}x${S.clip.h}. Paste places it.`);
  syncSelect();
}
function cut() {
  if (!S.sel) return;
  copy();
  change(() => { S.level = clearRegion(S.level, S.sel); });
  A.syncPanel();
}
function del() {
  if (!S.sel) return;
  change(() => { S.level = clearRegion(S.level, S.sel); });
  A.syncPanel();
}
// Rotating a box turns it a quarter clockwise in place, around its top-left corner.
function rotate() {
  if (S.paste) { S.paste = rotateClip(S.paste); return; }
  if (!S.sel) return;
  const r = norm(S.sel), turned = rotateClip(copyRegion(S.level, r));
  change(() => { S.level = pasteRegion(clearRegion(S.level, r), turned, r.x0, r.y0); });
  S.sel = { x0: r.x0, y0: r.y0, x1: r.x0 + turned.w - 1, y1: r.y0 + turned.h - 1 };
  A.syncPanel();
}
function startPaste() {
  if (S.paste) { S.paste = null; say(''); syncSelect(); return; }
  if (!S.clip) return;
  S.paste = JSON.parse(JSON.stringify(S.clip));
  S.sel = null;
  say('Click or tap where the top-left corner goes. Rotate turns it.');
  syncSelect();
}

// Keys in edit mode with Select: Ctrl+C, Ctrl+X, Ctrl+V, Delete, R, Escape.
export function selectKey(ev) {
  if (S.ui.tool !== 'select') return false;
  const ctrl = ev.ctrlKey || ev.metaKey, k = ev.key.toLowerCase();
  if (ctrl && k === 'c') copy();
  else if (ctrl && k === 'x') cut();
  else if (ctrl && k === 'v') { if (!S.paste) startPaste(); }
  else if (!ctrl && (k === 'delete' || k === 'backspace')) del();
  else if (!ctrl && k === 'r') rotate();
  else if (k === 'escape') { S.paste = null; S.sel = null; say(''); syncSelect(); }
  else return false;
  ev.preventDefault();
  return true;
}

// What edit view draws on top: the box, or the ghost of the paste under the pointer.
export function selectOverlay() {
  if (S.ui.tool !== 'select') return null;
  if (S.paste) return S.hover ? { paste: S.paste, x: S.hover.x, y: S.hover.y } : null;
  return S.sel ? { sel: norm(S.sel) } : null;
}
