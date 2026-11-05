// What the campaign opens (registers 558, 610, 611): the first builder level, then each one once the
// one before it is beaten; a side room once the builder level beside it is beaten, puzzle and challenge
// in turn; a level's side goals once it is beaten.
import { suite } from './lib.mjs';
import { builders, plan, sideRoom, isOpen, sideGoalsOpen, PUZZLES, AHEAD } from '../src/campaign/progression.js';
import { CHALLENGES } from '../src/level/challenges.js';

const { check, done } = suite('progression');
const b = builders(), none = { levels: {} }, beat = (...defs) => ({ levels: Object.fromEntries(defs.map(d => [d.id, { beaten: true }])) });
check('there are builder levels to open', b.length >= 3, String(b.length));
// Register 673: the AHEAD levels past the furthest one beaten are open, so a stuck player has others to try.
check('three levels are kept open ahead, the number asked for (register 673)', AHEAD === 3);
check(`the first ${AHEAD} builder levels are open from the start, and no more`, b.slice(0, AHEAD).every(d => isOpen(d.id, none)) && (b.length <= AHEAD || !isOpen(b[AHEAD].id, none)));
check('beating a level opens the one AHEAD past it', b.length <= AHEAD + 1 || (!isOpen(b[AHEAD + 1].id, beat(b[0])) && isOpen(b[AHEAD].id, beat(b[0]))));
check('it counts from the furthest one beaten, skipped ones and all', b.length <= AHEAD + 3 || (isOpen(b[AHEAD + 2].id, beat(b[2])) && !isOpen(b[AHEAD + 3].id, beat(b[2])) && isOpen(b[1].id, beat(b[2]))));
check('side rooms alternate: a puzzle after odd builder levels, a challenge after even ones', sideRoom(2) === CHALLENGES[0] && sideRoom(4) === (CHALLENGES[1] || null) && sideRoom(1) === (PUZZLES[0] || null));
const withSide = plan().findIndex(r => r.side);
if (withSide >= 0) {
  const { def, side } = plan()[withSide];
  check('a side room is shut until the builder level beside it is beaten', !isOpen(side.id, none) && isOpen(side.id, beat(def)));
  check('solving a side room opens nothing by itself (register 610)', !isOpen(b[withSide + AHEAD].id, beat(side)));
}
check('a level\'s side goals show once it is beaten', !sideGoalsOpen(b[0].id, none) && sideGoalsOpen(b[0].id, beat(b[0])));
check('a level off the plan stays open', isOpen('tutorial', none));
// The campaign's puzzles (registers 651, 660, 662): each is a room in rooms/ named "Puzzle N", the same room the
// Sandbox offers as an example, in the N-th puzzle slot, and solvable with every power off.
{
  const { TEMPLATES } = await import('../src/level/templates.js');
  const { allShortest } = await import('../src/campaign/robot.js');
  const { noPowers } = await import('../src/rules/base.js');
  const { splitRoom } = await import('../src/level/room.js');
  // A room is a campaign puzzle by its name (Puzzle N) or by its puzzleSlot (Pushback, Heist: registers 759, 776).
  const slot = t => /^Puzzle \d+$/.test(t.name) ? +t.name.slice(7) : t.level.puzzleSlot;
  const named = TEMPLATES.filter(t => slot(t));
  check('every room named Puzzle N or given a puzzle slot is a campaign puzzle, and nothing else is', named.length > 0 && named.length === PUZZLES.filter(Boolean).length && named.every(t => PUZZLES[slot(t) - 1]?.room === t.level), named.map(t => t.name).join());
  check('Pushback is puzzle 5 and Heist puzzle 6, by their own names', PUZZLES[4]?.name === 'Pushback' && PUZZLES[5]?.name === 'Heist');
  check('Puzzle N opens after the N-th odd builder level', PUZZLES.every((p, i) => !p || sideRoom(2 * i + 1) === p));
  for (const p of PUZZLES.filter(Boolean)) check(`${p.name} is solvable with every power off`, allShortest(noPowers(splitRoom(p.room).level)).status === 'solved');
}
done();
