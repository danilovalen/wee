// Keyboard: one letter per common tool, Tab to hide both side columns, and ? for a list of
// every key. The letters avoid E (play), R (rotate, reset) and the lens digits. All copy is draft.
import { TOOLS } from '../editor/palette.js';
import { $ } from './dom.js';

export const TOOL_KEYS = { look: 'L', erase: 'X', select: 'S', start: 'P', wall: 'B', checkpoint: 'C', goal: 'G', mover: 'M', turret: 'T', box: 'O', heavy: 'H', water: 'W', door: 'D' };
const BY_KEY = Object.fromEntries(Object.entries(TOOL_KEYS).map(([t, k]) => [k, t]));
const name = id => TOOLS.find(t => t.id === id).label;

const LIST = [
  ['Editing', [['E', 'Play this room, or go back to editing'], ['Ctrl+Z', 'Undo'], ['Ctrl+Shift+Z', 'Redo'], ['Ctrl+S', 'Save'], ['Tab', 'Hide or show both side columns'], ['?', 'This list']]],
  ['Tools', Object.entries(TOOL_KEYS).map(([t, k]) => [k, name(t)])],
  ['Lenses', [['1 to 4', 'Next lens in Colour, Dots, Lines or Frames'], ['0', 'Every lens off']]],
  ['Select', [['Ctrl+C', 'Copy'], ['Ctrl+X', 'Cut'], ['Ctrl+V', 'Paste'], ['Delete', 'Delete'], ['R', 'Rotate'], ['Escape', 'Let go']]],
  ['Playing', [['Arrows', 'Slide'], ['Space', 'Hide, or start or stop swimming, with those powers'], ['R', 'Reset the room'], ['E', 'Back to editing']]],
];

export function buildKeys() {
  document.querySelectorAll('[data-tool]').forEach(b => {
    const k = TOOL_KEYS[b.dataset.tool];
    if (!k) return;
    b.title = `${b.title} (${k})`;
    b.append(Object.assign(document.createElement('kbd'), { className: 'key', textContent: k }));
  });
  $('keysList').replaceChildren(...LIST.map(([head, rows]) => {
    const sec = document.createElement('section');
    sec.append(Object.assign(document.createElement('h3'), { textContent: head }), ...rows.map(([k, does]) => {
      const row = document.createElement('p');
      row.append(Object.assign(document.createElement('kbd'), { textContent: k }), ` ${does}`);
      return row;
    }));
    return sec;
  }));
  $('keysBtn').onclick = () => $('keysBox').showModal();
}

// The tool a bare letter picks in edit mode, or null.
export const toolForKey = ev => (ev.ctrlKey || ev.metaKey || ev.altKey ? null : BY_KEY[ev.key.toUpperCase()] || null);

// Tab hides both side columns, but only when no control has focus, so it still moves focus.
export function bareKey(ev) {
  if (ev.key !== 'Tab' || ev.ctrlKey || ev.altKey || innerWidth <= 700) return false;
  const f = document.activeElement;
  if (f && f !== document.body && f.id !== 'game') return false;
  document.body.classList.toggle('bare');
  return true;
}
export const showKeys = () => $('keysBox').showModal();
