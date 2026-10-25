import { createGame, step, gameText, replay, cloneGame } from "../src/rules/game.js";
import { worldStep as rawWorldStep } from '../src/rules/pieces.js';
import { aimKey } from '../src/rules/player.js';
import { parseLevel, emptyLevel, isCell, resizeSide, wallBorder, moveSide } from '../src/level/format.js';
import { solidCell, gateDirs, cellAt } from '../src/rules/grid.js';
import { stateKey } from '../src/solve/solve.js';
import { counterRoom, countOf } from '../tools/counterRoom.mjs';
import { displayRoom, digitOf } from '../tools/displayRoom.mjs';
import { hexRoom, hexOf } from '../tools/hexRoom.mjs';
import { place, describe, turnGate, moveAt } from '../src/editor/edit.js';
import { drawTurret } from '../src/view/pieces.js';
import { INK } from '../src/view/ink.js';
import { newHistory, record, undo, redo, LIMIT } from '../src/editor/history.js';
import { RT_PERIOD } from '../src/rules/base.js';
import { explode, respawn, refreshDoors } from '../src/rules/life.js';

// One move of yours, as the world sees it: pieces on your move start their slide, then
// every slide and push runs to its end before the test looks.
const settle = g => { for (let i = 0; i < 60 && g.entities.some(e => !e.dead && (e.rush || e.slide)); i++) step(g); return g; };
const worldStep = (g, d) => { g.move++; rawWorldStep(g, d); return settle(g); };
import { room, suite } from './lib.mjs';
import { readFileSync } from 'node:fs';

const { check, done } = suite('sim');

// Steps until the player stops sliding (or n ticks pass). First tick carries the key.
function slide(s, key, n = 50) {
  step(s, [key]);
  for (let i = 0; i < n && s.player.dir; i++) step(s);
  return s;
}
const at = (o, x, y) => o.x === x && o.y === y;
const alive = s => s.entities.filter(e => !e.dead);

{ // a slide runs until a block stops it
  const s = slide(createGame(room(['#######', '#P...##', '#######'])), 'right');
  check('slide stops at the wall', at(s.player, 4, 1), JSON.stringify(s.player));
  check('slide ends idle', s.player.dir === null);
}

const LONG = ['##########', '#..P....##', '##########'];

{ // boomerang reverses to the far wall, past the start
  const s = createGame(room(LONG));
  step(s, ['right']); step(s);
  step(s, ['left']);
  for (let i = 0; i < 50 && s.player.dir; i++) step(s);
  check('boomerang slides back to the far wall', at(s.player, 1, 1), JSON.stringify(s.player));
}
{ // without the power the reverse key does nothing
  const s = createGame(room(LONG, { powers: { boomerang: false } }));
  step(s, ['right']); step(s); step(s, ['left']);
  for (let i = 0; i < 50 && s.player.dir; i++) step(s);
  check('reverse ignored without boomerang', at(s.player, 7, 1), JSON.stringify(s.player));
}
{ // dive arrives at once and the world still gets every skipped tile
  const s = createGame(room(LONG));
  step(s, ['right']);
  step(s, ['right']);
  check('dive arrives in one tick', at(s.player, 7, 1) && s.player.dir === null, JSON.stringify(s.player));
  check('dive gives the world one step per tile', s.worldSteps === 4, 'worldSteps ' + s.worldSteps);
  const t = slide(createGame(room(LONG)), 'right');
  check('a plain slide gives the same world steps', t.worldSteps === s.worldSteps, t.worldSteps + ' vs ' + s.worldSteps);
}
{ // per-slide clock: one world step however long the slide
  const s = slide(createGame(room(LONG, { clock: 'slide' })), 'right');
  check('per-slide clock steps once', s.worldSteps === 1, 'worldSteps ' + s.worldSteps);
  const early = createGame(room(LONG, { clock: 'slide' }));
  step(early, ['right']);
  check('and steps when the slide starts, not when it ends', early.worldSteps === 1 && early.player.dir === 'right', JSON.stringify([early.worldSteps, early.player.dir]));
  const u = slide(createGame(room(['#####', '#P###', '#####'], { clock: 'slide' })), 'right');
  check('a blocked slide gives no world step', u.worldSteps === 0, 'worldSteps ' + u.worldSteps);
}
{ // laser kills an enemy across its beam, and the slide goes on
  const s = createGame(room(['#########', '#P......#', '#.......#', '#..E....#', '#########'], { mode: 'realtime' }));
  step(s, ['right']); step(s);
  step(s, ['down']);
  check('laser kills the enemy', alive(s).length === 0);
  check('the slide continues after firing', s.player.dir === 'right' && at(s.player, 4, 1), JSON.stringify(s.player));
  const t = createGame(room(['#########', '#P......#', '#.......#', '#..E....#', '#########'], { mode: 'realtime', powers: { laser: false } }));
  step(t, ['right']); step(t); step(t, ['down']);
  check('no beam without laser', alive(t).length === 1);
}
{ // a light box slides ahead; you stop behind it
  const s = slide(createGame(room(['#########', '#PB.....#', '#########'])), 'right');
  const box = s.entities[0];
  check('box slides to the wall', at(box, 7, 1), JSON.stringify(box));
  check('you stop behind the box', at(s.player, 6, 1), JSON.stringify(s.player));
  const t = slide(createGame(room(['#####', '#P.B#', '#####'])), 'right');
  check('a box against a wall stops you', at(t.player, 2, 1) && at(t.entities[0], 3, 1));
}
{ // a heavy box ignores a slide and moves on a dive
  const HEAVY = ['##########', '#P...H...#', '##########'];
  const s = slide(createGame(room(HEAVY)), 'right');
  check('a slide does not move a heavy box', at(s.entities[0], 5, 1) && at(s.player, 4, 1));
  const t = createGame(room(HEAVY));
  step(t, ['right']); step(t, ['right']);
  for (let i = 0; i < 10; i++) step(t);
  check('dive sends the heavy box to the wall', at(t.entities[0], 8, 1), JSON.stringify(t.entities[0]));
  check('the diver stays at the crash tile', at(t.player, 4, 1));
}
{ // a moving heavy box squashes an enemy, a light box does not
  const s = createGame(room(['##########', '#P...H.E.#', '##########'], { mode: 'realtime' }));
  step(s, ['right']); step(s, ['right']); step(s);
  check('heavy box squashes the enemy', s.entities.find(e => e.kind === 'enemy').dead);
  const t = createGame(room(['#######', '#.E.B.#', '#P....#', '#######']));
  worldStep(t);
  check('an enemy pushes a light box', at(t.entities.find(e => e.kind === 'box'), 5, 1) && at(t.entities.find(e => e.kind === 'enemy'), 4, 1));
}
{ // a heavy box moving into you squashes you
  const s = createGame(room(['########', '#..P..H#', '#......#', '########']));
  s.checkpoint = { x: 1, y: 2 };
  s.entities[0].slide = 'left';
  for (let i = 0; i < 5; i++) step(s);
  check('heavy box squashes you', s.deaths === 1 && at(s.player, 1, 2), JSON.stringify(s.player));
}
{ // a moving block pushes you, and crushes you against a wall
  const s = createGame(room(['########', '#M.P...#', '#......#', '########']));
  s.checkpoint = { x: 1, y: 2 };
  s.move++; rawWorldStep(s); for (let i = 0; i < 3; i++) step(s);
  check('a sliding block pushes you ahead of it', at(s.player, 5, 1) && at(s.entities[0], 4, 1), JSON.stringify(s.player));
  settle(s);
  check('all the way to the wall, where it crushes you', s.deaths === 1, JSON.stringify(s.player));
  const t = createGame(room(['#####', '#M.P#', '#...#', '#####']));
  t.checkpoint = { x: 1, y: 2 };
  worldStep(t); worldStep(t);
  check('mover crushes you against a wall', t.deaths === 1 && at(t.player, 1, 2), JSON.stringify(t.player));
  const u = createGame(room(['#######', '#M.B..#', '#######']));
  u.player.x = 5;
  worldStep(u); worldStep(u);
  check('a mover pushes a light box', at(u.entities[1], 4, 1), JSON.stringify(u.entities[1]));
}
{ // buttons of one colour are AND; a released button closes the doors
  const s = createGame(room(['######', '#P.oo#', '#B.DD#', '######']));
  check('doors start closed', !s.open.red);
  s.player.x = 3; step(s);
  check('one of two buttons is not enough', !s.open.red);
  s.entities[0].x = 4; s.entities[0].y = 1; step(s);
  check('all buttons pressed opens the colour', s.open.red);
  s.player.x = 2; step(s);
  check('releasing a button closes the doors', !s.open.red);
  const t = slide(createGame(room(['######', '#P.D.#', '#....#', '######'])), 'right');
  check('a closed door stops a slide', at(t.player, 2, 1));
}
{ // a hide cycles the world; what passes over you misses you, what ends on you squashes you
  const l = room(['######', '#.PE.#', '######']);
  l.entities[0].dir = -1;
  const s = createGame(l);
  step(s, ['hide']);
  check('hide gives the world a step', s.worldSteps === 1 && s.player.hidden);
  for (let i = 0; i < 8; i++) step(s);
  check('an enemy passes over you while you hide', !s.entities[0].dead && s.deaths === 0 && at(s.entities[0], 1, 1) && !s.player.hidden, JSON.stringify(s.entities[0]));
  const q = room(['#####', '#PE.#', '#...#', '#####']);
  q.entities[0].dir = -1;
  const sq = createGame(q);
  sq.checkpoint = { x: 3, y: 2 };
  step(sq, ['hide']);
  for (let i = 0; i < 8; i++) step(sq);
  check('one that stops on you squashes you when you come back', sq.deaths === 1, JSON.stringify(sq.player));
  const dl = room(['######', '#D...#', '#.M..#', '######']);
  dl.start = { x: 1, y: 1 }; dl.cells[2 * 6 + 2] = 'button:red';
  const dg = createGame(dl);
  dg.checkpoint = { x: 4, y: 1 };
  check('a door held open by a block on its button', dg.open.red);
  step(dg, ['hide']);
  for (let i = 0; i < 8; i++) step(dg);
  check('a door that closes on you while you hide squashes you', dg.deaths === 1, JSON.stringify(dg.player));
  const k = createGame(room(['######', '#.P..#', '#....#', '######']));
  step(k, ['hide']); step(k, ['right']);
  check('hidden, you cannot slide', k.player.dir === null && at(k.player, 2, 1));
  step(k, ['hide']);
  check('hiding again while hidden does nothing', k.worldSteps === 1);
  const lv = room(['##########', '#T.P.....#', '#E.......#', '##########']);
  lv.entities.find(e => e.kind === 'turret').turret = { dirs: ['right', 'down'], mode: 'realtime' };
  const sw = createGame(lv);
  sw.checkpoint = { x: 8, y: 2 };
  step(sw, ['hide']);
  for (let i = 0; i < 8; i++) step(sw);
  check('a beam that sweeps past while you hide misses you', sw.deaths === 0 && sw.beams[0].d === 'down', JSON.stringify(sw.beams[0].d));
  check('you hide until what the hide sent sliding has stopped', at(sw.entities.find(e => e.kind === 'enemy'), 8, 2) && !sw.player.hidden);
  const t = createGame(l);
  t.checkpoint = { x: 4, y: 1 };
  worldStep(t);
  check('the same enemy kills you on the ground', t.deaths === 1);
  const u = createGame(room(['######', '#.PE.#', '######'], { powers: { cycle: false } }));
  step(u, ['hide']);
  check('no hide without cycle', u.worldSteps === 0);
}
{ // real-time movers move with no input; on-input movers wait
  const s = createGame(room(['#######', '#M....#', '#P....#', '#######'], { mode: 'realtime' }));
  for (let i = 0; i < RT_PERIOD; i++) step(s);
  check('real-time mover sets off on its own clock', s.entities[0].rush);
  for (let i = 0; i < 5; i++) step(s);
  check('and slides on ice to the wall', at(s.entities[0], 5, 1), JSON.stringify(s.entities[0]));
  const t = createGame(room(['#######', '#M....#', '#P....#', '#######']));
  for (let i = 0; i < RT_PERIOD * 3; i++) step(t);
  check('on-input mover waits for you', at(t.entities[0], 1, 1));
}
{ // checkpoints and R
  const s = slide(createGame(room(['##########', '#P..C...##', '##########'])), 'right');
  check('sliding over a checkpoint takes it', at(s.checkpoint, 4, 1));
  step(s, ['respawn']);
  check('R returns you to the checkpoint', at(s.player, 4, 1));
  const t = createGame(room(['#####', '#P..#', '#####']));
  t.player.x = 3; step(t, ['respawn']);
  check('with no checkpoint, R returns you to the start', at(t.player, 1, 1));
}
{ // replay: the same keys end in the same state, different keys do not
  const l = room(['##########', '#P..E...##', '#........#', '#..B..C..#', '##########'], { mode: 'realtime' });
  const log = [{ t: 0, k: 'down' }, { t: 4, k: 'right' }, { t: 12, k: 'up' }, { t: 20, k: 'hide' }];
  const a = gameText(replay(l, log, 40)), b = gameText(replay(l, log, 40));
  check('replay is deterministic', a === b);
  check('a different log ends elsewhere', a !== gameText(replay(l, [{ t: 0, k: 'right' }], 40)));
}
{ // the level file round-trips and refuses what it does not know
  const l = room(['#####', '#PoD#', '#####']);
  const back = parseLevel(JSON.stringify(l));
  check('a level survives save and open', JSON.stringify(back) === JSON.stringify(parseLevel(JSON.stringify(back))) && back.cells[7] === 'button:red');
  let refused = 0;
  for (const bad of [{ ...l, format: 'x' }, { ...l, cells: ['lava'] }, { ...l, cells: l.cells.map((c, i) => i === 0 ? 'lava' : c) }, { ...l, clock: 'fast' }])
    try { parseLevel(JSON.stringify(bad)); } catch { refused++; }
  check('bad files are refused', refused === 4, refused + '/4');
  check('a new level is empty and playable', createGame(emptyLevel()).player.x === 1);
}

