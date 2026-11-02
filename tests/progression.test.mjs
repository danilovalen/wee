// What the campaign opens (registers 558, 610, 611): the first builder level, then each one once the
// one before it is beaten; a side room once the builder level beside it is beaten, puzzle and challenge
// in turn; a level's side goals once it is beaten.
import { suite } from './lib.mjs';
import { builders, plan, sideRoom, isOpen, sideGoalsOpen, PUZZLES } from '../src/campaign/progression.js';
import { CHALLENGES } from '../src/level/challenges.js';

const { check, done } = suite('progression');
const b = builders(), none = { levels: {} }, beat = (...defs) => ({ levels: Object.fromEntries(defs.map(d => [d.id, { beaten: true }])) });
check('there are builder levels to open', b.length >= 3, String(b.length));
check('the first builder level is open from the start', isOpen(b[0].id, none));
check('the second is shut until the first is beaten', !isOpen(b[1].id, none) && isOpen(b[1].id, beat(b[0])));
check('beating a later level alone opens only the one after it', !isOpen(b[2].id, beat(b[0])) && isOpen(b[2].id, beat(b[1])));
check('side rooms alternate: a puzzle after odd builder levels, a challenge after even ones', sideRoom(2) === CHALLENGES[0] && sideRoom(4) === (CHALLENGES[1] || null) && sideRoom(1) === (PUZZLES[0] || null));
const withSide = plan().findIndex(r => r.side);
if (withSide >= 0) {
  const { def, side } = plan()[withSide];
  check('a side room is shut until the builder level beside it is beaten', !isOpen(side.id, none) && isOpen(side.id, beat(def)));
  check('solving a side room opens nothing by itself (register 610)', !isOpen(b[withSide + 1].id, beat(side)));
}
check('a level\'s side goals show once it is beaten', !sideGoalsOpen(b[0].id, none) && sideGoalsOpen(b[0].id, beat(b[0])));
check('a level off the plan stays open', isOpen('tutorial', none));
done();
