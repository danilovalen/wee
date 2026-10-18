// The campaign: a main menu at launch, the level list, and building a level's room for the
// robot. Run judges the room (src/campaign/rules.js) and the robot plays a shortest path:
// the failing one when it fails. Progress and each level's room stay in this browser.
// Every level is open while the levels are being made. All copy is draft.
import { LEVELS } from '../level/campaign.js';
import { roomOf, placed, placementErrors, check, ELEMENTS, REQUIREMENTS, nameOf, stepsText, rangeShort, optionalGoals, optionalResults } from '../campaign/rules.js';
import { place, moveAt } from '../editor/edit.js';
import { newHistory } from '../editor/history.js';
import { S, starterLevel } from '../editor/state.js';
import { $, portrait, now } from './dom.js';
import { icon } from './icons.js';

const KEY = 'wee.campaign';
// The editor tool that places each palette element.
export const TOOL = { block: 'wall', box: 'box', button: 'button', door: 'door', toggle: 'toggle' };
// Every level hands you Move, to carry anything placed (the start and goal too) elsewhere.
const ALWAYS = ['move'];
let A = null, boot = null;

export function progress() {
  try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); if (p && p.levels) return p; } catch { /* storage off */ }
  return { last: null, levels: {} };
}
const write = p => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage off or full */ } };
const levelOf = id => LEVELS.find(l => l.id === id);

// Move: carries the thing on one tile to another, when the target can take it and the room
// breaks no rule it kept before. Returns the moved room or null.
export function moveIn(level, from, to) {
  return moveRefusal(level, from, to) ? null : moveAt(level, from, to);
}

// A room saved before rooms lost their border: a 7x7 framed in walls. Its frame was the
// level's, so it is cut off, and the start and goal it had stay where they were.
export function unframe(room) {
  const { w, h } = room, edge = i => { const x = i % w, y = (i - x) / w; return x === 0 || y === 0 || x === w - 1 || y === h - 1; };
  if (w < 3 || h < 3 || !room.cells.every((c, i) => !edge(i) || c === 'wall')) return room;
  const cells = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) cells.push(room.cells[y * w + x]);
  return { ...room, w: w - 2, h: h - 2, cells, start: room.start && { x: room.start.x - 1, y: room.start.y - 1 }, entities: room.entities.map(e => ({ ...e, x: e.x - 1, y: e.y - 1 })) };
}

// Why a tap may not change the room, or null when it may: placing must not break a rule the
// level enforces as you build (a maximum, a second goal, a box on a button). Too few of
// something is fine while building; Run says so.
export function refusal(level, ui, x, y, how) {
  if (!S.camp) return null;
  const def = S.camp.def, before = new Set(placementErrors(def, level).map(e => e.msg)), next = structuredClone(level);
  place(next, ui, x, y, how);
  const e = placementErrors(def, next).find(e => !/^Place at least/.test(e.msg) && !before.has(e.msg));
  return e ? tipOf(e.msg) : null;
}
export const allows = (level, ui, x, y, how) => !refusal(level, ui, x, y, how);
// A refusal said on the tile: the start and goal are never removed, only moved.
const tipOf = msg => msg === 'Place the goal.' ? 'The goal stays. Use Move.' : msg === 'Place the start.' ? 'The start stays. Use Move.' : msg;

// Why Move cannot carry a thing from one tile to another, or null when it can.
export function moveRefusal(level, from, to) {
  const next = moveAt(level, from, to);
  if (!next) return 'Cannot go there.';
  if (!S.camp) return null;
  const before = new Set(placementErrors(S.camp.def, level).map(e => e.msg)), e = placementErrors(S.camp.def, next).find(e => !before.has(e.msg));
  return e ? tipOf(e.msg) : null;
}

// Says why a tap was refused, on the tile, for a moment; the room does not change.
export function refuse(x, y, why) {
  S.fx.push({ type: 'refuse', x, y, at: now() });
  const tip = $('campTip'), c = $('game'), w = $('roomWrap').getBoundingClientRect(), r = c.getBoundingClientRect();
  tip.textContent = why;
  tip.style.left = `${r.left - w.left + (x + 0.5) * r.width / S.level.w}px`;
  tip.style.top = `${r.top - w.top + y * r.height / S.level.h}px`;
  tip.hidden = false;
  clearTimeout(refuse.t); refuse.t = setTimeout(() => { tip.hidden = true; }, 1500);
}

// The tools a level offers: Look, Erase, and its palette.
export const toolsFor = def => ['look', 'erase', ...ALWAYS, ...Object.keys(def.palette).map(el => TOOL[el])];

function save() {
  if (!S.camp) return;
  const p = progress(), rec = p.levels[S.camp.def.id] ||= {};
  rec.room = S.level; p.last = S.camp.def.id;
  write(p);
}

