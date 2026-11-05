// The What if lens (registers 755, 756): every tile painted by what changing it does to the answer. With a
// piece tool in hand, what placing it there does (every way round, the longest kept); with Erase, what taking
// out what is there does. Focusing a tile says it in full: moves, routes, traps, reuse, and whether the
// extra moves are all forced. Each candidate is one search, run a slice at a time; results fill in as found.
import { routes, NOTES_MAX } from '../solve/design.js';
import { reuse } from '../solve/flow.js';
import { roomMetrics } from '../solve/metrics.js';
import { whatIf } from '../editor/whatif.js';
import { wayOf } from '../editor/variants.js';
import { TOOLS } from '../editor/palette.js';
import { S } from '../editor/state.js';

const SKIP = new Set(['look', 'select', 'move', 'start', 'goal']);
const name = t => ((TOOLS.find(x => x.id === t) || {}).label || t).toLowerCase();
const keyOf = () => JSON.stringify([S.ui.tool, S.ui.colour, S.ui.gateColour, S.ui.pass, S.ui.aim, S.ui.corner, S.ui.face, S.ui.axis, S.ui.dir, S.ui.inverted, S.ui.on]);
export const whatIfTool = () => S.ui.tool === 'erase' ? 'erase' : SKIP.has(S.ui.tool) ? null : S.ui.tool;

// Runs the search for the room and tool in hand, once; a change to either starts it again (registers 720, 754).
export function ensureWhatIf() {
  const tool = whatIfTool(), stamp = JSON.stringify(S.level), key = keyOf();
  if (!tool || !S.level.start) return null;
  const w = S.whatIf;
  if (w && w.stamp === stamp && w.key === key) return w;
  const run = { stamp, key, map: new Map(), base: undefined, done: false, detail: new Map() };
  S.whatIf = run;
  const it = whatIf(JSON.parse(stamp), { ...S.ui, tool }, run.map);
  const slice = () => {
    if (S.whatIf !== run) return;
    const until = performance.now() + 20;
    for (;;) { const r = it.next(); if (r.done) { run.base = r.value; run.done = true; S.redraw = true; return; } if (performance.now() > until) break; }
    S.redraw = true; setTimeout(slice, 0);
  };
  slice();
  return run;
}
export const whatIfBusy = () => !!(S.whatIf && !S.whatIf.done && S.whatIf.stamp === JSON.stringify(S.level));

// The focused tile in full, worked out once per tile: routes, traps and reuse of the changed room, and
// whether the moves it adds are all forced (756).
function detail(run, i, r) {
  if (run.detail.has(i)) return run.detail.get(i);
  const d = { done: false };
  run.detail.set(i, d);
  if (!r.moves) { d.done = true; return d; }
  const steps = [routes(r.level), reuse(r.level, NOTES_MAX), roomMetrics(r.level), roomMetrics(JSON.parse(run.stamp))];
  const out = [];
  let k = 0;
  const slice = () => {
    if (S.whatIf !== run) return;
    const until = performance.now() + 20;
    while (k < steps.length) { const n = steps[k].next(); if (n.done) { out.push(n.value); k++; } if (performance.now() > until) break; }
    if (k < steps.length) { setTimeout(slice, 0); return; }
    const [ro, ru, m, m0] = out;
    Object.assign(d, { done: true, routes: ro && ro.routes, traps: ro && ro.dead, reuse: ru && ru.busiest,
      forced: m && m0 && r.moves > (run.base || 0) && Math.round(m.forced * m.shortest) - Math.round(m0.forced * m0.shortest) >= r.moves - (run.base || 0) });
    S.redraw = true;
  };
  setTimeout(slice, 0);
  return d;
}

const moves = n => `${n} ${n === 1 ? 'move' : 'moves'}`;
// What changing this tile does, said to the player, condition first (registers 700, 753).
export function whatIfFact(i) {
  const run = S.whatIf;
  if (!run || run.stamp !== JSON.stringify(S.level) || !run.map.has(i)) return [];
  const r = run.map.get(i), way = r.ui && wayOf(r.ui), act = r.ui ? `Place a ${name(r.what)}${way ? `, ${way},` : ''} here` : `Take out the ${name(r.what)} here`;
  if (!r.moves) return [`${act} and the room can't be won`];
  const was = run.base ? ` instead of ${run.base}` : '', d = detail(run, i, r), extra = r.moves - (run.base || 0);
  const out = [`${act} and the answer takes ${moves(r.moves)}${was}`];
  if (!d.done) out.push('working out its routes, traps and reuse');
  else {
    out.push(`${d.routes ?? '?'} ${d.routes === 1 ? 'route' : 'routes'}, ${d.traps ?? '?'} traps, reuse ${d.reuse ?? '?'}×`);
    if (run.base && extra > 0 && d.forced) out.push(`the ${moves(extra)} it adds are all forced`);
  }
  return out;
}
