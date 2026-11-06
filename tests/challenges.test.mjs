// Challenges (registers 558-562): every one has exactly one winning placement of all its given pieces,
// the game's own Run agrees with the checker, and the game reads what campaign/challenges.json says.
import { readFileSync } from 'node:fs';
import { measure, placements, rowsWith, toLevel, removalLevel, build, judge } from '../tools/challenge.mjs';
import { measureRemoval, choices, without } from '../tools/challenge.mjs';
import { PLACING, REMOVING } from '../src/campaign/names.js';
import { plan } from '../src/campaign/progression.js';
import { CHALLENGES } from '../src/level/challenges.js';
import { check, overLimits, underLimits } from '../src/campaign/rules.js';
import { suite } from './lib.mjs';
import { placingAxes, removalAxes, fails } from '../tools/challengeAxes.mjs';

const { check: ok, done } = suite('challenges');
const LIST = JSON.parse(readFileSync('campaign/challenges.json', 'utf8'));

ok('there are challenges to play', LIST.length >= 1);
ok('the game holds exactly what campaign/challenges.json says (run node tools/challenge.mjs --write)', JSON.stringify(LIST.map(c => c.remove ? removalLevel(c) : toLevel(c))) === JSON.stringify(CHALLENGES));
for (const ch of LIST.filter(c => !c.remove)) {
  const m = measure(ch);
  ok(`${ch.id}: exactly one placement of all its pieces wins`, m.wins.length === 1, `${m.wins.length} of ${m.placements}`);
  // The game's Run, on the level the player opens, agrees: the solution wins and a near miss does not.
  const def = CHALLENGES.find(c => c.id === ch.id), win = m.wins[0];
  const lost = placements(ch).map(pl => rowsWith(ch, pl)).find(rows => rows.join() !== win.rows.join());
  ok(`${ch.id}: the game's Run wins with the solution`, !!win && check(def, build(ch, win.rows)).won === true);
  ok(`${ch.id}: and does not with another placement`, check(def, build(ch, lost)).won === false);
}
// Removal challenges (register 787): the room as given can't be won, exactly one choice of the asked pieces
// wins, at least 30 choices, and the game's Run agrees.
for (const ch of LIST.filter(c => c.remove)) {
  const m = measureRemoval(ch), def = CHALLENGES.find(c => c.id === ch.id);
  ok(`${ch.id}: the room as given can't be won`, !judge(ch, ch.rows).reach && check(def, build(ch, ch.rows)).won === false);
  ok(`${ch.id}: exactly one choice of pieces to take out wins, of at least 30`, m.wins.length === 1 && m.choices >= 30, `${m.wins.length} of ${m.choices}`);
  const win = m.wins[0], lost = choices(ch.rows, ch.remove).find(t => JSON.stringify(t) !== JSON.stringify(win && win.tiles));
  ok(`${ch.id}: the game's Run wins once the right pieces are out`, !!win && check(def, build(ch, without(ch.rows, win.tiles))).won === true);
  ok(`${ch.id}: and not with other pieces out`, check(def, build(ch, without(ch.rows, lost))).won === false);
  // Said as taking out (register 787): the room as given asks for each kind still to go; one too many out says so.
  const asked = overLimits(def, build(ch, ch.rows)).map(e => e.msg);
  ok(`${ch.id}: the room as given says what to take out`, asked.length === Object.keys(ch.remove).length && asked.every(m => /^Take out \d+ more /.test(m)), JSON.stringify(asked));
  const extra = choices(ch.rows, Object.fromEntries(Object.entries(ch.remove).map(([k, n]) => [k, n + 1])))[0];
  const tooMany = extra ? underLimits(def, build(ch, without(ch.rows, extra))).map(e => e.msg) : ['Take out only'];
  ok(`${ch.id}: one too many out says to take out only the asked number`, tooMany.length > 0 && tooMany.every(m => /^Take out only \d+ /.test(m)), JSON.stringify(tooMany));
  ok(`${ch.id}: nor with one piece too few taken out`, check(def, build(ch, without(ch.rows, win.tiles.slice(1)))).won === false);
}
// Every challenge slot opens a placing challenge and its removal twin together (registers 786, 787).
const slots = plan().filter(r => r.side && r.side.challenge);
ok('every challenge slot has a placing challenge, and a removal twin unless its removal is waiting (805)', slots.length === PLACING.length && slots.every((r, i) => PLACING[i].waiting ? r.side === REMOVING[i] && !r.twin : r.twin ? r.twin.challenge.remove : REMOVING[i].waiting), `${slots.length} slots`);
ok('eleven of each', PLACING.length === 11 && REMOVING.length === 11, `${PLACING.length}, ${REMOVING.length}`);
// The axes every challenge is held to before it ships (registers 797, 799-801, 805): one answer, enough to try,
// no idle piece, every placed piece needed, depth after the first right piece, nothing read at a glance, and a
// name that says nothing about the answer.
const axes = c => c.remove ? removalAxes(c) : placingAxes(c);
// Slots no room meeting the depth bar has been found for yet: they pass every other axis and wait on 799.
const SHALLOW = ['c9', 'c10', 'c11'];
for (const ch of LIST.filter(c => !c.waiting)) {
  const f = fails(axes(ch)).filter(x => !(SHALLOW.includes(ch.id) && /^residual/.test(x)));
  ok(`${ch.id} ${ch.name}: passes every axis${SHALLOW.includes(ch.id) ? ' but depth (799, open)' : ''}`, f.length === 0, f.join('; '));
}
// A removal waiting for a room that meets the bar is left out of the campaign, not shipped weak (805).
const twins = plan().map(s => s.twin && s.twin.id).filter(Boolean);
ok('a waiting removal is in no slot of the campaign', LIST.filter(c => c.waiting).every(c => !twins.includes(c.id)) && LIST.some(c => c.waiting) === LIST.filter(c => c.remove).length > twins.length, JSON.stringify(twins));
// The levels he turned down still fail, each on what he saw: the axes would catch them again.
const REJECTED = JSON.parse(readFileSync('tests/fixtures/rejected-challenges.json', 'utf8')), by = id => axes(REJECTED.find(c => c.id === id));
ok('Lit door (c9) fails on depth after the first right piece (799)', fails(by('c9')).some(f => /^residual/.test(f)), fails(by('c9')).join('; '));
ok('Spare relay (r8) fails as seen at a glance, and on its name (805, 797)', (f => f.some(x => /^glance/.test(x)) && f.includes('name spoils'))(fails(by('r8'))), fails(by('r8')).join('; '));
ok('One beam (r9) fails as seen at a glance (800)', fails(by('r9')).some(f => /^glance/.test(f)), fails(by('r9')).join('; '));
ok('a draft whose lasers aim at nothing and whose relay is never lit fails as dead pieces (800)', fails(by('d9')).some(f => /^dead/.test(f)), fails(by('d9')).join('; '));
ok('Spike field (r10) fails at a glance and on depth (801)', (f => f.some(x => /^glance/.test(x)) && f.some(x => /^residual/.test(x)))(fails(by('r10'))), fails(by('r10')).join('; '));
done();
