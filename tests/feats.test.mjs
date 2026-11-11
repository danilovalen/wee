// Achievements earned by a Run (registers 631-636): the safety search that judges Guardrails and Deadly,
// and the counts a win carries toward the others.
import { safety } from '../src/solve/safety.js';
import { featsOf, record } from '../src/campaign/feats.js';
import { builders } from '../src/campaign/progression.js';
import { CHALLENGES } from '../src/level/challenges.js';
import { solve } from '../src/solve/solve.js';
import { room, suite } from './lib.mjs';

const { check, done } = suite('feats');
const at = rows => { const l = room(rows); return { l, path: solve(l).moves }; };

// Every other move bumps a wall or reaches somewhere the berry still can be reached from.
const open = at(['######', '#....#', '#P..G#', '######']);
const o = safety(open.l, open.path);
check('in an open room no move loses: guarded, and not deadly', !o.capped && o.guarded && !o.deadly, JSON.stringify(o));
// Left is spikes: guarded no more, and every move but the path's loses or does nothing.
const spikes = at(['######', '#xP.G#', '######']);
const s = safety(spikes.l, spikes.path);
check('a move into spikes is not guarded, and deadly when it is the only other move', !s.guarded && s.deadly, JSON.stringify(s));
// Right goes through a one-way and can never come back: a soft lock.
const lock = at(['#######', '#G.P>.#', '#######']);
const k = safety(lock.l, lock.path);
check('a one-way Wee cannot come back through is a soft lock: not guarded, still deadly', !k.guarded && k.deadly, JSON.stringify(k));
check('a room past the cap is not judged', safety(open.l, open.path, 1).capped);

// The counts a win carries (no def needed for a room with no limits).
const def = { palette: {}, require: [] }, judged = { guardrails: 'x', deadly: 'x' };
const win = (length, extra = {}) => ({ ok: true, won: true, length, reqs: {}, optional: [], path: [], ...extra });
const small = { w: 5, h: 5, cells: Array(25).fill(null), entities: [] };
const doors5 = { ...small, cells: [...Array(5).fill('door:red'), ...Array(20).fill(null)] };
check('12 moves in a 5x5 room is Move it move it', featsOf(def, small, win(12), judged).ids.includes('moveit'));
check('11 moves is not, and the count is kept', !featsOf(def, small, win(11), judged).ids.includes('moveit') && featsOf(def, small, win(11), judged).peak.moveit === 11);
check('a 6x5 room never counts for Move it move it', !featsOf(def, { ...small, w: 6, cells: Array(30).fill(null) }, win(12), judged).ids.includes('moveit'));
check('5 doors is Gateway', featsOf(def, doors5, win(4)).ids.includes('gateway'));
check('4 side goals met in one win is Silver bullet', featsOf(def, small, win(4, { optional: [1, 2, 3, 4].map(i => ({ id: 'g' + i, met: true })) })).ids.includes('silver'));
const one = ok => ({ ok: true, won: false, length: 1, reqs: { a: ok } }), lvl = n => ({ ...def, id: builders()[n - 1].id });
check('1 move on Level 11 with every main goal met is One shot, even when the move count is not', featsOf(lvl(11), small, one(true)).ids.includes('oneshot'));
check('1 move on Level 11 with a main goal missed is not', !featsOf(lvl(11), small, one(false)).ids.includes('oneshot'));
check('Level 10 is too early for One shot (register 641)', !featsOf(lvl(10), small, one(true)).ids.includes('oneshot'));
check('a challenge never counts for One shot', CHALLENGES.length === 0 || !featsOf({ ...def, id: CHALLENGES[0].id }, small, one(true)).ids.includes('oneshot'));
// What a Run earned is kept: the first level each was done on, and the best of each count.
const kept = record(record({}, { id: 'a' }, { ids: ['gateway'], peak: { moveit: 9 } }), { id: 'b' }, { ids: ['gateway', 'silver'], peak: { moveit: 7 } });
check('the save keeps the level each was first done on, and the best count', kept.feats.gateway === 'a' && kept.feats.silver === 'b' && kept.peak.moveit === 9, JSON.stringify(kept));
check('a run that does not win earns nothing else', featsOf(def, doors5, { ok: true, won: false, length: 4, reqs: {} }).ids.length === 0);
done();
