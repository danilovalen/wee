// The campaign: a main menu at launch, the level list, and building a level's room for the
// robot. Run judges the room (src/campaign/rules.js) and the robot plays a shortest path:
// the failing one when it fails. Progress and each level's room stay in this browser.
// Every level is open while the levels are being made. All copy is draft.
import { LEVELS, COSTS } from '../level/campaign.js';
import { roomOf, placed, placementErrors, check, ELEMENTS, REQUIREMENTS, stepsText, bestText, costOf, tilesOf } from '../campaign/rules.js';
import { place } from '../editor/edit.js';
import { newHistory } from '../editor/history.js';
import { S, starterLevel } from '../editor/state.js';
import { $, portrait } from './dom.js';

const KEY = 'wee.campaign';
// The editor tool that places each palette element.
export const TOOL = { block: 'wall', box: 'box', button: 'button', door: 'door', toggle: 'toggle' };
let A = null, boot = null;

export function progress() {
  try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); if (p && p.levels) return p; } catch { /* storage off */ }
  return { last: null, levels: {} };
}
const write = p => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage off or full */ } };
const levelOf = id => LEVELS.find(l => l.id === id);

// Whether a tap may change the room: placing must not break a rule the level enforces as you
// build (locked tiles, the start, a maximum, a box on a button). Too few of something is fine
// while building; Run says so.
export function allows(level, ui, x, y, how) {
  if (!S.camp) return true;
  const def = S.camp.def, before = new Set(placementErrors(def, level).map(e => e.msg)), next = structuredClone(level);
  place(next, ui, x, y, how);
  return placementErrors(def, next).every(e => /at least/.test(e.msg) || before.has(e.msg));
}

// The tools a level offers: Look, Erase, and its palette.
export const toolsFor = def => ['look', 'erase', ...Object.keys(def.palette).map(el => TOOL[el])];

function save() {
  if (!S.camp) return;
  const p = progress(), rec = p.levels[S.camp.def.id] ||= {};
  rec.room = S.level; p.last = S.camp.def.id;
  write(p);
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// A dot on each palette button that costs something, saying how much; none outside a level.
export function syncCostDots() {
  const cost = S.camp ? Object.fromEntries(Object.keys(S.camp.def.palette).map(el => [TOOL[el], COSTS[el]])) : {};
  document.querySelectorAll('[data-tool]').forEach(b => {
    let dot = b.querySelector('.costDot');
    if (cost[b.dataset.tool] == null) { if (dot) dot.remove(); return; }
    if (!dot) b.append(dot = Object.assign(document.createElement('span'), { className: 'costDot' }));
    dot.textContent = cost[b.dataset.tool];
    dot.title = `Costs ${cost[b.dataset.tool]}`;
  });
}

// The level's brief over the room: what to place, what the robot must do, and what it costs.
export function syncBrief() {
  if (!S.camp) return;
  const def = S.camp.def, { by } = placed(def, S.level), v = S.camp.verdict;
  const parts = Object.entries(def.palette).map(([el, [min, max]]) => `${ELEMENTS[el].label} ${by[el].length}/${max}${min ? ` (min ${min})` : ''} · ${COSTS[el]} each`);
  const reqs = [stepsText(def.steps), ...(def.rules || []).includes('noBoxOnButton') ? ['A box cannot start on a button.'] : [], ...(def.require || []).map(id => REQUIREMENTS[id].text)];
  const box = $('campBrief');
  box.replaceChildren();
  const head = document.createElement('p'); head.className = 'campHead';
  head.textContent = `${def.name} · Cost ${costOf(def, S.level, COSTS)} · Tiles ${tilesOf(S.level)}`;
  const pal = document.createElement('p'); pal.className = 'campPal'; pal.textContent = parts.join('  ·  ');
  const list = document.createElement('ul'); list.className = 'campReqs';
  for (const r of reqs) list.append(Object.assign(document.createElement('li'), { textContent: r }));
  const opt = document.createElement('li'); opt.className = 'optional'; opt.textContent = `Optional: ${bestText(def.steps)}`;
  list.append(opt);
  box.append(head, pal, list);
  if (v) {
    const out = document.createElement('p');
    out.className = 'campVerdict ' + (v.won ? 'won' : 'lost');
    out.id = 'campVerdict';
    out.textContent = !v.ok ? v.errors.map(e => e.msg).join(' ')
      : v.won ? `The robot made it in ${plural(v.length, 'move')}${v.paths > 1 ? `, on all ${v.paths} shortest paths` : ''}. Cost ${v.cost} · Tiles ${v.tiles} · Optional ${v.met}/${v.optional.length}.`
        : v.fail.why + (v.fail.path ? ' Watch the robot.' : '');
    box.append(out);
  }
}

export function enterLevel(id) {
  const def = levelOf(id);
  if (!def) return false;
  const p = progress(), rec = p.levels[id];
  closeAll();
  S.camp = { def, verdict: null };
  S.level = rec && rec.room && placementErrors(def, rec.room).every(e => /at least/.test(e.msg)) ? rec.room : roomOf(def);
  S.history = newHistory();
  S.ui.tool = 'look'; S.ui.colour = 'red';
  p.last = id; write(p);
  document.body.classList.add('campaign');
  A.setMode('edit'); A.syncPanel(); A.fit();
  syncBrief();
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

// Judges the room, keeps the best scores of a win, then the robot plays: the failing path, or
// the first shortest path of a win.
export function run() {
  if (!S.camp) return null;
  const def = S.camp.def, v = check(def, S.level, COSTS);
  S.camp.verdict = v;
  save();
  if (v.ok && v.won) {
    const p = progress(), rec = p.levels[def.id] ||= {}, best = rec.best || {};
    rec.best = { cost: Math.min(best.cost ?? Infinity, v.cost), tiles: Math.min(best.tiles ?? Infinity, v.tiles), met: Math.max(best.met ?? 0, v.met) };
    rec.beaten = true; rec.room = S.level;
    write(p);
  }
  S.camp.ranOn = JSON.stringify(S.level);
  const show = v.ok ? (v.won ? v.path : v.fail.path) : null;
  if (show) { A.setMode('play'); S.demo = [...show]; }
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
    small.textContent = rec.beaten ? `Beaten · best cost ${rec.best.cost} · tiles ${rec.best.tiles} · optional ${rec.best.met}` : `${stepsText(def.steps)}`;
    b.append(name, small);
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
