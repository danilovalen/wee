// Puzzles (register 302): rooms marked in the Sandbox, played by hand as the little circle.
// Your best is kept; the fewest moves come from the robot's own search.
import { noPowers } from '../rules/base.js';
import { S } from '../editor/state.js';
import { list } from './store.js';
import { splitRoom } from '../level/room.js';
import { allShortest } from '../campaign/robot.js';
import { $ } from './dom.js';
import { place, go, back, up } from './nav.js';
import { PUZZLES, INTRO } from '../campaign/progression.js';
import { progress, write } from './progress.js';
import { glyph } from './glyphs.js';

const KEY = 'wee-puzzles';
export const bests = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
export const keep = b => { try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* storage off */ } };
let A = null;

function leave() { S.puzzle = null; document.body.classList.remove('puzzle'); }
async function listPuzzles() {
  const rooms = (await list().catch(() => [])).filter(r => r.puzzle), b = bests();
  $('puzzleNone').hidden = rooms.length > 0;
  $('puzzleList').replaceChildren(...rooms.map(r => {
    const li = document.createElement('li'), btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'campRow'; btn.dataset.puzzle = r.id;
    btn.append(Object.assign(document.createElement('b'), { textContent: r.name || 'Untitled' }), Object.assign(document.createElement('small'), { textContent: b[r.id] ? `Solved in ${b[r.id]}` : 'Not solved yet' }));
    btn.onclick = () => go('puzzle', r.id);
    li.append(btn); return li;
  }));
}
// A campaign puzzle (register 651): its room by id, played by hand like any puzzle, back to the level list.
const authored = id => [INTRO.puzzle, ...PUZZLES].find(p => p && p.id === id);
function play(r, inCampaign = false) {
  const { level } = splitRoom(r), found = allShortest(level);
  S.puzzle = { id: r.id, fewest: found.status === 'solved' ? found.length : null, campaign: inCampaign };
  $('puzzleBack').textContent = inCampaign ? 'Levels' : 'Puzzles';
  S.camp = null; S.simple = true; S.stains = []; S.level = noPowers(level);
  document.body.classList.add('puzzle', 'simple');
  A.setMode('play'); A.syncPanel(); A.fit();
  brief();
}

// A puzzle's card (registers 784, 789), shaped like a campaign level's: its main star for the berry, and its side
// goal, the fewest moves in one take. A star kept from an earlier win stays filled.
function brief(run = {}) {
  const pz = S.puzzle, few = pz && pz.fewest;
  if (!pz) return;
  const kept = !!(((progress().levels[pz.id] || {}).goals || {}).fewest);
  const row = (text, cls, mark) => { const li = document.createElement('li'); li.className = cls; li.title = text; const m = document.createElement('span'); m.className = 'mark'; if (mark) m.innerHTML = glyph(mark); li.append(m, Object.assign(document.createElement('span'), { textContent: text })); return li; };
  const must = document.createElement('ul'); must.className = 'campReqs campMust';
  must.append(row('Get Wee to the berry.', run.won ? 'met' : '', run.won ? 'check' : ''));
  const big = document.createElement('span'); big.className = 'campBigStar' + (run.won ? ' on' : ''); big.innerHTML = glyph('star');
  const main = document.createElement('div'); main.className = 'campMain'; main.append(big, must);
  const opt = document.createElement('ul'); opt.className = 'campReqs campOpt'; opt.dataset.label = 'Optional goals';
  if (few != null) { const li = row(`Win in ${few} moves or fewer, with no undo.`, 'optional' + (kept && pz.campaign ? ' kept' : '') + (run.won ? (run.clean ? ' met' : ' unmet') : ''), 'star'); li.dataset.req = 'fewest'; opt.append(li); }
  const card = document.createElement('div'); card.className = 'campGoal'; card.append(main, opt);
  $('puzzleBrief').replaceChildren(card);
}

export function buildPuzzles(actions) {
  A = actions;
  place('puzzles', { page: 'puzzleBox', parent: () => 'menu', enter: listPuzzles });
  // A puzzle is found by its room's id, so a reload or a link plays it again.
  place('puzzle', { parent: id => authored(id) ? 'levels' : 'puzzles', exit: leave, enter: async id => {
    const a = authored(id); if (a) return void play({ ...a.room, id }, true);
    const r = (await list().catch(() => [])).find(o => o.id === id && o.puzzle); if (!r) return false; play(r);
  } });
  $('menuPuzzles').onclick = () => go('puzzles');
  $('puzzleMenu').onclick = () => back('menu');
  $('puzzleBack').onclick = up;
  addEventListener('wee:win', ev => {
    if (!S.puzzle) return;
    const b = bests(), n = ev.detail.moves, id = S.puzzle.id;
    if (!b[id] || n < b[id]) { b[id] = n; keep(b); }
    // A campaign puzzle keeps its win with the campaign, so the level list shows its star.
    // Two stars (registers 784, 785): one for solving it, one for solving it in the fewest moves in one take,
    // each undo counting as one more move.
    const few = S.puzzle.fewest, taken = n + (S.undos || 0), clean = few != null && taken <= few;
    if (S.puzzle.campaign) { const pr = progress(), rec = pr.levels[id] ||= {}; rec.beaten = true; rec.moves = Math.min(rec.moves || n, n); if (clean) rec.goals = { ...rec.goals, fewest: true }; write(pr); }
    // Just the count (register 789); the fewest moves is the card's side goal, met or missed there.
    $('winText').textContent = `Solved in ${n} ${n === 1 ? 'move' : 'moves'}.`;
    brief({ won: true, clean });
  });
}

// A campaign puzzle on the level list: P and its number, and one star holding your fewest moves once solved.
export function puzzleRow(def, rec, open, kind) {
  const li = document.createElement('li'), b = document.createElement('button');
  li.className = kind; b.type = 'button'; b.className = 'campRow'; b.dataset.level = def.id; b.disabled = !open; b.classList.toggle('locked', !open);
  const name = Object.assign(document.createElement('b'), { textContent: 'Puzzle ' + def.id.slice(1) }); name.setAttribute('aria-label', def.name);
  const top = document.createElement('span'); top.className = 'campRowHead'; top.append(name);
  const stars = document.createElement('span'); stars.className = 'campStars';
  // Its second star is the fewest moves in one take (register 785).
  const fewest = !!(rec.goals && rec.goals.fewest);
  stars.innerHTML = open ? `<span class="campStar main${rec.beaten ? ' on' : ''}" title="${rec.beaten ? `Solved in ${rec.moves}` : 'Not solved yet'}">${glyph('star')}${rec.beaten ? `<i>${rec.moves}</i>` : ''}</span><span class="campStar${fewest ? ' on' : ''}" data-goal="fewest" title="${fewest ? 'Solved in the fewest moves, in one take' : 'Solve it in the fewest moves, in one take: each undo counts as a move'}">${glyph('star')}</span>` : `<span class="campShut">${glyph('lock')}</span>`;
  b.append(top, stars); b.onclick = () => go('puzzle', def.id);
  li.append(b); return li;
}
