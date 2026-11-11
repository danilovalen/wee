// Sandbox room metrics (register 650): ruin split into kills and locks, the first ruin, places, choices
// and forced steps on the shortest path, and the ways to win, shortest and within 2 moves more.
import { runMetrics } from '../src/solve/metrics.js';
import { metricLines, reuseText } from '../src/app/metricLines.js';
import { flowUndos, reuse, wrongTurns, chokePoints } from '../src/solve/flow.js';
const run = it => { for (;;) { const r = it.next(); if (r.done) return r.value; } };
import { room, suite } from './lib.mjs';
import { readFileSync } from 'node:fs';
import { routes } from '../src/solve/design.js';

const { check, done } = suite('metrics');
const m = rows => runMetrics(room(rows));
const open = m(['######', '#....#', '#P..G#', '######']);
check('an open room: nothing can lose the run, and no first ruin', open.ruin === 0 && open.firstRuin === null, JSON.stringify(open));
check('it counts the places Wee can reach', open.places >= 3, JSON.stringify(open));
// Going with the flow (registers 708-710): a room the first move wins needs no undo.
const lane = m(['#####', '#P.G#', '#####']);
check('a room won in one move needs no undo going with the flow', lane.undos === 0, JSON.stringify(lane));
// Three dead ends and one way on, picked at random: most tries back out of at least one.
const fan = new Map([['s', { out: [{ key: 'a' }, { key: 'b' }, { key: 'c' }, { key: 'd' }] }], ['a', { out: [] }], ['b', { out: [] }], ['c', { out: [] }], ['d', { out: [{ win: true }] }]]);
const undos = (() => { const it = flowUndos(fan, 's'); for (;;) { const r = it.next(); if (r.done) return r.value; } })();
check('a choice with three dead ends takes undos, the same number every time', undos >= 1 && undos <= 3 && undos === (() => { const it = flowUndos(fan, 's'); for (;;) { const r = it.next(); if (r.done) return r.value; } })(), String(undos));
// A trap two positions deep: you can walk 2 moves into it before you are stuck.
const deep = wrongTurns(new Map([['s', { out: [{ win: true }, { key: 't' }, { key: 'v' }], at: { x: 1, y: 1 } }], ['t', { out: [{ key: 'u' }] }], ['u', { out: [] }], ['v', { out: [] }]]), ['s'], new Map([['s', 1]]));
check('the deepest trap counts every position you can still walk through', deep.turns === 2 && deep.traps === 2 && deep.deep.depth === 2 && deep.deep.at.x === 1, JSON.stringify(deep));
// A detour still reaches the berry, so it is a wrong turn but not a trap.
const detour = wrongTurns(new Map([['s', { out: [{ win: true }, { key: 'w' }], at: { x: 1, y: 1 } }], ['w', { out: [{ win: true }] }]]), ['s'], new Map([['s', 1], ['w', 1]]));
check('a detour is a wrong turn, not a trap', detour.turns === 1 && detour.traps === 0 && !detour.deep, JSON.stringify(detour));
const deadly = m(['######', '#xP.G#', '######']);
check('a move into spikes is a trap that ends the run at once (register 709)', deadly.wrong.turns === 1 && deadly.wrong.traps === 1 && deadly.wrong.deep.depth === 0 && deadly.wrong.deep.at.x === 2, JSON.stringify(deadly.wrong));
const spikes = m(['######', '#xP.G#', '######']);
check('spikes beside the start: some moves kill, from the very first move', spikes.hazard > 0 && spikes.lock === 0 && spikes.firstRuin === 0, JSON.stringify(spikes));
const lock = m(['#######', '#G.P>.#', '#######']);
check('a one-way with no way back: some moves lock you out, none kill', lock.lock > 0 && lock.hazard === 0, JSON.stringify(lock));
check('and that wrong turn is a trap you can walk into before you are stuck', lock.wrong.traps >= 1 && lock.wrong.deep.depth >= 1, JSON.stringify(lock.wrong));
check('a move that kills is no choice: beside spikes the start has one safe move', spikes.choices === 1, JSON.stringify(spikes));
check('ruin is kills and locks together', Math.abs(spikes.ruin - spikes.hazard - spikes.lock) < 1e-9 && Math.abs(lock.ruin - lock.hazard - lock.lock) < 1e-9);
// A corridor: every step of the shortest path has one safe move.
const corridor = m(['#####', '#P#G#', '#.#.#', '#...#', '#####']);
check('a corridor is all forced steps', corridor.forced === 1 && corridor.choices === 1, JSON.stringify(corridor));
// Two mirror-image ways round a pillar: two shortest ways, and more within 2 moves.
const both = m(['#######', '#.....#', '#.###.#', '#..P..#', '###G###']);
check('the shortest ways are counted, and ways within 2 moves more are at least as many', both.shortest >= 1 && both.near >= both.shortest, JSON.stringify(both));
// The shortest ways agree with the design notes' route count, on a room with powers where it is 2.
const first = JSON.parse(readFileSync('tests/fixtures/first-room-v1.wee', 'utf8')), fm = runMetrics(first), fr = (() => { const it = routes(first); for (;;) { const r = it.next(); if (r.done) return r.value; } })();
check('the shortest ways match the routes the design notes count', fm.shortest === fr.routes && fm.places === fr.positions && fm.shortest === 2, JSON.stringify({ fm, routes: fr.routes, positions: fr.positions }));
check('a room too big to measure says so', runMetrics(room(['######', '#....#', '#P..G#', '######']), 2) === null);
// The lines say each number in plain words, one sentence each.
const lines = metricLines(spikes), text = l => typeof l === 'string' ? l : l.text;
check('each line is one sentence, the deepest trap flashable where it starts', lines.length === 10 && lines.map(text).every(l => l.endsWith('.') && l.split('. ').length === 1) && lines.some(l => l.spots && l.spots[0].x === 2), JSON.stringify(lines));
check('no line about mashing is left (register 710)', !lines.map(text).some(l => /Mashing/.test(l)));
// Reuse (register 717): the corridor's three moves each stop against a different wall.
const corr = run(reuse(room(['#####', '#P#G#', '#.#.#', '#...#', '#####'])));
check('reuse counts the blocks the answer stops against', corr.moves === 3 && corr.blocks === 3 && corr.busiest === 1, JSON.stringify(corr));
// Right, down, right: two moves the same way, against two different walls.
const zig = run(reuse(room(['#######', '#P.#..#', '##.#..#', '##...G#', '#######'])));
check('reuse counts blocks, not move names', zig.moves === 3 && zig.blocks === 3, JSON.stringify(zig));
// Register 727: path reuse counts moves over ground already crossed; the corridor never crosses itself.
check('a corridor has no path reuse', corr.overlap === 0, JSON.stringify(corr));
const back = run(reuse(JSON.parse(readFileSync('rooms/puzzle-1.wee', 'utf8'))));
check('Puzzle 1, whose lines cross, has path reuse', back && back.overlap >= 1 && back.overlap < back.moves, JSON.stringify(back));
// Choke points: a place every way goes through is one; two ways round make none.
const line = new Map([['s', { out: [{ key: 'a' }], at: { x: 0, y: 0 } }], ['a', { out: [{ key: 'b' }, { key: 'c' }], at: { x: 1, y: 0 } }], ['b', { out: [{ win: true }], at: { x: 2, y: 0 } }], ['c', { out: [{ win: true }], at: { x: 2, y: 1 } }]]);
const ch = chokePoints(line, 's', ['s', 'a', 'b']);
check('a place every way goes through is a choke point; a place with a way round is not', ch.length === 1 && ch[0].x === 1, JSON.stringify(ch));
check('and says it in one sentence', reuseText(corr) === 'Reuse: 3 moves lean on 3 blocks, the busiest 1 time.', reuseText(corr));
check('a room that cannot lose says so', metricLines(open)[0] === 'Ruin: every move keeps the berry in reach.' && metricLines(open)[1] === 'First ruin: never.');
check('too big says so', metricLines(null)[0].startsWith('Too many positions'));
done();
