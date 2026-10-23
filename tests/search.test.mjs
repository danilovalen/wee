// The room search (tools/roomSearch.mjs) and what register 272 gave it: rooms past 10x10, partial
// credit for a goal nearly met, a mutation that copies a row or column, and the known rooms as seeds.
import { searcher, MAX_SIDE, MAX_AREA } from '../tools/roomSearch.mjs';
import { miss, SCORES, derived } from '../tools/searchScores.mjs';
import { search, polish, BY_AREA } from '../tools/climb.mjs';
import { REQUIREMENTS } from '../src/campaign/requirements.js';
import { spawnSync } from 'node:child_process';
import { roomsOf } from './knownRooms.mjs';
import { LEVELS } from '../src/level/campaign.js';
import { check } from '../src/campaign/rules.js';
import { room, suite } from './lib.mjs';

const { check: ok, done } = suite('search');
const level = id => LEVELS.find(l => l.id === id);

{ // size: a side may pass 10, up to 16 and 120 tiles
  const s = searcher(level('5'), 3);
  let g = s.parse(['P.....', '......', '......', '......', '......', '......', '......', '......', '......', '.....G']), tall = 0, over = 0;
  for (let i = 0; i < 4000; i++) { const h = s.mutate(g); if (h.h > 10) tall++; if (h.w > MAX_SIDE || h.h > MAX_SIDE || h.w * h.h > MAX_AREA) over++; if (h.h >= g.h) g = h; }
  ok('a room can grow past 10 on a side', tall > 0, String(tall));
  ok('and never past 16 a side or 120 tiles', over === 0 && MAX_SIDE === 16 && MAX_AREA === 120, String(over));
}
{ // partial credit: nearer is cheaper
  const off = rows => { const r = room(rows); for (const k of Object.keys(r.powers)) r.powers[k] = false; return r; };
  const once = off(['#######', '#PB...#', '#######']), never = off(['#######', '#P...B#', '#######']);
  ok('a box pushed once costs less than a box never pushed', miss('everyBoxPushedTwice', once, ['right']) < miss('everyBoxPushedTwice', never, ['right']));
  const near = off(['########', '#PB..#B#', '########']), far = off(['########', '#PB...##', '#B.....#', '########']);
  ok('a box stopped next to another box costs less than one stopped far from it', miss('boxHitsBox', near, ['right']) < miss('boxHitsBox', far, ['right']));
  ok('a goal with no partial credit costs 1', miss('throughOpenDoor', once, ['right']) === 1);
}
{ // copying a strip
  const s = searcher(level('5'), 1), g = s.parse(['P.....', '.B.#..', '......', '......', '.....G']);
  s.copyStrip(g, true, 1, 3);
  const at = (x, y, el) => g.items.some(i => i[0] === el && i[1] === x && i[2] === y);
  ok('copying row 2 onto row 4 puts its box and block there too', at(1, 3, 'box') && at(3, 3, 'block') && at(1, 1, 'box'), JSON.stringify(g.items));
}
{ // seeds: every known room, read by the search, is the room the tests know wins
  const bad = [];
  for (const l of LEVELS) for (const rows of roomsOf(l.id)) {
    const s = searcher(l, 1), v = check(l, s.make(s.parse(rows)));
    if (!v.won) bad.push(l.id + ': ' + rows.join(' '));
  }
  ok('the search reads every known room as a winning room', bad.length === 0, bad.join(' | '));
  // The climb stops at penalty 0, so a room the game refuses must never score 0 (register 335).
  const nonzero = [];
  for (const l of LEVELS) for (const rows of roomsOf(l.id)) { const s = searcher(l, 1); if (s.penalty(s.parse(rows)) !== 0) nonzero.push(l.id); }
  ok('every known winning room scores 0 in the search', nonzero.length === 0, nonzero.join());
  const s17 = searcher(level('17'), 1), two = s17.parse(['.#...', '...#.', 'PBo#.', 'e...I', '..#.I', '....G']);
  ok('a room past the palette\'s maximum never scores 0 in the search, as the game refuses it', s17.penalty(two) > 0 && !check(level('17'), s17.make(two)).won, String(s17.penalty(two)));
}
{ // partial credit for the laser and inverted-door goals (register 335)
  const off = rows => { const r = room(rows); for (const k of Object.keys(r.powers)) r.powers[k] = false; return r; };
  const nearI = off(['#######', '#P..N.#', '#######']), farI = off(['########', '#P.#...#', '#.....N#', '########']);
  ok('a robot that ends beside an inverted door costs less than one far from it', miss('robotThroughIdoor', nearI, ['right']) < miss('robotThroughIdoor', farI, ['right']));
  const lit = l => { const r = off(l); return miss('allRelaysLitAtEnd', r, []); };
  ok('every relay lit costs less than none lit', lit(['#######', '#PT.s.#', '#######']) < lit(['#######', '#PT#s.#', '#######']));
}
{ // register 364: partial credit for every goal, a climb that keeps near-misses and polishes a win, a prover for every piece
  // Goals about a count or the room's end state have no distance to measure; any other goal must have credit.
  const STATE = ['touchBlockFourTimes', 'doorClosedAtEnd', 'everyToggleOn', 'boxPushedThrice', 'boxPushedTwiceHitOnce', 'everyToggleOnThenOff', 'twoTogglesOffAtEnd', 'thirdToggleOnAtEnd', 'aToggleOffAtEnd', 'boxLaunched', 'noBoxAtEnd', 'oneWaysThreeWays', 'lasersTwoWays', 'threeRelays'];
  const bare = Object.keys(REQUIREMENTS).filter(id => !SCORES[id] && !derived(id) && !STATE.includes(id));
  ok('every goal but the count and end-state ones gives the search partial credit', bare.length === 0, bare.join(' '));
  const beam = (rows, id) => miss(id, room(rows), []);
  ok('a goal scored from its own row: a beam ending nearer a button costs less', beam(['#######', '#PT..#o', '#######'], 'laserThroughButton') < beam(['########', '#PT#...#', '#.....o#', '########'], 'laserThroughButton'));
  ok('a gate goal derives from its row too', derived('robotThroughOneWay') && derived('laserThroughOneWay') && derived('laserThroughGoal'));
  // The climb on level 18 (seed 3) wins in under a second; then its polish finds rooms smaller than the first.
  const sizes = [];
  const r18 = search(level('18'), { seconds: 15, seed: 3, see: r => sizes.push(r.w * r.h), until: () => sizes.length >= 40 });
  ok('the climb finds a win and keeps polishing it to a smaller room', sizes.length > 0 && Math.min(...sizes) < sizes[0], `${r18.climbs} climbs, sizes ${sizes.slice(0, 5)}... min ${Math.min(...sizes)}`);
  // Polish from level 19's known 5x5 win: every room it reports wins, and the room it ends on is smaller.
  const s19 = searcher(level('19'), 1), known = s19.parse(roomsOf('19')[0]), met = [];
  const end = s19.make(polish(s19, level('19'), known, BY_AREA, 300, x => met.push(x.r.w * x.r.h)));
  ok('polishing a win reports wins and ends on a smaller room', met.length > 0 && end.w * end.h < 25, `${met.length} wins, ends ${end.w}x${end.h}`);
  // A level offering lasers plain and pushable gets both from the search (register 373: it took the first, plain, always).
  // Level 16 offered them until register 426; it stands in here with its old offer.
  const s16 = searcher({ ...level('16'), pushable: { laser: 'also' } }, 5), kinds = new Set();
  for (let i = 0; i < 200; i++) for (const e of s16.make(s16.random()).entities) if (e.turret) kinds.add(!!e.crate);
  ok('the search builds plain and pushable lasers where a level offers both', kinds.size === 2, [...kinds].join());
  const g = s19.random();
  ok('the aiming edits leave a room the search can still build', Array.from({ length: 200 }).every(() => { const h = s19.mutate(g); s19.make(h); return h.w >= 3 && h.h >= 3; }));
  // The prover: a known win for level 3, and none for level 1 under its 4-move minimum (the old prover lowered it to 1).
  const prove = args => spawnSync('node', ['tools/minMoves.mjs', ...args], { encoding: 'utf8' }).stdout;
  ok('the prover finds level 3\'s 8-move win in a 2x3 room', /WON in 8 moves, 2x3: PD Gt \.\./.test(prove(['3', '--moves', '8', '--cells', '6'])));
  ok('the prover keeps the level\'s minimum moves', /no win in 3 moves/.test(prove(['1', '--moves', '3', '--cells', '6'])));
}
done();
