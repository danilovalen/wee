// Goals about switches and buttons. All copy is draft.
import { replayPath } from '../robot.js';
import { toggleHistory, switches, cellsWhere } from './helpers.js';

export const SWITCH_GOALS = {
  boxOffButtonAtEnd: {
    text: 'Every box off its button at the end.',
    short: ['all', { el: 'box' }, 'off', { el: 'button' }, { mark: 'end' }],
    judge: (room, moves) => {
      const end = replayPath(room, moves, () => {});
      return end.entities.filter(e => !e.dead && e.kind === 'box').every(e => !(end.cells[e.y * room.w + e.x] || '').startsWith('button:'));
    },
  },
  everyToggleOn: {
    text: 'Every switch turns on.',
    short: ['all', { el: 'toggle' }, 'turns on'],
    judge: (room, moves) => { const h = toggleHistory(room, moves); return h.all.length > 0 && h.all.every(i => h.on.has(i)); },
  },
  onlyBoxesFlipSwitches: {
    text: 'Only boxes turn switches on and off; the blob never crosses one.',
    short: ['only', { el: 'box' }, 'flips', { el: 'toggle' }],
    judge: (room, moves) => {
      let robot = false, flipped = false;
      replayPath(room, moves, s => {
        if ((s.cells[s.player.y * room.w + s.player.x] || '').startsWith('toggle:')) robot = true;
        if (s.toggled.length) flipped = true;
      });
      return flipped && !robot;
    },
  },
  everyToggleOffAtEnd: {
    text: 'Every switch off at the end.',
    short: ['all', { el: 'toggle' }, 'off', { mark: 'end' }],
    judge: (room, moves) => room.cells.some(c => c.startsWith('toggle:')) && replayPath(room, moves, () => {}).toggled.length === 0,
  },
  everyToggleOnThenOff: {
    text: 'Every switch turns on, then off again.',
    short: ['all', { el: 'toggle' }, 'on, then off'],
    judge: (room, moves) => { const h = toggleHistory(room, moves); return h.all.length > 0 && h.all.every(i => h.onOff.has(i)); },
  },
  twoTogglesOffAtEnd: {
    needs: { toggle: 2 },
    text: 'At least 2 switches off at the end.',
    short: ['2', { el: 'toggle' }, 'off', { mark: 'end' }],
    judge: (room, moves) => switches(room).length - replayPath(room, moves, () => {}).toggled.length >= 2,
  },
  thirdToggleOnAtEnd: {
    needs: { toggle: 3 },
    text: 'Third switch on at the end.',
    short: ['3rd', { el: 'toggle' }, 'on', { mark: 'end' }],
    judge: (room, moves) => switches(room).length >= 3 && replayPath(room, moves, () => {}).toggled.length >= 1,
  },
  aToggleOffAtEnd: {
    text: 'At least one switch off at the end.',
    short: [{ el: 'toggle' }, 'off', { mark: 'end' }],
    judge: (room, moves) => switches(room).length > replayPath(room, moves, () => {}).toggled.length,
  },
  robotOnButton: {
    text: 'Blob steps on a button.',
    short: [{ el: 'start' }, 'on', { el: 'button' }],
    judge: (room, moves) => {
      let ok = false;
      replayPath(room, moves, s => { if ((s.cells[s.player.y * room.w + s.player.x] || '').startsWith('button:')) ok = true; });
      return ok;
    },
  },
  boxOnButtonAtEnd: {
    text: 'Box on a button at the end.',
    short: [{ el: 'box' }, 'on', { el: 'button' }, { mark: 'end' }],
    judge: (room, moves) => { const end = replayPath(room, moves, () => {}); return end.entities.some(e => !e.dead && e.kind === 'box' && /^button:/.test(end.cells[e.y * room.w + e.x] || '')); },
  },
  // Register 473: the robot steps onto a switch, flipping it, at least twice (the same switch or another).
  robotFlipsSwitchTwice: {
    text: 'Blob flips a switch 2 or more times.',
    short: [{ el: 'start' }, 'flips', { el: 'toggle' }, '×2'],
    judge: (room, moves) => {
      let flips = 0, was = -1;
      replayPath(room, moves, s => { const i = s.player.y * room.w + s.player.x, on = (s.cells[i] || '').startsWith('toggle:') ? i : -1; if (on >= 0 && on !== was) flips++; was = on; });
      return flips >= 2;
    },
  },
  // Register 670: Level 2 teaches the switch placed on.
  everySwitchStartsOn: {
    text: 'Every switch starts on.',
    short: ['all', { el: 'toggle' }, 'start on'],
    judge: room => { const all = switches(room); return all.length > 0 && all.every(i => room.cells[i].endsWith(':on')); },
  },
  everySwitchFlipsTwice: {
    text: 'Every switch flips 2 or more times.',
    short: ['all', { el: 'toggle' }, 'flip', '×2'],
    judge: (room, moves) => {
      const all = switches(room), flips = new Map(all.map(i => [i, 0]));
      let was = null;
      replayPath(room, moves, s => { const on = new Set(s.toggled); if (was) for (const i of all) if (was.has(i) !== on.has(i)) flips.set(i, flips.get(i) + 1); was = on; });
      return all.length > 0 && all.every(i => flips.get(i) >= 2);
    },
  },
  twoSwitches: {
    needs: { toggle: 2 },
    text: 'At least 2 switches in the room.',
    short: ['≥2', { el: 'toggle' }],
    judge: room => switches(room).length >= 2,
  },
  threeSwitches: {
    needs: { toggle: 3 },
    text: 'At least 3 switches in the room.',
    short: ['≥3', { el: 'toggle' }],
    judge: room => switches(room).length >= 3,
  },
  twoButtons: {
    needs: { button: 2 },
    text: 'At least 2 buttons in the room.',
    short: ['≥2', { el: 'button' }],
    judge: room => cellsWhere(room, c => c.startsWith('button:')).length >= 2,
  },
};
