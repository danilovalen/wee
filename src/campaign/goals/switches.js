// Goals about switches and buttons. All copy is draft.
import { replayPath } from '../robot.js';
import { toggleHistory, switches } from './helpers.js';

export const SWITCH_GOALS = {
  boxOffButtonAtEnd: {
    text: 'Every box off its button at the end.',
    short: ['every', { el: 'box' }, 'off the', { el: 'button' }, 'at the end'],
    judge: (room, moves) => {
      const end = replayPath(room, moves, () => {});
      return end.entities.filter(e => !e.dead && e.kind === 'box').every(e => !(end.cells[e.y * room.w + e.x] || '').startsWith('button:'));
    },
  },
  everyToggleOn: {
    text: 'Every switch turns on.',
    short: ['every', { el: 'toggle' }, 'turns on'],
    judge: (room, moves) => { const h = toggleHistory(room, moves); return h.all.length > 0 && h.all.every(i => h.on.has(i)); },
  },
  onlyBoxesFlipSwitches: {
    text: 'Only boxes turn switches on and off; the robot never crosses one.',
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
    short: ['every', { el: 'toggle' }, 'off at the end'],
    judge: (room, moves) => room.cells.some(c => c.startsWith('toggle:')) && replayPath(room, moves, () => {}).toggled.length === 0,
  },
  everyToggleOnThenOff: {
    text: 'Every switch turns on, then off again.',
    short: ['every', { el: 'toggle' }, 'on, then off'],
    judge: (room, moves) => { const h = toggleHistory(room, moves); return h.all.length > 0 && h.all.every(i => h.onOff.has(i)); },
  },
  twoTogglesOffAtEnd: {
    needs: { toggle: 2 },
    text: 'At least 2 switches off at the end.',
    short: ['2', { el: 'toggle' }, 'off at the end'],
    judge: (room, moves) => switches(room).length - replayPath(room, moves, () => {}).toggled.length >= 2,
  },
  thirdToggleOnAtEnd: {
    needs: { toggle: 3 },
    text: 'Third switch on at the end.',
    short: ['a 3rd', { el: 'toggle' }, 'on at the end'],
    judge: (room, moves) => switches(room).length >= 3 && replayPath(room, moves, () => {}).toggled.length >= 1,
  },
  aToggleOffAtEnd: {
    text: 'At least one switch off at the end.',
    short: ['a', { el: 'toggle' }, 'off at the end'],
    judge: (room, moves) => switches(room).length > replayPath(room, moves, () => {}).toggled.length,
  },
  robotOnButton: {
    text: 'Robot steps on a button.',
    short: [{ el: 'start' }, 'steps on a', { el: 'button' }],
    judge: (room, moves) => {
      let ok = false;
      replayPath(room, moves, s => { if ((s.cells[s.player.y * room.w + s.player.x] || '').startsWith('button:')) ok = true; });
      return ok;
    },
  },
  boxOnButtonAtEnd: {
    text: 'Box on a button at the end.',
    short: [{ el: 'box' }, 'on a', { el: 'button' }, 'at the end'],
    judge: (room, moves) => { const end = replayPath(room, moves, () => {}); return end.entities.some(e => !e.dead && e.kind === 'box' && /^button:/.test(end.cells[e.y * room.w + e.x] || '')); },
  },
};