{ // weak enemy: a dive kills it and the dive goes on; a plain slide into it kills you
  const W = ['##########', '#P...E...#', '#........#', '##########'];
  const s = createGame(room(W, { mode: 'realtime' }));
  step(s, ['right']); step(s, ['right']);
  check('a dive kills a weak enemy', s.entities[0].dead && s.deaths === 0);
  check('the dive carries on past it', at(s.player, 8, 1), JSON.stringify(s.player));
  const t = slide(createGame(room(W, { mode: 'realtime' })), 'right');
  check('sliding into a weak enemy kills you', t.deaths === 1);
}
{ // strong enemy: only a moving heavy box kills it
  const L = ['#########', '#P......#', '#.......#', '#..S....#', '#########'];
  const s = createGame(room(L, { mode: 'realtime' }));
  step(s, ['right']); step(s); step(s, ['down']);
  check('a laser does not kill a strong enemy', !s.entities[0].dead);
  const D = ['##########', '#P...S...#', '#........#', '##########'];
  const t = createGame(room(D, { mode: 'realtime' }));
  t.checkpoint = { x: 1, y: 2 };
  step(t, ['right']); step(t, ['right']);
  check('diving into a strong enemy kills you', t.deaths === 1 && !t.entities[0].dead);
  const l = room(['######', '#PS..#', '#....#', '######']);
  l.entities[0].dir = -1;
  const u = createGame(l);
  u.checkpoint = { x: 4, y: 2 };
  step(u, ['hide']);
  for (let i = 0; i < 8; i++) step(u);
  check('a strong enemy that stops on you squashes you too', !u.entities[0].dead && u.deaths === 1);
  const v = createGame(room(['##########', '#P...H.S.#', '##########'], { mode: 'realtime' }));
  step(v, ['right']); step(v, ['right']); step(v);
  check('a thrown heavy box kills a strong enemy', v.entities.find(e => e.kind === 'strong').dead);
}
{ // turret: one continuous beam that turns clockwise, one direction per world step
  const l = room(['#######', '#.....#', '#..T..#', '#.....#', '#P....#', '#######']);
  l.entities[0].turret.dirs = ['left', 'up', 'down'];
  const s = createGame(l);
  const aims = [s.beams[0].d];
  s.player.x = 1;
  for (let i = 0; i < 3; i++) { step(s, ['hide']); for (let k = 0; k < 8; k++) step(s); aims.push(s.beams[0].d); }
  check('a turret turns clockwise and loops, once per move of yours', aims.join() === 'up,down,left,up' && s.deaths === 0, aims.join());
  step(s, ['up']);
  check('and turns once as you leave your tile, when your move starts', s.player.dir === 'up' && s.player.y === 3 && s.beams[0].d === 'down', JSON.stringify([s.player.y, s.beams[0].d]));
  slide(s, 'up');
  check('then holds still for the rest of the slide', s.beams[0].d === 'down', s.beams[0].d);
  const w = createGame(room(['#######', '#T....#', '#.....#', '#..P..#', '#.....#', '#######']));
  w.checkpoint = { x: 5, y: 4 };
  slide(w, 'up');
  check('sliding into a beam kills you', w.deaths === 1, JSON.stringify(w.player));
  // a dive crosses every tile it skips, so a beam on the way kills you as a slide would
  const across = () => { const l = room(['#########', '#...T...#', '#P......#', '#########']); l.entities[0].turret.dirs = ['down']; return createGame(l); };
  const dv = across(); step(dv, ['right']); step(dv, ['right']);
  const sl = slide(across(), 'right');
  check('diving through a beam kills you, as sliding through does', dv.deaths === 1 && sl.deaths === 1, `dive ${dv.deaths}, slide ${sl.deaths}`);
  const j = createGame(room(['#######', '#T..P.#', '#.....#', '#######']));
  j.checkpoint = { x: 5, y: 2 };
  step(j, ['hide']);
  check('you are safe in a beam while you hide', j.deaths === 0);
  for (let i = 0; i < 8; i++) step(j);
  check('and it is still there when you come back', j.deaths === 1);
  const b = createGame(room(['########', '#T.B..P#', '#......#', '########']));
  step(b);
  const end = b.beams[0].path.at(-1);
  check('a box blocks the beam', b.deaths === 0 && end[0] === 3, JSON.stringify(b.beams[0].path));
  const kl = room(['########', '#T.E.S.#', '#P.....#', '########']);
  const k = createGame(kl);
  step(k);
  const kend = k.beams[0].path.at(-1);
  check('a beam kills a weak enemy and stops at a strong one', k.entities.find(e => e.kind === 'enemy').dead && !k.entities.find(e => e.kind === 'strong').dead && kend[0] === 5, JSON.stringify(k.beams[0].path));
  for (let i = 0; i < 30; i++) step(k);
  check('a strong enemy takes no harm from a beam', !k.entities.find(e => e.kind === 'strong').dead);
  const rl = room(['#######', '#.....#', '#..T..#', '#.....#', '#P....#', '#######'], { mode: 'realtime' });
  rl.entities[0].turret.dirs = ['up', 'right'];
  const r = createGame(rl);
  for (let i = 0; i < RT_PERIOD; i++) step(r);
  check('a real-time turret turns on its own', r.beams[0].d === 'right', r.beams[0].d);
  const ql = room(['#######', '#.....#', '#..T..#', '#.....#', '#P....#', '#######']);
  ql.entities[0].turret.dirs = ['up', 'right'];
  const q = createGame(ql);
  for (let i = 0; i < RT_PERIOD * 2; i++) step(q);
  check('an on-input turret waits for you', q.beams[0].d === 'up');
}
{ // a turret rides its carrier and fires from where the carrier is
  const l = room(['#########', '#PB.....#', '#.......#', '#########']);
  l.entities[0].turret = { dirs: ['down'], mode: 'input' };
  const s = slide(createGame(l), 'right');
  check('the turret moves with its box', at(s.entities[0], 7, 1));
  const p0 = s.beams[0].path[0];
  check('and its beam starts at the box', p0[0] === 7 && p0[1] === 1 && s.beams[0].d === 'down', JSON.stringify(s.beams[0]));
  const t = slide(createGame(room(['######', '#P.T.#', '######'])), 'right');
  check('a turret block stops a slide', at(t.player, 2, 1));
  let refused = 0;
  for (const dirs of [[], ['up', 'up'], ['north'], ['up', 'right', 'down', 'left', 'up']]) {
    const bad = room(['####', '#PT#', '####']); bad.entities[0].turret.dirs = dirs;
    try { parseLevel(JSON.stringify(bad)); } catch { refused++; }
  }
  check('a turret with bad directions is refused', refused === 4, refused + '/4');
}
{ // a relay is a button that a beam holds down; with a wall behind it does what a catcher did (register 353)
  const s = createGame(room(['########', '#T..s#.#', '#.oD...#', '#P.....#', '########']));
  step(s);
  check('a lit relay alone is not enough when its colour has a button', !s.open.red);
  s.player.x = 2; s.player.y = 2; step(s);
  check('lit relay plus pressed button opens the door', s.open.red);
  s.entities.push({ id: 99, kind: 'box', x: 2, y: 1, dead: false, turret: null });
  step(s);
  check('blocking the beam closes the door again', !s.open.red && s.lit.size === 0);
  const t = createGame(room(['#######', '#T..s#', '#..D..#', '#P....#', '#######'].map(r => r.padEnd(7, '#').slice(0, 7))));
  check('a lone relay opens its colour from the start', t.open.red);
  let refused = 0;
  try { parseLevel(JSON.stringify({ ...room(['###', '#P#', '###']), cells: ['sensor:pink', ...Array(8).fill('')] })); } catch { refused++; }
  check('a relay of an unknown colour is refused', refused === 1);
  let old = null; try { old = parseLevel(JSON.stringify({ ...room(['###', '#P#', '###']), cells: ['receiver:blue', ...Array(8).fill('')] })); } catch { /* reported below */ }
  check('an old room\'s laser catcher loads as a relay of its colour', old?.cells[0] === 'sensor:blue');
}
{ // follow: pieces move the way you moved, one tile per world step, and wait when blocked
  const F = ['##########', '#M.......#', '#P.......#', '##########'];
  const s = slide(createGame(room(F, { mode: 'follow' })), 'right');
  check('a follower slides along with you', at(s.entities[0], 8, 1) && at(s.player, 8, 2), JSON.stringify(s.entities[0]));
  const w = slide(createGame(room(['##########', '#M..#....#', '#P.......#', '##########'], { mode: 'follow' })), 'right');
  check('a blocked follower waits while you go on', at(w.entities[0], 3, 1) && at(w.player, 8, 2), JSON.stringify(w.entities[0]));
  const t = slide(createGame(room(F, { mode: 'follow', clock: 'slide' })), 'right');
  settle(t);
  check('per slide, a follower slides all the way your way', at(t.entities[0], 8, 1), JSON.stringify(t.entities[0]));
  const u = createGame(room(F, { mode: 'follow' }));
  step(u, ['hide']);
  check('a hide has no direction, so followers stay', at(u.entities[0], 1, 1) && u.worldSteps === 1);
  const v = slide(createGame(room(['#######', '#.....#', '#P....#', '#..V..#', '#######'], { mode: 'follow' })), 'right');
  check('a follower ignores its patrol axis', at(v.entities[0], 5, 3), JSON.stringify(v.entities[0]));
}
{ // a follow turret points the way you moved, if it has that barrel
  const l = room(['########', '#..T...#', '#P.....#', '########'], { mode: 'follow' });
  l.entities[0].turret.dirs = ['up', 'right'];
  const s = createGame(l);
  step(s, ['right']); step(s);
  check('a follow turret points the way you slid', s.beams[0].d === 'right', s.beams[0].d);
  for (let i = 0; i < 10; i++) step(s);
  step(s, ['left']); step(s);
  check('no barrel that way, it keeps its aim', s.beams[0].d === 'right', s.beams[0].d);
  let refused = 0;
  try { parseLevel(JSON.stringify({ ...l, entities: [{ kind: 'mover', x: 2, y: 2, axis: 'h', mode: 'sideways' }] })); } catch { refused++; }
  check('an unknown clock is refused', refused === 1);
}
{ // settings changed mid-play are inputs, so a replay sees them at the same tick
  const l = room(LONG);
  const log = [{ t: 0, k: 'power:boomerang:0' }, { t: 0, k: 'right' }, { t: 2, k: 'left' }];
  const s = replay(l, log, 20);
  check('a power turned off mid-play stays off in the replay', at(s.player, 7, 1) && !s.powers.boomerang, JSON.stringify(s.player));
  const t = replay(l, [{ t: 0, k: 'clock:slide' }, { t: 0, k: 'right' }], 20);
  check('a clock changed mid-play is replayed', t.clock === 'slide' && t.worldSteps === 1, t.clock + ' ' + t.worldSteps);
}

{ // register 1: his report. A patrol that turns at a wall still moves that step,
  // so after his slide right and back the enemy ends level with him again.
  const r = JSON.parse(readFileSync(new URL('./reports/patrol-turn-loses-a-step.json', import.meta.url)));
  const s = replay(r.level, r.keys, r.ticks);
  check('his run: the enemy ends level with him', s.entities[0].x === s.player.x, `enemy ${s.entities[0].x}, player ${s.player.x}`);
  const t = createGame(room(['#####', '#M..#', '#P..#', '#####']));
  worldStep(t);
  check('on your move a patrol slides on ice to the wall and turns there', at(t.entities[0], 3, 1) && t.entities[0].dir === -1, JSON.stringify(t.entities[0]));
  worldStep(t);
  check('and on your next move slides all the way back', at(t.entities[0], 1, 1), JSON.stringify(t.entities[0]));
  const u = createGame(room(['###', '#M#', '#P#', '###']));
  worldStep(u);
  check('a patrol boxed in on both sides stays put', at(u.entities[0], 1, 1));
}
{ // a hide sends each on-your-move piece sliding until something stops it
  const s = createGame(room(['##########', '#E.......#', '#P.......#', '##########']));
  step(s, ['hide']);
  for (let i = 0; i < 12; i++) step(s);
  check('after a hide the enemy slides to the wall', at(s.entities[0], 8, 1), JSON.stringify(s.entities[0]));
  check('a hide is still one world step', s.worldSteps === 1);
  const t = createGame(room(['##########', '#E.......#', '#P.......#', '##########']));
  step(t, ['hide']); step(t);
  check('the slide takes a tile per tick, so you see it travel', t.entities[0].x === 3, JSON.stringify(t.entities[0]));
}
{ // triangles turn whatever enters an open face, and stop what hits a solid side
  const s = slide(createGame(room(['#########', '#.......#', '#.......#', '#.......#', '#P...3..#', '#########'])), 'right');
  check('a slide into a triangle turns up and carries on', at(s.player, 5, 1), JSON.stringify(s.player));
  const t = slide(createGame(room(['#######', '#.....#', '#P..7.#', '#######'])), 'right');
  check('a solid side stops a slide like a wall', at(t.player, 3, 2), JSON.stringify(t.player));
  const u = slide(createGame(room(['#######', '#.....#', '#.....#', '#PB..3#', '#######'])), 'right');
  check('a pushed box turns with the triangle', at(u.entities[0], 5, 1) && at(u.player, 5, 2), JSON.stringify(u.entities[0]) + JSON.stringify(u.player));
  const v = createGame(room(['#######', '#..E..#', '#.....#', '#..3..#', '#P....#', '#######'], { mode: 'realtime' }));
  v.player.x = 1; v.player.y = 3; v.player.dir = 'up';
  step(v, ['right']);
  check('a laser turns at a triangle', v.entities[0].dead, JSON.stringify(v.events.find(e => e.type === 'laser')));
  const w = createGame(room(['#######', '#M...9#', '#.....#', '#.....#', '#P....#', '#######']));
  worldStep(w);
  check('a patrol turns onto the other axis at a triangle', w.entities[0].axis === 'v' && at(w.entities[0], 5, 4), JSON.stringify(w.entities[0]));
  const x = createGame(room(['########', '#P...H9#', '#......#', '#......#', '########']));
  step(x, ['right']); step(x, ['right']);
  for (let i = 0; i < 8; i++) step(x);
  check('a thrown heavy box turns at a triangle', at(x.entities[0], 6, 3), JSON.stringify(x.entities[0]));
  let refused = 0;
  try { parseLevel(JSON.stringify({ ...room(['###', '#P#', '###']), cells: Array(9).fill('tri:up') })); } catch { refused++; }
  check('an unknown triangle is refused', refused === 1);
}

