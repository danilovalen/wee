// Lenses: four groups, by what they paint (a tile's colour, a dot, lines, a frame), with one
// lens on per group and every group at once. A tool in hand can open a lens by itself, until
// you pick one in that group. Data comes from searches run a slice at a time, again whenever
// the room changes. All copy is draft.
import { reach, move } from '../solve/solve.js';
import { createGame } from '../rules/game.js';
import { DIR_OF } from '../rules/base.js';
import { routes } from '../solve/design.js';
import { lensData } from '../solve/lenses.js';
import { INK } from '../view/ink.js';
import { S } from '../editor/state.js';
import { $ } from './dom.js';
import { sliced } from './design.js';
import { WELL, closeWell } from './well.js';
import { ensureWhatIf, whatIfBusy, whatIfFact, whatIfTool } from './whatif.js';

const STOPS_BUDGET_MS = 2000;
export const LENS_GROUPS = [
  { id: 'colour', label: 'Colour', key: '1', lenses: [['distance', 'Distance'], ['beams', 'Beams'], ['pieces', 'Pieces'], ['whatif', 'What if']] },
  { id: 'dots', label: 'Dots', key: '2', lenses: [['stops', 'Stops'], ['passes', 'Passes']] },
  { id: 'lines', label: 'Lines', key: '3', lenses: [['solution', 'Solution'], ['moves', 'Moves']] },
  { id: 'frames', label: 'Frames', key: '4', lenses: [['traps', 'Traps'], ['danger', 'Danger']] },
];
// What each lens shows, on its button's hover.
export const LENS_TIPS = {
  off: 'Show nothing in this row.',
  distance: 'Colour each tile by how many moves it takes to win from there.',
  beams: 'Colour every tile a laser can ever reach.',
  pieces: 'Colour every tile a box, a moving block or an enemy can ever stand on.',
  whatif: 'With a piece in hand, colour each tile by what placing it there does to the answer; with Erase, by what taking it out does.',
  stops: 'Ring every tile you can stop on: ice if every shortest win stops there, orange if some do.',
  passes: 'Dot every tile you slide through: ice if every shortest win passes it, orange if some do.',
  solution: 'Draw one shortest way to the goal, its moves numbered.',
  moves: 'Draw every slide from stop to stop, thicker where more positions make it.',
  traps: 'Frame every tile from which the goal is out of reach for good.',
  danger: 'Frame every tile where a move kills you.',
};
// The lens a tool opens by itself, while it is in hand.
const PIECE = { colour: 'pieces' }, BEAM = { colour: 'beams' }, AIM = { colour: 'distance', lines: 'solution' };
export const AUTO = { turret: BEAM, sensor: BEAM, box: PIECE, heavy: PIECE, mover: PIECE, enemy: PIECE, strong: PIECE, goal: AIM, start: AIM };
const SEARCHED = ['distance', 'beams', 'pieces', 'solution', 'passes', 'moves', 'danger'];

const L = () => S.lens;
// Every lens turns on and off by itself, so any can show at once (register 770); the colour lenses paint the
// same tiles, so one of them at a time.
export const MULTI = new Set(['dots', 'lines', 'frames']);
const groupOf = id => LENS_GROUPS.find(g => g.lenses.some(([l]) => l === id));
const auto = group => L().follow ? (AUTO[S.ui.tool] || {})[group] || null : null;
export function isOn(id) {
  const gr = groupOf(id);
  if (!gr) return false;
  if (!MULTI.has(gr.id)) return lensOn(gr.id) === id;
  const v = (L().on || {})[id];
  return v === undefined ? (L().pick[gr.id] === undefined ? auto(gr.id) === id : L().pick[gr.id] === id) : v;
}
// What is on in a group: your pick, else what the tool opens, else nothing; for a group of on/off lenses,
// the first one on.
export function lensOn(group) {
  if (MULTI.has(group)) return LENS_GROUPS.find(g => g.id === group).lenses.map(([id]) => id).find(isOn) || null;
  const pick = L().pick[group];
  if (pick !== undefined) return pick === 'off' ? null : pick;
  return auto(group);
}
// Whether a group's lens is the tool's doing rather than your pick.
export const isAuto = group => L().pick[group] === undefined && !!lensOn(group);
// Lenses are for building: none in a campaign level, a challenge or a puzzle, for now (register 760).
export const lensesHere = () => L().open && S.mode === 'edit' && !S.camp && !S.puzzle;
const onNow = () => lensesHere() ? LENS_GROUPS.flatMap(gr => gr.lenses.map(([id]) => id)).filter(isOn) : [];

