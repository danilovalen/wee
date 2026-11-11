// A run as one position per move (register 758): the keys played again from the start give a frame after
// each move, ending where the run ended.
import { runFrames, levelAt } from '../src/solve/frames.js';
import { replay } from '../src/rules/game.js';
import { room, suite } from './lib.mjs';

const { check, done } = suite('frames');
const OFF = { boomerang: false, dive: false, laser: false, cycle: false };
// Right to the wall, then down onto the berry: two moves.
const l = room(['#####', '#P..#', '###.#', '#####'], { powers: OFF }); l.cells[2 * 5 + 3] = 'goal';
const log = [{ t: 0, k: 'right' }, { t: 12, k: 'down' }], ticks = 30;
const f = runFrames(l, log, ticks);
check('a frame for the start and one per move', f.length === 3, String(f.length));
check('each move\'s frame is where it came to rest', f[1].game.player.x === 3 && f[1].game.player.y === 1 && f[2].game.player.y === 2, JSON.stringify(f.map(x => [x.game.player.x, x.game.player.y])));
check('the last frame is where the run ended', f[2].game.won === true && JSON.stringify(f[2].game.player) === JSON.stringify(replay(l, log, f[2].tick).player));
check('the first frame is the start, kept as it was', f[0].game.player.x === 1 && f[0].game.move === 0);
check('frames are copies: changing one leaves the next alone', (f[0].game.player.x = 99, f[1].game.player.x === 3));
check('a key that only changes a setting is not a move', runFrames(l, [{ t: 0, k: 'clock:tile' }], 5).length === 1);
// Edit from here: a box pushed one tile and the blob beside it start there in the new room.
const push = room(['######', '#PB..#', '######'], { powers: OFF });
const pf = runFrames(push, [{ t: 0, k: 'right' }], 20), at = levelAt(push, pf[pf.length - 1].game);
check('Edit from here starts Wee and each piece where the run left them', at.start.x === pf[pf.length - 1].game.player.x && at.entities[0].x === pf[pf.length - 1].game.entities[0].x && at.entities[0].x !== 2, JSON.stringify([at.start, at.entities]));
check('and leaves the room it came from as it was', push.entities[0].x === 2 && push.start.x === 1);
done();