{ // one-way and two-way tiles: through along their arrows, a wall any other way
  const s = slide(createGame(room(['########', '#P..>..#', '########'])), 'right');
  check('a slide passes a one-way tile going its way', at(s.player, 6, 1), JSON.stringify(s.player));
  const t = slide(createGame(room(['########', '#..>..P#', '########'])), 'left');
  check('against its arrow it is a wall', at(t.player, 4, 1), JSON.stringify(t.player));
  const u = slide(createGame(room(['#####', '#...#', '#.>.#', '#...#', '#.P.#', '#####'])), 'up');
  check('across its arrow it is a wall too', at(u.player, 2, 3), JSON.stringify(u.player));
  const v = createGame(room(['#####', '#...#', '#.>.#', '#...#', '#####']));
  v.player.x = 2; v.player.y = 2;
  slide(v, 'up');
  check('standing on one, you can only leave its way', at(v.player, 2, 2));
  slide(v, 'right');
  check('and leaving its way works', at(v.player, 3, 2));
  const w = slide(slide(createGame(room(['#######', '#P.=..#', '#######'])), 'right'), 'left');
  check('a two-way tile lets you through both ways', at(w.player, 1, 1), JSON.stringify(w.player));
  const b = slide(createGame(room(['########', '#..>B.P#', '########'])), 'left');
  check('a box cannot be pushed against an arrow', at(b.entities[0], 4, 1) && at(b.player, 5, 1), JSON.stringify(b.entities[0]));
  const m = createGame(room(['#######', '#M.<..#', '#P....#', '#######']));
  worldStep(m, 'right'); worldStep(m, 'right');
  check('a moving block turns back at an arrow against it', at(m.entities[0], 1, 1), JSON.stringify(m.entities[0]));
  const l = createGame(room(['########', '#T.<..P#', '#......#', '########']));
  step(l);
  check('a beam stops at an arrow against it', l.deaths === 0 && l.beams[0].path.at(-1)[0] === 2, JSON.stringify(l.beams[0].path));
  const k = createGame(room(['########', '#T.>..P#', '#......#', '########']));
  k.checkpoint = { x: 1, y: 2 };
  step(k);
  check('and passes one going its way', k.deaths === 1);
  let refused = 0;
  for (const c of ['gate:', 'gate:up,up', 'gate:north']) {
    try { parseLevel(JSON.stringify({ ...room(['###', '#P#', '###']), cells: [c, ...Array(8).fill('')] })); } catch { refused++; }
  }
  check('a one-way tile with bad directions is refused', refused === 3, refused + '/3');
}

{ // a coloured one-way points the other way while its colour is pressed (register 241)
  const make = held => {
    const l = room(['#######', '#..>.P#', '#.B...#', '#######']);
    l.cells[1 * 7 + 3] = 'gate:right@red'; l.cells[2 * 7 + (held ? 2 : 4)] = 'button:red';
    return createGame(l);
  };
  const off = slide(make(false), 'left');
  check('a red one-way keeps its way while red is not pressed', at(off.player, 4, 1), JSON.stringify(off.player));
  const on = slide(make(true), 'left');
  check('and turns round while the red button is held', at(on.player, 1, 1), JSON.stringify(on.player));
  const back = make(true); back.player.x = 1;
  slide(back, 'right');
  check('then refuses its old way', at(back.player, 2, 1), JSON.stringify(back.player));
  let bad = 0;
  for (const c of ['gate:right@pink', 'gate:right@red@blue', 'gate:@red']) {
    try { parseLevel(JSON.stringify({ ...room(['###', '#P#', '###']), cells: [c, ...Array(8).fill('')] })); } catch { bad++; }
  }
  check('a one-way with a bad colour is refused', bad === 3 && isCell('gate:right,left@blue'), bad + '/3');
  const d = room(['#####', '#P..#', '#####']); d.cells[7] = 'gate:up@red';
  check('the Look tool names its colour', describe(d, 2, 1).startsWith('Red one-way'), describe(d, 2, 1));
  const put = room(['#####', '#P..#', '#####']);
  place(put, { tool: 'gate', pass: ['left'], gateColour: 'blue' }, 3, 1, 'place');
  check('placing a one-way with a colour chosen gives it that colour', put.cells[8] === 'gate:left@blue', put.cells[8]);
  turnGate(put, 3, 1);
  check('turning it keeps its colour', put.cells[8] === 'gate:up@blue', put.cells[8]);
}

{ // boxes push boxes (register 278): pushed, a row of boxes goes as a train; sliding on its own, a box hands its slide on
  const tr = slide(createGame(room(['#######', '#PBB..#', '#######'])), 'right');
  check('pushing a box into another pushes both, a train', at(tr.entities[0], 4, 1) && at(tr.entities[1], 5, 1) && at(tr.player, 3, 1), JSON.stringify([tr.entities, tr.player]));
  const three = slide(createGame(room(['########', '#PBBB..#', '########'])), 'right');
  check('a train of three moves as one', three.entities.map(e => e.x).join() === '4,5,6' && at(three.player, 3, 1), JSON.stringify(three.entities.map(e => e.x)));
  const stuck = slide(createGame(room(['######', '#PBB#', '######'].map(r => r.slice(0, 5)))), 'right');
  check('a train against a wall does not move', at(stuck.entities[0], 2, 1) && at(stuck.entities[1], 3, 1) && at(stuck.player, 1, 1), JSON.stringify(stuck.entities));
  const l = room(['#######', '#.B.B##', '#####o#', '#####P#', '#######']);
  l.cells[1 * 7 + 4] = 'gate:right@red'; l.cells[2 * 7 + 5] = 'button:red';
  const g = createGame(l); slide(g, 'up'); for (let i = 0; i < 20; i++) step(g);
  const [a, b] = [...g.entities].sort((p, q) => p.x - q.x);
  check('a box thrown out stops at the box it meets, which slides on', at(a, 1, 1) && at(b, 3, 1), JSON.stringify(g.entities));
}

{ // a one-way that turns launches what stands on it along its new arrow, until something stops it (register 253)
  const l = room(['#######', '##..B.#', '#o#####', '#P#####', '#######']);
  l.cells[1 * 7 + 4] = 'gate:right@red'; l.cells[2 * 7 + 1] = 'button:red';
  const g = createGame(l);
  slide(g, 'up'); for (let i = 0; i < 20; i++) step(g);
  check('the box on it slides out the new way when the button goes down', at(g.entities[0], 2, 1), JSON.stringify(g.entities[0]));
  const r = room(['########', '#....P.#', '#B.....#', '#o######', '########']);
  r.cells[1 * 8 + 5] = 'gate:right@red'; r.cells[3 * 8 + 1] = 'button:red';
  const h = createGame(r);
  h.entities[0].y = 3; for (let i = 0; i < 20; i++) step(h);
  check('the robot on it is launched too, sliding until a wall stops it', at(h.player, 1, 1), JSON.stringify(h.player));
  const k = room(['#######', '##..B.#', '#o.####', '#P#####', '#######']);
  k.cells[1 * 7 + 4] = 'gate:right@red'; k.cells[2 * 7 + 1] = 'button:red';
  const off = createGame(k);
  const plain = room(['#######', '##..B.#', '#o#####', '#P#####', '#######']);
  plain.cells[1 * 7 + 4] = 'gate:left'; plain.cells[2 * 7 + 1] = 'button:red';
  const pg = createGame(plain);
  slide(pg, 'up'); for (let i = 0; i < 20; i++) step(pg);
  check('a plain one-way launches nothing when a colour turns', at(pg.entities[0], 4, 1), JSON.stringify(pg.entities[0]));
  const rs = room(['#######', '##..B.#', '#o#####', '#P#####', '#######']);
  rs.cells[1 * 7 + 4] = 'gate:right@red'; rs.cells[2 * 7 + 1] = 'button:red';
  const re = createGame(rs); re.open.red = true; respawn(re); for (let i = 0; i < 20; i++) step(re);
  check('a reset launches nothing: the doors start over as a new room\'s do', at(re.entities.find(e => !e.dead), 4, 1), JSON.stringify(re.entities.find(e => !e.dead)));
  check('nothing is launched while the colour stays as it is', (() => { for (let i = 0; i < 20; i++) step(off); return at(off.entities[0], 4, 1); })(), JSON.stringify(off.entities[0]));
}

{ // a spring launches whatever lands in front of it, the way it faces
  const R = ['#######', '#.....#', '#.....#', '#P....#', '#..8..#', '#######'];
  const s = slide(createGame(room(R)), 'right');
  check('a spring turns your slide its way', at(s.player, 3, 1), JSON.stringify(s.player));
  const b = slide(createGame(room(['#######', '#.....#', '#.....#', '#PB...#', '#..8..#', '#######'])), 'right');
  for (let i = 0; i < 6; i++) step(b);
  check('a pushed box gets launched', at(b.entities[0], 3, 1), JSON.stringify(b.entities[0]));
  check('and you, stepping in front after it, get launched behind it', at(b.player, 3, 2), JSON.stringify(b.player));
  const e = createGame(room(['#######', '#P....#', '#.....#', '#.E...#', '#..8..#', '#######']));
  worldStep(e, 'right');
  for (let i = 0; i < 6; i++) step(e);
  check('an enemy stepping in front gets launched', at(e.entities[0], 3, 1), JSON.stringify(e.entities[0]));
  const a = createGame(room(R));
  a.player.x = 3; a.player.y = 3;
  step(a, ['hide']);
  check('hidden, you are out of its reach', a.player.dir === null && at(a.player, 3, 3));
  const w = createGame(room(['#####', '#...#', '#.P.#', '#.8.#', '#####']));
  w.cells[1 * 5 + 2] = 'wall';
  step(w);
  check('it does not launch into a wall', w.player.dir === null);
  const v = slide(createGame(room(['#######', '#P..8.#', '#######'])), 'right');
  check('a spring is solid from its sides', at(v.player, 3, 1), JSON.stringify(v.player));
  const l = createGame(room(['########', '#T.....#', '#P.8...#', '########']));
  step(l);
  check('a beam crossing it is untouched', l.beams[0].path.at(-1)[0] === 6, JSON.stringify(l.beams[0].path));
}
{ // a death block destroys whatever moves into it
  const s = slide(createGame(room(['#######', '#.....#', '#P..X.#', '#######'])), 'right');
  check('you die sliding into one', s.deaths === 1);
  const b = slide(createGame(room(['#######', '#PB.X.#', '#######'])), 'right');
  check('a pushed box is destroyed, and on ice you follow it in', b.deaths === 1, JSON.stringify(b.player));
  const m = createGame(room(['#######', '#M.X..#', '#P....#', '#######']));
  worldStep(m, 'right'); worldStep(m, 'right');
  check('a moving block is destroyed', m.entities[0].dead);
  const g = createGame(room(['#######', '#S.X..#', '#P....#', '#######']));
  worldStep(g, 'right'); worldStep(g, 'right');
  check('even a strong enemy is destroyed', g.entities[0].dead);
  const h = createGame(room(['#########', '#P..H.X.#', '#.......#', '#########']));
  step(h, ['right']); step(h, ['right']);
  for (let i = 0; i < 5; i++) step(h);
  check('a thrown heavy box crosses the spikes whole (register 431)', !h.entities[0].dead, JSON.stringify(h.entities[0]));
  const t = createGame(room(['########', '#T..X.P#', '#......#', '########']));
  step(t);
  check('a beam passes over spikes (register 457)', t.beams[0].path.some(([x]) => x === 4) && t.beams[0].path.some(([x]) => x === 5), JSON.stringify(t.beams[0].path));
  const r = createGame(room(['#######', '#.....#', '#..M..#', '#..X..#', '#P....#', '#######']));
  r.entities[0].axis = 'v';
  r.checkpoint = { x: 1, y: 4 };
  worldStep(r, 'right');
  check('a vertical patrol into it is destroyed too', r.entities[0].dead);
}

{ // a laser sensor is a floor button that only a turret beam crossing it holds down
  const s = createGame(room(['########', '#T.s...#', '#P....D#', '########']));
  step(s);
  check('a beam crossing a sensor opens its colour', s.open.red && s.beams[0].path.at(-1)[0] === 6, JSON.stringify(s.beams[0].path));
  const b = createGame(room(['########', '#T.s...#', '#P....D#', '########']));
  b.entities.push({ id: 99, kind: 'box', x: 3, y: 1, axis: 'h', dir: 1, mode: 'input', slide: null, dead: false, rush: false });
  step(b);
  check('a box on the sensor keeps the beam off it', !b.open.red);
  const t = createGame(room(['########', '#..s...#', '#P....D#', '########']));
  step(t);
  check('with no beam it stays off', !t.open.red);
  let bad = 0;
  try { parseLevel(JSON.stringify({ ...room(['###', '#P#', '###']), cells: ['sensor:purple', ...Array(8).fill('')] })); } catch { bad++; }
  try { parseLevel(JSON.stringify({ ...room(['###', '#P#', '###']), cells: ['sensor:red', ...Array(8).fill('')] })); } catch { bad += 10; }
  check('a sensor of no colour is refused, a coloured one is kept', bad === 1, String(bad));
  const a = room(['########', '#T.s...#', '#P.B..D#', '########']);
  a.cells[2 * 8 + 4] = 'button:red';
  const off = createGame(a);
  step(off);
  check('a sensor and a button of one colour: the button up keeps the door shut', !off.open.red);
  a.cells[2 * 8 + 4] = ''; a.cells[2 * 8 + 3] = 'button:red';
  const on = createGame(a);
  step(on);
  check('both held, it opens', on.open.red);
}

