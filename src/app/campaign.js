// The campaign: a main menu at launch, the level list, and building a level's room for the
// robot. Run checks the room (src/campaign/rules.js) and the robot plays a shortest path:
// the failing one when it fails. Progress and each level's room stay in this browser.
// Every level is open while the levels are being made. All copy is draft.
import { LEVELS } from '../level/campaign.js';
import { roomOf, coloursOf, placementErrors, check, optionalGoals, listed } from '../campaign/rules.js';
import { newHistory } from '../editor/history.js';
import { S, starterLevel } from '../editor/state.js';
import { $, portrait } from './dom.js';
import { levelParts } from './levelParts.js';
import { noteWin, bindWin } from './winCard.js';
import { noteLeaving, copyDebug } from './debug.js';
import { buildMenuScene } from './menuScene.js';
import { madeLevel } from './made.js';
import { progress, write, firstTime } from './progress.js';
import { TOOL, words, syncBrief, clearTrail, flashStuck, bindGoalCard } from './goalCard.js';
import { place, go, back, up } from './nav.js';

// Every level hands you Move, to carry anything placed (the start and goal too) elsewhere.
const ALWAYS = ['move'];
let A = null, fitScene = null;

const levelOf = id => LEVELS.find(l => l.id === id) || madeLevel(id);

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
  S.camp = { def, verdict: null }; S.trail = null; $('campBack').textContent = def.made ? 'Maker' : 'Levels';
  const kept = rec && rec.room && unframe(rec.room);
  // A saved room is kept even if a later rule refuses part of it: Run says what, nothing is lost.
  // The tutorial always starts from its own room (register 512).
  S.level = !def.tutorial && kept && placementErrors(def, kept).every(e => /^(Place at least|Place the |Nothing can start)/.test(e.msg)) ? kept : roomOf(def);
  S.history = newHistory();
  S.ui.tool = 'look'; S.ui.colour = coloursOf(def)[0];
  p.last = id; write(p);
  document.body.classList.add('campaign'); document.body.classList.remove('simple'); S.simple = false;
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


// Judges the room, keeps which optional goals a win has met, then the robot plays: the failing path, or
// the first shortest path of a win.
export function run() {
  if (!S.camp) return null;
  const def = S.camp.def, v = check(def, S.level);
  S.camp.verdictGone = false;
  S.camp.verdict = v;
  save();
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
    write(p);
    noteWin(def, before, rec, v, words);
  }
  S.camp.ranOn = JSON.stringify(S.level);
  const show = v.ok ? (v.won ? v.path : v.fail.path) : null;
  if (show) { A.setMode('play'); S.demo = [...show]; S.demoRunning = true; }
  else flashStuck(v);
  syncBrief();
  return v;
}


// A level's stars (register 475): the main goal, a line, one per side goal. A met goal's star is
// filled and holds the fewest tiles placed in a win that met it.
const STAR = 'M12 1.8l3 6.4 7 .8-5.2 4.8 1.4 6.9L12 17.2 5.8 20.7l1.4-6.9L2 9l7-.8z';
function star(n, main, label) {
  const el = document.createElement('span'), on = n != null;
  el.className = 'campStar' + (main ? ' main' : '') + (on ? ' on' : '');
  el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR}"/></svg>` + (on ? `<i>${n}</i>` : '');
  el.title = label;
  return el;
}
function stars(def, rec) {
  const row = document.createElement('span'), best = rec.best || {}, line = document.createElement('span');
  row.className = 'campStars'; line.className = 'campStarLine';
  const met = id => rec.goals && rec.goals[id] ? best[id] ?? best.win ?? '' : null;
  const side = optionalGoals(def);
  row.append(star(rec.beaten ? best.win ?? '' : null, true, 'Win'), ...(side.length ? [line] : []), ...side.map(o => star(met(o.id), false, o.text)));
  row.setAttribute('aria-label', rec.beaten ? `Beaten, ${Object.values(rec.goals || {}).filter(Boolean).length} of ${optionalGoals(def).length} side goals` : 'Not beaten');
  return row;
}

function renderList() {
  const p = progress(), list = $('campList');
  list.replaceChildren(...LEVELS.filter(listed).map(def => {
    const rec = p.levels[def.id] || {}, li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.className = 'campRow'; b.dataset.level = def.id;
    const name = document.createElement('b');
    name.textContent = def.name.replace(/^Level /, ''); name.setAttribute('aria-label', def.name);
    // The number and its pieces share one line (register 527).
    const top = document.createElement('span'); top.className = 'campRowHead'; top.append(name, levelParts(def, TOOL));
    b.append(top, stars(def, rec));
    if (def.id === p.last) b.classList.add('sel');
    b.onclick = () => go('level', def.id);
    li.append(b);
    return li;
  }));
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
  $('campRun').onclick = () => { S.camp.testing = false; run(); };
  // Test: the room played by hand, the robot not involved; nothing is judged or saved.
  $('campTest').onclick = () => { if (!S.camp) return; clearTrail(); $('campVerdict').hidden = true; S.camp.verdictGone = true; S.camp.testing = true; A.setMode('play'); };
  // After a Run the robot has shown its path: back to editing, so a tap on the room places again.
  bindWin();
  addEventListener('wee:demoDone', () => setTimeout(() => { if (S.camp && !S.camp.testing && S.mode === 'play') A.setMode('edit'); }, 900));
  addEventListener('wee:win', ev => {
    if (!S.camp || !S.camp.testing) return;
    const out = $('campVerdict');
    out.className = 'campVerdict won'; out.hidden = false;
    $('campVerdictText').textContent = `You reached the goal in ${ev.detail.moves} ${ev.detail.moves === 1 ? 'move' : 'moves'}, but playing it yourself does not beat the level: press Run and the robot plays it.`;
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
