// The campaign: a main menu at launch, the level list, and building a level's room for the
// robot. Run checks the room (src/campaign/rules.js) and the robot plays a shortest path:
// the failing one when it fails. Progress and each level's room stay in this browser.
// Every level is open while the levels are being made. All copy is draft.
import { LEVELS } from '../level/campaign.js';
import { CHALLENGES } from '../level/challenges.js';
import { unlocked, allOpen } from './unlock.js';
import { plan, builders, isOpen, sideGoalsOpen, listOrder } from '../campaign/progression.js';
import { roomOf, coloursOf, placementErrors, check, optionalGoals, listed, placed } from '../campaign/rules.js';
import { markUsed } from './known.js';
import { featsOf, record } from '../campaign/feats.js';
import { nearMiss } from '../solve/nearMiss.js';
import { doneIds, noteEarned } from './achieve.js';
import { newHistory } from '../editor/history.js';
import { S, starterLevel } from '../editor/state.js';
import { $, portrait, now } from './dom.js';
import { levelParts } from './levelParts.js';
import { iconOn, glyph } from './glyphs.js';
import { shownName, challengeName } from '../campaign/names.js';
import { noteWin, bindWin } from './winCard.js';
import { noteLeaving, copyDebug } from './debug.js';
import { buildMenuScene } from './menuScene.js';
import { buildLogo } from './logo.js';
import { forgetRun } from './replay.js';
import { madeLevel } from './made.js';
import { progress, write, firstTime } from './progress.js';
import { postScore, tick } from './board.js';
import { slotNow } from './slots.js';
import { globalScore, levelStars } from '../campaign/score.js';
import { TOOL, words, syncBrief, clearTrail, flashStuck, bindGoalCard } from './goalCard.js';
import { place, go, back, up } from './nav.js';
import { puzzleRow } from './puzzles.js';

// Every level hands you Move, to carry anything placed (the start and goal too) elsewhere.
const ALWAYS = ['move'];
let A = null, fitScene = null;

// A challenge saved before it was rebuilt keeps nothing: its fixed tiles must still be the level's.
const sameFixed = (def, room) => {
  if (!def.challenge) return true;
  const r = def.room, open = new Set(def.challenge.open.map(([x, y]) => y * r.w + x)), key = (l, i) => l.cells[i] + '|' + l.entities.filter(e => e.y * l.w + e.x === i).map(e => e.kind + (e.turret ? e.turret.dirs : '')).join();
  return room.w === r.w && room.h === r.h && r.cells.every((c, i) => open.has(i) || key(r, i) === key(room, i)) && (!r.start || (room.start && room.start.x === r.start.x && room.start.y === r.start.y));
};
const levelOf = id => LEVELS.find(l => l.id === id) || CHALLENGES.find(l => l.id === id) || madeLevel(id);

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


export function enterLevel(id) {
  const def = levelOf(id);
  if (!def) return false;
  const p = progress(), rec = p.levels[id];
  S.camp = { def, verdict: null, tick: Date.now() }; S.trail = null; S.stains = []; forgetRun(); iconOn($('campBack'), 'levels', def.made ? 'Maker' : 'Levels');
  const kept = rec && rec.room && unframe(rec.room);
  // A saved room is kept even if a later rule refuses part of it: Run says what, nothing is lost.
  // The tutorial always starts from its own room (register 512).
  S.level = !def.tutorial && kept && sameFixed(def, kept) && placementErrors(def, kept).every(e => /^(Place at least|Place the |Nothing can start)/.test(e.msg)) ? kept : roomOf(def);
  S.history = newHistory();
  S.ui.tool = 'look'; S.ui.colour = coloursOf(def)[0];
  p.last = id; write(p);
  document.body.classList.add('campaign'); document.body.classList.remove('simple'); S.simple = false;
  document.body.classList.toggle('challenge', !!def.challenge);
  document.body.classList.toggle('removal', !!(def.challenge && def.challenge.remove));
  // In a level, undo, redo and Reset sit with the tools, so the top bar keeps only Levels, Run and Test (plan step 2).
  $('campTop').prepend(Object.assign($('campHistory') || document.createElement('span'), { id: 'campHistory', className: 'campHistory' }));
  $('campHistory').dataset.join = '';
  $('campHistory').append($('undo'), $('redo'), $('campReset'));
  syncBrief();
  A.setMode('edit'); A.syncPanel(); A.fit();
  return true;
}