{ // a closing door squashes you, weak enemies and boxes; strong enemies, heavy boxes and blocks hold it
  const doorRoom = (kind, opts) => {
    const l = room(['#######', '#D....#', '#.M...#', '#.....#', '#######'], opts);
    l.cells[2 * 7 + 2] = 'button:red';
    if (kind) { l.start = { x: 4, y: 3 }; l.entities.push({ kind, x: 1, y: 1, axis: 'h', dir: 1, mode: 'realtime' }); }
    else l.start = { x: 1, y: 1 };
    const g = createGame(l);
    g.checkpoint = { x: 5, y: 3 };
    worldStep(g, 'right');
    return g;
  };
  const you = doorRoom(null);
  check('a closing door squashes you', you.deaths === 1);
  const arm = doorRoom(null, { powers: { armored: true } });
  check('armored, you hold it open', arm.deaths === 0 && arm.open.red);
  for (const k of ['enemy', 'box']) {
    const g = doorRoom(k);
    check(`a closing door destroys a ${k}`, g.entities.find(e => e.kind === k).dead && !g.open.red);
  }
  for (const k of ['strong', 'heavy', 'mover']) {
    const g = doorRoom(k);
    check(`a ${k} holds the door open`, !g.entities.find(e => e.x === 1 && e.y === 1).dead && g.open.red);
  }
}
{ // armored: weak enemies, blocks and doors cannot crush you; strong enemies, heavy boxes, beams and death blocks still can
  const A = { powers: { armored: true } };
  const l = room(['######', '#.PE.#', '######'], A);
  l.entities[0].dir = -1;
  const e = createGame(l);
  worldStep(e);
  check('a weak enemy sliding into you stops and turns back', e.deaths === 0 && at(e.entities[0], 3, 1) && e.entities[0].dir === 1, JSON.stringify(e.entities[0]));
  const sl = slide(createGame(room(['#######', '#P..E.#', '#######'], { ...A, mode: 'realtime' })), 'right');
  check('sliding into a weak enemy stops you in front', sl.deaths === 0 && at(sl.player, 3, 1), JSON.stringify(sl.player));
  const st = room(['######', '#.PS.#', '#....#', '######'], A);
  st.entities[0].dir = -1;
  const sg = createGame(st);
  sg.checkpoint = { x: 1, y: 2 };
  worldStep(sg);
  check('a strong enemy still kills you', sg.deaths === 1);
  const m = createGame(room(['#####', '#MP##', '#...#', '#####'], A));
  worldStep(m);
  check('a block cannot crush you against a wall', m.deaths === 0 && at(m.player, 2, 1) && at(m.entities[0], 1, 1), JSON.stringify(m.entities[0]));
  const hv = createGame(room(['########', '#..P..H#', '#......#', '########'], A));
  hv.checkpoint = { x: 1, y: 2 };
  hv.entities[0].slide = 'left';
  for (let i = 0; i < 5; i++) step(hv);
  check('a heavy box still squashes you', hv.deaths === 1);
  const sw = createGame(room(['#######', '#.....#', '#P..X.#', '#######'], A));
  slide(sw, 'right');
  check('a death block still kills you', sw.deaths === 1);
  const bm = createGame(room(['#######', '#T..P.#', '#.....#', '#######'], A));
  bm.checkpoint = { x: 5, y: 2 };
  step(bm);
  check('a beam still kills you', bm.deaths === 1);
  const q = room(['#####', '#PE.#', '#...#', '#####'], A);
  q.entities[0].dir = -1;
  const hq = createGame(q);
  step(hq, ['hide']);
  for (let i = 0; i < 8; i++) step(hq);
  check('coming back under a weak enemy, you are fine', hq.deaths === 0);
  const sq = room(['#####', '#PS.#', '#...#', '#####'], A);
  sq.entities[0].dir = -1;
  const hs = createGame(sq);
  hs.checkpoint = { x: 3, y: 2 };
  step(hs, ['hide']);
  for (let i = 0; i < 8; i++) step(hs);
  check('under a strong one, you are squashed', hs.deaths === 1);
  const pushed = createGame(room(['######', '#MP..#', '######'], A));
  worldStep(pushed);
  check('a block still pushes you as far as it can', pushed.deaths === 0 && at(pushed.player, 4, 1), JSON.stringify(pushed.player));
  const ls = createGame(room(['#######', '#P...E#', '#######'], A));
  ls.entities[0].slide = 'left';
  for (let i = 0; i < 6; i++) step(ls);
  check('a launched weak enemy stops at you', ls.deaths === 0 && at(ls.entities[0], 2, 1), JSON.stringify(ls.entities[0]));
}

{ // water: only swimmers, strong enemies, heavy boxes and blocks go in; a beam shocks the whole pool
  const SW = { powers: { swim: true } };
  const dry = slide(createGame(room(['########', '#P..ww.#', '########'], SW)), 'right');
  check('not swimming, water stops you in front like a block', dry.deaths === 0 && at(dry.player, 3, 1), JSON.stringify(dry.player));
  const t = createGame(room(['#######', '#P....#', '#######'], { powers: { swim: true, cycle: false } }));
  step(t, ['hide']);
  check('with Swim, the tap starts swimming and the world steps', t.player.swimming && !t.player.hidden && t.worldSteps === 1);
  step(t, ['hide']);
  check('and the next tap stops it', !t.player.swimming && t.worldSteps === 2);
  const both = createGame(room(['#######', '#P....#', '#######'], SW));
  step(both, ['hide']);
  check('with Cycle too, one tap hides you and starts swimming, one step', both.player.hidden && both.player.swimming && both.worldSteps === 1);
  const none = createGame(room(['#######', '#P....#', '#######'], { powers: { swim: false, cycle: false } }));
  step(none, ['hide']);
  check('with neither, the tap does nothing', none.worldSteps === 0 && !none.player.swimming);
  const sw = createGame(room(['##########', '#Pwwwwww.#', '##########'], { powers: { swim: true, cycle: false } }));
  step(sw, ['hide']); step(sw, ['right']);
  for (let i = 0; i < 6; i++) step(sw);
  check('swimming, you go in, then a tile every other tick (land would be 7)', sw.player.x === 5 && sw.player.swimming, JSON.stringify(sw.player));
  step(sw, ['hide']);
  for (let i = 0; i < 20; i++) step(sw);
  check('in water the tap cannot stop swimming', sw.player.swimming && at(sw.player, 8, 1), JSON.stringify(sw.player));
  const wb = createGame(room(['#######', '#.....#', '#P.ww.#', '#######'], SW));
  wb.player.swimming = true; wb.player.x = 3; wb.player.y = 2;
  const steps = wb.worldSteps;
  wb.powers.cycle = false;
  step(wb, ['hide']);
  check('Swim alone in water: the tap does nothing', wb.worldSteps === steps && wb.player.swimming);
  wb.powers.cycle = true;
  step(wb, ['hide']);
  check('with Cycle, in water the tap still hides you', wb.player.hidden && wb.player.swimming);
  for (const [k, ch, goes] of [['enemy', 'E', false], ['box', 'B', false], ['strong', 'S', true], ['mover', 'M', true]]) {
    const g = createGame(room(['########', `#P${ch}ww..#`, '#......#', '########']));
    g.player.y = 2; g.player.x = 1;
    if (k === 'box') g.entities[0].slide = 'right'; else for (let i = 0; i < 3; i++) worldStep(g);
    for (let i = 0; i < 6; i++) step(g);
    const e = g.entities[0];
    check(goes ? `a ${k} goes through water` : `a ${k} stops at water`, goes ? e.x >= 3 : (e.x <= 2 && !e.dead), JSON.stringify(e));
  }
  const pb = slide(createGame(room(['#######', '#PB.ww#', '#######'])), 'right');
  check('a box you push stops at water, and so do you', at(pb.entities[0], 3, 1) && at(pb.player, 2, 1), JSON.stringify(pb.entities[0]));
  let wbad = 0;
  try { parseLevel(JSON.stringify({ ...room(['###', '#P#', '###']), cells: ['water', ...Array(8).fill('')] })); } catch { wbad++; }
  check('a level file keeps water', wbad === 0);
  const hv = createGame(room(['#########', '#.H.ww..#', '#P......#', '#########']));
  hv.entities[0].slide = 'right';
  for (let i = 0; i < 8; i++) step(hv);
  check('a heavy box slides through water', at(hv.entities[0], 7, 1), JSON.stringify(hv.entities[0]));
  // the shock
  const pool = room(['#########', '#T.wwww.#', '#...w...#', '#P..ww..#', '#.......#', '#########']);
  const pg = createGame(pool);
  pg.player.swimming = true; pg.player.x = 5; pg.player.y = 3; pg.checkpoint = { x: 1, y: 4 };
  step(pg);
  check('a beam over water passes on', pg.beams[0].path.at(-1)[0] === 7, JSON.stringify(pg.beams[0].path));
  check('and shocks the whole pool: swimming far from the beam, you die', pg.deaths === 1);
  const apart = room(['#########', '#T.ww...#', '#.......#', '#P..ww..#', '#.......#', '#########']);
  const ag = createGame(apart);
  ag.player.swimming = true; ag.player.x = 5; ag.player.y = 3;
  step(ag);
  check('a separate pool is not shocked', ag.deaths === 0 && !ag.shocked.has(3 * 9 + 5));
  const ar = createGame(pool);
  ar.powers.armored = true; ar.player.swimming = true; ar.player.x = 5; ar.player.y = 3; ar.checkpoint = { x: 1, y: 4 };
  step(ar);
  check('armored, the shock still kills you', ar.deaths === 1);
  const hid = createGame(pool);
  hid.player.swimming = true; hid.player.x = 5; hid.player.y = 3; hid.player.hidden = true;
  step(hid);
  check('hidden, the shock misses you', hid.deaths === 0);
  const en = createGame(pool);
  en.entities.push({ id: 98, kind: 'enemy', x: 4, y: 2, axis: 'h', dir: 1, mode: 'input', slide: null, dead: false, rush: false });
  en.entities.push({ id: 97, kind: 'strong', x: 4, y: 3, axis: 'h', dir: 1, mode: 'input', slide: null, dead: false, rush: false });
  step(en);
  check('a weak enemy in the pool dies, a strong one does not', en.entities.find(e => e.id === 98).dead && !en.entities.find(e => e.id === 97).dead);
  const my = createGame(room(['#########', '#.......#', '#P......#', '#.wwww..#', '#.......#', '#########'], { powers: { swim: true } }));
  my.player.swimming = true; my.player.x = 5; my.player.y = 3; my.checkpoint = { x: 1, y: 1 };
  my.player.dir = 'left';
  step(my, ['up']);
  check('your own laser into the water you swim in kills you', my.deaths === 1);
}

{ // sticky: a puddle makes you sticky until water or until you stick to something
  const pass = slide(createGame(room(['########', '#P.%...#', '########'])), 'right');
  check('sliding through a puddle makes you sticky', pass.player.sticky && at(pass.player, 6, 1), JSON.stringify(pass.player));
  const wash = createGame(room(['#########', '#P%.ww..#', '#########'], { powers: { swim: true, cycle: false } }));
  step(wash, ['hide']); slide(wash, 'right');
  check('water washes it off', !wash.player.sticky && wash.player.x === 7, JSON.stringify(wash.player));
  const g = slide(createGame(room(['#########', '#.......#', '#P%..B..#', '#########'])), 'right');
  check('sticky, you stop at a box and it glues to you', at(g.player, 4, 2) && at(g.entities[0], 5, 2) && g.player.stuck && !g.player.sticky, JSON.stringify(g.player));
  slide(g, 'up');
  check('a glued box comes along beside you', at(g.player, 4, 1) && at(g.entities[0], 5, 1) && g.player.stuck, JSON.stringify(g.entities[0]));
  slide(g, 'left');
  check('and behind you', at(g.player, 1, 1) && at(g.entities[0], 2, 1) && g.player.stuck, JSON.stringify(g.entities[0]));
  step(g, ['right']); step(g);
  check('ahead, it goes first, one tile ahead of you', g.player.x === 3 && g.entities[0].x === 4 && g.player.stuck, JSON.stringify([g.player, g.entities[0]]));
  slide(g, 'right');
  check('until it cannot: pushed into a wall, you both stop and it stays glued', at(g.entities[0], 7, 1) && at(g.player, 6, 1) && g.player.stuck, JSON.stringify(g.player));
  slide(g, 'right');
  check('pressing into the wall again keeps it glued', at(g.entities[0], 7, 1) && at(g.player, 6, 1) && g.player.stuck, JSON.stringify(g.player));
  slide(g, 'left');
  check('and it still comes along when you leave', at(g.player, 1, 1) && at(g.entities[0], 2, 1) && g.player.stuck, JSON.stringify([g.player, g.entities[0]]));
  const sd = slide(createGame(room(['#########', '#.......#', '#P%B....#', '#.......#', '#########'])), 'right');
  sd.cells[3 * 9 + 3] = 'wall';
  slide(sd, 'down');
  check('a glued box blocked beside you falls off while you go on', at(sd.player, 2, 3) && at(sd.entities[0], 3, 2) && !sd.player.stuck, JSON.stringify(sd.player));
  const hv = slide(createGame(room(['########', '#P%.H..#', '########'])), 'right');
  check('a still heavy box does not stick: you stay sticky', at(hv.player, 3, 1) && hv.player.sticky && !hv.player.stuck);
  const plain = slide(createGame(room(['########', '#P..B..#', '########'])), 'right');
  check('not sticky, a box is pushed as before', at(plain.entities[0], 6, 1) && !plain.player.stuck);
  // riding a moving block
  const rd = createGame(room(['##########', '#P%.M....#', '#........#', '##########'], { mode: 'realtime' }));
  slide(rd, 'right');
  check('sticky, you stop at a moving block and ride it', rd.player.stuck && rd.player.x === rd.entities[0].x - 1, JSON.stringify(rd.player));
  const x0 = rd.entities[0].x;
  for (let i = 0; i < 20 && rd.entities[0].x === x0; i++) step(rd);
  check('it carries you as it moves away', rd.entities[0].x > 4 && rd.player.x === rd.entities[0].x - 1 && rd.player.stuck, JSON.stringify([rd.player, rd.entities[0]]));
  step(rd, ['down']);
  for (let i = 0; i < 4; i++) step(rd);
  check('a move lets go', !rd.player.stuck && rd.player.y === 2, JSON.stringify(rd.player));
  const wl = createGame(room(['##########', '#P%.M....#', '#........#', '##########'], { mode: 'realtime' }));
  slide(wl, 'right');
  wl.cells[1 * 10 + 4] = 'wall';
  const mx = wl.entities[0].x;
  for (let i = 0; i < 13; i++) step(wl);
  check('when you cannot follow, you come off', !wl.player.stuck && wl.entities[0].x > mx && at(wl.player, 3, 1), JSON.stringify(wl.player));
  // a sliding box reaching a sticky you
  const sb = createGame(room(['###########', '#..P....B.#', '###########']));
  sb.player.sticky = true; sb.entities[0].slide = 'left';
  for (let i = 0; i < 12; i++) step(sb);
  check('a sliding box pushes a sticky you along, then stays glued when it stops', at(sb.player, 1, 1) && at(sb.entities[0], 2, 1) && sb.player.stuck && !sb.player.stuck.ride, JSON.stringify(sb.player));
  const rbRoom = ['#######', '#.....#', '#.....#', '#P....#', '#.....#', '#..B..#', '#######'];
  const rb = createGame(room(rbRoom));
  rb.player.sticky = true; rb.entities[0].slide = 'up'; rb.player.dir = 'right';
  for (let i = 0; i < 8; i++) step(rb);
  check('sticky, you meet a sliding box and ride it until it stops, then it is glued', at(rb.player, 2, 1) && at(rb.entities[0], 3, 1) && rb.player.stuck && !rb.player.stuck.ride, JSON.stringify([rb.player, rb.entities[0]]));
  const rl = createGame(room(rbRoom));
  rl.player.sticky = true; rl.entities[0].slide = 'up'; rl.player.dir = 'right';
  step(rl); step(rl); step(rl);
  step(rl, ['down']);
  for (let i = 0; i < 8; i++) step(rl);
  check('riding a sliding box, a move lets go and it slides on without you', at(rl.player, 2, 5) && at(rl.entities[0], 3, 1) && !rl.player.stuck, JSON.stringify([rl.player, rl.entities[0]]));
  const rw = createGame(room(['##########', '#P%.M....#', '##########'], { mode: 'realtime' }));
  slide(rw, 'right');
  step(rw, ['up']);
  check('riding, a press into a wall still lets go', !rw.player.stuck, JSON.stringify(rw.player));
  const hd = slide(createGame(room(['#########', '#.......#', '#P%..B..#', '#########'])), 'right');
  step(hd, ['hide']);
  check('hiding lets go', !hd.player.stuck);
  let pb = 0;
  try { parseLevel(JSON.stringify({ ...room(['###', '#P#', '###']), cells: ['sticky', ...Array(8).fill('')] })); } catch { pb++; }
  check('a level file keeps a puddle', pb === 0);
}

