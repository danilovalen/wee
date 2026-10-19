// Making one room to order: build a walled room holding the asked-for ingredients, judge
// it with the solver, change one thing at a time while the score goes up, and start over
// when it stops going up. The same recipe always walks the same path, so it rebuilds the
// same room; only a time limit, applied by the caller, can cut the walk short.
import { CLOCKWISE, CORNERS } from '../rules/base.js';
import { emptyLevel, wallBorder } from '../level/format.js';
import { INGREDIENTS, ING, spot } from './ingredients.js';
import { judge, lockedIn } from './score.js';
import { contains } from '../solve/tags.js';
import { rng } from './random.js';

export const LIMITS = { size: [5, 14], moves: [1, 40] };
const clamp = (v, [a, b]) => Math.max(a, Math.min(b, Math.round(+v || a)));
const STALE = 40;
// How many times in a row a room's idle parts are tidied away before it is judged as it is.
const TIDY = 4;
// How many more tries a fit that ends in a long walk waits for one that does not.
const GRACE = 150;

// Fills in defaults, keeps the numbers in range, and turns on what a Must or Allowed
// ingredient brings with it (a laser catcher needs a turret). One that can never change the
// answer (a checkpoint) is Allowed at most. What you set Off yourself (recipe.off) is never
// brought along: a room that needs it then simply does not fit.
export function normalize(recipe) {
  const ing = {}, base = recipe.base || null, has = base ? new Set(contains(base)) : new Set();
  // Completing a room: what is already in it is allowed, whatever the form says.
  const off = (recipe.off || []).filter(id => ING[id] && !ING[id].tags.some(t => has.has(t)));
  for (const [id, v] of Object.entries(recipe.ing || {})) if (ING[id] && (v === 'must' || v === 'allowed')) ing[id] = ING[id].allowedOnly ? 'allowed' : v;
  for (const g of INGREDIENTS) if (!ing[g.id] && g.tags.some(t => has.has(t))) ing[g.id] = 'allowed';
  for (let grew = true; grew;) {
    grew = false;
    for (const id of Object.keys(ing)) for (const w of ING[id].with || []) if (!ing[w] && !off.includes(w)) { ing[w] = 'allowed'; grew = true; }
  }
  const min = clamp(recipe.min ?? 6, LIMITS.moves), max = Math.max(min, clamp(recipe.max ?? 12, LIMITS.moves));
  const w = base ? base.w : clamp(recipe.w ?? 8, LIMITS.size), h = base ? base.h : clamp(recipe.h ?? 8, LIMITS.size);
  return { w, h, ing, ...(off.length ? { off } : {}), ...(base ? { base } : {}), min, max, seed: (+recipe.seed || 0) >>> 0 };
}

// The shelf's name for a recipe: size, move range, and what it must use.
export function recipeLabel(recipe) {
  const must = INGREDIENTS.filter(g => recipe.ing[g.id] === 'must').map(g => g.label);
  return [`${recipe.w}x${recipe.h}`, ...(recipe.base ? ['your room'] : []), `${recipe.min}-${recipe.max} moves`, ...(must.length ? [must.join(', ')] : [])].join(', ');
}

const ctxOf = recipe => ({ many: !!recipe.ing.colours, and: !!recipe.ing.and });
const placers = recipe => INGREDIENTS.filter(g => recipe.ing[g.id] && g.place);

