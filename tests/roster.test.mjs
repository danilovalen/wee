// The roster: every template solves, and each designed room still says what it was built to
// say: its par, the mechanisms its answer uses, nothing in it the design notes would flag, no
// lint, and the catch its idea rests on.
import { TEMPLATES } from '../src/level/templates.js';
import { createGame, step } from '../src/rules/game.js';
import { solve, settled } from '../src/solve/solve.js';
import { uses } from '../src/solve/tags.js';
import { elementCheck, idleElements, NOTES_MAX } from '../src/solve/design.js';
import { lint } from '../src/solve/lint.js';
import { suite } from './suite.mjs';

const { check, done } = suite('roster');
const run = g => { for (;;) { const r = g.next(); if (r.done) return r.value; } };
const room = name => TEMPLATES.find(t => t.name === name)?.level;
const play = (level, moves) => { const s = createGame(level); for (const m of moves) { step(s, [m]); for (let i = 0; i < 400 && !settled(s); i++) step(s); } return s; };

// A template with no goal (Sample) is a sandbox; every other one must solve.
const rooms = TEMPLATES.filter(t => t.level.cells.includes('goal')), unsolved = rooms.filter(t => solve(t.level).status !== 'solved').map(t => t.name);
check(`every template with a goal solves (${rooms.length})`, rooms.length >= 3 && !unsolved.length, unsolved.join());

const DESIGNED = {
  Overshoot: { par: 5, use: ['use:push'] },
  'Short fuse': { par: 12, use: ['use:blast', 'use:break'] },
};
for (const [name, want] of Object.entries(DESIGNED)) {
  const l = room(name), s = l && solve(l);
  if (!s || s.status !== 'solved') { check(`${name} is in the roster and solves`, false); continue; }
  const u = uses(l, s.moves), idle = idleElements(run(elementCheck(l, NOTES_MAX)), s.moves.length);
  check(`${name}: par ${want.par}, its answer uses ${want.use.join(' and ')}, no power is on`, s.moves.length === want.par && want.use.every(t => u.includes(t)) && !Object.values(l.powers).some(Boolean), `${s.moves.length} ${u}`);
  check(`${name}: nothing in it the design notes would flag, and no lint`, !idle.unused.length && !idle.plain.length && !lint(l).length, JSON.stringify([idle, lint(l)]));
}

// Overshoot's catch: the goal is straight above the start, and going for it slides you past it.
const o = room('Overshoot');
if (o) { const up = play(o, ['up']); check('Overshoot: going straight for the goal slides you past it', !up.won && up.player.y < o.start.y - 1, JSON.stringify(up.player)); }

// Short fuse's catch: after lighting the bomb and getting clear, coming straight back down
// stops you beside it as it goes off; you have to spend a move first.
const f = room('Short fuse');
if (f) {
  const ans = solve(f).moves, lit = ans.indexOf('down', 1) >= 0 ? ans.findIndex((m, i) => { const s = play(f, ans.slice(0, i + 1)); return s.entities.some(e => e.kind === 'bomb' && e.fuse != null); }) : -1;
  const back = play(f, [...ans.slice(0, lit + 2), 'down']);
  check('Short fuse: back down straight after getting clear, the blast gets you', lit > 0 && back.deaths === 1, JSON.stringify({ lit, deaths: back.deaths }));
  check('Short fuse: the answer waits one move against a wall before going back', ans[lit + 1] === ans[lit + 2], ans.join(' '));
}
done();
