// A run: the state, one tick of it, its text reading, and replaying a key log.
// Pure and deterministic: no DOM, no clock, no randomness.
import { COLOURS, MOVES, NEEDS, POWERS, RT_PERIOD } from './base.js';
import { aimOf, computeBeams, turnTurrets } from './beams.js';
import { inWater } from './grid.js';
import { freshPieces, refreshDoors } from './life.js';
import { fireSprings, rushOnce, slidePiece } from './pieces.js';
import { input, slideOnce, unhide } from './player.js';
import { checkStuck } from './sticky.js';
import { checkGlue, partnerOf } from './glue.js';

export function createGame(level) {
  const l = JSON.parse(JSON.stringify(level));
  const s = {
    origin: l.entities,
    w: l.w, h: l.h, cells: l.cells, powers: l.powers, clock: l.clock,
    start: { ...l.start },
    checkpoint: { ...l.start },
    player: { x: l.start.x, y: l.start.y, dir: null, moved: 0, hidden: false, hideTicks: 0, swimming: false, stroke: false, sticky: false, stuck: null, pushing: null, snap: true },
    entities: freshPieces(l.entities),
    open: {}, lit: new Set(), shocked: new Set(), beams: [], tick: 0, worldSteps: 0, move: 0, deaths: 0, events: [],
  };
  computeBeams(s, false);
  refreshDoors(s);
  return s;
}

export function step(s, inputs = []) {
  s.events = [];
  s.player.snap = false;
  for (const k of inputs) input(s, k);
  // Pieces already sliding move first, so a piece a spring launched gets away
  // before you reach it.
  for (const e of s.entities) if (!e.dead && e.slide) slidePiece(s, e);
  for (const e of s.entities) if (!e.dead && e.rush && !e.slide) rushOnce(s, e);
  // In water you move a tile every other tick.
  if (s.player.dir) {
    s.player.stroke = inWater(s, s.player.x, s.player.y) ? !s.player.stroke : false;
    if (!s.player.stroke) slideOnce(s, false);
  }
  if (s.tick % RT_PERIOD === RT_PERIOD - 1) {
    for (const e of s.entities) if (!e.dead && !e.slide && !e.rush && e.mode === 'realtime' && MOVES.includes(e.kind) && !partnerOf(s, e)?.rush) e.rush = true;
    turnTurrets(s, 'realtime');
  }
  if (s.player.hidden) unhide(s);
  fireSprings(s);
  checkStuck(s);
  checkGlue(s);
  computeBeams(s, true);
  refreshDoors(s);
  s.tick++;
  return s;
}

// The one text reading of the game: tests, the bot and the agent all use it.
export function gameText(s, mode = 'play') {
  return JSON.stringify({
    mode, tick: s.tick, clock: s.clock, worldSteps: s.worldSteps, deaths: s.deaths,
    player: { x: s.player.x, y: s.player.y, sliding: s.player.dir, hidden: s.player.hidden, swimming: s.player.swimming, sticky: s.player.sticky, stuck: s.player.stuck && (s.player.stuck.ride ? 'riding' : 'glued') },
    checkpoint: s.checkpoint,
    pieces: s.entities.filter(e => !e.dead).map(e => ({
      kind: e.kind, x: e.x, y: e.y,
      ...(e.sticky ? { sticky: true } : {}), ...(partnerOf(s, e) ? { glued: true } : {}),
      ...(MOVES.includes(e.kind) ? { axis: e.axis, mode: e.mode } : {}),
      ...(e.turret ? { turret: { dirs: e.turret.dirs, mode: e.turret.mode, aim: aimOf(e.turret) } } : {}),
    })),
    open: COLOURS.filter(c => s.open[c]),
    beams: s.beams.map(b => ({ from: b.path[0], to: b.path[b.path.length - 1] })),
    powers: POWERS.filter(p => s.powers[p] && !NEEDS[p]),
  });
}

// Replays a key log ({t, k}) from the level; the same log always ends in the same text.
export function replay(level, log, ticks) {
  const s = createGame(level);
  for (let t = 0; t < ticks; t++) step(s, log.filter(i => i.t === t).map(i => i.k));
  return s;
}