function leaveLevel() {
  save();
  S.camp = null; S.trail = null; S.stains = [];
  // A level's goals leave with it (register 667).
  $('campBrief').replaceChildren(); $('campVerdict').hidden = true; forgetRun();
  document.body.classList.remove('campaign', 'challenge', 'removal');
  $('campTest').after($('undo'), $('redo'), $('campReset'));
  // The sandbox never inherits a campaign room.
  S.level = starterLevel(portrait()); S.history = newHistory();
  A.setMode('edit');
}


// Judges the room, keeps which optional goals a win has met, then the robot plays: the failing path, or
// the first shortest path of a win.
export function run() {
  if (!S.camp) return null;
  const def = S.camp.def, v = check(def, S.level);
  S.camp.verdictGone = false;
  S.camp.verdict = v;
  save();
  const was = doneIds();
  if (v.ok && v.won) {
    const p = progress(), rec = p.levels[def.id] ||= {}, goals = rec.goals || {}, before = { beaten: !!rec.beaten, goals: { ...goals } };
    rec.goals = Object.fromEntries(v.optional.map(o => [o.id, !!goals[o.id] || o.met]));
    // Statistics to compare with other players: every win's moves and tiles placed (the start and
    // the goal not counted), fewest and most of each. A save that kept tiles per area starts over.
    const st = rec.stats ||= { moves: null, tiles: null }, span = (r, n) => r ? [Math.min(r[0], n), Math.max(r[1], n)] : [n, n];
    st.moves = span(st.moves, v.length); st.tiles = span(Array.isArray(st.tiles) ? st.tiles : null, v.tiles);
    // The score is tiles (register 328): the fewest in any win, and the fewest in a win meeting each optional goal.
    const best = rec.best ||= {}, low = (k, n) => { best[k] = best[k] == null ? n : Math.min(best[k], n); };
    low('win', v.tiles);
    for (const o of v.optional) if (o.met) low(o.id, v.tiles);
    rec.beaten = true; rec.room = S.level;
    // When each star was first earned and the time in levels, for a later speedrun (register 839).
    const when = Date.now(), at = rec.at ||= {};
    for (const id of ['win', ...v.optional.filter(o => o.met).map(o => o.id)]) at[id] ??= when;
    S.camp.tick = tick(p, S.camp.tick, when);
    write(p); postScore(p, slotNow());
    // Beating a level opens its pieces in the Sandbox's editor (registers 558, 626): the ones it offers and the ones in the room.
    markUsed([...new Set([...Object.keys(def.palette || {}), ...Object.entries(placed(def, S.level).by).filter(([, l]) => l.length).map(([el]) => el)])].map(el => TOOL[el]).filter(Boolean));
    noteWin(def, before, rec, v, words);
  }
  // What this Run did toward the achievements (registers 629-639): a level's own Run only, never the tutorial.
  if (!def.tutorial && v.ok) {
    const p = progress();
    write(record(p, def, featsOf(def, S.level, v, p.feats || {})));
  }
  noteEarned(was);
  S.camp.ranOn = JSON.stringify(S.level);
  let show = v.ok ? (v.won ? v.path : v.fail.path) : null;
  // A room the blob cannot win: it still tries, playing the attempt that ends nearest the berry, and fails
  // there (register 642); the tiles that stop it flash once it has.
  const near = !show && v.ok && !v.won ? nearMiss(S.level) : null;
  S.camp.near = near && near.path.length ? near : null;
  if (S.camp.near) show = near.path;
  if (show) { A.setMode('play'); S.demo = [...show]; S.demoRunning = true; }
  else flashStuck(v);
  syncBrief();
  return v;
}