{ // dying, or Reset, puts the whole room back as it started, with you on your last checkpoint
  const l = room(['#########', '#P.B...C#', '#.......#', '#.....D.#', '#..o....#', '#########']);
  const g = createGame(l);
  slide(g, 'right');
  check('pushing the box first', g.entities[0].x === 7 && at(g.player, 6, 1), JSON.stringify(g.entities[0]));
  g.checkpoint = { x: 2, y: 2 };
  g.entities.push({ id: 50, kind: 'enemy', x: 9, y: 9, axis: 'h', dir: 1, mode: 'input', slide: null, dead: false, rush: false });
  step(g, ['respawn']);
  check('Reset puts every piece back where the room starts', g.entities.length === 1 && at(g.entities[0], 3, 1) && !g.entities[0].dead, JSON.stringify(g.entities));
  check('and you on your last checkpoint', at(g.player, 2, 2));
  const d = createGame(room(['#######', '#.....#', '#PB.X.#', '#######']));
  d.checkpoint = { x: 1, y: 1 };
  slide(d, 'right');
  check('dying resets the room too: the box you lost is back', d.deaths === 1 && at(d.entities[0], 2, 2) && !d.entities[0].dead && at(d.player, 1, 1), JSON.stringify(d.entities[0]));
  const t = room(['#######', '#.....#', '#T....#', '#P....#', '#######']);
  t.entities[0].turret = { dirs: ['up', 'right'], mode: 'input' };
  const tg = createGame(t);
  slide(tg, 'right');
  const aim = tg.beams[0].d;
  step(tg, ['respawn']);
  check('a turret points where it started', aim === 'right' && tg.beams[0].d === 'up', aim + ' ' + tg.beams[0].d);
}

{ // turning back mid-push: the box slides on alone, the way it was going
  const g = createGame(room(['##########', '#PB......#', '##########']));
  step(g, ['right']); step(g); step(g);
  const bx = g.entities[0].x;
  step(g, ['left']);
  for (let i = 0; i < 10; i++) step(g);
  check('the box you were pushing slides on to the wall', bx === 5 && at(g.entities[0], 8, 1), JSON.stringify(g.entities[0]));
  check('and you slide back', at(g.player, 1, 1), JSON.stringify(g.player));
  const f = createGame(room(['##########', '#P...B...#', '##########']));
  step(f, ['right']); step(f);
  step(f, ['left']);
  for (let i = 0; i < 10; i++) step(f);
  check('a box you were not pushing stays put', at(f.entities[0], 5, 1), JSON.stringify(f.entities[0]));
  const n = createGame(room(['##########', '#PB......#', '##########'], { powers: { boomerang: false } }));
  step(n, ['right']); step(n); step(n);
  step(n, ['left']);
  for (let i = 0; i < 10; i++) step(n);
  check('without Boomerang you keep pushing', at(n.entities[0], 8, 1) && at(n.player, 7, 1));
  const gl = slide(createGame(room(['##########', '#P%.B....#', '#........#', '##########'])), 'right');
  slide(gl, 'left');
  step(gl, ['right']); step(gl);
  step(gl, ['left']); step(gl);
  check('a glued box does not slide off on a turn', gl.player.stuck && Math.abs(gl.entities[0].x - gl.player.x) === 1, JSON.stringify([gl.player, gl.entities[0]]));
}

{ // a moving block pushing a box onto spikes: the box covers them, whole (register 431)
  const g = createGame(room(['########', '#M.B.X.#', '#P.....#', '########']));
  worldStep(g, 'right'); worldStep(g, 'right'); worldStep(g, 'right');
  check('a box pushed onto spikes is not destroyed', !g.entities.find(e => e.kind === 'box').dead, JSON.stringify(g.entities));
}

{ // boxes cover spikes (registers 427, 428, 431): the box sits there whole; whoever steps onto bare spikes dies
  const g = createGame(room(['######', '#PB.X#', '######']));
  step(g, ['right']); for (let i = 0; i < 6; i++) step(g);
  check('pushed onto spikes against a wall, a box stays there whole and the robot lives', !g.entities[0].dead && g.entities[0].x === 4 && g.deaths === 0 && g.player.x === 3, JSON.stringify([g.entities[0], g.player]));
  const on = createGame(room(['#######', '#PB.X.#', '#######']));
  step(on, ['right']); for (let i = 0; i < 6; i++) step(on);
  check('pushing a box on over spikes, the robot follows onto them and dies', on.deaths === 1, String(on.deaths));
  const en = createGame(room(['#######', '#S.X..#', '#P....#', '#######']));
  worldStep(en, 'right'); worldStep(en, 'right');
  check('an enemy still dies on spikes', en.entities[0].dead);
}
{ // one death per moment: pieces from before a reset do not act after it
  const l = room(['#####', '#.PE#', '#...#', '#F..#', '#####']);
  l.entities[0].dir = -1; l.entities[1].dir = -1;
  const g = createGame(l);
  g.checkpoint = { x: 1, y: 2 };
  worldStep(g);
  check('an old piece cannot kill you again after the room resets', g.deaths === 1, String(g.deaths));
}

{ // a piece slides once per move of yours, and finishes a slide before starting another
  const g = createGame(room(['##########', '#P.......#', '#M.#.....#', '##########']));
  slide(g, 'right'); settle(g);
  check('one long slide of yours on the per-tile clock moves a patrol once, not back and forth', at(g.entities[0], 2, 2), JSON.stringify(g.entities[0]));
  const f = createGame(room(['##########', '#M.......#', '#P.#.....#', '#........#', '##########'], { mode: 'follow' }));
  step(f, ['right']); step(f);
  step(f, ['down']); settle(f);
  check('a follower still sliding your old way finishes that slide first', at(f.entities[0], 8, 1), JSON.stringify(f.entities[0]));
}

{ // a side shot leaves from the tile you were drawn on when you pressed
  const R = ['##########', '#........#', '###.######', '#P.......#', '##########'];
  const g = createGame(room(R));
  step(g, ['right']); step(g); step(g);
  check('three ticks in, you are past the hole', at(g.player, 4, 3), JSON.stringify(g.player));
  check('pressed early in the tick, a side key is aimed back', aimKey(g, 'up', 0.2) === 'back:up' && aimKey(g, 'up', 0.7) === 'up');
  check('along your slide it is not', aimKey(g, 'right', 0.2) === 'right' && aimKey(g, 'left', 0.2) === 'left');
  step(g, ['back:up']);
  const shot = g.events.find(e => e.type === 'laser');
  check('aimed back, the shot goes up through the hole you just passed', shot && shot.path.some(([x, y]) => x === 3 && y === 1), JSON.stringify(shot));
  const h = createGame(room(R));
  step(h, ['right']); step(h); step(h);
  step(h, ['up']);
  const miss = h.events.find(e => e.type === 'laser');
  check('not aimed back, it leaves from your tile and hits the wall', miss && miss.path.length === 1 && miss.path[0][0] === 4, JSON.stringify(miss));
  const st = createGame(room(R));
  check('standing still, no key is aimed back', aimKey(st, 'up', 0.1) === 'up');
}

{ // a sliding heavy box breaks a light box it runs into, and slides on
  const g = createGame(room(['#########', '#.H.B...#', '#P......#', '#########']));
  g.entities[0].slide = 'right';
  for (let i = 0; i < 8; i++) step(g);
  check('the light box breaks', g.entities.find(e => e.kind === 'box').dead);
  check('and the heavy box slides on to the wall', at(g.entities.find(e => e.kind === 'heavy'), 7, 1), JSON.stringify(g.entities[0]));
  const h = createGame(room(['#########', '#.H.H...#', '#P......#', '#########']));
  h.entities[0].slide = 'right';
  for (let i = 0; i < 8; i++) step(h);
  check('a heavy box only stops at another heavy box', at(h.entities[0], 3, 1) && !h.entities[1].dead, JSON.stringify(h.entities));
}

{ // an inverted door is open until every switch of its colour is held, then closes
  const s = createGame(room(['#######', '#P.N..#', '#o....#', '#######']));
  check('with no switch held, an inverted door is open', !s.open.red && !solidCell(s, 3, 1));
  const lone = createGame(room(['#####', '#PN.#', '#####']));
  check('with no switch of its colour at all, it is open', !solidCell(lone, 2, 1));
  s.player.x = 1; s.player.y = 2; step(s);
  check('pressing the button closes it', s.open.red && solidCell(s, 3, 1));
  s.player.x = 2; s.player.y = 2; step(s);
  check('releasing the button opens it again', !s.open.red && !solidCell(s, 3, 1));
  const t = room(['#######', '#P.N..#', '#B....#', '#######']);
  t.cells[2 * 7 + 1] = 'button:red';
  const g = slide(createGame(t), 'right');
  check('a closed inverted door stops a slide', at(g.player, 2, 1), JSON.stringify(g.player));
  const both = room(['#######', '#PDN..#', '#.....#', '#######']);
  both.cells[2 * 7 + 1] = 'button:red';
  const bg = createGame(both);
  bg.player.x = 1; bg.player.y = 2; step(bg);
  check('one colour opens its doors and closes its inverted doors together', !solidCell(bg, 2, 1) && solidCell(bg, 3, 1));
  const beam = room(['#######', '#T.N..#', '#o....#', '#######']);
  const bm = createGame(beam);
  check('an open inverted door lets a beam through', bm.beams[0].path.length === 5, JSON.stringify(bm.beams[0].path));
  bm.player.x = 1; bm.player.y = 2; step(bm); step(bm);
  check('a closed one stops it', bm.beams[0].path.length === 2, JSON.stringify(bm.beams[0].path));
}
{ // a closing inverted door squashes and is held like a door
  const idoorRoom = (kind, opts) => {
    const l = room(['#######', '#N....#', '#.M...#', '#.....#', '#######'], opts);
    l.cells[2 * 7 + 5] = 'button:red';
    if (kind) { l.start = { x: 4, y: 3 }; l.entities.push({ kind, x: 1, y: 1, axis: 'h', dir: 1, mode: 'realtime' }); }
    else l.start = { x: 1, y: 1 };
    const g = createGame(l);
    g.checkpoint = { x: 5, y: 3 };
    worldStep(g, 'right');
    return g;
  };
  const you = idoorRoom(null);
  check('a closing inverted door squashes you', you.deaths === 1, JSON.stringify(you.player));
  const arm = idoorRoom(null, { powers: { armored: true } });
  check('armored, you hold it open', arm.deaths === 0 && !arm.open.red);
  for (const k of ['enemy', 'box']) {
    const g = idoorRoom(k);
    check(`it destroys a ${k}`, g.entities.find(e => e.kind === k).dead && g.open.red);
  }
  for (const k of ['strong', 'heavy']) {
    const g = idoorRoom(k);
    check(`a ${k} holds it open`, !g.entities.find(e => e.kind === k).dead && !g.open.red);
  }
}
{ // the editor places, names and reads back an inverted door
  check('idoor:red is a cell', isCell('idoor:red') && !isCell('idoor:pink'));
  const l = room(['#####', '#P.E#', '#####']);
  place(l, { tool: 'idoor', colour: 'blue' }, 3, 1, 'place');
  check('placing one clears the piece there', l.cells[8] === 'idoor:blue' && l.entities.length === 0, JSON.stringify(l.entities));
  check('Look names it', describe(l, 3, 1) === 'Blue inverted door');
  check('it is not placed on the start', place(l, { tool: 'idoor', colour: 'red' }, 1, 1, 'place').length === 0 && l.cells[6] === '');
  place(l, { tool: 'start' }, 3, 1, 'place');
  check('moving the start onto one clears it', l.cells[8] === '' && l.start.x === 3);
}

{ // a piece that crosses a puddle is sticky and glues to the first piece it meets
  const g = createGame(room(['#######', '#M%..B#', '#.....#', '#######']));
  g.player.x = 1; g.player.y = 2;
  worldStep(g);
  const [m, b] = g.entities;
  check('a moving block crossing a puddle glues to the box it is stopped by', m.glue === b.id && b.glue === m.id && !m.sticky, JSON.stringify(g.entities));
  check('the text says so', JSON.parse(gameText(g)).pieces.every(p => p.glued));
  worldStep(g);
  check('on its next slide the box comes back with it', at(m, 1, 1) && at(b, 2, 1), JSON.stringify(g.entities));
  worldStep(g); worldStep(g);
  check('the box ahead goes first, until it cannot: then they come apart', at(b, 5, 1) && !m.glue && !b.glue, JSON.stringify(g.entities));
  check('back over the puddle alone, the block is sticky again', m.sticky && at(m, 1, 1), JSON.stringify(m));
  const e = createGame(room(['#######', '#E%..B#', '#.....#', '#######'], { mode: 'input' }));
  e.player.x = 1; e.player.y = 2;
  worldStep(e);
  check('an enemy glues to a box too', e.entities[0].glue === e.entities[1].id, JSON.stringify(e.entities));
  const w = createGame(room(['#######', '#M%w..#', '#.....#', '#######']));
  w.player.x = 1; w.player.y = 2;
  w.move++; rawWorldStep(w); step(w);
  check('crossing a puddle makes a piece sticky', w.entities[0].sticky && JSON.parse(gameText(w)).pieces[0].sticky, JSON.stringify(w.entities));
  settle(w);
  check('water washes it off', !w.entities[0].sticky, JSON.stringify(w.entities));
  const t = createGame(room(['#######', '#M%..T#', '#.....#', '#######']));
  t.player.x = 1; t.player.y = 2;
  worldStep(t);
  check('a turret does not glue', !t.entities[0].glue && !t.entities[1].glue, JSON.stringify(t.entities));
}
{ // you push a sticky box into another: they glue, and the next push moves both
  const sticky = l => { const g = createGame(l); g.entities[0].sticky = true; return g; };
  const g = slide(sticky(room(['#########', '#PB..B..#', '#########'])), 'right');
  const [a, b] = g.entities;
  check('the sticky box glues to the box it is pushed into', a.glue === b.id && at(a, 4, 1) && at(g.player, 3, 1), JSON.stringify(g.entities));
  slide(g, 'right');
  check('pushed again, the pair moves as one until the front one is stopped', at(a, 6, 1) && at(b, 7, 1) && at(g.player, 5, 1) && !a.glue, JSON.stringify(g.entities));
  const h = slide(sticky(room(['#########', '#PB..H..#', '#########'])), 'right');
  slide(h, 'right');
  check('glued to a heavy box, a light one brings it along', at(h.entities[1], 7, 1), JSON.stringify(h.entities));
  const k = createGame(room(['#######', '#PB...#', '#.B...#', '#######']));
  const [top, low] = k.entities;
  top.glue = low.id; low.glue = top.id;
  slide(k, 'right');
  check('pushed, a box brings the one glued beside it', at(top, 5, 1) && at(low, 5, 2) && top.glue === low.id, JSON.stringify(k.entities));
}