export function toggleLenses() {
  const l = L();
  l.open = !l.open;
  // The chips under the room carry the lenses; turning them off closes their tab if it shows.
  if (!l.open && WELL.open && WELL.tab === 'lenses') closeWell();
  syncLenses();
}
export function pickLens(group, id) {
  if (MULTI.has(group)) { const on = L().on ||= {}; for (const [l] of groupOf(group === 'dots' ? 'stops' : group === 'lines' ? 'solution' : 'traps').lenses) on[l] = l === id; }
  L().pick[group] = id; syncLenses();
}
export function cycleLens(group) {
  const gr = LENS_GROUPS.find(g => g.id === group), ids = ['off', ...gr.lenses.map(([id]) => id)];
  if (!L().open) toggleLenses();
  pickLens(group, ids[(ids.indexOf(lensOn(group) || 'off') + 1) % ids.length]);
}
export function lensesOff() { for (const gr of LENS_GROUPS) L().pick[gr.id] = 'off'; L().on = Object.fromEntries(LENS_GROUPS.flatMap(g => g.lenses.map(([id]) => [id, false]))); syncLenses(); }

// Starts whatever search the lenses on now need and the room does not have yet.
function ensure() {
  if (!S.level.start) return;
  const on = onNow(), stamp = JSON.stringify(S.level);
  if ((on.includes('stops') || on.includes('traps')) && (!S.stops || S.stops.stamp !== stamp)) runStops(stamp);
  if (on.some(id => SEARCHED.includes(id)) && (!S.lensData || S.lensData.stamp !== stamp)) {
    // The last finished map stays, to draw the old line dimmed until the new one is ready (register 720).
    if (S.lensData && S.lensData.d) S.lensPrev = { w: JSON.parse(S.lensData.stamp).w, d: S.lensData.d, hist: S.history };
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
  if (lensesHere()) {
    // The line lenses narrow to one tile while you point at it, or after a Look tap holds it (register 752).
    const f = S.ui.tool === 'look' && S.lookTile || S.hover;
    if (f) out.focus = f.y * S.level.w + f.x;
    if (d && colour === 'distance') out.heat = { distance: d.distance, hopeless: S.level.cells.includes('goal') ? d.hopeless : [] };
    if (d && colour === 'beams') out.heat = { tiles: d.beams, colour: INK.zap };
    if (d && colour === 'pieces') out.heat = { tiles: d.pieces, colour: INK.box };
    // What if (755): warm where a change lengthens the answer, cool where it shortens it, the change in moves on it.
    const wi = colour === 'whatif' && ensureWhatIf();
    if (wi) { out.heat = { whatif: wi.map, base: wi.base }; out.deltas = [...wi.map].map(([i, r]) => ({ i, breaks: !r.moves, same: r.same, d: r.moves - (wi.base || 0) })); }
    // A ring where you can stop, a dot where you slide through, coloured by what the shortest wins do there:
    // every one, some, or none (registers 750, 769).
    // With no berry there is no win to measure by, so the marks keep one plain colour.
    const goal = S.level.cells.includes('goal'), use = (m, i) => !goal ? null : (m && m.get(i)) || 'unused';
    if (isOn('stops')) { const list = d ? [...d.stops] : st ? st.list || [...(st.out.stops || [])] : null; if (list) out.rings = list.map(i => ({ i, use: d ? use(d.wins.stop, i) : null })); }
    if (d && isOn('passes')) out.passing = [...d.through].map(i => ({ i, use: use(d.wins.pass, i) }));
    if (isOn('solution')) Object.assign(out, solutionMarks(d));
    if (d && isOn('moves')) out.moves = [...d.moves].map(([k, n]) => { const [a, b] = k.split('>').map(Number); return { a, b, n }; }).filter(m => m.a !== m.b);
    if (d && isOn('danger')) out.crosses = d.danger;
    if (st && st.traps && isOn('traps')) out.frames = new Set(st.traps);
  }
  return out;
}
// What the searches already know about one tile, for the hover line. Nothing is searched for it.
export function tileFacts(i) {
  const st = fresh(S.stops), ld = fresh(S.lensData), d = ld && ld.d, out = [], goal = S.level.cells.includes('goal');
  if (d) {
    if (d.distance.has(i)) out.push(`${d.distance.get(i)} ${d.distance.get(i) === 1 ? 'move' : 'moves'} to win from here`);
    else if (goal && d.hopeless.includes(i)) out.push('no win from here');
    if (d.stops.has(i)) out.push('you can stop here'); else if (d.passes.has(i)) out.push('you only slide through');
    if (d.beams.has(i)) out.push('a laser reaches here');
    if (d.pieces.has(i)) out.push('a piece can be here');
    if (d.danger.has(i)) out.push('a move kills you here');
  } else if (st && st.list && st.list.includes(i)) out.push('you can stop here');
  if (st && st.traps && st.traps.includes(i)) out.push('the goal is out of reach for good from here');
  if (lensesHere() && isOn('whatif')) out.push(...whatIfFact(i));
  // A red-framed tile says why it is framed (register 730): what the design notes found about it.
  const x = i % S.level.w, y = Math.floor(i / S.level.w), u = S.design && S.design.stamp === JSON.stringify(S.level) && S.design.unused.find(e => e.x === x && e.y === y);
  if (u) out.push(u.as === 'wall' ? 'a plain block here would do the same job' : u.as === 'turret' ? 'a fixed turret here would do the same job' : 'taking this out changes nothing');
  return out;
}
// Whether a search the lenses wait on is still running, so the room keeps redrawing.
export const lensBusy = () => onNow().length > 0 && ((fresh(S.stops) && !S.stops.list) || (fresh(S.lensData) && S.lensData.d === undefined) || (isOn('whatif') && whatIfBusy()));

export function lensLine(id) {
  const st = fresh(S.stops), ld = fresh(S.lensData), d = ld ? ld.d : undefined, part = d && d.capped ? ' Partial: the room has more positions than were searched.' : '';
  if (['stops', 'traps'].includes(id) && st && st.why || SEARCHED.includes(id) && d === null) return 'Has real-time pieces, so lenses cannot map it.';
  const wait = 'Working it out...', hasGoal = S.level.cells.includes('goal');
  switch (id) {
    case 'stops': return !d && !(st && st.list) ? wait : `Rings: ${tiles(d ? d.stops.size : st.list.length)} you can stop on${hasGoal ? '; ice if every shortest win stops there, orange if only some do, grey otherwise' : ''}.${part}`;
    case 'passes': return !d ? wait : `Dots: ${tiles(d.through.size)} you slide through${hasGoal ? '; ice if every shortest win passes there, orange if only some do, grey otherwise' : ''}.${part}`;
    case 'moves': return !d ? wait : `Lines: every move from stop to stop, thicker where more positions make it.${part}`;
    case 'danger': return !d ? wait : d.danger.size ? `Frames: ${tiles(d.danger.size)} where a move kills you.${part}` : `Frames: no move kills you.${part}`;
    case 'traps': return !S.level.cells.includes('goal') ? 'Frames: place a berry to find traps.' : st && st.traps ? `Frames: ${tiles(st.traps.length)} where the goal is out of reach for good.` : wait;
    case 'distance': return !d ? wait : !S.level.cells.includes('goal') ? 'Colour: place a berry to see how far each tile is.' : `Colour: green is near the goal, red is far, grey can no longer win.${part}`;
    case 'whatif': return !whatIfTool() ? 'What if: pick a piece, or Erase, to see what each tile would do.' : whatIfBusy() ? 'What if: working it out, tile by tile...' : `What if: warm tiles make the answer longer, cool ones shorter, a red X can't be won; point at one for more.`;
    case 'beams': return !d ? wait : `Colour: red where a laser can ever reach.${part}`;
    case 'pieces': return !d ? wait : `Colour: brown where a box, block or enemy can ever be.${part}`;
    case 'solution': return !d ? wait : d.solution.length ? `Lines: a shortest way, ${d.solution.length - 1} moves, numbered.${part}` : !S.level.cells.includes('goal') ? 'Lines: place a berry to see a way.' : 'Lines: no way to the goal.';
  }
  return '';
}
function legend() {
  const on = onNow();
  $('lensLegend').replaceChildren(...on.map(id => Object.assign(document.createElement('li'), { textContent: lensLine(id) })));
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
      const b = Object.assign(document.createElement('button'), { type: 'button', textContent: label, title: LENS_TIPS[id] });
      b.dataset.lensGroup = gr.id; b.dataset.lens = id;
      b.onclick = () => pickLens(gr.id, id);
      return b;
    }));
    return row;
  }));
  $('lensFollow').onchange = e => { L().follow = e.target.checked; syncLenses(); };
  // The Lenses tab turns them on in place: the header's button is not there in every mode (register 690).
  $('stopsBtn').onclick = $('lensOff').onclick = toggleLenses;
}

