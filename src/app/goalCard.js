// The goal card over the room: one row per requirement, drawn as words and palette icons, marked
// after a run; a missed row draws a shortest path that misses it; the verdict floats over the room.
import { placed, ELEMENTS, nameOf, stepsText, rangeShort, optionalGoals, optionalResults, pushingsOf } from '../campaign/rules.js';
import { REQUIREMENTS, trailOf } from '../campaign/requirements.js';
import { shownName } from '../campaign/names.js';
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
export function words(parts) {
  const span = document.createElement('span'); span.className = 'words';
  span.append(...parts.flatMap((p, i) => [...(i ? [document.createTextNode(' ')] : []), word(p)]));
  return span;
}
function word(p) {
  if (typeof p === 'string') return document.createTextNode(p);
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
  const ran = v && v.ok && v.length != null;
  // The tutorial teaches one thing, so its card is one order (registers 511, 512).
  const rows = def.tutorial ? [{ id: 'star', parts: ['Get the robot to the star.'], text: 'Get the robot to the star.', met: ran ? v.won : null }]
    : [{ id: 'steps', parts: [rangeShort(def.steps)], text: stepsText(def.steps), met: ran ? v.inRange : null }];
  // A maximum is a goal of its own, so the limit shows while playing (register 299); so is a minimum
  // of 2 or more. A minimum of 1 goes without saying: a requirement already needs the piece.
  const { by } = placed(def, S.level);
  for (const [el, [min, max]] of Object.entries(def.palette)) {
    if (max !== null && max !== undefined) rows.push({ id: 'max-' + el, parts: [min === max ? `exactly ${max}` : `at most ${max}`, { el }], text: min === max ? `Place exactly ${max} ${nameOf(el, max)}.` : `Place at most ${max} ${nameOf(el, max)}.`, met: v ? by[el].length >= min && by[el].length <= max : null });
    else if (min >= 2) rows.push({ id: 'min-' + el, parts: [`${min} or more`, { el }], text: `Place at least ${min} ${nameOf(el, min)}.`, met: v ? by[el].length >= min : null });
  }
  for (const id of def.require || []) rows.push({ id, parts: REQUIREMENTS[id].short, text: REQUIREMENTS[id].text, met: ran && v.reqs ? v.reqs[id] : null });
  const results = ran ? optionalResults(def, v) : [];
  for (const o of optionalGoals(def)) rows.push({ id: o.id, parts: o.parts, text: `Optional: ${o.text}`, met: ran ? results.find(r => r.id === o.id).met : null, optional: true });
  const card = document.createElement('div'); card.className = 'campGoal';
  const head = document.createElement('p'); head.className = 'campHead';
  const last = document.createElement('span'); last.className = 'campLast'; last.id = 'campLast';
  const tiles = Object.values(placed(def, S.level).by).reduce((n, l) => n + l.length, 0);
  // A win names its tiles too, counted as the stats count them: the start and the goal are not (register 258).
  last.textContent = !v ? '' : !v.ok ? 'not ready' : v.won ? `won in ${v.length}, ${tiles} ${tiles === 1 ? 'tile' : 'tiles'}` : v.length != null ? `last run: ${v.length} moves` : 'no way through';
  head.append(Object.assign(document.createElement('b'), { textContent: shownName(def) }), last);
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
    const mark = document.createElement('span'); mark.className = 'mark'; mark.textContent = r.met === true ? '✓' : r.met === false ? '✕' : r.optional ? '★' : '';
    li.append(mark, words(r.parts));
    list.append(li);
  }
  const label = Object.assign(document.createElement('p'), { className: 'campLabel', textContent: 'Goals' });
  card.append(head, label, must, opt);
  $('campBrief').replaceChildren(card);
  // The verdict's words, over the room.
  const out = $('campVerdict');
  // A message the player put away stays away until the next Run, however often the card redraws.
  out.hidden = !v || S.camp.verdictGone;
  if (!v) return;
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