// A level's stars (register 475): the main goal, a line, one per side goal. A met goal's star is
// filled and holds the fewest tiles placed in a win that met it.
function star(n, main, label, points) {
  const el = document.createElement('span'), on = n != null;
  el.className = 'campStar' + (main ? ' main' : '') + (on ? ' on' : '');
  el.innerHTML = glyph('star') + (on ? `<i>${n}</i>` : '');
  el.title = points ? `${label.replace(/\.$/, '')}, ${points} points.` : label;
  return el;
}
// sideOpen: the level's side goals are open, so their stars say what they are (register 558); shut, each
// is an empty star with no words, so the plan still shows how many there are (register 625).
function stars(def, rec, sideOpen = true) {
  const row = document.createElement('span'), best = rec.best || {}, line = document.createElement('span');
  row.className = 'campStars'; line.className = 'campStarLine';
  const met = id => rec.goals && rec.goals[id] ? best[id] ?? best.win ?? '' : null;
  const side = optionalGoals(def), pts = Object.fromEntries(levelStars(def, rec).map(x => [x.id, x.points]));
  row.append(star(rec.beaten ? best.win ?? '' : null, true, 'Win', pts.win), ...(side.length ? [line] : []), ...side.map(o => star(sideOpen ? met(o.id) : null, false, sideOpen ? o.text : 'Side goal', sideOpen && pts[o.id])));
  row.setAttribute('aria-label', rec.beaten ? `Beaten, ${Object.values(rec.goals || {}).filter(Boolean).length} of ${optionalGoals(def).length} side goals` : 'Not beaten');
  return row;
}

// The floor plan (registers 558, 609-611): the builder levels down a corridor, each with the side
// room it opens beside it; a room shuts until the level that opens it is beaten.
function room(def, p, kind) {
  if (def.puzzle) return puzzleRow(def, p.levels[def.id] || {}, allOpen() || isOpen(def.id, p), kind);
  const rec = p.levels[def.id] || {}, li = document.createElement('li'), b = document.createElement('button'), open = allOpen() || isOpen(def.id, p);
  li.className = kind; b.type = 'button'; b.className = 'campRow'; b.dataset.level = def.id; b.disabled = !open; b.classList.toggle('locked', !open);
  const name = document.createElement('b');
  name.textContent = def.challenge ? challengeName(def) : shownName(def).replace(/^Level /, ''); name.setAttribute('aria-label', shownName(def));
  // The number and its pieces share one line (register 527).
  const top = document.createElement('span'); top.className = 'campRowHead'; top.append(name, levelParts(def, TOOL));
  const shut = document.createElement('span'); shut.className = 'campShut'; shut.innerHTML = glyph('lock');
  b.append(top, open ? stars(def, rec, allOpen() || !builders().includes(def) || sideGoalsOpen(def.id, p)) : shut);
  if (def.id === p.last) b.classList.add('sel');
  b.onclick = () => go('level', def.id);
  li.append(b);
  return li;
}
// A challenge slot holds its two challenges side by side, each half as wide (register 786).
function pair(li, twin) {
  if (!twin) return li;
  li.classList.add('pair'); li.append(...twin.childNodes);
  return li;
}
// Unlocked for the session, the levels off the plan join it in number order; a hidden one never shows (731).
function renderList() {
  const p = progress(), rows = [], extras = unlocked() ? LEVELS.filter(d => !d.tutorial && !d.hidden && !listed(d)) : [];
  for (const { def, side, twin } of listOrder(plan(), extras)) rows.push(room(def, p, 'main'), side ? pair(room(side, p, 'side'), twin && room(twin, p, 'side')) : Object.assign(document.createElement('li'), { className: 'side none' }));
  $('campList').replaceChildren(...rows);
  $('campScore').textContent = `Score ${globalScore(p.levels)}`;
}

