// The campaign: a main menu at launch, the level list, and building a level's room for the
// robot. Run judges the room (src/campaign/rules.js) and the robot plays a shortest path:
// the failing one when it fails. Progress and each level's room stay in this browser.
// Every level is open while the levels are being made. All copy is draft.
import { LEVELS } from '../level/campaign.js';
import { roomOf, coloursOf, placed, placementErrors, check, ELEMENTS, nameOf, stepsText, rangeShort, optionalGoals, optionalResults } from '../campaign/rules.js';
import { REQUIREMENTS, trailOf } from '../campaign/requirements.js';
import { newHistory } from '../editor/history.js';
import { S, starterLevel } from '../editor/state.js';
import { $, portrait, now } from './dom.js';
import { icon } from './icons.js';
import { noteLeaving, copyDebug } from './debug.js';
import { buildMenuScene } from './menuScene.js';

const KEY = 'wee.campaign';
// The editor tool that places each palette element.
export const TOOL = { block: 'wall', box: 'box', button: 'button', door: 'door', toggle: 'toggle', gate: 'gate', laser: 'turret' };
// Every level hands you Move, to carry anything placed (the start and goal too) elsewhere.
const ALWAYS = ['move'];
let A = null, boot = null, fitScene = null;

export function progress() {
  try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); if (p && p.levels) return migrate(p); } catch { /* storage off */ }
  return { last: null, levels: {}, v: 4 };
}
// v2 (register 226): level 8 became level 7, so its saved room and stats move with it; the old
// level 7's go, and the new level 8 starts empty. v3 (register 243, one day): a two-colour level 7
// moved 7-10 up one. v4 (register 246): that level is 11, so a v3 save's 8-11 go back to 7-10 and
// its 7 becomes 11; earlier saves already number 7-10 that way.
export function migrate(p) {
  const v = p.v || 1;
  if (v >= 4) return p;
  if (v < 2) {
    const old8 = p.levels['8'];
    delete p.levels['7']; delete p.levels['8'];
    if (old8) p.levels['7'] = old8;
    if (p.last === '8') p.last = '7'; else if (p.last === '7') p.last = null;
  }
  if (v === 3) {
    const at = n => p.levels[n], was = { 7: at(7), 8: at(8), 9: at(9), 10: at(10), 11: at(11) };
    for (const n of [7, 8, 9, 10, 11]) delete p.levels[n];
    for (const n of [8, 9, 10, 11]) if (was[n]) p.levels[n - 1] = was[n];
    if (was[7]) p.levels[11] = was[7];
    const l = +p.last;
    if (l === 7) p.last = '11'; else if (l >= 8 && l <= 11) p.last = String(l - 1);
  }
  p.v = 4; write(p);
  return p;
}
const write = p => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage off or full */ } };
const levelOf = id => LEVELS.find(l => l.id === id);

// A room saved before rooms lost their border: a 7x7 framed in walls. Its frame was the
// level's, so it is cut off, and the start and goal it had stay where they were.
export function unframe(room) {
  const { w, h } = room, edge = i => { const x = i % w, y = (i - x) / w; return x === 0 || y === 0 || x === w - 1 || y === h - 1; };
  if (w < 3 || h < 3 || !room.cells.every((c, i) => !edge(i) || c === 'wall')) return room;
  const cells = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) cells.push(room.cells[y * w + x]);
  return { ...room, w: w - 2, h: h - 2, cells, start: room.start && { x: room.start.x - 1, y: room.start.y - 1 }, entities: room.entities.map(e => ({ ...e, x: e.x - 1, y: e.y - 1 })) };
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
  head.append(Object.assign(document.createElement('b'), { textContent: def.name }), last);
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
  $('campVerdictText').textContent = !v.ok ? v.errors.map(e => e.msg).join(' ')
    : v.won ? `Made it in ${v.length} moves${v.paths > 1 ? `, on all ${v.paths} shortest paths` : ''}.`
      : v.fail.why + (v.fail.path ? ' Watch the robot.' : '');
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
function clearTrail() { if (S.trail) { S.trail = null; S.redraw = true; } if (S.camp && S.camp.trailOf) { S.camp.trailOf = null; syncBrief(); } }

export function enterLevel(id) {
  const def = levelOf(id);
  if (!def) return false;
  const p = progress(), rec = p.levels[id];
  closeAll();
  S.camp = { def, verdict: null }; S.trail = null;
  const kept = rec && rec.room && unframe(rec.room);
  // A saved room is kept even if a later rule refuses part of it: Run says what, nothing is lost.
  S.level = kept && placementErrors(def, kept).every(e => /^(Place at least|Place the |Nothing can start)/.test(e.msg)) ? kept : roomOf(def);
  S.history = newHistory();
  S.ui.tool = 'look'; S.ui.colour = coloursOf(def)[0];
  p.last = id; write(p);
  document.body.classList.add('campaign');
  syncBrief();
  A.setMode('edit'); A.syncPanel(); A.fit();
  return true;
}

