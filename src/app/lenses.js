// Lenses: four groups, by what they paint (a tile's colour, a dot, lines, a frame), with one
// lens on per group and every group at once. A tool in hand can open a lens by itself, until
// you pick one in that group. Data comes from searches run a slice at a time, again whenever
// the room changes. All copy is draft.
import { reach } from '../solve/solve.js';
import { routes } from '../solve/design.js';
import { lensData } from '../solve/lenses.js';
import { INK } from '../view/ink.js';
import { S } from '../editor/state.js';
import { $ } from './dom.js';
import { sliced } from './design.js';

const STOPS_BUDGET_MS = 2000;
export const LENS_GROUPS = [
  { id: 'colour', label: 'Colour', key: '1', lenses: [['distance', 'Distance'], ['beams', 'Beams'], ['pieces', 'Pieces']] },
  { id: 'dots', label: 'Dots', key: '2', lenses: [['stops', 'Stops']] },
  { id: 'lines', label: 'Lines', key: '3', lenses: [['solution', 'Solution']] },
  { id: 'frames', label: 'Frames', key: '4', lenses: [['traps', 'Traps']] },
];
// The lens a tool opens by itself, while it is in hand.
const PIECE = { colour: 'pieces' }, BEAM = { colour: 'beams' }, AIM = { colour: 'distance', lines: 'solution' };
export const AUTO = { turret: BEAM, receiver: BEAM, sensor: BEAM, box: PIECE, heavy: PIECE, mover: PIECE, enemy: PIECE, strong: PIECE, goal: AIM, start: AIM };
const SEARCHED = ['distance', 'beams', 'pieces', 'solution'];

const L = () => S.lens;
// What is on in a group: your pick, else what the tool opens, else nothing.
export function lensOn(group) {
  const pick = L().pick[group];
  if (pick !== undefined) return pick === 'off' ? null : pick;
  return L().follow ? (AUTO[S.ui.tool] || {})[group] || null : null;
}
const onNow = () => L().open && S.mode === 'edit' ? LENS_GROUPS.map(gr => lensOn(gr.id)).filter(Boolean) : [];

export function toggleLenses() {
  const l = L();
  l.open = !l.open;
  // Opening the first time shows what Stops used to: every stop, and the traps among them.
  if (l.open && !l.opened) { l.opened = true; l.pick.dots = 'stops'; l.pick.frames = 'traps'; }
  syncLenses();
}
export function pickLens(group, id) { L().pick[group] = id; syncLenses(); }
export function cycleLens(group) {
  const gr = LENS_GROUPS.find(g => g.id === group), ids = ['off', ...gr.lenses.map(([id]) => id)];
  if (!L().open) toggleLenses();
  pickLens(group, ids[(ids.indexOf(lensOn(group) || 'off') + 1) % ids.length]);
}
export function lensesOff() { for (const gr of LENS_GROUPS) L().pick[gr.id] = 'off'; syncLenses(); }

// Starts whatever search the lenses on now need and the room does not have yet.
function ensure() {
  const on = onNow(), stamp = JSON.stringify(S.level);
  if ((on.includes('stops') || on.includes('traps')) && (!S.stops || S.stops.stamp !== stamp)) runStops(stamp);
  if (on.some(id => SEARCHED.includes(id)) && (!S.lensData || S.lensData.stamp !== stamp)) {
    S.lensData = { stamp, d: undefined };
    sliced(lensData(JSON.parse(stamp)), stamp, d => { if (S.lensData.stamp === stamp) { S.lensData.d = d; S.redraw = true; legend(); } });
  }
}

// The stop map: plain slides first, then the whole search until its time runs out.
function runStops(stamp) {
  const out = {}, it = reach(JSON.parse(stamp), { budgetMs: STOPS_BUDGET_MS, out });
  S.stops = { stamp, list: null, out, why: null, capped: false, traps: null };
  const slice = () => {
    if (!S.stops || S.stops.stamp !== stamp) return;
    const until = performance.now() + 25;
    for (;;) {
      const r = it.next();
      if (r.done) {
        Object.assign(S.stops, { list: r.value.stops, why: r.value.why, capped: r.value.capped });
        legend(); S.redraw = true;
        if (!r.value.why && S.level.cells.includes('goal')) sliced(routes(JSON.parse(stamp)), stamp, m => {
          if (!S.stops || S.stops.stamp !== stamp) return;
          S.stops.traps = m ? m.traps : [];
          S.redraw = true; legend();
        });
        return;
      }
      if (performance.now() > until) break;
    }
    setTimeout(slice, 0);
  };
  slice();
}

