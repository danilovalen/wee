// Achievements (registers 627-640): their own page, the popup a Run's new ones raise, the one-time note that
// stars now cover a look, and the red dots on the menu's Looks and Achievements buttons.
import { $ } from './dom.js';
import { place, go, back, current } from './nav.js';
import { glyph } from './glyphs.js';
import { S } from '../editor/state.js';
import { LEVELS } from '../level/campaign.js';
import { CHALLENGES } from '../level/challenges.js';
import { shownName, challengeName } from '../campaign/names.js';
import { earnedList, available, owns, affords } from './wallet.js';
import { allOpen } from './unlock.js';
import { PALETTES, SKINS } from '../view/look.js';
import { play } from './sound.js';
import { caption } from './voice.js';
import { photo } from './albumScenes.js';

// Every look with its key and cost, palettes first.
export const LOOKS = [...PALETTES.map(p => ({ key: 'palette:' + p.id, cost: p.cost })), ...SKINS.map(s => ({ key: 'skin:' + s.id, cost: s.cost }))];
export const buyable = () => LOOKS.filter(l => !owns(l.key, l.cost) && affords(l.cost)).map(l => l.key);

// What has been looked at, kept per browser: the dots are a convenience, not progress.
const SEEN = 'wee.seen';
const seen = () => { try { return { looks: [], ach: [], hinted: false, ...JSON.parse(localStorage.getItem(SEEN) || '{}') }; } catch { return { looks: [], ach: [], hinted: false }; } };
const keep = o => { try { localStorage.setItem(SEEN, JSON.stringify(o)); } catch { /* storage off */ } };
export const doneIds = () => new Set(earnedList().filter(a => a.done).map(a => a.id));

export function syncDots() {
  const s = seen();
  $('menuLooks').classList.toggle('dot', buyable().some(k => !s.looks.includes(k)));
  $('menuAchieve').classList.toggle('dot', [...doneIds()].some(id => !s.ach.includes(id)));
  // Hidden until there is something behind them (registers 958, 959): an achievement earned, a look affordable or owned.
  $('menuAchieve').classList.toggle('shut', !allOpen() && !doneIds().size);
  $('menuLooks').classList.toggle('shut', !allOpen() && !buyable().length && !LOOKS.some(l => l.cost && owns(l.key, l.cost)));
}
// Opening Looks clears its dot (register 640); each look you can buy keeps its own until bought.
export function sawLooks() { const s = seen(); s.looks = [...new Set([...s.looks, ...buyable()])]; keep(s); syncDots(); }

// A badge: the achievement's own picture, with the star slot it fills once done (register 639).
export function badge(a) {
  const b = document.createElement('span'); b.className = 'achBadge' + (a.done ? ' done' : '');
  b.innerHTML = glyph(a.icon) + `<span class="achSlot">${glyph('star')}</span>`;
  return b;
}
const where = id => { const d = [...LEVELS, ...CHALLENGES].find(l => l.id === id); return d ? (d.challenge ? challengeName(d) : shownName(d)) : ''; };

// A star count counts up from nothing as its page opens, ticking as it goes (register 647).
export function countUp(el, n) {
  clearInterval(el.countTimer);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches, step = Math.max(1, Math.ceil(n / 8));
  let i = still ? n : 0;
  const show = () => { el.innerHTML = `${glyph('star')}<b>${i}</b>`; el.dataset.count = String(i); };
  show();
  if (i >= n) return;
  el.countTimer = setInterval(() => { i = Math.min(n, i + step); show(); play('tick'); if (i >= n) clearInterval(el.countTimer); }, 45);
}

