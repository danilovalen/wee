// Puzzles (register 302): rooms marked in the Sandbox, played by hand as the little circle.
// Your best is kept; the fewest moves come from the robot's own search.
import { S } from '../editor/state.js';
import { list } from './store.js';
import { splitRoom } from '../level/room.js';
import { allShortest } from '../campaign/robot.js';
import { $ } from './dom.js';

const KEY = 'wee-puzzles';
const bests = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const keep = b => { try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* storage off */ } };
let A = null;

function leave() { S.puzzle = null; document.body.classList.remove('puzzle'); }
export async function openPuzzles() {
  for (const id of ['menuBox', 'campBox']) if ($(id).open) $(id).close();
  leave();
  const rooms = (await list().catch(() => [])).filter(r => r.puzzle), b = bests();
  $('puzzleNone').hidden = rooms.length > 0;
  $('puzzleList').replaceChildren(...rooms.map(r => {
    const li = document.createElement('li'), btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'campRow'; btn.dataset.puzzle = r.id;
    btn.append(Object.assign(document.createElement('b'), { textContent: r.name || 'Untitled' }), Object.assign(document.createElement('small'), { textContent: b[r.id] ? `Solved in ${b[r.id]}` : 'Not solved yet' }));
    btn.onclick = () => play(r);
    li.append(btn); return li;
  }));
  if (!$('puzzleBox').open) $('puzzleBox').showModal();
}
function play(r) {
  const { level } = splitRoom(r), found = allShortest(level);
  $('puzzleBox').close();
  S.puzzle = { id: r.id, fewest: found.status === 'solved' ? found.length : null };
  S.camp = null; S.simple = true; S.level = level;
  document.body.classList.add('puzzle', 'simple');
  A.setMode('play'); A.syncPanel(); A.fit();
}

export function buildPuzzles(actions) {
  A = actions;
  $('menuPuzzles').onclick = openPuzzles;
  $('puzzleMenu').onclick = () => { $('puzzleBox').close(); $('menuBox').showModal(); };
  $('puzzleBack').onclick = openPuzzles;
  addEventListener('wee:win', ev => {
    if (!S.puzzle) return;
    const b = bests(), n = ev.detail.moves, id = S.puzzle.id;
    if (!b[id] || n < b[id]) { b[id] = n; keep(b); }
    const few = S.puzzle.fewest;
    $('winText').textContent = few == null ? `Solved in ${n} moves.` : n === few ? `Solved in ${n} moves, the fewest there are.` : `Solved in ${n} moves. It can be done in ${few}.`;
  });
}