// The Solution line: the new answer when ready; until then the last one, dimmed (register 720); and when an
// edit leaves no way to the berry, the last answer cut where the room now stops it (register 722).
function solutionMarks(d) {
  // Only within the same room: another room opened since has its own history.
  const prev = S.lensPrev && S.lensPrev.w === S.level.w && S.lensPrev.hist === S.history ? S.lensPrev.d : null;
  if (d && d.solution.length) return { lines: d.solution };
  if (!prev || !prev.solution.length) return {};
  if (d === null) return {};
  if (d === undefined) return { lines: prev.solution, stale: true };
  return { lines: prev.solution, ...cutOf(S.level, prev.solution) };
}
// Replays an old answer, stop by stop, on the room as it is now: where it first ends somewhere else, the
// line is cut, and the tile past that stop, the one that now stops it, is marked.
export function cutOf(level, path) {
  const w = level.w;
  let s = createGame(level);
  for (let n = 1; n < path.length; n++) {
    const a = path[n - 1], b = path[n], k = DIR_OF(Math.sign(b % w - a % w), Math.sign(Math.floor(b / w) - Math.floor(a / w)));
    const t = k && move(s, k), at = t ? t.player.y * w + t.player.x : a;
    if (at !== b || !t) { const [dx, dy] = k ? [Math.sign(b % w - a % w), Math.sign(Math.floor(b / w) - Math.floor(a / w))] : [0, 0]; return { cutAt: n - 1, stopper: at + dy * w + dx }; }
    s = t;
  }
  return { cutAt: path.length - 1, stopper: null };
}
// One lens on or off by itself (register 721). Lenses that draw the same way share a row, so turning one on
// turns the other off.
export function toggleLens(id) {
  const gr = groupOf(id);
  L().open = true;
  if (MULTI.has(gr.id)) (L().on ||= {})[id] = !isOn(id);
  else L().pick[gr.id] = lensOn(gr.id) === id ? 'off' : id;
  syncLenses();
}