// The level list, drawn fresh, with the last level played in view.
export function showList() {
  renderList();
  const sel = $('campList').querySelector('.sel') || $('campList').querySelector('button');
  if (sel) { sel.focus(); sel.scrollIntoView({ block: 'nearest' }); }
}

// actions: setMode, syncPanel, fit.
export function buildCampaign(actions) {
  A = actions; bindGoalCard(actions);
  fitScene = buildMenuScene($('menuScene'));
  buildLogo(document.querySelector('.menuLogo'));
  place('menu', { page: 'menuBox', parent: () => null, enter: () => {}, shown: () => fitScene?.() });
  place('levels', { page: 'campBox', parent: () => 'menu', enter: () => {}, shown: showList });
  // A level goes back to where it was opened from; with no history, a made level's parent is the maker.
  place('level', { parent: id => (levelOf(id) || {}).made ? 'maker' : 'levels', enter: id => (S.camp && S.camp.def.id === id) || enterLevel(id), exit: () => { noteLeaving(); leaveLevel(); } });
  // A first-time player lands in the tutorial (register 512).
  $('menuCampaign').onclick = () => firstTime(progress()) && !window.__noTutorial ? go('level', 'tutorial') : go('levels');
  $('menuTutorial').onclick = () => go('level', 'tutorial');
  $('menuSandbox').onclick = () => go('rooms', 'start');
  $('campMenu').onclick = () => back('menu');
  // The Sandbox's way back (register 357): its Rooms page has a Menu button, as the other modes' pages do.
  $('roomsMenu').onclick = () => back('menu');
  $('campBack').onclick = up;
  $('menuDebug').onclick = copyDebug;
  $('campRun').onclick = () => { S.camp.testing = false; forgetRun(); run(); };
  // Test: the room played by hand, the robot not involved; nothing is judged or saved.
  $('campTest').onclick = () => { if (!S.camp) return; clearTrail(); $('campVerdict').hidden = true; S.camp.verdictGone = true; S.camp.testing = true; A.setMode('play'); };
  // After a Run the robot has shown its path: back to editing, so a tap on the room places again.
  bindWin();
  // The attempt has failed: a stop bumps toward the berry it could not reach, then the cause flashes.
  addEventListener('wee:demoDone', () => {
    const n = S.camp && S.camp.near;
    if (!n) return;
    S.camp.near = null;
    const g = S.level.cells.indexOf('goal'), gx = g % S.level.w - n.at.x, gy = Math.floor(g / S.level.w) - n.at.y;
    if (n.end === 'stop' && g >= 0) S.fx.push({ type: 'bump', dx: Math.abs(gx) >= Math.abs(gy) ? Math.sign(gx) : 0, dy: Math.abs(gx) >= Math.abs(gy) ? 0 : Math.sign(gy), at: now() });
    flashStuck(S.camp.verdict);
  });
  addEventListener('wee:demoDone', () => { if (S.camp) { syncBrief(); $('campBrief').classList.remove('landed'); void $('campBrief').offsetWidth; $('campBrief').classList.add('landed'); } });
  addEventListener('wee:demoDone', () => setTimeout(() => { if (S.camp && !S.camp.testing && S.mode === 'play') A.setMode('edit'); }, 900));
  addEventListener('wee:win', ev => {
    if (!S.camp || !S.camp.testing) return;
    const out = $('campVerdict');
    out.className = 'campVerdict won'; out.hidden = false;
    $('campVerdictText').textContent = `You reached the berry in ${ev.detail.moves} ${ev.detail.moves === 1 ? 'move' : 'moves'}, but playing it yourself does not beat the level: press Run and Wee plays it.`;
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
