import { createGame, step, worldStep, gameText, replay, parseLevel, emptyLevel, RT_PERIOD } from '../src/sim.js';
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
  worldStep(t); worldStep(t);
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
  const s = createGame(room(['########', '#M.P...#', '########']));
  worldStep(s); worldStep(s);
  check('mover pushes you a tile', at(s.player, 4, 1) && at(s.entities[0], 3, 1), JSON.stringify(s.player));
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
{ // a jump cycles the world; an enemy landing under you dies
  const l = room(['######', '#.PE.#', '######']);
  l.entities[0].dir = -1;
  const s = createGame(l);
  step(s, ['jump']);
  check('jump gives the world a step', s.worldSteps === 1);
  check('an enemy stepping under a jump dies', s.entities[0].dead && s.deaths === 0);
  const t = createGame(l);
  t.checkpoint = { x: 4, y: 1 };
  worldStep(t);
  check('the same enemy kills you on the ground', t.deaths === 1);
  const u = createGame(room(['######', '#.PE.#', '######'], { powers: { cycle: false } }));
  step(u, ['jump']);
  check('no jump without cycle', u.worldSteps === 0);
}
{ // real-time movers move with no input; on-input movers wait
  const s = createGame(room(['#######', '#M....#', '#P....#', '#######'], { mode: 'realtime' }));
  for (let i = 0; i < RT_PERIOD; i++) step(s);
  check('real-time mover moves on its own', at(s.entities[0], 2, 1));
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
  const log = [{ t: 0, k: 'down' }, { t: 4, k: 'right' }, { t: 12, k: 'up' }, { t: 20, k: 'jump' }];
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
  const l = room(['######', '#.PS.#', '#....#', '######']);
  l.entities[0].dir = -1;
  const u = createGame(l);
  u.checkpoint = { x: 1, y: 2 };
  step(u, ['jump']);
  check('a jump does not kill a strong enemy', !u.entities[0].dead && u.deaths === 1);
  const v = createGame(room(['##########', '#P...H.S.#', '##########'], { mode: 'realtime' }));
  step(v, ['right']); step(v, ['right']); step(v);
  check('a thrown heavy box kills a strong enemy', v.entities.find(e => e.kind === 'strong').dead);
}
{ // turret: fires its directions clockwise, one per world step
  const l = room(['#######', '#.....#', '#..T..#', '#.....#', '#P....#', '#######']);
  l.entities[0].turret.dirs = ['left', 'up', 'down'];
  const s = createGame(l);
  const order = [];
  const t = createGame(l);
  for (let i = 0; i < 4; i++) { t.events = []; worldStep(t); order.push(t.events.find(e => e.type === 'beam')?.d); }
  check('a turret fires clockwise and loops', order.join() === 'up,down,left,up', order.join());
  const r = createGame(room(['#######', '#T...P#', '#.....#', '#######'], { mode: 'realtime' }));
  r.checkpoint = { x: 1, y: 2 };
  for (let i = 0; i < RT_PERIOD; i++) step(r);
  check('a real-time turret beam kills you', r.deaths === 1);
  const q = createGame(room(['#######', '#T...P#', '#.....#', '#######']));
  for (let i = 0; i < RT_PERIOD * 2; i++) step(q);
  check('an on-input turret waits for you', q.deaths === 0 && q.entities[0].turret.next === 0);
  const a = createGame(room(['#######', '#T...P#', '#.....#', '#######']));
  a.checkpoint = { x: 1, y: 2 };
  step(a, ['jump']);
  check('you are safe from a beam in the air', a.deaths === 0 && a.entities[0].turret.next === 1);
  const kl = room(['########', '#T.E.S.#', '#P.....#', '########'], { mode: 'realtime' });
  for (const e of kl.entities) if (e.kind !== 'turret') e.mode = 'input';
  const k = createGame(kl);
  for (let i = 0; i < RT_PERIOD; i++) step(k);
  const beam = k.events.find(e => e.type === 'beam');
  const end = beam && beam.path[beam.path.length - 1];
  check('a beam kills a weak enemy and stops at a strong one', k.entities.find(e => e.kind === 'enemy').dead && !k.entities.find(e => e.kind === 'strong').dead && end && end[0] === 5, JSON.stringify(beam));
}
{ // a turret rides its carrier and fires from where the carrier is
  const l = room(['#########', '#PB.....#', '#.......#', '#########']);
  l.entities[0].turret = { dirs: ['down'], mode: 'input' };
  const s = slide(createGame(l), 'right');
  const box = s.entities[0];
  check('the turret moves with its box', at(box, 7, 1));
  s.events = []; worldStep(s);
  const b = s.events.find(e => e.type === 'beam');
  check('and fires from the box', b && b.path[0][0] === 7 && b.path[0][1] === 1 && b.d === 'down', JSON.stringify(b));
  const t = slide(createGame(room(['######', '#P.T.#', '######'])), 'right');
  check('a turret block stops a slide', at(t.player, 2, 1));
  let refused = 0;
  for (const dirs of [[], ['up', 'up'], ['north'], ['up', 'right', 'down', 'left', 'up']]) {
    const bad = room(['####', '#PT#', '####']); bad.entities[0].turret.dirs = dirs;
    try { parseLevel(JSON.stringify(bad)); } catch { refused++; }
  }
  check('a turret with bad directions is refused', refused === 4, refused + '/4');
}