function leaveLevel() {
  save();
  S.camp = null; S.trail = null;
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
  S.camp.verdictGone = false;
  S.camp.verdict = v;
  save();
  if (v.ok && v.won) {
    const p = progress(), rec = p.levels[def.id] ||= {}, goals = rec.goals || {};
    rec.goals = Object.fromEntries(v.optional.map(o => [o.id, !!goals[o.id] || o.met]));
    // Statistics to compare with other players: every win's moves, and per room area the tiles
    // placed (the start and the goal not counted). Fewest and most of each.
    const st = rec.stats ||= { moves: null, tiles: {} }, span = (r, n) => r ? [Math.min(r[0], n), Math.max(r[1], n)] : [n, n];
    const tiles = Object.values(placed(def, S.level).by).reduce((n, l) => n + l.length, 0);
    st.moves = span(st.moves, v.length); st.tiles[v.area] = span(st.tiles[v.area], tiles);
    rec.beaten = true; rec.room = S.level;
    write(p);
  }
  S.camp.ranOn = JSON.stringify(S.level);
  const show = v.ok ? (v.won ? v.path : v.fail.path) : null;
  if (show) { A.setMode('play'); S.demo = [...show]; S.demoRunning = true; }
  else flashStuck(v);
  syncBrief();
  return v;
}

// A beaten level's statistics, short: moves fewest to most, and tiles at the smallest area won.
const range = ([a, b]) => a === b ? `${a}` : `${a}–${b}`;
function statsText(st) {
  if (!st || !st.moves) return '';
  const area = Math.min(...Object.keys(st.tiles).map(Number));
  return `, moves ${range(st.moves)}, tiles ${range(st.tiles[area])} at area ${area}`;
}

function renderList() {
  const p = progress(), list = $('campList');
  list.replaceChildren(...LEVELS.map(def => {
    const rec = p.levels[def.id] || {}, li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.className = 'campRow'; b.dataset.level = def.id;
    const name = document.createElement('b'), small = document.createElement('small');
    name.textContent = def.name;
    small.textContent = rec.beaten ? `Beaten, optional ${Object.values(rec.goals || {}).filter(Boolean).length}/${optionalGoals(def).length}${statsText(rec.stats)}` : '';
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

export function openMenu() { closeAll(); $('menuBox').showModal(); fitScene?.(); }

// actions: setMode, syncPanel, fit; sandbox(): starts the sandbox (the Rooms list).
export function buildCampaign(actions, sandbox) {
  A = actions; boot = sandbox;
  fitScene = buildMenuScene($('menuScene'));
  $('menuCampaign').onclick = openList;
  $('menuSandbox').onclick = () => { closeAll(); boot(); };
  $('campMenu').onclick = openMenu;
  $('campBack').onclick = () => { noteLeaving(); leaveLevel(); openList(); };
  $('menuDebug').onclick = copyDebug;
  $('campRun').onclick = () => { S.camp.testing = false; run(); };
  // Test: the room played by hand, the robot not involved; nothing is judged or saved.
  $('campTest').onclick = () => { if (!S.camp) return; clearTrail(); $('campVerdict').hidden = true; S.camp.verdictGone = true; S.camp.testing = true; A.setMode('play'); };
  // After a Run the robot has shown its path: back to editing, so a tap on the room places again.
  addEventListener('wee:demoDone', () => setTimeout(() => { if (S.camp && !S.camp.testing && S.mode === 'play') A.setMode('edit'); }, 900));
  addEventListener('wee:win', ev => {
    if (!S.camp || !S.camp.testing) return;
    const out = $('campVerdict');
    out.className = 'campVerdict won'; out.hidden = false;
    $('campVerdictText').textContent = `You reached the goal in ${ev.detail.moves} ${ev.detail.moves === 1 ? 'move' : 'moves'}. A test does not count: Run judges the room.`;
    $('campVerdictText').onclick = null;
  });
  // The verdict is read once: the next touch anywhere else blanks it (its band keeps its place); the card keeps the marks.
  addEventListener('pointerdown', ev => {
    if (ev.target.closest('#campVerdict, .campReqs li.points')) return;
    $('campVerdict').hidden = true; if (S.camp) S.camp.verdictGone = true;
    clearTrail();
  }, true);
  // A change to the room clears the last verdict and is kept for next time.
  let stamp = '';
  const watch = () => {
    if (!S.camp) return;
    const s = JSON.stringify(S.level);
    if (s === stamp) return;
    stamp = s;
    if (S.camp.ranOn !== s) { S.camp.verdict = null; S.trail = null; S.camp.trailOf = null; }
    save(); syncBrief();
  };
  for (const t of ['pointerup', 'keyup', 'click']) addEventListener(t, () => setTimeout(watch, 0));
  addEventListener('wee:mode', () => { if (S.camp) { if (S.mode !== 'play') S.camp.testing = false; syncBrief(); } });
  addEventListener('pagehide', save);
}
