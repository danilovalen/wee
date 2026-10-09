// Judging a generated room: solved, par inside the range, every Must-use ingredient used by
// the solution, nothing set to Off in the room. The score orders the rooms that fail, so the
// search can climb toward one that fits.
import { createGame, step } from '../rules/game.js';
import { DIRS } from '../rules/base.js';
import { facing } from '../rules/grid.js';
import { search, parseMove } from '../solve/solve.js';
import { contains, uses } from '../solve/tags.js';
import { ING } from './ingredients.js';

const pieceTag = e => e.turret && e.kind !== 'turret' ? ['touch:' + e.kind, 'touch:mounted'] : ['touch:' + e.kind];

// What the solution touches, beyond the index's tags: a piece you stop against (a push ends
// against the box) or that dies; a tile you stop against. 'touch:water' is water that stopped you.
export function touches(level, moves) {
  const tags = new Set(), s = createGame(level);
  const busy = () => s.player.dir || s.player.hidden || s.entities.some(e => !e.dead && (e.rush || e.slide));
  const watch = () => {
    for (const ev of s.events) if (ev.type === 'kill') { const e = s.entities.find(o => o.id === ev.id); if (e) pieceTag(e).forEach(t => tags.add(t)); }
  };
  for (const m of moves) {
    const { k, at, then } = parseMove(m);
    let last = null;
    step(s, [k]); watch(); if (s.player.dir) last = s.player.dir;
    for (let i = 1; i <= 4 * s.w * s.h + 40 && busy(); i++) { step(s, i === at ? [then] : []); watch(); if (s.player.dir) last = s.player.dir; }
    if (!last) continue;
    const p = s.player, d = facing(s, p.x, p.y, last), x = p.x + DIRS[d][0], y = p.y + DIRS[d][1];
    if (x < 0 || y < 0 || x >= s.w || y >= s.h) continue;
    const e = s.entities.find(o => !o.dead && o.x === x && o.y === y), c = s.cells[y * s.w + x];
    if (e) pieceTag(e).forEach(t => tags.add(t));
    else if (c && c !== 'wall') tags.add('touch:' + c.split(':')[0]);
  }
  return [...tags];
}

// The Off ingredients whose tags the room holds.
export const offFound = (level, recipe) => {
  const have = new Set(contains(level));
  return Object.keys(ING).filter(id => !recipe.ing[id] && ING[id].tags.some(t => have.has(t)));
};

// The room with every piece or tile an ingredient marks taken away.
export function without(level, id) {
  const kind = ING[id].tags[0].split(':')[1];
  const l = structuredClone(level);
  l.entities = l.entities.filter(e => e.kind !== kind);
  l.cells = l.cells.map(c => c.split(':')[0] === kind ? '' : c);
  return l;
}

// Must-use ingredients the solution did not use. A generator, since 'shapes' solves again.
export function* missing(level, recipe, moves, max) {
  const have = new Set([...contains(level), ...uses(level, moves), ...touches(level, moves)]), out = [];
  for (const id of Object.keys(recipe.ing)) {
    if (recipe.ing[id] !== 'must') continue;
    const needs = ING[id].needs || ING[id].tags;
    if (needs.some(t => have.has(t))) continue;
    if (needs.includes('shapes')) {
      const r = yield* search(without(level, id), max);
      if (r.status === 'unsolvable' || (r.status === 'solved' && r.moves.length < moves.length)) continue;
    }
    out.push(id);
  }
  return out;
}

// A generator: runs the solver a slice at a time, then returns the verdict.
export function* judge(level, recipe, max = 3000) {
  const off = offFound(level, recipe);
  if (off.length) return { fit: false, score: -Infinity, status: 'off', off };
  const r = yield* search(level, max);
  if (r.status !== 'solved') return { fit: false, score: -1000, status: r.status };
  const par = r.moves.length, miss = yield* missing(level, recipe, r.moves, max);
  const out = par < recipe.min ? recipe.min - par : par > recipe.max ? par - recipe.max : 0;
  const mid = (recipe.min + recipe.max) / 2;
  const score = -100 * miss.length - 10 * out - Math.abs(par - mid) / 10;
  return { fit: !miss.length && !out, score, status: 'solved', par, moves: r.moves, missing: miss };
}
