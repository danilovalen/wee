// The side panels: the tool palette and its options, powers and status, the room size,
// and the file buttons. syncPanel makes every control show the current state.
import { CLOCKWISE, COLOURS, POWERS, NEEDS } from '../rules/base.js';
import { resizeLevel, moveSide, wallBorder } from '../level/format.js';
import { INK } from '../view/ink.js';
import { TOOLS, GROUPS, POWER_TEXT, NAMES } from '../editor/palette.js';
import { toolsFor, syncBrief } from './campaign.js';
import { coloursOf } from '../campaign/rules.js';
import { S } from '../editor/state.js';
import { $, canvas, touch } from './dom.js';
import { change, step as undoStep, syncUndo } from './undo.js';
import { runCheck, syncCheck, syncLint } from './check.js';
import { buildLenses, syncLenses } from './lenses.js';
import { buildWell, openWell } from './well.js';
import { buildChips } from './chips.js';
import { buildReset } from './reset.js';
import { buildSize } from './size.js';
import { buildSheets } from './sheets.js';
import { buildKeys } from './keys.js';
import { syncRoomsButton } from './rooms.js';
import { buildSelect, syncSelect } from './select.js';
import { icon } from './icons.js';

const DEFAULT_HINT = touch ? 'Tap to place, tap one again to remove it, and Look changes nothing.' : 'Click to place, click one again or right click to remove it, and Look changes nothing.';
function syncCtxText() {
  const note = [...document.querySelectorAll('.opt:not([hidden]) .note')].map(n => n.textContent).join(' ');
  const message = $('placeHint').textContent !== DEFAULT_HINT;
  $('ctxNote').textContent = message ? '' : note;
  $('placeHint').classList.toggle('quiet', !message && !!note);
  $('placeHint').classList.toggle('msg', message);
}

export function keysText() {
  return touch
    ? (S.mode === 'play' ? 'Swipe to slide, and while sliding, swipe again to use a power.' : '')
    : (S.mode === 'play' ? `Arrows slide, ${tapText()}R resets the room and E goes back to editing.` : 'E plays this room and ? lists every key.');
}

function tapText() {
  const { cycle, swim } = S.level.powers;
  return cycle && swim ? 'Space hides you and starts or stops swimming. ' : cycle ? 'Space hides you. ' : swim ? 'Space starts or stops swimming. ' : '';
}


