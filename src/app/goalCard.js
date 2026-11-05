// The goal card over the room: one row per requirement, drawn as words and palette icons, marked
// after a run; a missed row draws a shortest path that misses it; the verdict floats over the room.
import { placed, ELEMENTS, nameOf, stepsText, rangeShort, optionalGoals, optionalResults, pushingsOf, bounds } from '../campaign/rules.js';
import { REQUIREMENTS, trailOf } from '../campaign/requirements.js';
import { shownName } from '../campaign/names.js';
import { glyph } from './glyphs.js';
import { S } from '../editor/state.js';
import { $, now } from './dom.js';
import { icon } from './icons.js';
import { progress } from './progress.js';
import { allOpen } from './unlock.js';
import { builders, sideGoalsOpen } from '../campaign/progression.js';

// The editor tool that places each palette element.
export const TOOL = { spikes: 'death', block: 'wall', box: 'box', button: 'button', door: 'door', toggle: 'toggle', gate: 'gate', laser: 'turret', idoor: 'idoor', relay: 'sensor', berry: 'goal' };
let A = null;
// The campaign's actions (setMode), for drawing a missed path.
export const bindGoalCard = actions => { A = actions; };

// A row's words, each object drawn as its palette icon (framed when the level offers it only pushable); the robot and the goal have their own.
const WORD_ICON = { start: ['robot', 'Blob'], goal: ['goal', 'Berry'], beam: ['beam', 'Laser beam'] };
// The move minimum as a path and "4+" (register 546): while Run's robot plays it counts its moves, and
// turns green once there are enough.
let dotsEl = null;
function dots(n) {
  const d = document.createElement('span'); d.className = 'moveDots'; d.dataset.need = n; d.setAttribute('role', 'img');
  d.innerHTML = glyph('path') + '<b></b>';
  dotsEl = d; fill(d, S.demoRunning && S.game ? S.game.move : S.camp && S.camp.verdict && S.camp.verdict.ok && S.camp.verdict.length != null ? S.camp.verdict.length : 0);
  return d;
}
function fill(d, moved) {
  const n = +d.dataset.need, counting = !!S.demoRunning && moved < n;
  d.querySelector('b').textContent = counting ? String(moved) : `${n}+`;
  d.classList.toggle('counting', counting); d.classList.toggle('reached', !!S.demoRunning && moved >= n);
  d.setAttribute('aria-label', `at least ${n} moves`);
}
export function syncDots(moved) { if (dotsEl && dotsEl.isConnected) fill(dotsEl, moved); }
const MARKS = { end: { glyph: 'flag', say: 'at the end' }, star: { glyph: 'star', say: 'side goals' }, path: { glyph: 'path', say: 'moves' } };
export function words(parts) {
  const span = document.createElement('span'); span.className = 'words';
  span.append(...parts.flatMap((p, i) => [...(i ? [document.createTextNode(' ')] : []), word(p)]));
  return span;
}
function word(p) {
  // A side goal of two conditions joins them with + (register 549).
  if (p === '+') return Object.assign(document.createElement('span'), { className: 'campPlus', textContent: '+' });
  if (typeof p === 'string') return document.createTextNode(p);
  // A drawn mark in place of words: the flag is "at the end" (register 537).
  if (p.dots) return dots(p.dots);
  if (p.mark) { const m = document.createElement('span'); m.className = 'campMark'; m.dataset.mark = p.mark; m.innerHTML = glyph(MARKS[p.mark].glyph); m.title = MARKS[p.mark].say; m.setAttribute('aria-label', MARKS[p.mark].say); m.setAttribute('role', 'img'); return m; }
  const def = S.camp && S.camp.def, crate = !!def && !!def.palette[p.el] && pushingsOf(def, p.el).every(Boolean), [tool, name] = WORD_ICON[p.el] || [TOOL[p.el], (crate ? 'Pushable ' + ELEMENTS[p.el].label.toLowerCase() : ELEMENTS[p.el].label)], c = icon(tool, 'red', null, crate);
  c.className = 'campIcon'; c.dataset.part = p.el; if (crate) c.dataset.crate = ''; c.title = name; c.setAttribute('aria-label', name); c.setAttribute('role', 'img');
  return c;
}