// A row's words, with each object drawn as its palette icon.
function words(parts) {
  const span = document.createElement('span'); span.className = 'words';
  span.append(...parts.flatMap((p, i) => [...(i ? [document.createTextNode(' ')] : []), word(p)]));
  return span;
}
function word(p) {
  if (typeof p === 'string') return document.createTextNode(p);
  const c = icon(p.el === 'start' ? 'start' : TOOL[p.el]), name = p.el === 'start' ? 'Robot' : ELEMENTS[p.el].label;
  c.className = 'campIcon'; c.dataset.part = p.el; c.title = name; c.setAttribute('aria-label', name); c.setAttribute('role', 'img');
  return c;
}

// The level over the room: a goal card with one row per requirement, marked after a run, and
// the optional goals apart. Its height never changes with a verdict; the verdict's words
// float over the room instead.
export function syncBrief() {
  if (!S.camp) return;
  const def = S.camp.def, v = S.camp.verdict;
  const ran = v && v.ok && v.length != null;
  const rows = [{ id: 'steps', parts: [rangeShort(def.steps)], text: stepsText(def.steps), met: ran ? v.inRange : null }];
  if ((def.rules || []).includes('noBoxOnButton'))
    rows.push({ id: 'noBoxOnButton', parts: ['no', { el: 'box' }, 'starts on a', { el: 'button' }], text: 'A box cannot start on a button.', met: v && !v.ok && v.errors.some(e => /box cannot start/.test(e.msg)) ? false : null });
  // A minimum of 2 or more is a goal of its own; a minimum of 1 goes without saying, since a
  // requirement already needs the piece (Run still names one that is missing).
  const { by } = placed(def, S.level);
  for (const [el, [min]] of Object.entries(def.palette)) if (min >= 2)
    rows.push({ id: 'min-' + el, parts: [`${min} or more`, { el }], text: `Place at least ${min} ${nameOf(el, min)}.`, met: v ? by[el].length >= min : null });
  for (const id of def.require || []) rows.push({ id, parts: REQUIREMENTS[id].short, text: REQUIREMENTS[id].text, met: ran && v.reqs ? v.reqs[id] : null });
  const results = ran ? optionalResults(def, v) : [];
  for (const o of optionalGoals(def)) rows.push({ id: o.id, parts: o.parts, text: `Optional: ${o.text}`, met: ran ? results.find(r => r.id === o.id).met : null, optional: true });
  const card = document.createElement('div'); card.className = 'campGoal';
  const head = document.createElement('p'); head.className = 'campHead';
  const last = document.createElement('span'); last.className = 'campLast'; last.id = 'campLast';
  last.textContent = !v ? '' : !v.ok ? 'not ready' : v.won ? `won in ${v.length}` : v.length != null ? `last run: ${v.length} moves` : 'no way through';
  head.append(Object.assign(document.createElement('b'), { textContent: def.name }), last);
  // What a level requires, two to a line; what it only rewards, apart beneath.
  const must = document.createElement('ul'); must.className = 'campReqs campMust';
  const opt = document.createElement('ul'); opt.className = 'campReqs campOpt';
  opt.dataset.label = 'Optional';
  for (const r of rows) {
    const list = r.optional ? opt : must;
    const li = document.createElement('li'); li.dataset.req = r.id; li.title = r.text;
    li.className = (r.optional ? 'optional ' : '') + (r.met === true ? 'met' : r.met === false ? 'unmet' : '');
    const mark = document.createElement('span'); mark.className = 'mark'; mark.textContent = r.met === true ? '✓' : r.met === false ? '✕' : r.optional ? '★' : '';
    li.append(mark, words(r.parts));
    list.append(li);
  }
  card.append(head, must, opt);
  $('campBrief').replaceChildren(card);
  // The verdict's words, over the room.
  const out = $('campVerdict');
  out.hidden = !v;
  if (!v) return;
  out.className = 'campVerdict ' + (v.won ? 'won' : 'lost');
  $('campVerdictText').textContent = !v.ok ? v.errors.map(e => e.msg).join(' ')
    : v.won ? `Made it in ${v.length} moves${v.paths > 1 ? `, on all ${v.paths} shortest paths` : ''}.`
      : v.fail.why + (v.fail.path ? ' Watch the robot.' : '');
  // A run that cannot finish points at the tiles that stop it; tap the words to see them again.
  const points = stuckAt(v).length > 0;
  out.classList.toggle('points', points);
  $('campVerdictText').onclick = points ? () => flashStuck(v) : null;
  $('campVerdictText').title = points ? 'Show the tiles' : '';
}