let fresh = new Set();
function render() {
  const list = earnedList(), n = list.filter(a => a.done).length;
  $('achCount').innerHTML = `${glyph('star')}<b>${available()}</b>`;
  $('achDone').textContent = `${n} of ${list.length} done`;
  $('achBar').style.setProperty('--done', `${Math.round(n / list.length * 100)}%`);
  $('achList').replaceChildren(...list.map(a => {
    const li = document.createElement('li'); li.dataset.achievement = a.id;
    li.classList.toggle('done', a.done); li.classList.toggle('new', fresh.has(a.id));
    const text = document.createElement('span'); text.className = 'achText';
    text.append(Object.assign(document.createElement('b'), { textContent: a.name }), Object.assign(document.createElement('span'), { textContent: a.text }));
    // Under a photo it has earned, the blob says its piece (register 844).
    if (a.done && caption(a.id)) text.append(Object.assign(document.createElement('q'), { className: 'achSay', textContent: caption(a.id) }));
    if (a.of && !a.done) { const m = document.createElement('i'); m.className = 'achMeter'; m.style.setProperty('--at', `${Math.round(a.at / a.of * 100)}%`); m.title = `${a.at} of ${a.of}`; text.append(m); }
    const right = document.createElement('small'); right.textContent = a.done ? (a.where ? where(a.where) : `+${a.stars}`) : `+${a.stars}`;
    // An earned one shows its photo, a drawn scene; one not earned keeps its picture in an empty slot.
    li.append((a.done && photo(a.id)) || badge(a), text, right);
    return li;
  }));
}

// The popups waiting for the robot to finish, one after another.
const queue = [];
let showing = false;
function next() {
  const t = $('toast');
  if (!queue.length) { showing = false; t.hidden = true; return; }
  showing = true;
  const item = queue.shift();
  t.replaceChildren(item.badge, Object.assign(document.createElement('span'), { className: 'toastText' }), Object.assign(document.createElement('small'), { textContent: item.plus || '' }));
  t.querySelector('.toastText').append(Object.assign(document.createElement('b'), { textContent: item.title }), Object.assign(document.createElement('span'), { textContent: item.text }));
  t.dataset.kind = item.kind; t.onclick = () => { queue.length = 0; next(); if ($('winBox').open) $('winBox').close(); go(item.kind === 'look' ? 'looks' : 'achievements'); };
  raise(); t.hidden = false; play(item.kind === 'look' ? 'tick' : 'star');
  clearTimeout(next.timer); next.timer = setTimeout(next, window.__toastMs ?? 3000);
}
// An open modal page makes everything outside it untappable, so the popup lives inside the topmost one.
function raise() {
  const t = $('toast'), modal = [...document.querySelectorAll('dialog[open]')].filter(d => d.matches(':modal'));
  const host = $('winBox').open ? $('winBox') : modal.at(-1) || document.body;
  if (t.parentElement !== host) host.append(t);
}
function flush() { if (queue.length && !showing && !S.demoRunning) next(); }

// After a campaign Run: a popup for each achievement it earned, then, once ever, the note that the stars
// cover a look (register 627). They wait for the robot to stop.
export function noteEarned(was) {
  for (const a of earnedList()) if (a.done && !was.has(a.id)) queue.push({ kind: 'ach', title: a.name, text: a.text, plus: `+${a.stars}`, badge: badge(a) });
  const s = seen();
  if (!s.hinted && buyable().length) {
    s.hinted = true; keep(s);
    const b = document.createElement('span'); b.className = 'achBadge done'; b.innerHTML = glyph('looks');
    queue.push({ kind: 'look', title: 'New look', text: 'You have enough stars for a new look.', badge: b });
  }
  syncDots();
  if (!S.demoRunning) setTimeout(flush, 0);
}

export function buildAchieve() {
  place('achievements', {
    page: 'achBox', parent: () => 'menu',
    enter: () => { const s = seen(), done = doneIds(); fresh = new Set([...done].filter(id => !s.ach.includes(id))); s.ach = [...done]; keep(s); render(); countUp($('achCount'), available()); syncDots(); },
  });
  $('menuAchieve').innerHTML = glyph('trophy');
  $('menuAchieve').onclick = () => go('achievements');
  $('achMenu').onclick = () => back('menu');
  addEventListener('wee:demoDone', () => setTimeout(flush, 0));
  // A card opened while a popup shows would cover it: the popup comes back on top.
  new MutationObserver(() => { if (!$('toast').hidden) raise(); }).observe($('winBox'), { attributes: true, attributeFilter: ['open'] });
  for (const e of ['wee:stars', 'wee:unlock', 'wee:look']) addEventListener(e, () => { syncDots(); if (current()?.name === 'achievements') render(); });
  addEventListener('wee:place', ev => { if (ev.detail.name === 'menu') syncDots(); });
  syncDots();
}