// actions: what the panels trigger elsewhere (setMode, copyReport, fit), passed in so
// the panels never import the play loop.
export function buildPanels(actions) {
  const { setMode, copyReport, fit } = actions;
  for (const [g, name] of GROUPS) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.group = g; b.textContent = name;
    b.onclick = () => { S.ui.group = g; syncPanel(); };
    $('groups').append(b);
  }
  for (const t of TOOLS) {
    // On a wide screen the palette is sections, each under its own heading.
    if (TOOLS.find(o => o.group === t.group) === t) {
      const h = document.createElement('h3');
      h.className = 'ghead'; h.textContent = GROUPS.find(([g]) => g === t.group)[1];
      $('palette').append(h);
    }
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.tool = t.id; b.dataset.in = t.group;
    if (t.campaign) b.dataset.camp = '1';
    b.title = t.label;
    b.append(icon(t.id), Object.assign(document.createElement('span'), { className: 'lbl', textContent: t.label }));
    b.onclick = () => { S.ui.tool = t.id; syncPanel(); };
    $('palette').append(b);
  }
  for (const col of COLOURS) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.colour = col; b.title = col;
    b.style.background = INK[col];
    b.onclick = () => { S.ui.colour = col; syncPanel(); };
    $('colours').append(b);
  }
  document.querySelectorAll('[data-axis]').forEach(b => b.onclick = () => { S.ui.axis = b.dataset.axis; S.ui.dir = +b.dataset.dir; syncPanel(); });
  document.querySelectorAll('[data-start]').forEach(b => b.onclick = () => { S.ui.start = b.dataset.start; syncPanel(); });
  document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { S.ui.mode = b.dataset.mode; syncPanel(); });
  document.querySelectorAll('[data-corner]').forEach(b => b.onclick = () => { S.ui.corner = b.dataset.corner; syncPanel(); });
  document.querySelectorAll('[data-face]').forEach(b => b.onclick = () => { S.ui.face = b.dataset.face; syncPanel(); });
  document.querySelectorAll('[data-pass]').forEach(b => b.onclick = () => {
    const d = b.dataset.pass, ui = S.ui;
    if (ui.pass.includes(d)) { if (ui.pass.length > 1) ui.pass = ui.pass.filter(p => p !== d); }
    else ui.pass = [...ui.pass, d];
    syncPanel();
  });
  document.querySelectorAll('[data-aim]').forEach(b => b.onclick = () => {
    const d = b.dataset.aim, ui = S.ui;
    if (ui.aim.includes(d)) { if (ui.aim.length > 1) ui.aim = ui.aim.filter(a => a !== d); }
    else ui.aim = [...ui.aim, d];
    syncPanel();
  });
  for (const p of POWERS) {
    const row = document.createElement('label');
    row.className = 'power' + (NEEDS[p] ? ' off' : '');
    const box = document.createElement('input');
    box.type = 'checkbox'; box.dataset.power = p; box.disabled = !!NEEDS[p];
    box.onchange = () => { change(() => { S.level.powers[p] = box.checked; }); if (S.game) S.pending.push(`power:${p}:${box.checked ? 1 : 0}`); syncPanel(); };
    const name = document.createElement('b'); name.textContent = NAMES[p];
    const say = document.createElement('small'); say.textContent = NEEDS[p] ? 'Needs ' + NEEDS[p] + '.' : POWER_TEXT[p];
    row.title = say.textContent;
    row.append(box, name, say);
    $(p === 'armored' ? 'statusList' : 'powerList').append(row);
  }
  document.querySelectorAll('input[name=clock]').forEach(r => r.onchange = () => { change(() => { S.level.clock = r.value; }); if (S.game) S.pending.push('clock:' + r.value); });
  $('mode').onclick = () => setMode(S.mode === 'play' ? 'edit' : 'play');
  $('hideBtn').onclick = () => S.pending.push('hide');
  $('respawnBtn').onclick = $('stuckReset').onclick = () => S.pending.push('respawn');
  $('reportBtn').onclick = copyReport;
  $('again').onclick = () => setMode('play');
  $('checkBtn').onclick = () => { runCheck(); openWell('findings'); };
  buildWell();
  buildChips();
  buildSize({ after: () => { syncPanel(); fit(); } });
  buildSheets();
  buildKeys();
  document.querySelectorAll('.opt .note').forEach(n => { n.title = n.textContent; });
  buildSelect({ syncPanel });
  buildLenses();
  $('playHere').onclick = () => { if (!S.lookAt) return; S.playFrom = S.lookAt; setMode('play'); };
  $('showSolution').onclick = () => { const moves = S.check?.result?.moves; if (!moves) return; setMode('play'); S.demo = [...moves]; };
  const after = () => { syncPanel(); fit(); };
  $('undo').onclick = () => undoStep(true, after);
  $('redo').onclick = () => undoStep(false, after);
  buildReset(after);
  $('winEdit').onclick = () => setMode('edit');
  $('placeHint').textContent = DEFAULT_HINT;
  // The context bar's one line of text: a message, else the tool's note, else the default hint.
  new MutationObserver(syncCtxText).observe($('placeHint'), { childList: true, characterData: true, subtree: true });
  const resize = () => {
    const level = S.level;
    const w = Math.max(2, Math.min(40, +$('w').value || level.w)), h = Math.max(2, Math.min(30, +$('h').value || level.h));
    if (w !== level.w || h !== level.h) { change(() => { S.level = resizeLevel(level, w, h); }); fit(); }
  };
  $('w').onchange = resize; $('h').onchange = resize;
  document.querySelectorAll('[data-side]').forEach(b => b.onclick = () => {
    const l = moveSide(S.level, b.dataset.side, +b.dataset.delta);
    if (!l) return;
    change(() => { S.level = l; }); syncPanel(); fit();
  });
  $('border').onclick = () => { change(() => { S.level = wallBorder(S.level); }); syncPanel(); };
}

