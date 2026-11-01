// Challenges (registers 558-562): every one has exactly one winning placement of all its given pieces,
// the game's own Run agrees with the checker, and the game reads what campaign/challenges.json says.
import { readFileSync } from 'node:fs';
import { measure, placements, rowsWith, toLevel, build, judge } from '../tools/challenge.mjs';
import { CHALLENGES } from '../src/level/challenges.js';
import { check } from '../src/campaign/rules.js';
import { suite } from './lib.mjs';

const { check: ok, done } = suite('challenges');
const LIST = JSON.parse(readFileSync('campaign/challenges.json', 'utf8'));

ok('there are challenges to play', LIST.length >= 1);
ok('the game holds exactly what campaign/challenges.json says (run node tools/challenge.mjs --write)', JSON.stringify(LIST.map(toLevel)) === JSON.stringify(CHALLENGES));
for (const ch of LIST) {
  const m = measure(ch);
  ok(`${ch.id}: exactly one placement of all its pieces wins`, m.wins.length === 1, `${m.wins.length} of ${m.placements}`);
  // The game's Run, on the level the player opens, agrees: the solution wins and a near miss does not.
  const def = CHALLENGES.find(c => c.id === ch.id), win = m.wins[0];
  const lost = placements(ch).map(pl => rowsWith(ch, pl)).find(rows => rows.join() !== win.rows.join());
  ok(`${ch.id}: the game's Run wins with the solution`, !!win && check(def, build(ch, win.rows)).won === true);
  ok(`${ch.id}: and does not with another placement`, check(def, build(ch, lost)).won === false);
}
done();
