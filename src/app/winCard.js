// The two win moments of a level (registers 415, 416): the first win, and the run that meets the
// last side goal (a side goal counts once met in any run). Each asks Next level or Stay, once the
// robot has finished its run. A first win that meets every side goal shows only the second.
import { LEVELS } from '../level/campaign.js';
import { optionalGoals } from '../campaign/rules.js';
import { $ } from './dom.js';
import { go, up } from './nav.js';

let pending = null;
// Cards already shown this session, by level: kept apart from saved progress, which a page opened as
// a file on a phone may not keep, so a level never shows its first or its gold card twice (register 447).
const shown = new Set();

// before: the level's record before this run; rec: after it; words: draws a goal's short words.
export function noteWin(def, before, rec, v, words) {
  const goals = optionalGoals(def), all = r => goals.length > 0 && goals.every(o => r.goals && r.goals[o.id]);
  const gold = all(rec);
  if (before.beaten && (!gold || all(before))) return;
  const key = `${def.id}:${gold ? 'gold' : 'first'}`;
  if (shown.has(key)) return;
  shown.add(key);
  const fresh = goals.filter(o => rec.goals[o.id] && !(before.goals && before.goals[o.id])).map(o => o.id);
  pending = { def, gold, moves: v.length, goals, met: rec.goals, fresh, words };
}

function next(def) {
  if (def.made) return { label: 'Maker', go: up };
  const list = LEVELS.filter(l => !l.hidden), i = list.findIndex(l => l.id === def.id), n = i >= 0 ? list[i + 1] : null;
  return n ? { label: 'Next level', go: () => go('level', n.id) } : { label: 'Levels', go: up };
}

// Stars out of the gold card for about a second; none when motion is turned down.
function burst(box) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('span'), a = i / 14 * Math.PI * 2;
    s.className = 'burst'; s.textContent = '★';
    s.style.setProperty('--dx', `${Math.cos(a) * 140}px`); s.style.setProperty('--dy', `${Math.sin(a) * 110 - 40}px`);
    box.append(s); setTimeout(() => s.remove(), 1200);
  }
}

function show(p) {
  // Older tests that win and carry on clicking switch the cards off.
  if (window.__noWinCard) return;
  const box = $('winBox'), n = next(p.def);
  box.classList.toggle('gold', p.gold);
  $('winTitle').textContent = p.gold ? 'Every side goal met' : `${p.def.name} beaten`;
  $('winSay').textContent = p.gold ? `${p.def.name} is done, all ${p.goals.length} stars.` : `The robot made it in ${p.moves} ${p.moves === 1 ? 'move' : 'moves'}.`;
  $('winStars').replaceChildren(...p.goals.map(o => {
    const s = document.createElement('span');
    s.className = 'winStar' + (p.met[o.id] ? ' on' : '') + (p.fresh.includes(o.id) ? ' new' : ''); s.textContent = '★';
    return s;
  }));
  $('winGoals').replaceChildren(...p.goals.map(o => {
    const li = document.createElement('li'); li.className = p.met[o.id] ? 'on' : ''; li.dataset.goal = o.id;
    const m = document.createElement('i'); m.textContent = '★';
    li.append(m, p.words(o.parts)); return li;
  }));
  $('winNext').textContent = n.label;
  $('winNext').onclick = () => { box.close(); n.go(); };
  box.showModal();
  if (p.gold) burst(box);
}

export function bindWin() {
  addEventListener('wee:demoDone', () => { if (pending) { const p = pending; pending = null; show(p); } });
  $('winStay').onclick = () => $('winBox').close();
  // A tap outside the card is Stay too.
  $('winBox').addEventListener('click', ev => { if (ev.target === $('winBox')) $('winBox').close(); });
}
