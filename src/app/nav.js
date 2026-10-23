// Where you are (register 359): every screen is a place with a hash path, and this is the only
// module that opens or closes a place's page, so Back, Escape, reload and links agree.
// Pop-ups that are not places (confirmations, This room, New room) stay plain dialogs. docs/NAVIGATION.md.
import { $ } from './dom.js';

// The pages that are places. Nothing outside this file opens or closes them (tests/arch.test.mjs).
export const PAGES = ['menuBox', 'campBox', 'makerBox', 'puzzleBox', 'roomsBox'];
const places = {}; // name -> { page, parent(arg), enter(arg), shown(), exit(nextName) }
// shut: pages this module closed; a dialog's close event comes later, so the flag must outlive the call.
let here = null, ours = false, turn = 0;
const shut = new Set();
// A preview frame (about:srcdoc, blob:) cannot change its address, so there the entries live here instead.
let fixed = false;
const stack = [];
const state = () => fixed ? stack[stack.length - 1] : history.state;
function write(entry, replace) {
  if (!fixed) try { history[replace ? 'replaceState' : 'pushState'](entry, '', location.pathname + location.search + entry.path); return; } catch { fixed = true; }
  if (replace && stack.length) stack[stack.length - 1] = entry; else stack.push(entry);
}

export const place = (name, def) => { places[name] = def; };
export const pathOf = (name, arg = null) => '#/' + (name === 'menu' ? '' : name + (arg != null ? '/' + arg : ''));
export const current = () => here;
function parse(hash) {
  const [name, ...rest] = (hash || '').replace(/^#\/?/, '').split('/');
  return places[name] ? { name, arg: rest.length ? decodeURIComponent(rest.join('/')) : null } : { name: 'menu', arg: null };
}

// Closes every page but this place's own (and, after the browser's Back, any pop-up left over it).
function closePages(keep, popups) {
  for (const d of document.querySelectorAll('dialog[open]')) if (d.id !== keep && (PAGES.includes(d.id) || popups)) { shut.add(d.id); d.close(); }
}

async function show(name, arg, popups = false) {
  const def = places[name], t = ++turn;
  if (here && (here.name !== name || here.arg !== arg)) places[here.name].exit?.(name);
  here = { name, arg };
  closePages(def.page, popups);
  // The page opens at once and fills as it loads, so a tap or Escape right after lands on it.
  if (def.page && !$(def.page).open) $(def.page).showModal();
  // The page starts hidden (index.html), so nothing paints before the first place is up (register 401).
  if (def.page) document.documentElement.classList.remove('booting');
  const ok = await def.enter(arg);
  if (t !== turn) return;  // a later move overtook this one while it loaded
  if (ok === false) { go(def.parent(arg), null, { replace: true }); return; }
  def.shown?.();
  document.documentElement.classList.remove('booting');
  dispatchEvent(new CustomEvent('wee:place', { detail: here }));
}

// The only way to change screen: a history entry, then the place.
export function go(name, arg = null, { replace = false } = {}) {
  const path = pathOf(name, arg), from = here && pathOf(here.name, here.arg);
  if (path === from) return show(name, arg);
  write({ path, prev: replace ? state()?.prev ?? null : from }, replace);
  return show(name, arg);
}

// One step up: back through history when that is where you came from, so the browser's Back and
// this agree; otherwise straight to the parent (a cold start from a reload or a link).
export function back(target = here && places[here.name].parent(here.arg)) {
  if (!target) return;
  if (state()?.prev !== pathOf(target)) go(target);
  else if (!fixed) { ours = true; history.back(); }
  else { stack.pop(); const { name, arg } = parse(state().path); show(name, arg); }
}
// Up to the place a level, puzzle or room was opened from: its own parent unless history says otherwise.
export const up = () => back(here && places[here.name].parent(here.arg));

export function start() {
  if (location.hash.startsWith('#room=')) return show('room', null);  // a shared room link: rooms.js reads the hash
  const sandbox = !location.hash && new URLSearchParams(location.search).has('sandbox');
  const { name, arg } = sandbox ? { name: 'rooms', arg: null } : parse(location.hash);
  write({ path: pathOf(name, arg), prev: null }, true);
  return show(name, arg);
}

export function bindNav() {
  addEventListener('popstate', () => { const { name, arg } = parse(location.hash); const popups = !ours; ours = false; show(name, arg, popups); });
  // Escape on a page goes up a place, never into the screen behind it; the menu has nowhere up.
  for (const id of PAGES) $(id).addEventListener('cancel', ev => { ev.preventDefault(); if (here && here.name !== 'menu') up(); });
  // A page closed by its own Close button (the Rooms page) goes to its parent, the room; the event comes
  // late, so a page open again by then (reopened in the meantime) stays.
  for (const id of PAGES) $(id).addEventListener('close', () => { if (shut.delete(id) || $(id).open) return; if (here && places[here.name].page === id) up(); });
  // The logo is the way to the menu from anywhere.
  $('logo').onclick = () => go('menu');
}
