// The side panels: the tool palette and its options, powers and status, the room size,
// and the file buttons. syncPanel makes every control show the current state.
import { COLOURS, POWERS, NEEDS } from '../rules/base.js';
import { emptyLevel, resizeLevel, resizeSide, wallBorder } from '../level/format.js';
import { T, INK } from '../view/ink.js';
import { drawPiece } from '../view/pieces.js';
import { drawEdit } from '../view/scene.js';
import { TOOLS, GROUPS, POWER_TEXT, NAMES } from '../editor/palette.js';
import { S } from '../editor/state.js';
import { $, canvas, touch } from './dom.js';
import { change, step as undoStep, syncUndo } from './undo.js';
import { runCheck, syncCheck, syncLint, toggleStops } from './check.js';
import { syncRoomsButton } from './rooms.js';
import { buildSelect, syncSelect } from './select.js';

export function keysText() {
  return touch
    ? (S.mode === 'play' ? 'Swipe to slide. While sliding, swipe again to use a power.' : '')
    : (S.mode === 'play' ? `Arrows slide. ${tapText()}R resets the room. E goes back to editing.` : 'E plays this room.');
}

function tapText() {
  const { cycle, swim } = S.level.powers;
  return cycle && swim ? 'Space hides you and starts or stops swimming. ' : cycle ? 'Space hides you. ' : swim ? 'Space starts or stops swimming. ' : '';
}

function icon(tool) {
  const c = document.createElement('canvas'), k = 20 / T;
  c.width = 40; c.height = 40;
  const x = c.getContext('2d'); x.scale(2 * k, 2 * k);
  if (tool === 'wall' || tool === 'checkpoint' || tool === 'button' || tool === 'door' || tool === 'idoor' || tool === 'tri' || tool === 'gate' || tool === 'spring' || tool === 'death' || tool === 'sensor' || tool === 'water' || tool === 'sticky' || tool === 'goal') {
    const l = emptyLevel(1, 1); l.cells[0] = tool === 'wall' || tool === 'checkpoint' || tool === 'death' || tool === 'water' || tool === 'sticky' || tool === 'goal' ? tool : tool === 'tri' ? 'tri:se' : tool === 'gate' ? 'gate:right' : tool === 'spring' ? 'spring:up' : tool + ':red';
    l.start = { x: 9, y: 9 }; drawEdit(x, l, null, [], 0);
  } else if (tool === 'select') {
    x.strokeStyle = '#c3cad8'; x.lineWidth = 2; x.setLineDash([4, 3]); x.strokeRect(6, 6, 20, 20); x.setLineDash([]);
  } else if (tool === 'look') {
    x.strokeStyle = '#c3cad8'; x.lineWidth = 2.5;
    x.beginPath(); x.arc(14, 14, 7, 0, Math.PI * 2); x.moveTo(19, 19); x.lineTo(26, 26); x.stroke();
  } else if (tool === 'receiver') {
    const l = emptyLevel(1, 1); l.cells[0] = 'receiver:red'; l.start = { x: 9, y: 9 }; drawEdit(x, l, null, [], 0);
  } else if (tool === 'erase') {
    x.strokeStyle = '#8e98ad'; x.lineWidth = 3; x.beginPath(); x.moveTo(8, 8); x.lineTo(24, 24); x.moveTo(24, 8); x.lineTo(8, 24); x.stroke();
  } else if (tool === 'start') {
    x.fillStyle = INK.player; x.beginPath(); x.arc(16, 16, 10, 0, Math.PI * 2); x.fill();
  } else if (tool === 'turret') drawPiece(x, { kind: 'turret', turret: { dirs: ['up', 'right'], mode: 'input' } }, 0, 0);
  else drawPiece(x, { kind: tool, axis: 'h', dir: 1, mode: 'input' }, 0, 0);
  return c;
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
    b.append(icon(t.id), t.label);
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
  document.querySelectorAll('[data-axis]').forEach(b => b.onclick = () => { S.ui.axis = b.dataset.axis; syncPanel(); });
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
  $('respawnBtn').onclick = () => S.pending.push('respawn');
  $('reportBtn').onclick = copyReport;
  $('again').onclick = () => setMode('play');
  $('checkBtn').onclick = () => runCheck();
  buildSelect({ syncPanel });
  $('stopsBtn').onclick = toggleStops;
  $('playHere').onclick = () => { if (!S.lookAt) return; S.playFrom = S.lookAt; setMode('play'); };
  $('showSolution').onclick = () => { const moves = S.check?.result?.moves; if (!moves) return; setMode('play'); S.demo = [...moves]; };
  const after = () => { syncPanel(); fit(); };
  $('undo').onclick = () => undoStep(true, after);
  $('redo').onclick = () => undoStep(false, after);
  $('winEdit').onclick = () => setMode('edit');
  $('placeHint').textContent = touch ? 'Tap to place. Tap one again to remove it. Look changes nothing.' : 'Click to place. Click one again, or right click, to remove it. Look changes nothing.';
  const resize = () => {
    const level = S.level;
    const w = Math.max(5, Math.min(40, +$('w').value || level.w)), h = Math.max(5, Math.min(30, +$('h').value || level.h));
    if (w !== level.w || h !== level.h) { change(() => { S.level = resizeLevel(level, w, h); }); fit(); }
  };
  $('w').onchange = resize; $('h').onchange = resize;
  document.querySelectorAll('[data-side]').forEach(b => b.onclick = () => {
    const l = resizeSide(S.level, b.dataset.side, +b.dataset.delta);
    if (!l) { $('placeHint').textContent = 'That cut would remove the start, or make the room too small.'; return; }
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
  syncRoomsButton();
  canvas.style.touchAction = S.mode === 'edit' && ui.tool === 'look' ? 'pan-y' : 'none';
  document.querySelectorAll('[data-tool]').forEach(b => { b.classList.toggle('on', b.dataset.tool === ui.tool); b.hidden = b.dataset.in !== ui.group; });
  // A tab carries a dot when the selected tool sits in it.
  const holder = TOOLS.find(t => t.id === ui.tool).group;
  document.querySelectorAll('[data-group]').forEach(b => { b.classList.toggle('on', b.dataset.group === ui.group); b.classList.toggle('holds', b.dataset.group === holder && holder !== ui.group); });
  // The tap button says only what the tap does with the powers on.
  const tap = [level.powers.cycle && 'Hide', level.powers.swim && 'Swim'].filter(Boolean);
  $('hideBtn').hidden = !tap.length; $('hideBtn').textContent = tap.join(' / ');
  $('keys').textContent = keysText();
  document.querySelectorAll('[data-axis]').forEach(b => b.classList.toggle('on', b.dataset.axis === ui.axis));
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
  document.querySelectorAll('[data-power]').forEach(b => { b.checked = !!level.powers[b.dataset.power] && !NEEDS[b.dataset.power]; });
  document.querySelectorAll('input[name=clock]').forEach(r => { r.checked = r.value === level.clock; });
}
