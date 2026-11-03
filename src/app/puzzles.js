// Puzzles (register 302): rooms marked in the Sandbox, played by hand as the little circle.
// Your best is kept; the fewest moves come from the robot's own search.
import { noPowers } from '../rules/base.js';
import { S } from '../editor/state.js';
import { list } from './store.js';
import { splitRoom } from '../level/room.js';
import { allShortest } from '../campaign/robot.js';
import { $ } from './dom.js';
import { place, go, back, up } from './nav.js';
import { PUZZLES } from '../campaign/progression.js';
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
const authored = id => PUZZLES.find(p => p && p.id === id);
function play(r, inCampaign = false) {
  const { level } = splitRoom(r), found = allShortest(level);
  S.puzzle = { id: r.id, fewest: found.status === 'solved' ? found.length : null, campaign: inCampaign };
  $('puzzleBack').textContent = inCampaign ? 'Levels' : 'Puzzles';
  S.camp = null; S.simple = true; S.level = noPowers(level);
  document.body.classList.add('puzzle', 'simple');
  A.setMode('play'); A.syncPanel(); A.fit();
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
    if (S.puzzle.campaign) { const pr = progress(), rec = pr.levels[id] ||= {}; rec.beaten = true; rec.moves = Math.min(rec.moves || n, n); write(pr); }
    const few = S.puzzle.fewest;
    $('winText').textContent = few == null ? `Solved in ${n} moves.` : n === few ? `Solved in ${n} moves, the fewest there are.` : `Solved in ${n} moves, and it can be done in ${few}.`;
  });
}

// A campaign puzzle on the level list: P and its number, and one star holding your fewest moves once solved.
export function puzzleRow(def, rec, open, kind) {
  const li = document.createElement('li'), b = document.createElement('button');
  li.className = kind; b.type = 'button'; b.className = 'campRow'; b.dataset.level = def.id; b.disabled = !open; b.classList.toggle('locked', !open);
  const name = Object.assign(document.createElement('b'), { textContent: def.id.toUpperCase() }); name.setAttribute('aria-label', def.name);
  const top = document.createElement('span'); top.className = 'campRowHead'; top.append(name);
  const stars = document.createElement('span'); stars.className = 'campStars';
  stars.innerHTML = open ? `<span class="campStar main${rec.beaten ? ' on' : ''}" title="${rec.beaten ? `Solved in ${rec.moves}` : 'Not solved yet'}">${glyph('star')}${rec.beaten ? `<i>${rec.moves}</i>` : ''}</span>` : `<span class="campShut">${glyph('lock')}</span>`;
  b.append(top, stars); b.onclick = () => go('puzzle', def.id);
  li.append(b); return li;
}