// Completing a room (recipe.base) starts from it: its start and goal stay, and only the
// ingredients it does not hold yet are added.
export function build(recipe, r) {
  const base = recipe.base, l = base ? structuredClone(base) : wallBorder(emptyLevel(recipe.w, recipe.h));
  if (!base) for (const p of Object.keys(l.powers)) l.powers[p] = false;
  for (const g of INGREDIENTS) if (g.power && recipe.ing[g.id]) l.powers[g.power] = true;
  if (!base || !l.start) { const s = spot(l, r); l.start = { x: s % l.w, y: (s - s % l.w) / l.w }; }
  if (!l.cells.includes('goal')) l.cells[spot(l, r)] = 'goal';
  const ctx = ctxOf(recipe), has = new Set(base ? contains(base) : []);
  for (const g of placers(recipe)) if (!g.tags.some(t => has.has(t)) && (recipe.ing[g.id] === 'must' || r.next() < 0.5)) g.place(l, r, ctx);
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
// Nothing you placed is ever changed when completing a room (lockedIn).
export function mutate(level, recipe, r) {
  const l = structuredClone(level), inner = [], locked = lockedIn(recipe);
  for (let i = 0; i < l.cells.length; i++) { const x = i % l.w, y = (i - x) / l.w; if (x > 0 && y > 0 && x < l.w - 1 && y < l.h - 1 && !locked.has(i)) inner.push(i); }
  const op = r.int(6), to = spot(l, r), mine = l.entities.filter(e => !locked.has(e.y * l.w + e.x));
  if (op === 0 && to >= 0) { const walls = inner.filter(i => l.cells[i] === 'wall'); if (walls.length && r.next() < 0.5) l.cells[r.pick(walls)] = ''; else l.cells[to] = 'wall'; }
  else if (op === 1 && to >= 0) { const tiles = inner.filter(i => l.cells[i] && l.cells[i] !== 'wall'); if (tiles.length) { const i = r.pick(tiles); l.cells[to] = l.cells[i]; l.cells[i] = ''; } }
  else if (op === 2 && to >= 0 && mine.length) { const e = r.pick(mine); e.x = to % l.w; e.y = (to - e.x) / l.w; }
  else if (op === 3 && to >= 0 && !recipe.base?.start) l.start = { x: to % l.w, y: (to - to % l.w) / l.w };
  else if (op === 4) { const ts = inner.filter(i => turned(l.cells[i], r)); if (ts.length) { const i = r.pick(ts); l.cells[i] = turned(l.cells[i], r); } else if (to >= 0) l.cells[to] = 'wall'; }
  else if (op === 5) {
    const allowed = placers(recipe).filter(g => recipe.ing[g.id] === 'allowed');
    if (allowed.length && r.next() < 0.3) r.pick(allowed).place(l, r, ctxOf(recipe));
    else if (to >= 0 && !locked.has(l.cells.indexOf('goal'))) { const g = l.cells.indexOf('goal'); l.cells[g] = ''; l.cells[to] = 'goal'; }
  }
  return l;
}

// A room with its idle parts dealt with: an unused piece or tile taken out, one whose stand-in
// does the same job turned into that stand-in.
export function tidy(level, { unused = [], plain = [] }) {
  const l = structuredClone(level), at = e => x => x.x === e.x && x.y === e.y;
  for (const e of unused) { if (e.piece) l.entities = l.entities.filter(x => !at(e)(x)); else l.cells[e.y * l.w + e.x] = ''; }
  for (const e of plain) {
    const p = e.piece && l.entities.find(at(e));
    if (e.as === 'turret' && p) { l.entities = l.entities.filter(x => x !== p); l.entities.push({ kind: 'turret', x: e.x, y: e.y, turret: p.turret }); continue; }
    if (p) l.entities = l.entities.filter(x => x !== p);
    l.cells[e.y * l.w + e.x] = 'wall';
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
  // Judges a room, and while it fits but for idle parts, tidies them away and judges again.
  function* settle(level) {
    let v = yield* judge(level, recipe);
    for (let n = 0; n < TIDY && !v.fit && (v.unused?.length || v.plain?.length) && out.tries < maxTries; n++) {
      keep(level, v);
      level = tidy(level, v); v = yield* judge(level, recipe);
    }
    return [level, v];
  }
  // A fit that ends in a long walk (verdict.tail) is kept, and the search goes on a while for
  // one that does not; failing that, the walk is what comes back.
  let held = null, until = Infinity;
  const fits = (level, v) => {
    if (!v.fit) return false;
    if (!v.tail) return true;
    if (!held) { held = { fit: true, level, verdict: v }; until = out.tries + GRACE; }
    return false;
  };
  const done = () => held && out.tries >= until;
  while (out.tries < maxTries && !done()) {
    let [cur, cv] = yield* settle(build(recipe, r));
    keep(cur, cv);
    if (fits(cur, cv)) return { fit: true, level: cur, verdict: cv, tries: out.tries };
    for (let stale = 0; stale < STALE && out.tries < maxTries && !done();) {
      const [next, nv] = yield* settle(mutate(cur, recipe, r));
      keep(next, nv);
      if (fits(next, nv)) return { fit: true, level: next, verdict: nv, tries: out.tries };
      if (nv.score > cv.score) stale = 0; else stale++;
      if (nv.score >= cv.score) { cur = next; cv = nv; }
      yield out.tries;
    }
  }
  if (held) return { ...held, tries: out.tries };
  return { fit: false, level: out.best.level, verdict: out.best.verdict, tries: out.tries };
}

// The whole walk at once, for tests and tools.
export function generateNow(recipe, opts) {
  const it = generate(recipe, opts);
  for (;;) { const r = it.next(); if (r.done) return r.value; }
}