const tiles = n => `${n} ${n === 1 ? 'tile' : 'tiles'}`;
const fresh = d => d && d.stamp === JSON.stringify(S.level) ? d : null;
// What the room draws for the lenses on now; see view/lenses.js.
export function lensMarks() {
  ensure();
  const st = fresh(S.stops), ld = fresh(S.lensData), d = ld && ld.d;
  const colour = lensOn('colour'), out = {};
  if (L().open && S.mode === 'edit') {
    if (d && colour === 'distance') out.heat = { distance: d.distance, hopeless: S.level.cells.includes('goal') ? d.hopeless : [] };
    if (d && colour === 'beams') out.heat = { tiles: d.beams, colour: INK.beam };
    if (d && colour === 'pieces') out.heat = { tiles: d.pieces, colour: INK.box };
    if (st && lensOn('dots') === 'stops') out.dots = st.list || [...(st.out.stops || [])];
    if (d && lensOn('lines') === 'solution') out.lines = d.solution;
    if (st && st.traps && lensOn('frames') === 'traps') out.frames = new Set(st.traps);
  }
  return out;
}
// Whether a search the lenses wait on is still running, so the room keeps redrawing.
export const lensBusy = () => onNow().length > 0 && ((fresh(S.stops) && !S.stops.list) || (fresh(S.lensData) && S.lensData.d === undefined));

function line(id) {
  const st = fresh(S.stops), ld = fresh(S.lensData), d = ld ? ld.d : undefined, part = d && d.capped ? ' Partial: the room has more positions than were searched.' : '';
  if (['stops', 'traps'].includes(id) && st && st.why || SEARCHED.includes(id) && d === null) return 'Has real-time pieces, so lenses cannot map it.';
  const wait = 'Working it out...';
  switch (id) {
    case 'stops': return st && st.list ? `Dots: ${tiles(st.list.length)} you can stop on${st.capped ? ', maybe more' : ''}.` : wait;
    case 'traps': return !S.level.cells.includes('goal') ? 'Frames: place a Goal to find traps.' : st && st.traps ? `Frames: ${tiles(st.traps.length)} where the goal is out of reach for good.` : wait;
    case 'distance': return !d ? wait : !S.level.cells.includes('goal') ? 'Colour: place a Goal to see how far each tile is.' : `Colour: green is near the goal, red is far, grey can no longer win.${part}`;
    case 'beams': return !d ? wait : `Colour: red where a laser can ever reach.${part}`;
    case 'pieces': return !d ? wait : `Colour: brown where a box, block or enemy can ever be.${part}`;
    case 'solution': return !d ? wait : d.solution.length ? `Lines: a shortest way, ${d.solution.length - 1} moves, numbered.${part}` : !S.level.cells.includes('goal') ? 'Lines: place a Goal to see a way.' : 'Lines: no way to the goal.';
  }
  return '';
}
function legend() {
  const on = onNow();
  $('lensLegend').replaceChildren(...on.map(id => Object.assign(document.createElement('li'), { textContent: line(id) })));
}

export function syncLenses() {
  const l = L(), show = l.open && S.mode === 'edit';
  $('stopsBtn').setAttribute('aria-pressed', String(l.open)); $('stopsBtn').classList.toggle('on', l.open);
  $('lensBox').hidden = !show;
  $('lensFollow').checked = l.follow;
  document.querySelectorAll('[data-lens-group]').forEach(b => b.classList.toggle('on', (lensOn(b.dataset.lensGroup) || 'off') === b.dataset.lens));
  if (show) { ensure(); legend(); }
  S.redraw = true;
}

export function buildLenses() {
  $('lensRows').replaceChildren(...LENS_GROUPS.map(gr => {
    const row = document.createElement('div');
    row.className = 'lensRow';
    const name = Object.assign(document.createElement('span'), { textContent: gr.label, title: `Key ${gr.key} cycles this row.` });
    row.append(name, ...[['off', 'Off'], ...gr.lenses].map(([id, label]) => {
      const b = Object.assign(document.createElement('button'), { type: 'button', textContent: label });
      b.dataset.lensGroup = gr.id; b.dataset.lens = id;
      b.onclick = () => pickLens(gr.id, id);
      return b;
    }));
    return row;
  }));
  $('lensFollow').onchange = e => { L().follow = e.target.checked; syncLenses(); };
  $('stopsBtn').onclick = toggleLenses;
}
