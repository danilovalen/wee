// Goals about boxes and blocks: pushes, collisions, where they end. A box collides when the robot's
// push ends with something stopping the box, and the box moved in that push. All copy is draft.
import { replayPath } from '../robot.js';
import { boxMoves } from '../pushes.js';
import { STEP, live, stoppedPushes, boxCount } from './helpers.js';

export const BOX_GOALS = {
  touchBlockFourTimes: {
    text: 'Robot touches the same block 4 times.',
    short: ['touch one', { el: 'block' }, '×4'],
    // A touch is a slide that ends against a block, as a collision ends against a door.
    judge: (room, moves) => {
      const touches = {};
      let dir = null;
      replayPath(room, moves, s => {
        const p = s.player;
        if (dir && !p.dir) {
          const [dx, dy] = STEP[dir], x = p.x + dx, y = p.y + dy;
          if (x >= 0 && y >= 0 && x < room.w && y < room.h && room.cells[y * room.w + x] === 'wall') touches[y * room.w + x] = (touches[y * room.w + x] || 0) + 1;
        }
        dir = p.dir;
      });
      return Object.values(touches).some(n => n >= 4);
    },
  },
  boxPushedThrice: {
    text: 'One box pushed in at least 3 moves.',
    short: [{ el: 'box' }, 'pushed ×3'],
    judge: (room, moves) => boxMoves(room, moves).some(b => b.pushes >= 3),
  },
  boxPushedTwiceHitOnce: {
    text: 'One box pushed in at least 2 moves, and hit once by the robot without moving.',
    short: [{ el: 'box' }, 'pushed ×2, collided ×1'],
    judge: (room, moves) => boxMoves(room, moves).some(b => b.pushes >= 2 && b.hits >= 1),
  },
  // Level 5 (register 263): each box must do both, so a second box cannot share the work.
  everyBoxPushedTwice: {
    text: 'Every box pushed in at least 2 moves.',
    short: ['every', { el: 'box' }, 'pushed 2 times'],
    judge: (room, moves) => { const b = boxMoves(room, moves); return b.length > 0 && b.every(x => x.pushes >= 2); },
  },
  everyBoxHitOnce: {
    text: 'Robot collides with every box without moving it.',
    short: [{ el: 'start' }, 'collides with every', { el: 'box' }],
    judge: (room, moves) => { const b = boxMoves(room, moves); return b.length > 0 && b.every(x => x.hits >= 1); },
  },
  // Register 277: a box on a coloured one-way when it turns is thrown out the other way.
  boxLaunched: {
    text: 'One-way turns and throws out the box on it.',
    short: [{ el: 'gate' }, 'throws a', { el: 'box' }, 'out'],
    judge: (room, moves) => {
      let ok = false;
      replayPath(room, moves, s => { if (s.events.some(e => e.type === 'launch' && live(s, e.x, e.y))) ok = true; });
      return ok;
    },
  },
  boxHitsBox: {
    needs: { box: 2 },
    text: 'Box collides with another box.',
    short: [{ el: 'box' }, 'collides with a', { el: 'box' }],
    judge: (room, moves) => stoppedPushes(room, moves).out.some(h => live(h.s, h.x, h.y)),
  },
  noBoxAtEnd: {
    text: 'No box left at the end.',
    short: ['no', { el: 'box' }, 'at the end'],
    judge: (room, moves) => boxCount(room) > 0 && !replayPath(room, moves, () => {}).entities.some(e => !e.dead && e.kind === 'box'),
  },
};