// A challenge's given pieces, one icon each; a placed one fades (register 566).
function piecesToPlace(def, by) {
  const box = document.createElement('div'); box.className = 'campPieces'; box.setAttribute('aria-label', 'Pieces to place');
  // Each kind says how many, 1x included, so "a one-way and a block" reads as one of each (register 761).
  for (const [el, [n]] of Object.entries(def.palette)) {
    const kind = document.createElement('span'); kind.className = 'campKind';
    kind.append(Object.assign(document.createElement('b'), { className: 'campCount', textContent: `${n}×` }));
    for (let i = 0; i < n; i++) { const c = word({ el }); if (i < by[el].length) c.classList.add('used'); kind.append(c); }
    box.append(kind);
  }
  return box;
}

// The level over the room: a goal card with one row per requirement, marked after a run, and
// the optional goals apart. Its height never changes with a verdict; the verdict's words
// float over the room instead.
export function syncBrief() {
  if (!S.camp) return;
  const def = S.camp.def, v = S.camp.verdict;
  // While Run's robot plays, the marks wait and the move dots fill; they land when it stops (plan step 3).
  const ran = v && v.ok && v.length != null && !S.demoRunning;
  // The tutorial teaches one thing, so its card is one order (registers 511, 512).
  // A challenge's only goal is the star, which the big star already says (register 582): its card holds
  // just the pieces to place, which are not a goal (register 566).
  const rows = def.challenge ? [] : def.tutorial ? [{ id: 'star', parts: ['Get the blob to the berry.'], text: 'Get the blob to the berry.', met: ran ? v.won : null }]
    : [{ id: 'steps', parts: [{ dots: bounds(def.steps).min }], text: stepsText(def.steps), met: ran ? v.inRange : null }];
  // A maximum is a goal of its own, so the limit shows while playing (register 299); so is a minimum
  // of 2 or more. A minimum of 1 goes without saying: a requirement already needs the piece.
  const { by } = placed(def, S.level);
  for (const [el, [min, max]] of def.challenge ? [] : Object.entries(def.palette)) {
    if (max !== null && max !== undefined) rows.push({ id: 'max-' + el, parts: [min === max ? `=${max}` : `≤${max}`, { el }], text: min === max ? `Place exactly ${max} ${nameOf(el, max)}.` : `Place at most ${max} ${nameOf(el, max)}.`, met: v ? by[el].length >= min && by[el].length <= max : null });
    else if (min >= 2) rows.push({ id: 'min-' + el, parts: [`≥${min}`, { el }], text: `Place at least ${min} ${nameOf(el, min)}.`, met: v ? by[el].length >= min : null });
  }
  for (const id of def.require || []) rows.push({ id, parts: REQUIREMENTS[id].short, text: REQUIREMENTS[id].text, met: ran && v.reqs ? v.reqs[id] : null });
  const results = ran ? optionalResults(def, v) : [];
  // A side star earned by any earlier room stays filled on a pale chip; the room on screen rings the
  // ones it meets (register 586), so stars read as collected one room at a time.
  const kept = ((progress().levels[def.id] || {}).goals) || {};
  // A builder level's side goals show once it is beaten (register 558).
  const sideShown = allOpen() || !builders().includes(def) || sideGoalsOpen(def.id, progress());
  for (const o of sideShown ? optionalGoals(def) : []) rows.push({ id: o.id, parts: o.parts, text: `Optional: ${o.text}`, met: ran ? results.find(r => r.id === o.id).met : null, optional: true, kept: !!kept[o.id] });
  const card = document.createElement('div'); card.className = 'campGoal';
  const last = $('campLast');
  const tiles = Object.values(placed(def, S.level).by).reduce((n, l) => n + l.length, 0);
  // A win names its tiles too, counted as the stats count them: the start and the goal are not (register 258).
  // Only a win says anything up here, as the level list will: a star holding the tiles placed (label sweep, register 545).
  const said = v && v.ok && v.won ? `won in ${v.length}, ${tiles} ${tiles === 1 ? 'tile' : 'tiles'}` : '';
  last.dataset.said = said; last.title = said; last.setAttribute('aria-label', said);
  last.innerHTML = said && !S.demoRunning ? `${glyph('star')}<b>${tiles}</b>` : '';
  // The level's number sits in the top bar (plan step 4); the card holds only its goals.
  $('campNum').textContent = shownName(def).replace(/^Level /, ''); $('campNum').title = shownName(def);
  // What a level requires, two to a line; what it only rewards, apart beneath.
  // The main star and what it needs, in one gold box; each side goal its own chip with its own small star (register 547).
  const must = document.createElement('ul'); must.className = 'campReqs campMust';
  const opt = document.createElement('ul'); opt.className = 'campReqs campOpt';
  const main = document.createElement('div'); main.className = 'campMain';
  const big = document.createElement('span'); big.className = 'campBigStar' + (ran && v.won ? ' on' : ''); big.innerHTML = glyph('star'); big.setAttribute('role', 'img'); big.setAttribute('aria-label', 'Main star');
  main.append(big, must);
  if (def.challenge) main.append(piecesToPlace(def, by));
  opt.dataset.label = 'Optional goals';
  for (const r of rows) {
    const list = r.optional ? opt : must;
    const li = document.createElement('li'); li.dataset.req = r.id; li.title = r.text;
    li.className = (r.optional ? 'optional ' : '') + (r.kept ? 'kept ' : '') + (r.met === true ? 'met' : r.met === false ? 'unmet' : '');
    // A failed row with a path that missed it: a tap draws that path on the room.
    const missed = v && v.missed && v.missed[r.id];
    if (missed) { li.classList.add('points'); li.title = `${r.text} Tap to see a shortest path that misses it.`; li.onclick = () => showTrail(r, missed); }
    if (S.camp.trailOf === r.id) li.classList.add('shown');
    const mark = document.createElement('span'); mark.className = 'mark'; const k = r.optional ? 'star' : r.met === true ? 'check' : r.met === false ? 'cross' : ''; if (k) mark.innerHTML = glyph(k);
    li.append(mark, words(r.parts));
    list.append(li);
  }
  card.append(main, opt);
  $('campBrief').replaceChildren(card);
  // The verdict's words, over the room.
  const out = $('campVerdict');
  // A message the player put away stays away until the next Run, however often the card redraws.
  out.hidden = !v || S.camp.verdictGone;
  if (!v) return;
  // Shown, not written (plan step 5): a win, a short run (its empty dots pulse) and a missed goal (its
  // cross) need no sentence. A robot that cannot get through keeps its words: the flashing tiles say
  // where, not why. The words stay as the message's text for a screen reader too.
  const shows = v.ok && stuckAt(v).length === 0 && (v.won || v.inRange === false || (v.reqs && Object.values(v.reqs).some(m => m === false)));
  if (shows) out.hidden = true;
  const short = document.querySelector('#campBrief .moveDots'); if (short) short.classList.toggle('short', !!(v.ok && v.inRange === false && !S.demoRunning));
  out.className = 'campVerdict ' + (v.won ? 'won' : 'lost');
  $('campVerdictText').textContent = !v.ok ? v.errors[0].msg
    : v.won ? `Made it in ${v.length} moves${v.paths > 1 ? `, on all ${v.paths} shortest paths` : ''}.`
      : v.fail.why;
  // A run that cannot finish points at the tiles that stop it; tap the words to see them again.
  const points = stuckAt(v).length > 0;
  out.classList.toggle('points', points);
  $('campVerdictText').onclick = points ? () => flashStuck(v) : null;
  $('campVerdictText').title = points ? 'Show the tiles' : '';
}

// Draws on the room one shortest path that missed a goal, and says which goal.
function showTrail(row, path) {
  A.setMode('edit');
  S.trail = trailOf(S.level, path); S.camp.trailOf = row.id; S.camp.verdictGone = false; S.redraw = true;
  syncBrief();
  const out = $('campVerdict');
  out.className = 'campVerdict lost'; out.hidden = false;
  $('campVerdictText').textContent = `Not met: ${row.text.replace(/^Optional: /, '')} This shortest path misses it, ${path.length} moves.`;
  $('campVerdictText').onclick = null;
}
export function clearTrail() { if (S.trail) { S.trail = null; S.redraw = true; } if (S.camp && S.camp.trailOf) { S.camp.trailOf = null; syncBrief(); } }

export const stuckAt = v => (v && v.ok && !v.won && v.fail.at) || [];
export function flashStuck(v) { for (const t of stuckAt(v)) S.fx.push({ type: 'flash', x: t.x, y: t.y, at: now() }); }
