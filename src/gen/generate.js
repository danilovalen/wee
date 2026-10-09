// Making one room to order: build a walled room holding the asked-for ingredients, judge
// it with the solver, change one thing at a time while the score goes up, and start over
// when it stops going up. The same recipe always walks the same path, so it rebuilds the
// same room; only a time limit, applied by the caller, can cut the walk short.
import { CLOCKWISE, CORNERS } from '../rules/base.js';
import { emptyLevel, wallBorder } from '../level/format.js';
import { INGREDIENTS, ING, spot } from './ingredients.js';
import { judge } from './score.js';
import { rng } from './random.js';

export const LIMITS = { size: [5, 14], moves: [1, 40] };
const clamp = (v, [a, b]) => Math.max(a, Math.min(b, Math.round(+v || a)));
const STALE = 40;

// Fills in defaults, keeps the numbers in range, and turns on what a Must or Allowed
// ingredient brings with it (a laser catcher needs a turret). One that can never change the
// answer (a checkpoint) is Allowed at most.
export function normalize(recipe) {
  const ing = {};
  for (const [id, v] of Object.entries(recipe.ing || {})) if (ING[id] && (v === 'must' || v === 'allowed')) ing[id] = ING[id].allowedOnly ? 'allowed' : v;
  for (let grew = true; grew;) {
    grew = false;
    for (const id of Object.keys(ing)) for (const w of ING[id].with || []) if (!ing[w]) { ing[w] = 'allowed'; grew = true; }
  }
  const min = clamp(recipe.min ?? 6, LIMITS.moves), max = Math.max(min, clamp(recipe.max ?? 12, LIMITS.moves));
  return { w: clamp(recipe.w ?? 8, LIMITS.size), h: clamp(recipe.h ?? 8, LIMITS.size), ing, min, max, seed: (+recipe.seed || 0) >>> 0 };
}

// The shelf's name for a recipe: size, move range, and what it must use.
export function recipeLabel(recipe) {
  const must = INGREDIENTS.filter(g => recipe.ing[g.id] === 'must').map(g => g.label);
  return [`${recipe.w}x${recipe.h}`, `${recipe.min}-${recipe.max} moves`, ...(must.length ? [must.join(', ')] : [])].join(' · ');
}

const ctxOf = recipe => ({ many: !!recipe.ing.colours, and: !!recipe.ing.and });
const placers = recipe => INGREDIENTS.filter(g => recipe.ing[g.id] && g.place);

export function build(recipe, r) {
  let l = wallBorder(emptyLevel(recipe.w, recipe.h));
  for (const p of Object.keys(l.powers)) l.powers[p] = false;
  for (const g of INGREDIENTS) if (g.power && recipe.ing[g.id]) l.powers[g.power] = true;
  const s = spot(l, r);
  l.start = { x: s % l.w, y: (s - s % l.w) / l.w };
  l.cells[spot(l, r)] = 'goal';
  const ctx = ctxOf(recipe);
  for (const g of placers(recipe)) if (recipe.ing[g.id] === 'must' || r.next() < 0.5) g.place(l, r, ctx);
  const area = (l.w - 2) * (l.h - 2), rocks = Math.round(area * (0.08 + r.next() * 0.1));
  for (let k = 0; k < rocks; k++) { const i = spot(l, r); if (i >= 0) l.cells[i] = 'wall'; }
  return l;
}

const turned = (c, r) => {
  const [k] = c.split(':');
  if (k === 'tri') return 'tri:' + r.pick(CORNERS);
  if (k === 'gate' || k === 'spring') return k + ':' + r.pick(CLOCKWISE);
  return null;
};

// One change: move a tile, a piece, the start or the goal; add or take away a rock; turn a
// tile that has a direction; now and then add an Allowed ingredient.
export function mutate(level, recipe, r) {
  const l = structuredClone(level), inner = [];
  for (let i = 0; i < l.cells.length; i++) { const x = i % l.w, y = (i - x) / l.w; if (x > 0 && y > 0 && x < l.w - 1 && y < l.h - 1) inner.push(i); }
  const op = r.int(6), to = spot(l, r);
  if (op === 0 && to >= 0) { const walls = inner.filter(i => l.cells[i] === 'wall'); if (walls.length && r.next() < 0.5) l.cells[r.pick(walls)] = ''; else l.cells[to] = 'wall'; }
  else if (op === 1 && to >= 0) { const tiles = inner.filter(i => l.cells[i] && l.cells[i] !== 'wall'); if (tiles.length) { const i = r.pick(tiles); l.cells[to] = l.cells[i]; l.cells[i] = ''; } }
  else if (op === 2 && to >= 0 && l.entities.length) { const e = r.pick(l.entities); e.x = to % l.w; e.y = (to - e.x) / l.w; }
  else if (op === 3 && to >= 0) l.start = { x: to % l.w, y: (to - to % l.w) / l.w };
  else if (op === 4) { const ts = inner.filter(i => turned(l.cells[i], r)); if (ts.length) { const i = r.pick(ts); l.cells[i] = turned(l.cells[i], r); } else if (to >= 0) l.cells[to] = 'wall'; }
  else if (op === 5) {
    const allowed = placers(recipe).filter(g => recipe.ing[g.id] === 'allowed');
    if (allowed.length && r.next() < 0.3) r.pick(allowed).place(l, r, ctxOf(recipe));
    else if (to >= 0) { const g = l.cells.indexOf('goal'); l.cells[g] = ''; l.cells[to] = 'goal'; }
  }
  return l;
}

// A generator over a recipe. Yields while it works; out.best and out.tries say how far it
// got. Returns { fit, level, verdict, tries } with the first room that fits, or the closest
// one when maxTries runs out.
export function* generate(recipe, { maxTries = Infinity, out = {} } = {}) {
  recipe = normalize(recipe);
  const r = rng(recipe.seed);
  out.tries = 0; out.best = null;
  const keep = (level, v) => { out.tries++; if (!out.best || v.score > out.best.verdict.score) out.best = { level, verdict: v }; };
  while (out.tries < maxTries) {
    let cur = build(recipe, r), cv = yield* judge(cur, recipe);
    keep(cur, cv);
    if (cv.fit) return { fit: true, level: cur, verdict: cv, tries: out.tries };
    for (let stale = 0; stale < STALE && out.tries < maxTries;) {
      const next = mutate(cur, recipe, r), nv = yield* judge(next, recipe);
      keep(next, nv);
      if (nv.fit) return { fit: true, level: next, verdict: nv, tries: out.tries };
      if (nv.score > cv.score) stale = 0; else stale++;
      if (nv.score >= cv.score) { cur = next; cv = nv; }
      yield out.tries;
    }
  }
  return { fit: false, level: out.best.level, verdict: out.best.verdict, tries: out.tries };
}

// The whole walk at once, for tests and tools.
export function generateNow(recipe, opts) {
  const it = generate(recipe, opts);
  for (;;) { const r = it.next(); if (r.done) return r.value; }
}
