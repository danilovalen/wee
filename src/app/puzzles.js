// Puzzles (register 302): rooms marked in the Sandbox, played by hand as the little circle.
// Your best is kept; the fewest moves come from the robot's own search.
import { S } from '../editor/state.js';
import { list } from './store.js';
import { splitRoom } from '../level/room.js';
import { allShortest } from '../campaign/robot.js';
import { $ } from './dom.js';
import { place, go, back, up } from './nav.js';

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
function play(r) {
  const { level } = splitRoom(r), found = allShortest(level);
  S.puzzle = { id: r.id, fewest: found.status === 'solved' ? found.length : null };
  S.camp = null; S.simple = true; S.level = level;
  document.body.classList.add('puzzle', 'simple');
  A.setMode('play'); A.syncPanel(); A.fit();
}

export function buildPuzzles(actions) {
  A = actions;
  place('puzzles', { page: 'puzzleBox', parent: () => 'menu', enter: listPuzzles });
  // A puzzle is found by its room's id, so a reload or a link plays it again.
  place('puzzle', { parent: () => 'puzzles', enter: async id => { const r = (await list().catch(() => [])).find(o => o.id === id && o.puzzle); if (!r) return false; play(r); }, exit: leave });
  $('menuPuzzles').onclick = () => go('puzzles');
  $('puzzleMenu').onclick = () => back('menu');
  $('puzzleBack').onclick = up;
  addEventListener('wee:win', ev => {
    if (!S.puzzle) return;
    const b = bests(), n = ev.detail.moves, id = S.puzzle.id;
    if (!b[id] || n < b[id]) { b[id] = n; keep(b); }
    const few = S.puzzle.fewest;
    $('winText').textContent = few == null ? `Solved in ${n} moves.` : n === few ? `Solved in ${n} moves, the fewest there are.` : `Solved in ${n} moves, and it can be done in ${few}.`;
  });
}