export function syncPanel() {
  const ui = S.ui, level = S.level;
  S.redraw = true;
  syncUndo();
  syncCheck();
  syncLint();
  syncSelect();
  syncLenses();
  syncRoomsButton();
  canvas.style.touchAction = S.mode === 'edit' && ui.tool === 'look' ? 'pan-y' : 'none';
  // In a campaign level the palette is the level's: its elements, Look and Erase, in one list.
  const only = S.camp ? toolsFor(S.camp.def) : S.simple ? SIMPLE : null;
  syncColours();
  if (only && !only.includes(ui.tool)) ui.tool = 'look';
  document.querySelectorAll('[data-tool]').forEach(b => { b.classList.toggle('on', b.dataset.tool === ui.tool); b.hidden = only ? !only.includes(b.dataset.tool) : b.dataset.in !== ui.group || !!b.dataset.camp; });
  syncBrief();
  // A tab carries a dot when the selected tool sits in it.
  const holder = TOOLS.find(t => t.id === ui.tool).group;
  // In a level the one-way says how it is turned and taken away (register 234); draft copy.
  $('toolName').textContent = TOOLS.find(t => t.id === ui.tool).label + ((S.camp || S.simple) && (ui.tool === 'gate' || ui.tool === 'turret') ? ' (tap one to turn it, hold to remove it)' : '');
  document.querySelectorAll('[data-group]').forEach(b => { b.classList.toggle('on', b.dataset.group === ui.group); b.classList.toggle('holds', b.dataset.group === holder && holder !== ui.group); });
  // The tap button says only what the tap does with the powers on.
  const tap = [level.powers.cycle && 'Hide', level.powers.swim && 'Swim'].filter(Boolean);
  $('hideBtn').hidden = !tap.length; $('hideBtn').textContent = tap.join(' / ');
  $('keys').textContent = keysText();
  document.querySelectorAll('[data-axis]').forEach(b => b.classList.toggle('on', b.dataset.axis === ui.axis && +b.dataset.dir === ui.dir));
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === ui.mode));
  document.querySelectorAll('[data-colour]').forEach(b => b.classList.toggle('on', b.dataset.colour === ui.colour));
  document.querySelectorAll('[data-corner]').forEach(b => b.classList.toggle('on', b.dataset.corner === ui.corner));
  document.querySelectorAll('[data-face]').forEach(b => b.classList.toggle('on', b.dataset.face === ui.face));
  document.querySelectorAll('[data-pass]').forEach(b => {
    const on = ui.pass.includes(b.dataset.pass);
    b.classList.toggle('on', on);
    b.disabled = on && ui.pass.length === 1;
  });
  document.querySelectorAll('[data-aim]').forEach(b => {
    const on = ui.aim.includes(b.dataset.aim);
    b.classList.toggle('on', on);
    b.disabled = on && ui.aim.length === 1;
  });
  document.querySelectorAll('.opt').forEach(o => { o.hidden = !o.dataset.for.split(' ').includes(ui.tool); });
  if (ui.mode === 'follow') $('axisOpt').hidden = true;
  // A turret with one direction has nothing to choose from; one aims first otherwise.
  const first = ui.aim.includes(ui.start) ? ui.start : CLOCKWISE.find(d => ui.aim.includes(d));
  if (ui.aim.length < 2) $('startOpt').hidden = true;
  syncCtxText();
  document.querySelectorAll('[data-start]').forEach(b => { b.classList.toggle('on', b.dataset.start === first); b.disabled = !ui.aim.includes(b.dataset.start); });
  document.querySelectorAll('[data-power]').forEach(b => { b.checked = !!level.powers[b.dataset.power] && !NEEDS[b.dataset.power]; });
  document.querySelectorAll('input[name=clock]').forEach(r => { r.checked = r.value === level.clock; });
}

// A level with more than one colour shows them as a row of dots over its tools (register 245):
// what you place takes the chosen one, and a one-way takes a colour only in a level that names
// its colours. The palette's coloured pieces are drawn in the colour they will be placed in.
const TINTED = ['button', 'toggle', 'door', 'idoor', 'receiver', 'sensor', 'gate'];
let tint = '';
// In a level, Look, Erase and Move start the colours' line; back in the sandbox they return to the palette.
const LINE = ['look', 'erase', 'move'];
// The simple Sandbox (register 302) builds with the campaign's elements and tools, in two colours.
const SIMPLE = ['look', 'erase', 'move', 'start', 'goal', 'wall', 'box', 'button', 'toggle', 'door', 'gate', 'turret'];
const lined = () => !!(S.camp || S.simple);
function placeTools() {
  const box = $('campTools');
  for (const id of LINE) {
    const b = document.querySelector(`[data-tool="${id}"]`);
    // A comment keeps each one's place in the palette while it is away.
    if (lined() && b.parentNode !== box) { b.home ||= document.createComment(id); b.replaceWith(b.home); box.append(b); }
    else if (!lined() && b.parentNode === box) b.home.replaceWith(b);
  }
}
function syncColours() {
  placeTools();
  const ui = S.ui, cols = S.camp ? coloursOf(S.camp.def) : S.simple ? ['red', 'blue'] : null, row = $('campColours');
  if (cols && !cols.includes(ui.colour)) ui.colour = cols[0];
  ui.gateColour = (S.camp && S.camp.def.colours) || S.simple ? ui.colour : null;
  // In a level a laser stands alone, fires one way and turns with its clock: no mounting, no aim list.
  if (lined()) { ui.mount = false; if (ui.aim.length !== 1) ui.aim = ['right']; ui.mode = 'input'; } else ui.mount = true;
  row.hidden = !cols || cols.length < 2;
  if (cols && row.dataset.cols !== cols.join()) {
    row.dataset.cols = cols.join();
    row.replaceChildren(...cols.map(col => {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.campColour = col; b.title = col; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', col);
      b.style.background = INK[col];
      b.onclick = () => { S.ui.colour = col; syncPanel(); };
      return b;
    }));
  }
  row.querySelectorAll('[data-camp-colour]').forEach(b => { const on = b.dataset.campColour === ui.colour; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
  const key = ui.colour + '|' + ui.gateColour;
  if (key === tint) return;
  tint = key;
  for (const id of TINTED) {
    const b = document.querySelector(`#palette [data-tool="${id}"]`), old = b && b.querySelector('canvas');
    if (old) { const c = icon(id, ui.colour, ui.gateColour); c.dataset.colour = id === 'gate' ? ui.gateColour || '' : ui.colour; old.replaceWith(c); }
  }
}
