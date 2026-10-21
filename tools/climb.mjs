// The room search's climb (register 364), shared by tools/levelSearch.mjs and tools/searchBench.mjs.
// A climb starts from a known room, from one of the best near-misses kept so far, or from a fresh
// room; it gives up after a long run of edits that do not help. After a win it keeps going: fewer
// moves first, then a smaller room, reporting every distinct win on the way.
import { check } from '../src/campaign/rules.js';
import { searcher } from './roomSearch.mjs';

const KEEP = 16, STEPS = 400, STALL = 150, POLISH = 300;
export const BY_MOVES = (v, r) => v.length * 1000 + r.w * r.h, BY_AREA = (v, r) => r.w * r.h * 1000 + v.length;

// From a winning genome, edits that stay wins and do not score worse by f; every win met goes to see.
export function polish(s, def, g, f, steps, see, live = () => true) {
  const winOf = h => { if (s.penalty(h) !== 0) return null; const r = s.make(h), v = check(def, r); return v.won ? { r, v } : null; };
  let cur = g, w = winOf(g), score = w ? f(w.v, w.r) : Infinity;
  for (let i = 0; i < steps && w && live(); i++) {
    const h = s.mutate(cur), x = winOf(h);
    if (!x) continue;
    see(x);
    const sc = f(x.v, x.r);
    if (sc <= score) { cur = h; score = sc; }
  }
  return cur;
}

// see(room, verdict, key) is called once per distinct win. Returns the climbs made and the closest miss.
export function search(def, { seconds = 60, seed = 1, from = [], see = () => {}, until = () => false }) {
  const s = searcher(def, seed), end = Date.now() + seconds * 1000, live = () => Date.now() < end && !until();
  let n = seed * 7919 + 1;
  const rnd = () => ((n = (n * 1103515245 + 12345) % 2147483648) / 2147483648), pick = a => a[Math.floor(rnd() * a.length)];
  const kept = [], wins = new Set();
  let climbs = 0, best = Infinity;
  function remember(g, p) {
    const key = s.show(s.make(g));
    if (kept.some(k => k.key === key)) return;
    kept.push({ g, p, key }); kept.sort((a, b) => a.p - b.p); kept.length = Math.min(kept.length, KEEP);
  }
  function start() {
    const r = rnd();
    if (from.length && r < 0.2) return s.parse(pick(from));
    if (kept.length && r < 0.6) {
      // The nearer misses are picked more often, and shaken a little so a climb does not repeat itself.
      let g = kept[Math.floor(rnd() ** 2 * kept.length)].g;
      for (let k = 1 + Math.floor(rnd() * 3); k > 0; k--) g = s.mutate(g);
      return g;
    }
    return s.random();
  }
  const winOf = g => { if (s.penalty(g) !== 0) return null; const r = s.make(g), v = check(def, r); return v.won ? { r, v } : null; };
  const report = w => { const key = s.show(w.r); if (!wins.has(key)) { wins.add(key); see(w.r, w.v, key); } };
  while (live()) {
    climbs++;
    let g = start(), p = s.penalty(g);
    for (let i = 0, stall = 0; i < STEPS && p > 0 && stall < STALL && live(); i++) {
      const h = s.mutate(g), t = s.penalty(h);
      stall = t < p ? 0 : stall + 1;
      if (t <= p) { g = h; p = t; }
    }
    best = Math.min(best, p);
    if (p > 0) { remember(g, p); continue; }
    const w = winOf(g);
    if (!w) continue;
    report(w);
    for (const f of [BY_MOVES, BY_AREA]) polish(s, def, g, f, POLISH, report, live);
  }
  return { climbs, best, wins: wins.size };
}

export const benchRun = (def, seed, seconds, see) => search(def, { seconds, seed, see: (r, v, key) => see(key, v.length, r.w * r.h) });