{ // a glued pair moves as one, whatever moves it
  const glue = (a, b) => { a.glue = b.id; b.glue = a.id; };
  const two = createGame(room(['########', '#MM....#', '#......#', '########']));
  two.player.x = 1; two.player.y = 2;
  glue(two.entities[0], two.entities[1]);
  two.move++; rawWorldStep(two); step(two);
  check('two glued blocks start one slide between them, not two', at(two.entities[0], 2, 1) && at(two.entities[1], 3, 1), JSON.stringify(two.entities));
  const rt = createGame(room(['########', '#MM....#', '#......#', '########'], { mode: 'realtime' }));
  rt.player.x = 1; rt.player.y = 2;
  glue(rt.entities[0], rt.entities[1]);
  for (let i = 0; i < RT_PERIOD + 1; i++) step(rt);
  check('on a beat too', at(rt.entities[0], 2, 1) && at(rt.entities[1], 3, 1), JSON.stringify(rt.entities));
  const pm = createGame(room(['#######', '#M.B..#', '#..B..#', '#######']));
  pm.player.x = 1; pm.player.y = 2;
  glue(pm.entities[1], pm.entities[2]);
  worldStep(pm);
  check('a block pushing a box brings the box glued to it', at(pm.entities[1], 5, 1) && at(pm.entities[2], 5, 2), JSON.stringify(pm.entities));
  const sh = createGame(room(['#######', '#H..B.#', '#######']));
  sh.entities[0].sticky = true; sh.entities[0].slide = 'right';
  settle(sh);
  check('a sticky heavy box glues to the box it slides into instead of breaking it', sh.entities[0].glue === sh.entities[1].id && !sh.entities[1].dead && at(sh.entities[0], 3, 1), JSON.stringify(sh.entities));
  const sf = createGame(room(['#######', '#BH...#', '#######']));
  glue(sf.entities[0], sf.entities[1]); sf.entities[1].slide = 'right';
  settle(sf);
  check('a sliding piece brings its partner behind it', at(sf.entities[1], 5, 1) && at(sf.entities[0], 4, 1) && sf.entities[0].glue, JSON.stringify(sf.entities));
  const sl = createGame(room(['#######', '#HB...#', '#######']));
  glue(sl.entities[0], sl.entities[1]); sl.entities[0].slide = 'right';
  settle(sl);
  check('a partner ahead of a slide goes first, and falls off where it stops', at(sl.entities[1], 5, 1) && at(sl.entities[0], 4, 1) && !sl.entities[0].glue && !sl.entities[1].glue, JSON.stringify(sl.entities));
  const gp = createGame(room(['########', '#MM%...#', '#......#', '########']));
  gp.player.x = 1; gp.player.y = 2;
  glue(gp.entities[0], gp.entities[1]);
  worldStep(gp);
  check('a glued piece crossing a puddle does not get sticky', !gp.entities[0].sticky && !gp.entities[1].sticky && at(gp.entities[0], 5, 1), JSON.stringify(gp.entities));
  const tg = createGame(room(['#######', '#.BBB.#', '#..P..#', '#######']));
  tg.entities[0].sticky = true; glue(tg.entities[1], tg.entities[2]);
  tg.player.x = 1; tg.player.y = 1;
  slide(tg, 'right');
  check('a piece already glued takes no second partner', tg.entities[0].sticky && !tg.entities[0].glue, JSON.stringify(tg.entities));
  const dd = createGame(room(['#######', '#.BB..#', '#..P..#', '#######']));
  glue(dd.entities[0], dd.entities[1]);
  dd.entities[1].dead = true; step(dd);
  check('a piece whose partner is gone lets go', !dd.entities[0].glue);
  const ap = createGame(room(['#######', '#.BB..#', '#..P..#', '#######']));
  glue(ap.entities[0], ap.entities[1]);
  ap.entities[1].x = 5; step(ap);
  check('so does a pair that ended up apart', !ap.entities[0].glue && !ap.entities[1].glue);
}

{ // a partner cannot follow onto you: they come apart
  const g = createGame(room(['#######', '#M....#', '#BP...#', '#######']));
  g.entities[0].glue = g.entities[1].id; g.entities[1].glue = g.entities[0].id;
  worldStep(g);
  check('a box glued to a block stays when you stand where it would go', at(g.entities[1], 1, 2) && !g.entities[1].glue && at(g.entities[0], 5, 1), JSON.stringify(g.entities));
}
{ // each hide is a move of its own: a piece slides again after your slide
  const g = createGame(room(['#######', '#M....#', '#P....#', '#######']));
  slide(g, 'right');
  settle(g);
  const x = g.entities[0].x;
  step(g, ['hide']); settle(g);
  check('a hide after a slide starts the block again', g.entities[0].x !== x, JSON.stringify(g.entities));
}

{ // the goal: you win by coming to rest on it, not by sliding over it
  const l = room(['#######', '#P....#', '#######']);
  l.cells[10] = 'goal';
  const over = slide(createGame(l), 'right');
  check('sliding over the goal does not win', !over.won && at(over.player, 5, 1));
  const r = room(['#######', '#P..#.#', '#######']);
  r.cells[10] = 'goal';
  const g = slide(createGame(r), 'right');
  check('stopping on it wins', g.won && JSON.parse(gameText(g)).won);
  check('the text counts your moves', JSON.parse(gameText(g)).moves === 1);
  step(g, ['left']); step(g);
  check('once won, keys do nothing', at(g.player, 3, 1) && !g.player.dir);
  const h = room(['#######', '#P....#', '#######'], { powers: { cycle: true } });
  h.cells[9] = 'goal';
  const hg = createGame(h); hg.player.x = 2; step(hg, ['hide']);
  check('hidden on it is not a win', !hg.won);
  check('the goal is a cell', isCell('goal'));
  const e = room(['#####', '#P..#', '#####']);
  place(e, { tool: 'goal' }, 2, 1, 'place');
  check('the editor places a goal and names it', e.cells[7] === 'goal' && describe(e, 2, 1) === 'Goal');
  check('not on the start', place(e, { tool: 'goal' }, 1, 1, 'place').length === 0);
}

{ // undo and redo are a stack of whole levels
  const h = newHistory();
  let l = room(['#####', '#P..#', '#####']);
  const before = JSON.stringify(l);
  check('an edit that changed nothing is not recorded', !record(h, before, l) && h.past.length === 0);
  l.cells[7] = 'wall';
  check('an edit that changed the level is', record(h, before, l) && h.past.length === 1);
  l = undo(h, l);
  check('undo brings the level back', l.cells[7] === '' && h.future.length === 1 && h.past.length === 0);
  l = redo(h, l);
  check('redo puts the edit back', l.cells[7] === 'wall' && h.past.length === 1 && h.future.length === 0);
  const b2 = JSON.stringify(l); l = undo(h, l); l.cells[8] = 'wall'; record(h, b2, l);
  check('a new edit clears redo', h.future.length === 0 && redo(h, l) === null);
  const e = newHistory(); let m = room(['#####', '#P..#', '#####']);
  for (let i = 0; i < LIMIT + 5; i++) { const b = JSON.stringify(m); m.cells[7] = String(i); record(e, b, m); }
  check('only the last 100 steps are kept', e.past.length === LIMIT);
  check('undo with nothing to undo does nothing', undo(newHistory(), m) === null);
}

{ // a row or column added or cut on one side moves everything with it
  const l = room(['#####', '#P.B#', '#####']);
  const top = resizeSide(l, 'top', 1);
  check('adding a row on top shifts the room down', top.h === 4 && top.start.y === 2 && top.entities[0].y === 2 && top.cells[5] === 'wall' && top.cells[0] === '');
  const left = resizeSide(l, 'left', 1);
  check('adding a column on the left shifts it right', left.w === 6 && left.start.x === 2 && left.entities[0].x === 4);
  const right = resizeSide(l, 'right', -1);
  check('cutting the right column keeps the rest in place', right.w === 4 && right.cells.length === 12 && right.entities[0].x === 3 && right.cells[7] === '');
  check('cutting the column with the start takes the start off', resizeSide(resizeSide(l, 'left', -1), 'left', -1).start === null);
  check('the box is cut away with its column', resizeSide(resizeSide(l, 'right', -1), 'right', -1).entities.length === 0);
  check('a room stays at least 1 tile (register 319)', !!resizeSide(room(['###', '#P#']), 'top', -1) && resizeSide(room(['#P#']), 'top', -1) === null);
  const b = wallBorder(room(['.....', '.P...', '....B', '.....']));
  check('Border walls every edge tile', b.cells.filter((c, i) => (i % 5 === 0 || i % 5 === 4 || i < 5 || i >= 15) && c !== 'wall').length === 0);
  check('and removes pieces on the edge, keeps the start', b.entities.length === 0 && b.cells[6] === '');
  const s2 = room(['P..', '...', '...']); s2.start = { x: 0, y: 0 };
  check('the start on the edge is left open', wallBorder(s2).cells[0] === '');
}

// Starting direction: a patrol starts the way it was placed, a turret aims first where told.
{
  const l = room(['.....', '.P...', '.....']);
  place(l, { tool: 'enemy', axis: 'v', dir: -1, mode: 'input' }, 3, 1, 'place');
  const en = l.entities.find(e => e.kind === 'enemy');
  check('a patrol keeps the starting direction picked', en.axis === 'v' && en.dir === -1);
  place(l, { tool: 'turret', aim: ['up', 'down'], start: 'down', mode: 'input' }, 2, 2, 'place');
  const tu = l.entities.find(e => e.kind === 'turret');
  check('a turret stores where it aims first', tu.turret.start === 'down');
  place(l, { tool: 'turret', aim: ['up', 'down'], start: 'left', mode: 'input' }, 0, 0, 'place');
  check('a start outside its directions is not stored', !('start' in l.entities.find(e => e.x === 0 && e.y === 0).turret));
  const g = createGame(l);
  check('in play it aims there first', g.entities.find(e => e.kind === 'turret' && e.x === 2).turret.aim === 1);
  check('a start it cannot fire is refused', (() => { try { parseLevel(JSON.stringify({ ...l, entities: [{ kind: 'turret', x: 2, y: 2, turret: { dirs: ['up'], mode: 'input', start: 'down' } }] })); return false; } catch { return true; } })());
}

// In the editor, a turret's lit barrel is the one it fires first.
{
  const lit = [];
  let angle = 0;
  const g = new Proxy({}, { get: (o, k) => k === 'rotate' ? a => { angle = a; } : k === 'restore' ? () => { angle = 0; } : k in o ? o[k] : () => {}, set: (o, k, v) => { if (k === 'fillStyle' && v === INK.zap && angle) lit.push(angle); o[k] = v; return true; } });
  drawTurret(g, { dirs: ['up', 'down'], mode: 'input', start: 'down' });
  check('the editor lights the barrel a turret fires first', lit.length === 1 && Math.abs(lit[0] - Math.PI / 2) < 1e-9, JSON.stringify(lit));
}

{ // the mode badge (a 5.5 dot) only on a turret that turns (register 300)
  const dots = t => { let n = 0; const g = new Proxy({}, { get: (o, k) => k === 'arc' ? (x, y, r) => { if (r === 5.5) n++; } : k in o ? o[k] : () => {}, set: (o, k, v) => { o[k] = v; return true; } }); drawTurret(g, t, [24, 8]); return n; };
  check('a one-way laser wears no mode badge', dots({ dirs: ['right'], mode: 'input' }) === 0);
  check('a turning turret still wears its mode badge', dots({ dirs: ['up', 'down'], mode: 'realtime' }) === 1);
}

