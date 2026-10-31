// The goal card over the room: one row per requirement, drawn as words and palette icons, marked
// after a run; a missed row draws a shortest path that misses it; the verdict floats over the room.
import { placed, ELEMENTS, nameOf, stepsText, rangeShort, optionalGoals, optionalResults, pushingsOf, bounds } from '../campaign/rules.js';
import { REQUIREMENTS, trailOf } from '../campaign/requirements.js';
import { shownName } from '../campaign/names.js';
import { glyph } from './glyphs.js';
import { S } from '../editor/state.js';
import { $, now } from './dom.js';
import { icon } from './icons.js';

// The editor tool that places each palette element.
export const TOOL = { spikes: 'death', block: 'wall', box: 'box', button: 'button', door: 'door', toggle: 'toggle', gate: 'gate', laser: 'turret', idoor: 'idoor', relay: 'sensor' };
let A = null;
// The campaign's actions (setMode), for drawing a missed path.
export const bindGoalCard = actions => { A = actions; };

// A row's words, each object drawn as its palette icon (framed when the level offers it only pushable); the robot and the goal have their own.
const WORD_ICON = { start: ['robot', 'Robot'], goal: ['goal', 'Goal'] };
// The move minimum as dots, one per move, filled as the robot moves; moves past it add smaller dots.
let dotsEl = null;
function dots(n) {
  const d = document.createElement('span'); d.className = 'moveDots'; d.dataset.need = n; d.setAttribute('role', 'img');
  dotsEl = d; fill(d, S.demoRunning && S.game ? S.game.move : S.camp && S.camp.verdict && S.camp.verdict.ok && S.camp.verdict.length != null ? S.camp.verdict.length : 0);
  return d;
}
function fill(d, moved) {
  const n = +d.dataset.need, all = Math.min(Math.max(n, moved), 12), have = d.children.length;
  d.setAttribute('aria-label', `${moved} of at least ${n} moves`);
  for (let i = have; i < all; i++) { const s = document.createElement('i'); if (i >= n) s.className = 'extra'; d.append(s); }
  for (let i = all; i < have; i++) d.lastChild.remove();
  [...d.children].forEach((s, i) => s.classList.toggle('on', i < moved));
}
export function syncDots(moved) { if (dotsEl && dotsEl.isConnected) fill(dotsEl, moved); }
const MARKS = { end: { glyph: 'flag', say: 'at the end' } };
export function words(parts) {
  const span = document.createElement('span'); span.className = 'words';
  span.append(...parts.flatMap((p, i) => [...(i ? [document.createTextNode(' ')] : []), word(p)]));
  return span;
}
function word(p) {
  if (typeof p === 'string') return document.createTextNode(p);
  // A drawn mark in place of words: the flag is "at the end" (register 537).
  if (p.dots) return dots(p.dots);
  if (p.mark) { const m = document.createElement('span'); m.className = 'campMark'; m.dataset.mark = p.mark; m.innerHTML = glyph(MARKS[p.mark].glyph); m.title = MARKS[p.mark].say; m.setAttribute('aria-label', MARKS[p.mark].say); m.setAttribute('role', 'img'); return m; }
  const def = S.camp && S.camp.def, crate = !!def && !!def.palette[p.el] && pushingsOf(def, p.el).every(Boolean), [tool, name] = WORD_ICON[p.el] || [TOOL[p.el], (crate ? 'Pushable ' + ELEMENTS[p.el].label.toLowerCase() : ELEMENTS[p.el].label)], c = icon(tool, 'red', null, crate);
  c.className = 'campIcon'; c.dataset.part = p.el; if (crate) c.dataset.crate = ''; c.title = name; c.setAttribute('aria-label', name); c.setAttribute('role', 'img');
  return c;
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
  const rows = def.tutorial ? [{ id: 'star', parts: ['Get the robot to the star.'], text: 'Get the robot to the star.', met: ran ? v.won : null }]
    : [{ id: 'steps', parts: [{ dots: bounds(def.steps).min }, 'moves'], text: stepsText(def.steps), met: ran ? v.inRange : null }];
  // A maximum is a goal of its own, so the limit shows while playing (register 299); so is a minimum
  // of 2 or more. A minimum of 1 goes without saying: a requirement already needs the piece.
  const { by } = placed(def, S.level);
  for (const [el, [min, max]] of Object.entries(def.palette)) {
    if (max !== null && max !== undefined) rows.push({ id: 'max-' + el, parts: [min === max ? `=${max}` : `≤${max}`, { el }], text: min === max ? `Place exactly ${max} ${nameOf(el, max)}.` : `Place at most ${max} ${nameOf(el, max)}.`, met: v ? by[el].length >= min && by[el].length <= max : null });
    else if (min >= 2) rows.push({ id: 'min-' + el, parts: [`≥${min}`, { el }], text: `Place at least ${min} ${nameOf(el, min)}.`, met: v ? by[el].length >= min : null });
  }
  for (const id of def.require || []) rows.push({ id, parts: REQUIREMENTS[id].short, text: REQUIREMENTS[id].text, met: ran && v.reqs ? v.reqs[id] : null });
  const results = ran ? optionalResults(def, v) : [];
  for (const o of optionalGoals(def)) rows.push({ id: o.id, parts: o.parts, text: `Optional: ${o.text}`, met: ran ? results.find(r => r.id === o.id).met : null, optional: true });
  const card = document.createElement('div'); card.className = 'campGoal';
  const last = $('campLast');
  const tiles = Object.values(placed(def, S.level).by).reduce((n, l) => n + l.length, 0);
  // A win names its tiles too, counted as the stats count them: the start and the goal are not (register 258).
  last.textContent = !v ? '' : !v.ok ? 'not ready' : v.won ? `won in ${v.length}, ${tiles} ${tiles === 1 ? 'tile' : 'tiles'}` : v.length != null ? `last run: ${v.length} moves` : 'no way through';
  // The level's number sits in the top bar (plan step 4); the card holds only its goals.
  $('campNum').textContent = shownName(def).replace(/^Level /, ''); $('campNum').title = shownName(def);
  // What a level requires, two to a line; what it only rewards, apart beneath.
  const must = document.createElement('ul'); must.className = 'campReqs campMust';
  const opt = document.createElement('ul'); opt.className = 'campReqs campOpt';
  opt.dataset.label = 'Optional goals';
  for (const r of rows) {
    const list = r.optional ? opt : must;
    const li = document.createElement('li'); li.dataset.req = r.id; li.title = r.text;
    li.className = (r.optional ? 'optional ' : '') + (r.met === true ? 'met' : r.met === false ? 'unmet' : '');
    // A failed row with a path that missed it: a tap draws that path on the room.
    const missed = v && v.missed && v.missed[r.id];
    if (missed) { li.classList.add('points'); li.title = `${r.text} Tap to see a shortest path that misses it.`; li.onclick = () => showTrail(r, missed); }
    if (S.camp.trailOf === r.id) li.classList.add('shown');
    const mark = document.createElement('span'); mark.className = 'mark'; const k = r.met === true ? 'check' : r.met === false ? 'cross' : r.optional ? 'star' : ''; if (k) mark.innerHTML = glyph(k);
    li.append(mark, words(r.parts));
    list.append(li);
  }
  card.append(must, opt);
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