export function enterLevel(id) {
  const def = levelOf(id);
  if (!def) return false;
  const p = progress(), rec = p.levels[id];
  closeAll();
  S.camp = { def, verdict: null };
  const kept = rec && rec.room && unframe(rec.room);
  S.level = kept && placementErrors(def, kept).every(e => /^(Place at least|Place the )/.test(e.msg)) ? kept : roomOf(def);
  S.history = newHistory();
  S.ui.tool = 'look'; S.ui.colour = 'red';
  p.last = id; write(p);
  document.body.classList.add('campaign');
  syncBrief();
  A.setMode('edit'); A.syncPanel(); A.fit();
  return true;
}

function leaveLevel() {
  save();
  S.camp = null;
  document.body.classList.remove('campaign');
  // The sandbox never inherits a campaign room.
  S.level = starterLevel(portrait()); S.history = newHistory();
  A.setMode('edit');
}

const stuckAt = v => (v && v.ok && !v.won && v.fail.at) || [];
function flashStuck(v) { for (const t of stuckAt(v)) S.fx.push({ type: 'flash', x: t.x, y: t.y, at: now() }); }

// Judges the room, keeps which optional goals a win has met, then the robot plays: the failing path, or
// the first shortest path of a win.
export function run() {
  if (!S.camp) return null;
  const def = S.camp.def, v = check(def, S.level);
  S.camp.verdict = v;
  save();
  if (v.ok && v.won) {
    const p = progress(), rec = p.levels[def.id] ||= {}, goals = rec.goals || {};
    rec.goals = Object.fromEntries(v.optional.map(o => [o.id, !!goals[o.id] || o.met]));
    rec.beaten = true; rec.room = S.level;
    write(p);
  }
  S.camp.ranOn = JSON.stringify(S.level);
  const show = v.ok ? (v.won ? v.path : v.fail.path) : null;
  if (show) { A.setMode('play'); S.demo = [...show]; }
  else flashStuck(v);
  syncBrief();
  return v;
}

function renderList() {
  const p = progress(), list = $('campList');
  list.replaceChildren(...LEVELS.map(def => {
    const rec = p.levels[def.id] || {}, li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.className = 'campRow'; b.dataset.level = def.id;
    const name = document.createElement('b'), small = document.createElement('small');
    name.textContent = def.name;
    small.textContent = rec.beaten ? `Beaten · optional ${Object.values(rec.goals || {}).filter(Boolean).length}/${optionalGoals(def).length}` : `${stepsText(def.steps)}`;
    // The elements the level hands you, as the palette draws them.
    const parts = document.createElement('span'); parts.className = 'campParts';
    for (const el of Object.keys(def.palette)) {
      const c = icon(TOOL[el]); c.dataset.part = el; c.title = ELEMENTS[el].label; c.setAttribute('aria-label', ELEMENTS[el].label);
      parts.append(c);
    }
    b.append(name, parts, small);
    if (def.id === p.last) b.classList.add('sel');
    b.onclick = () => enterLevel(def.id);
    li.append(b);
    return li;
  }));
}

function closeAll() { for (const id of ['menuBox', 'campBox']) if ($(id).open) $(id).close(); }

export function openList() {
  renderList();
  closeAll();
  $('campBox').showModal();
  const sel = $('campList').querySelector('.sel') || $('campList').querySelector('button');
  if (sel) { sel.focus(); sel.scrollIntoView({ block: 'nearest' }); }
}

export function openMenu() { closeAll(); $('menuBox').showModal(); }

// actions: setMode, syncPanel, fit; sandbox(): starts the sandbox (the Rooms list).
export function buildCampaign(actions, sandbox) {
  A = actions; boot = sandbox;
  $('menuCampaign').onclick = openList;
  $('menuSandbox').onclick = () => { closeAll(); boot(); };
  $('campMenu').onclick = openMenu;
  $('campBack').onclick = () => { leaveLevel(); openList(); };
  $('campRun').onclick = run;
  $('campVerdictClose').onclick = () => { $('campVerdict').hidden = true; };
  // The verdict is read once: the next touch anywhere else puts it away; the card keeps the marks.
  addEventListener('pointerdown', ev => { if (!$('campVerdict').hidden && !ev.target.closest('#campVerdict')) $('campVerdict').hidden = true; }, true);
  // A change to the room clears the last verdict and is kept for next time.
  let stamp = '';
  const watch = () => {
    if (!S.camp) return;
    const s = JSON.stringify(S.level);
    if (s === stamp) return;
    stamp = s;
    if (S.camp.ranOn !== s) S.camp.verdict = null;
    save(); syncBrief();
  };
  for (const t of ['pointerup', 'keyup', 'click']) addEventListener(t, () => setTimeout(watch, 0));
  addEventListener('wee:mode', () => { if (S.camp) syncBrief(); });
  addEventListener('pagehide', save);
}