{ // a relay is a block a beam goes through (register 312); a two-colour door opens on either colour (313)
  const g = createGame(room(['#######', '#P.s..#', '#######'])); slide(g, 'right');
  check('a relay stops the robot', at(g.player, 2, 1), JSON.stringify(g.player));
  const b = createGame(room(['#######', '#T.s..#', '#P....#', '#######'])); step(b);
  check('a beam goes through a relay and lights it', b.lit.has(1 * 7 + 3) && b.beams[0].path.some(([x]) => x === 5), JSON.stringify(b.beams[0].path));
  const d = createGame(room(['#####', '#PY.#', '#####']));
  const shut = solidCell(d, 2, 1); d.open.blue = true; const blue = solidCell(d, 2, 1); d.open = { red: true }; const red = solidCell(d, 2, 1);
  check('a two-colour door is shut with neither colour, open with either', shut && !blue && !red);
  check('a room with a two-colour door reads back', isCell('door:red|blue') && !isCell('door:red|red') && !isCell('door:red|pink'));
  // Any coloured piece may take two colours (register 316): a sensor counts in both colours' AND.
  const two = (extra) => { const l = room(['#######', '#PB...#', '#######']); l.cells[9] = 'button:red|blue'; l.cells[11] = 'door:red'; l.cells[12] = 'door:blue'; if (extra) l.cells[10] = extra; return createGame(l); };
  const both = two();
  check('a held two-colour button opens both colours', both.open.red && both.open.blue, JSON.stringify(both.open));
  const half = two('button:red');
  check('a held two-colour button still waits on the other red buttons', !half.open.red && half.open.blue, JSON.stringify(half.open));
  const i2 = createGame(room(['#####', '#P..#', '#####'])); i2.cells[2 + 5] = 'idoor:red|blue';
  const iOpen = !solidCell(i2, 2, 1); i2.open = { blue: true }; const iShut = solidCell(i2, 2, 1);
  check('a two-colour inverted door is passable with neither colour, solid with either', iOpen && iShut);
  const gd = { open: { blue: true } };
  check('a two-colour one-way turns while either colour is pressed', gateDirs(gd, 'gate:right@red|blue')[0] === 'left' && gateDirs({ open: {} }, 'gate:right@red|blue')[0] === 'right');
  // A heavy piece holds a two-colour door as it holds a one-colour one (register 317).
  const held = k => { const l = room(['######', '#P.' + k + '.#', '######']); l.cells[9] = 'door:red|blue'; const g = createGame(l); g.open = { red: true }; refreshDoors(g); return g; };
  const crushed = held('B'), kept = held('H');
  check('a two-colour door closing crushes a box in it', !crushed.open.red && crushed.entities[0].dead);
  check('a heavy box in a two-colour door keeps it open', kept.open.red && !kept.entities[0].dead);
  const blueOn = (() => { const l = room(['#######', '#PBB..#', '#######']); l.cells[9] = 'button:blue'; l.cells[10] = 'door:red|blue'; const g = createGame(l); g.open.red = true; refreshDoors(g); return g; })();
  check('red closing does not crush a box in a two-colour door blue still holds open', blueOn.open.blue && !blueOn.entities[1].dead, JSON.stringify(blueOn.open));
  const iheld = k => { const l = room(['#######', '#PB' + k + '..#', '#######']); l.cells[9] = 'button:red'; l.cells[10] = 'idoor:red|blue'; return createGame(l); };
  const ic = iheld('B'), ik = iheld('H');
  check('a two-colour inverted door blocking crushes a box in it; a heavy box keeps it passable', ic.open.red && ic.entities[1].dead && !ik.open.red && !ik.entities[1].dead, JSON.stringify([ic.open, ik.open]));
  // A two-colour one-way does not launch again when its second colour joins the first (register 316).
  const lg = room(['#######', '#P...B#', '#..B..#', '#B....#', '#######']); lg.cells[10] = 'gate:up@red|blue'; lg.cells[15] = 'button:blue'; lg.cells[19] = 'button:red';
  const sg = createGame(lg), onGate = sg.entities.find(e => e.y === 2), bb = sg.entities.find(e => e.y === 1), rb = sg.entities.find(e => e.y === 3);
  onGate.x = 3; onGate.y = 1; bb.x = 1; bb.y = 2; refreshDoors(sg); const firstLaunch = onGate.slide;
  onGate.slide = null; onGate.x = 3; onGate.y = 1; rb.x = 5; rb.y = 2; refreshDoors(sg);
  check('a two-colour one-way launches when the pair opens, not again when the other colour joins', firstLaunch === 'down' && !onGate.slide, JSON.stringify([firstLaunch, onGate.slide]));
  check('every coloured piece reads back in two colours, in the palette\'s order', ['button:red|blue', 'toggle:red|blue', 'idoor:red|blue', 'sensor:red|blue', 'gate:right@red|blue'].every(isCell) && !isCell('button:blue|red') && !isCell('gate:right@red|red'));
}

{ // a pushable laser (register 336): pushed like a box, keeps its aim, joins a train; a plain one is a wall
  const turret = g => g.entities.find(e => e.kind === 'turret');
  const a = createGame(room(['#######', '#P.K..#', '#######'])); slide(a, 'right');
  check('the robot pushes a pushable laser, which keeps its aim', turret(a).x === 5 && a.player.x === 4 && turret(a).turret.dirs[0] === 'up', JSON.stringify([turret(a).x, a.player.x]));
  const b = createGame(room(['#######', '#P.T..#', '#######'])); slide(b, 'right');
  check('a plain laser stops the robot', turret(b).x === 3 && b.player.x === 2);
  const c = createGame(room(['#######', '#PBK..#', '#######'])); slide(c, 'right');
  check('a box pushes a pushable laser ahead of it, as a train', turret(c).x === 5 && c.entities.find(e => e.kind === 'box').x === 4, JSON.stringify(c.entities.map(e => [e.kind, e.x])));
  check('a pushable laser reads back', parseLevel(JSON.stringify(room(['#P.K#']))).entities[0].crate === true);
}

{ // pushable tiles (register 336): a relay, a one-way along its arrow, a closed door or inverted door
  const run = (rows, crates, k = 'right') => slide(createGame(room(rows, { crates })), k);
  const r = run(['#######', '#P.s..#', '#######'], [[3, 1]]);
  check('the robot pushes a pushable relay to the wall', cellAt(r, 5, 1) === 'sensor:red' && cellAt(r, 3, 1) === '' && r.player.x === 4 && r.crates.has(12), JSON.stringify([r.cells, [...r.crates], r.player.x]));
  check('a plain relay stops the robot', run(['#######', '#P.s..#', '#######'], []).player.x === 2);
  const g = run(['#######', '#P.>..#', '#######'], [[3, 1]]);
  check('a pushable one-way is pushed along its arrow, then stepped onto once it cannot move (register 460)', cellAt(g, 5, 1) === 'gate:right' && g.player.x === 5, JSON.stringify([g.cells.slice(7, 14), g.player.x]));
  const gw = run(['#######', '#..<.P#', '#######'], [[3, 1]], 'left');
  check('pushed along its arrow from the other side too', cellAt(gw, 1, 1) === 'gate:left' && gw.player.x === 1, JSON.stringify([gw.cells.slice(7, 14), gw.player.x]));
  const ga = run(['#######', '#P.<..#', '#######'], [[3, 1]]);
  check('against its arrow a pushable one-way is a wall', cellAt(ga, 3, 1) === 'gate:left' && ga.player.x === 2);
  const d = run(['#######', '#P.D..#', '#######'], [[3, 1]]);
  check('a closed pushable door is pushed', cellAt(d, 5, 1) === 'door:red' && d.player.x === 4);
  const od = (() => { const l = room(['########', '#P.D...#', '#B.....#', '########'], { crates: [[3, 1]] }); l.cells[17] = 'button:red'; return slide(createGame(l), 'right'); })();
  check('an open pushable door is walked through, not pushed', cellAt(od, 3, 1) === 'door:red' && od.player.x === 6, JSON.stringify([od.cells.slice(8, 16), od.player.x]));
  const nd = (() => { const l = room(['########', '#P.N...#', '#B.....#', '########'], { crates: [[3, 1]] }); l.cells[17] = 'button:red'; return slide(createGame(l), 'right'); })();
  check('a closed (pressed) pushable inverted door is pushed', cellAt(nd, 6, 1) === 'idoor:red' && nd.player.x === 5, JSON.stringify([nd.cells.slice(8, 16), nd.player.x]));
  const tr = run(['########', '#PBs.B.#', '########'], [[3, 1]]);
  check('a box pushes a pushable relay that pushes a box, as one train', cellAt(tr, 5, 1) === 'sensor:red' && tr.entities.map(e => e.x).join() === '4,6' && tr.player.x === 3, JSON.stringify([tr.cells.slice(8, 16), tr.entities.map(e => e.x), tr.player.x]));
  const fl = run(['#######', '#P.sg.#', '#######'], [[3, 1]]);
  check('a pushable tile lands only on bare floor', cellAt(fl, 3, 1) === 'sensor:red' && fl.player.x === 2);
  const rs = run(['#######', '#P.s..#', '#######'], [[3, 1]]); respawn(rs);
  check('a reset puts pushed tiles back', cellAt(rs, 3, 1) === 'sensor:red' && rs.crates.has(10) && cellAt(rs, 5, 1) === '');
  const k1 = createGame(room(['#######', '#P.s..#', '#######'], { crates: [[3, 1]] })), k2 = slide(cloneGame(k1), 'right');
  const k3 = cloneGame(k1); k3.cells = [...k1.cells]; k3.cells[11] = k3.cells[10]; k3.cells[10] = ''; k3.crates = new Set([11]);
  check('a pushed tile changes the search key, and a copy of a run is untouched by the push', stateKey(k1) !== stateKey(k3) && stateKey(k1) !== stateKey(k2) && cellAt(k1, 3, 1) === 'sensor:red');
  const ed = room(['#P...#']), ui = { tool: 'sensor', colour: 'red', crate: true };
  place(ed, ui, 3, 0, 'place');
  check('placing with the chip on makes a pushable tile', ed.crates?.length === 1 && ed.cells[3] === 'sensor:red' && /pushable/.test(describe(ed, 3, 0)));
  place(ed, { ...ui, crate: false }, 3, 0, 'place');
  check('placing again with the chip off makes it plain', !ed.crates && ed.cells[3] === 'sensor:red');
  place(ed, ui, 3, 0, 'place'); place(ed, ui, 3, 0, 'erase');
  check('erasing a pushable tile takes the mark too', !ed.crates && ed.cells[3] === '');
  place(ed, ui, 3, 0, 'place'); const mv = moveAt(ed, { x: 3, y: 0 }, { x: 4, y: 0 }), gr = resizeSide(ed, 'left', 1);
  check('moving or growing the room carries the mark with its tile', mv.crates[0].x === 4 && mv.cells[4] === 'sensor:red' && gr.crates[0].x === 4, JSON.stringify([mv.crates, gr.crates]));
  const bord = room(['#####', '#.s.#', '#####'], { crates: [[2, 1]] }), grown = moveSide(bord, 'left', 1);
  check('growing a walled room carries the mark too', grown && grown.crates[0].x === 3 && grown.cells[grown.w + 3] === 'sensor:red', JSON.stringify(grown && grown.crates));
  check('pushable tiles read back', parseLevel(JSON.stringify(room(['#P.s#'], { crates: [[3, 0]] }))).crates[0].x === 3);
  let bad = ''; try { parseLevel(JSON.stringify(room(['#P..#'], { crates: [[3, 0]] }))); } catch (e) { bad = e.message; }
  check('a pushable mark on a tile that cannot be pushed is refused', /pushable/i.test(bad), bad);
}

{ // wires (register 347): a network per colour of touching wire tiles; grey pieces read only theirs
  const line = (x0, x1, y, w) => Array.from({ length: x1 - x0 + 1 }, (_, i) => ({ x: x0 + i, y, w }));
  const make = (rows, wires, set = {}) => { const l = room(rows); l.wires = wires; for (const [i, c] of Object.entries(set)) l.cells[+i] = c; return createGame(l); };
  // Row 1: a box on a grey button at (2,1); row 2: a grey door at (5,2); a teal wire joins them.
  const rows = ['#######', '#PB...#', '#.....#', '#######'];
  const set = { 9: 'button:wire', 19: 'door:wire' };
  const on = make(rows, [...line(2, 5, 1, 'teal'), { x: 5, y: 2, w: 'teal' }], set);
  check('a grey door opens while a switch on its wire holds', !solidCell(on, 5, 2), JSON.stringify(on.open));
  const off = make(rows, [...line(2, 4, 1, 'teal'), { x: 5, y: 2, w: 'teal' }], set);
  check('a grey door on another wire stays shut', solidCell(off, 5, 2));
  const crossed = make(rows, [...line(2, 5, 1, 'violet'), { x: 5, y: 2, w: 'teal' }], set);
  check('wires of different colours on touching tiles do not join', solidCell(crossed, 5, 2));
  const red = make(rows, [...line(2, 5, 1, 'teal'), { x: 5, y: 2, w: 'teal' }], { 9: 'button:red', 19: 'door:wire', 12: 'door:red' });
  check('a coloured switch on a wire powers the wire and still its colour', !solidCell(red, 5, 2) && !solidCell(red, 5, 1) && red.open.red);
  const two = make(['#######', '#PB..B#', '#.....#', '#######'], [...line(2, 5, 1, 'teal'), { x: 5, y: 2, w: 'teal' }], { 9: 'button:wire', 12: 'button:wire', 19: 'door:wire' });
  check('a wire is on only while every switch on it holds', !solidCell(two, 5, 2));
  const half = make(['#######', '#PB...#', '#.....#', '#######'], [...line(2, 5, 1, 'teal'), { x: 5, y: 2, w: 'teal' }], { 9: 'button:wire', 12: 'button:wire', 19: 'door:wire' });
  check('one switch of two is not enough', solidCell(half, 5, 2));
  const bare = make(rows, [], { 19: 'door:wire', 9: 'button:wire' });
  // A pushed grey piece takes the wires of the tile it lands on (register 351).
  const pushRoom = () => { const l = room(['########', '#B.....#', '#P.D.#.#', '########'], { crates: [[3, 2]] }); l.cells[9] = 'button:wire'; l.cells[19] = 'door:wire'; l.wires = [[1, 1], [2, 1], [3, 1], [4, 1], [4, 2]].map(([x, y]) => ({ x, y, w: 'teal' })); return l; };
  const pg = slide(createGame(pushRoom()), 'right');
  check('a grey door pushed onto a live wire joins it and opens', /^door:w\d/.test(cellAt(pg, 4, 2)) && !solidCell(pg, 4, 2), cellAt(pg, 4, 2));
  const pl = pushRoom(); pl.wires = [...pl.wires.filter(r => r.y === 1), { x: 3, y: 2, w: 'violet' }];
  const pf = slide(createGame(pl), 'right');
  check('pushed off its wire, a grey door no longer reads it', cellAt(pf, 4, 2) === 'door:wnone' && solidCell(pf, 4, 2), cellAt(pf, 4, 2));
  check('a grey door on no wire never opens', solidCell(bare, 5, 2));
  const inv = make(rows, [...line(2, 5, 1, 'teal'), { x: 5, y: 2, w: 'teal' }], { 9: 'button:wire', 19: 'idoor:wire' });
  check('a grey inverted door is solid while its wire is on', solidCell(inv, 5, 2));
  check('wires read back; a bad one is refused', parseLevel(JSON.stringify({ ...room(rows), wires: [{ x: 1, y: 1, w: 'teal' }] })).wires.length === 1 && (() => { try { parseLevel(JSON.stringify({ ...room(rows), wires: [{ x: 1, y: 1, w: 'red' }] })); return false; } catch { return true; } })());
  check('a grey one-way is refused', !isCell('gate:right@wire') && isCell('door:wire') && !isCell('door:red|wire'));
  const grown = resizeSide({ ...room(rows), wires: [{ x: 2, y: 1, w: 'teal' }] }, 'left', 1);
  check('resizing carries the wires', grown.wires[0].x === 3);
  const ed = room(['#P...#']), ui = { tool: 'wire', wire: 'violet' };
  place(ed, ui, 3, 0, 'place'); place(ed, { ...ui, wire: 'teal' }, 3, 0, 'place');
  check('the Wire tool lays a wire of its colour; two colours share a tile', ed.wires.length === 2 && /violet and teal wires/.test(describe(ed, 3, 0)), describe(ed, 3, 0));
  place(ed, ui, 3, 0, 'remove');
  check('removing takes only that colour', ed.wires.length === 1 && ed.wires[0].w === 'teal');
  place(ed, { tool: 'box' }, 3, 0, 'place'); const mv = moveAt(ed, { x: 3, y: 0 }, { x: 4, y: 0 });
  check('a piece moved off a wire leaves the wire where it was', mv.wires[0].x === 3 && mv.entities[0].x === 4);
  place(ed, ui, 3, 0, 'erase'); const first = ed.entities.length === 0 && ed.wires?.length === 1;
  place(ed, ui, 3, 0, 'erase');
  check('erase takes the piece first, then the wires', first && !ed.wires);
}