{ // follow: pieces move the way you moved, one tile per world step, and wait when blocked
  const F = ['##########', '#M.......#', '#P.......#', '##########'];
  const s = slide(createGame(room(F, { mode: 'follow' })), 'right');
  check('a follower slides along with you', at(s.entities[0], 8, 1) && at(s.player, 8, 2), JSON.stringify(s.entities[0]));
  const w = slide(createGame(room(['##########', '#M..#....#', '#P.......#', '##########'], { mode: 'follow' })), 'right');
  check('a blocked follower waits while you go on', at(w.entities[0], 3, 1) && at(w.player, 8, 2), JSON.stringify(w.entities[0]));
  const t = slide(createGame(room(F, { mode: 'follow', clock: 'slide' })), 'right');
  check('per slide, a follower takes one tile your way', at(t.entities[0], 2, 1), JSON.stringify(t.entities[0]));
  const u = createGame(room(F, { mode: 'follow' }));
  step(u, ['jump']);
  check('a jump has no direction, so followers stay', at(u.entities[0], 1, 1) && u.worldSteps === 1);
  const v = slide(createGame(room(['#######', '#.....#', '#P....#', '#..V..#', '#######'], { mode: 'follow' })), 'right');
  check('a follower ignores its patrol axis', at(v.entities[0], 5, 3), JSON.stringify(v.entities[0]));
}
{ // a follow turret fires your direction, and only if it has that barrel
  const l = room(['########', '#..T...#', '#P.....#', '########'], { mode: 'follow' });
  l.entities[0].turret.dirs = ['up', 'right'];
  const s = createGame(l);
  step(s, ['right']);
  const b = s.events.find(e => e.type === 'beam');
  check('a follow turret fires the way you slid', b && b.d === 'right', JSON.stringify(b));
  const t = createGame(l);
  t.player.x = 6; step(t, ['left']);
  check('no barrel that way, no beam', !t.events.some(e => e.type === 'beam'));
  check('a follow turret keeps no clockwise turn', s.entities[0].turret.next === 0);
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
  worldStep(t); worldStep(t); worldStep(t);
  check('a patrol bounces off a wall without losing a step', at(t.entities[0], 2, 1), JSON.stringify(t.entities[0]));
  const u = createGame(room(['###', '#M#', '#P#', '###']));
  worldStep(u);
  check('a patrol boxed in on both sides stays put', at(u.entities[0], 1, 1));
}
{ // a jump sends each on-your-move piece sliding until something stops it
  const s = createGame(room(['##########', '#E.......#', '#P.......#', '##########']));
  step(s, ['jump']);
  for (let i = 0; i < 12; i++) step(s);
  check('after a jump the enemy slides to the wall', at(s.entities[0], 8, 1), JSON.stringify(s.entities[0]));
  check('a jump is still one world step', s.worldSteps === 1);
  const t = createGame(room(['##########', '#E.......#', '#P.......#', '##########']));
  step(t, ['jump']); step(t);
  check('the slide takes a tile per tick, so you see it travel', t.entities[0].x === 3, JSON.stringify(t.entities[0]));
}
{ // strong enemy: two laser hits within four of your moves kill it
  // It sits walled in below the row you slide along, so it cannot wander off.
  const L = ['###########', '#.P.......#', '#.........#', '#....#S#..#', '###########'];
  const s = createGame(room(L));
  const e = s.entities[0];
  step(s, ['right']); step(s); step(s); step(s);
  step(s, ['down']);
  check('a first laser only hurts a strong enemy', !e.dead && e.hurt > 0, JSON.stringify(e));
  step(s, ['left']);
  step(s, ['down']);
  check('a second laser two moves later kills it', e.dead);
  const t = createGame(room(L));
  const f = t.entities[0];
  step(t, ['right']); step(t); step(t); step(t);
  step(t, ['down']);
  step(t); step(t); step(t);
  step(t, ['left']); step(t); step(t);
  check('the hurt wears off after four of your moves', f.hurt === 0, JSON.stringify(f));
  step(t, ['down']);
  check('so a late second laser only hurts it again', !f.dead && f.hurt > 0);
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
  for (let i = 0; i < 6; i++) worldStep(w);
  check('a patrol turns onto the other axis at a triangle', w.entities[0].axis === 'v' && at(w.entities[0], 5, 3), JSON.stringify(w.entities[0]));
  const x = createGame(room(['########', '#P...H9#', '#......#', '#......#', '########']));
  step(x, ['right']); step(x, ['right']);
  for (let i = 0; i < 8; i++) step(x);
  check('a thrown heavy box turns at a triangle', at(x.entities[0], 6, 3), JSON.stringify(x.entities[0]));
  let refused = 0;
  try { parseLevel(JSON.stringify({ ...room(['###', '#P#', '###']), cells: Array(9).fill('tri:up') })); } catch { refused++; }
  check('an unknown triangle is refused', refused === 1);
}

done();
