// Sandbox room metrics (register 650): ruin split into kills and locks, the first ruin, places, choices
// and forced steps on the shortest path, and the ways to win, shortest and within 2 moves more.
import { runMetrics } from '../src/solve/metrics.js';
import { metricLines } from '../src/app/metricLines.js';
import { room, suite } from './lib.mjs';
import { readFileSync } from 'node:fs';
import { routes } from '../src/solve/design.js';

const { check, done } = suite('metrics');
const m = rows => runMetrics(room(rows));
const open = m(['######', '#....#', '#P..G#', '######']);
check('an open room: nothing can lose the run, and no first ruin', open.ruin === 0 && open.firstRuin === null, JSON.stringify(open));
check('it counts the places the blob can reach', open.places >= 3, JSON.stringify(open));
const spikes = m(['######', '#xP.G#', '######']);
check('spikes beside the start: some moves kill, from the very first move', spikes.hazard > 0 && spikes.lock === 0 && spikes.firstRuin === 0, JSON.stringify(spikes));
const lock = m(['#######', '#G.P>.#', '#######']);
check('a one-way with no way back: some moves lock you out, none kill', lock.lock > 0 && lock.hazard === 0, JSON.stringify(lock));
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
const lines = metricLines(spikes);
check('six lines, each one sentence', lines.length === 6 && lines.every(l => l.endsWith('.') && l.split('. ').length === 1), JSON.stringify(lines));
check('a room that cannot lose says so', metricLines(open)[0] === 'Ruin: no move can lose the run.' && metricLines(open)[1] === 'First ruin: never.');
check('too big says so', metricLines(null)[0].startsWith('Too many positions'));
done();