{ // the 4-bit counter room (register 349): wires, gates and a clock count 0 to 15 and round again
  const c = createGame(counterRoom()), seen = [];
  for (let t = 0; t < 560; t++) { step(c); const n = countOf(c); if (seen.at(-1)?.n !== n) seen.push({ t, n }); }
  const steps = seen.slice(1).map(e => e.n), gaps = seen.slice(2).map((e, i) => e.t - seen[i + 1].t);
  check('the counter room counts 0 to 15 and loops, one step every 16 ticks', steps.slice(0, 33).join() === [...Array(33).keys()].map(k => (k + 1) % 16).join() && gaps.every(g => g === 16), JSON.stringify(seen.slice(0, 20)));
  check('the saved counter room is the generated one', JSON.stringify(parseLevel(readFileSync('rooms/4-bit-counter.wee', 'utf8')).wires) === JSON.stringify(counterRoom().wires));
}

{ // a 3-bit counter on a 7-segment display of doors (register 355): it shows 0 to 7 and loops, never garbled
  const r = displayRoom(), c = createGame(r), seen = [];
  for (let t = 0; t < 280; t++) { step(c); const d = digitOf(c); if (seen.at(-1)?.d !== d) seen.push({ t, d }); }
  const ds = seen.map(e => e.d).join('');
  check('the 7-segment room shows 0 to 7 and loops, one digit every 16 ticks', ds.startsWith('01234567012345670') && !ds.includes('?') && seen.slice(2).every((e, i) => e.t - seen[i + 1].t === 16), ds);
  check('the saved 7-segment room is the generated one', JSON.stringify(parseLevel(readFileSync('rooms/7-segment-counter.wee', 'utf8')).wires) === JSON.stringify(r.wires));
}

{ // the grey-only 4-bit counter with a hex display (register 356): 0 to F and round again, no colour anywhere
  const r = hexRoom(), c = createGame(r), seen = [];
  for (let t = 0; t < 520; t++) { step(c); const d = hexOf(c); if (seen.at(-1)?.d !== d) seen.push({ t, d }); }
  const ds = seen.map(e => e.d).join('');
  check('the hex room shows 0 to F and loops, one digit every 16 ticks', ds.startsWith('0123456789ABCDEF0') && !ds.includes('?') && seen.slice(2).every((e, i) => e.t - seen[i + 1].t === 16), ds);
  check('the hex room uses grey pieces only', r.cells.every(c => !/:(red|blue|yellow|green)/.test(c)) && r.cells.some(c => c.endsWith(':wire')));
  check('the saved hex room is the generated one', JSON.stringify(parseLevel(readFileSync('rooms/hex-counter.wee', 'utf8')).wires) === JSON.stringify(r.wires));
}

{ // gravel stops what slides onto it
  const r = room(['#######', '#P.g..#', '#######']);
  check('a slide stops on gravel', at(slide(createGame(r), 'right').player, 3, 1));
  const d = room(['#######', '#P.g..#', '#######'], { powers: { dive: true } });
  const ds = createGame(d); step(ds, ['right']); step(ds, ['right']); for (let i = 0; i < 50 && ds.player.dir; i++) step(ds);
  check('a dive stops on gravel too', at(ds.player, 3, 1), JSON.stringify(ds.player));
  const m = createGame(room(['########', '#P.....#', '#M.g...#', '########']));
  settle(worldStep(m, 'right'));
  check('a moving block stops on gravel', at(m.entities[0], 3, 2), JSON.stringify(m.entities[0]));
  worldStep(m, 'right');
  check('and goes on the same way at its next move', at(m.entities[0], 6, 2), JSON.stringify(m.entities[0]));
  const h = createGame(room(['#########', '#P.H.g..#', '#########'], { powers: { dive: true } }));
  step(h, ['right']); step(h, ['right']); for (let i = 0; i < 60 && (h.player.dir || h.entities.some(e => e.slide)); i++) step(h);
  check('a heavy box sent sliding stops on gravel', at(h.entities[0], 5, 1), JSON.stringify(h.entities[0]));
  check('gravel is a tile a room can hold', isCell('gravel'));
}
{ // a breakable block: a wall to light things, broken by a dive, a heavy box or a strong enemy
  const kAt = (s, x, y) => s.broken.includes(y * s.w + x);
  const run = s => { for (let i = 0; i < 80 && (s.player.dir || s.entities.some(e => !e.dead && (e.slide || e.rush))); i++) step(s); return s; };
  const p = slide(createGame(room(['########', '#P..k..#', '########'])), 'right');
  check('a plain slide stops against a breakable block', at(p.player, 3, 1) && !p.broken.length, JSON.stringify(p.player));
  const d = createGame(room(['########', '#P..k..#', '########'], { powers: { dive: true } }));
  step(d, ['right']); step(d, ['right']); run(d);
  check('a dive breaks it and slides on through', at(d.player, 6, 1) && kAt(d, 4, 1), JSON.stringify([d.player, d.broken]));
  check('the run text lists the broken block', JSON.parse(gameText(d)).broken?.[0]?.join() === '4,1', gameText(d));
  step(d, ['respawn']);
  check('Reset puts the block back', !d.broken.length && solidCell(d, 4, 1));
  const b = slide(createGame(room(['########', '#PB..k.#', '########'])), 'right');
  check('a pushed box stops against it', at(b.entities[0], 4, 1) && !b.broken.length, JSON.stringify(b.entities[0]));
  const h = run((s => { step(s, ['right']); step(s, ['right']); return s; })(createGame(room(['##########', '#P.H.k...#', '##########'], { powers: { dive: true } }))));
  check('a heavy box sent sliding breaks it and slides on through', at(h.entities[0], 8, 1) && kAt(h, 5, 1), JSON.stringify([h.entities[0], h.broken]));
  const st = createGame(room(['########', '#P.....#', '#S..k..#', '########']));
  settle(worldStep(st, 'right'));
  check('a strong enemy on patrol breaks it and goes on through', at(st.entities[0], 6, 2) && kAt(st, 4, 2), JSON.stringify([st.entities[0], st.broken]));
  const we = createGame(room(['########', '#P.....#', '#E..k..#', '########']));
  settle(worldStep(we, 'right'));
  check('a weak enemy stops against it', at(we.entities[0], 3, 2) && !we.broken.length, JSON.stringify(we.entities[0]));
  const sp = run((s => { step(s); return s; })(createGame(room(['#######', '#6Hk..#', '#P....#', '#######']))));
  check('a spring launches a heavy box into it, and the box breaks it', kAt(sp, 3, 1) && sp.entities[0].x === 5, JSON.stringify([sp.entities[0], sp.broken]));
  const t = createGame(room(['########', '#T.k..P#', '########'])); step(t);
  check('a turret beam stops at it and does not break it', !t.deaths && !t.broken.length && t.beams[0].path.at(-1)[0] === 2, JSON.stringify([t.deaths, t.beams[0]?.path]));
  const c = createGame(room(['########', '#P..k..#', '########'], { powers: { dive: true } })), copy = cloneGame(c);
  step(copy, ['right']); step(copy, ['right']); run(copy);
  check('breaking it in a copy leaves the original whole', kAt(copy, 4, 1) && !c.broken.length);
  check('a breakable block is a tile a room can hold', isCell('crack'));
  const ed = room(['#####', '#P..#', '#####']);
  place(ed, { tool: 'crack' }, 3, 1, 'place');
  check('the tool places a breakable block, and Look names it', ed.cells[8] === 'crack' && describe(ed, 3, 1) === 'Breakable block', ed.cells[8]);
}
{ // a bomb: a push lights it, it goes off at the end of your second move after
  const b0 = createGame(room(['########', '#......#', '#PO....#', '########']));
  slide(b0, 'right');
  const bomb = b0.entities[0];
  check('pushing a bomb lights it', at(bomb, 6, 2) && bomb.fuse === 2 && !bomb.dead, JSON.stringify(bomb));
  slide(b0, 'up');
  check('one move later it is still burning', !bomb.dead && bomb.fuse === 1, JSON.stringify(bomb));
  const watch = cloneGame(b0);
  step(b0, ['left']);
  check('the second move has started and it has not gone off yet', !b0.entities[0].dead && b0.entities[0].fuse === 0 && b0.player.dir, JSON.stringify(b0.entities[0]));
  for (let i = 0; i < 50 && b0.player.dir; i++) step(b0);
  check('it goes off when your second move ends, out of reach of you', b0.entities[0].dead && !b0.deaths && at(b0.player, 1, 1), JSON.stringify([b0.entities[0], b0.player]));
  slide(watch, 'right');
  check('standing in its 3x3 when it goes off kills you', watch.deaths === 1, JSON.stringify(watch.player));
  const re = createGame(room(['#########', '#PO.g...#', '#########']));
  slide(re, 'right'); slide(re, 'right');
  check('pushing a burning bomb again does not restart its fuse', at(re.entities[0], 7, 1) && re.entities[0].fuse === 1, JSON.stringify(re.entities[0]));
  const ch = createGame(room(['#########', '#...k..P#', '#.OOB...#', '#.EHS...#', '#########']));
  explode(ch, ch.entities[0]);
  const [o1, o2, bx, en, hv, st] = ch.entities;
  check('a blast sets off a bomb beside it, which breaks what is in its own reach', o1.dead && o2.dead && bx.dead && ch.broken.includes(1 * 9 + 4), JSON.stringify(ch.entities.map(e => [e.kind, e.dead])));
  check('a blast breaks weak enemies but not heavy boxes or strong enemies', en.dead && !hv.dead && !st.dead, JSON.stringify([en.dead, hv.dead, st.dead]));
  const t = createGame(room(['########', '#T..O..#', '#.....P#', '########'])); step(t);
  check('a turret beam sets a bomb off at once', t.entities[1].dead && t.events.some(e => e.type === 'blast'), JSON.stringify(t.entities[1]));
  const w = createGame(room(['########', '#PO..ww#', '########']));
  const seen = []; step(w, ['right']); for (let i = 0; i < 50 && w.player.dir; i++) { seen.push(...w.events.map(e => e.type)); step(w); }
  seen.push(...w.events.map(e => e.type));
  check('water puts its fuse out, and it does not light while in water', at(w.entities[0], 5, 1) && w.entities[0].fuse === null && seen.includes('fizzle'), JSON.stringify([w.entities[0], seen]));
  const dry = createGame(room(['########', '#PO.w..#', '########'], { powers: { swim: true, cycle: false } }));
  step(dry, ['hide']); slide(dry, 'right');
  check('pushed out of the water, it lights again', at(dry.entities[0], 6, 1) && dry.entities[0].fuse === 2, JSON.stringify(dry.entities[0]));
  step(dry, ['respawn']);
  check('Reset puts the bomb back, unlit', at(dry.entities[0], 2, 1) && dry.entities[0].fuse === null);
  const hs = createGame(room(['#########', '#P.H.O..#', '#########'], { powers: { dive: true } }));
  const hev = []; step(hs, ['right']); step(hs, ['right']); for (let i = 0; i < 60 && (hs.player.dir || hs.entities.some(e => !e.dead && e.slide)); i++) { hev.push(...hs.events.map(e => e.type)); step(hs); }
  check('a heavy box sliding into a bomb sets it off', hs.entities[1].dead && hev.includes('blast') && !hs.entities[0].dead && !hs.deaths, JSON.stringify([hs.entities, hev]));
  const dz = createGame(room(['#######', '#POX..#', '#######']));
  step(dz, ['right']);
  check('a bomb pushed into a death block goes off there, and you beside it die', dz.deaths === 1 && dz.events.some(e => e.type === 'blast'), JSON.stringify(dz.events));
  const ar = createGame(room(['#######', '#POX..#', '#######'], { powers: { armored: true } }));
  step(ar, ['right']);
  check('armored, a blast does not hurt you', !ar.deaths && ar.events.some(e => e.type === 'blast'), JSON.stringify(ar.events));
  const mt = createGame(room(['########', '#.OB..P#', '#..H...#', '########']));
  mt.entities[1].turret = { dirs: ['up'], mode: 'input', aim: 0 }; mt.entities[2].turret = { dirs: ['up'], mode: 'input', aim: 0 };
  explode(mt, mt.entities[0]);
  check('a turret riding a light box goes with the box; one on a heavy box stays', mt.entities[1].dead && !mt.entities[2].dead && !mt.beams.some(b => b.id === mt.entities[1].id), JSON.stringify(mt.entities.map(e => [e.kind, e.dead])));
  check('a bomb is a piece a level can hold', parseLevel(JSON.stringify(room(['#####', '#PO.#', '#####']))).entities[0].kind === 'bomb');
}
{ // a press that goes nowhere is not a move
  const w = createGame(room(['#####', '#P..#', '#####']));
  slide(w, 'up');
  check('pressing into a wall is not a move', w.move === 0 && !w.player.dir, String(w.move));
  slide(w, 'right');
  check('a press that slides you is one move', w.move === 1, String(w.move));
  const bx = createGame(room(['#####', '#PB#.', '#####']));
  slide(bx, 'right');
  check('pushing a box that cannot move is not a move', bx.move === 0 && at(bx.entities[0], 2, 1), String(bx.move));
  const bm = createGame(room(['########', '#......#', '#PO....#', '########']));
  slide(bm, 'right'); slide(bm, 'right'); slide(bm, 'right');
  check('pressing into a wall does not burn a fuse', bm.entities[0].fuse === 2 && bm.move === 1, JSON.stringify([bm.entities[0], bm.move]));
  const st = createGame(room(['#####', '#PB.#', '#####']));
  st.player.sticky = true; slide(st, 'right');
  check('sticking to a box you meet counts as a move, though you do not step', st.move === 1 && st.player.stuck, JSON.stringify([st.move, st.player.stuck]));
}
done();
