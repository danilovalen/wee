// The Generator: pick a size, a move range and what the room is made of, and it makes one
// room that fits, a slice at a time so the page stays responsive. Its rooms wait on their
// own shelf; one joins your rooms only when you open it and Save. All copy is draft.
import { INGREDIENTS } from '../gen/ingredients.js';
import { generate, normalize, recipeLabel, LIMITS } from '../gen/generate.js';
import { stampOf } from '../level/room.js';
import { S } from '../editor/state.js';
import { thumbURL } from '../view/thumb.js';
import { $ } from './dom.js';
import { change } from './undo.js';
import { dirty, remember, syncRoomsButton } from './rooms.js';
import { icon } from './icons.js';
import { current, back } from './nav.js';
import { TOOLS, GROUPS } from '../editor/palette.js';
import { SIMPLE } from './panels.js';

const SHELF = 'wee.generated', FORM = 'wee.genForm', KEEP = 20, SLICE_MS = 25;
const CHOICES = [['', 'Off'], ['allowed', 'Allowed'], ['must', 'Must use']];
// Ingredients that are not a palette tool borrow the icon and section of the tool they are about.
const ING_ICON = { door: 'door', and: 'button', colours: 'door' };
const ING_GROUP = { follow: 'pieces', mounted: 'pieces' };
const ING_COLOUR = { colours: 'blue' };
export const ingGroup = g => ING_GROUP[g.id] || (TOOLS.find(t => t.id === (ING_ICON[g.id] || g.id)) || {}).group;
// What the Sandbox open now can place (register 379): the menu's Sandbox has the campaign's pieces and no
// powers, so the generator offers only those; ?sandbox offers everything.
const offered = g => !S.simple || (!g.power && SIMPLE.includes(ING_ICON[g.id] === 'button' ? 'door' : ING_ICON[g.id] || g.id));
function showOffered() {
  for (const li of $('genIng').querySelectorAll('.genSec')) {
    let any = false;
    for (const sel of li.querySelectorAll('select')) { const on = offered(INGREDIENTS.find(g => g.id === sel.dataset.id)); sel.closest('li').hidden = !on; if (!on) { sel.value = ''; sel.dataset.off = '1'; } any ||= on; }
    li.hidden = !any;
  }
}
let A = null, run = 0, shown = null;

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage off or full */ } };
export const shelf = () => read(SHELF, []);
const newSeed = () => 1 + Math.floor(Math.random() * 999999);
const say = t => { $('genSay').textContent = t; };

function recipeFromForm() {
  const ing = {};
  const off = [];
  for (const sel of $('genIng').querySelectorAll('select')) if (sel.value) ing[sel.dataset.id] = sel.value; else if (sel.dataset.off) off.push(sel.dataset.id);
  const base = $('genKeep').checked && S.level ? { base: structuredClone(S.level) } : {};
  return normalize({ w: $('genW').value, h: $('genH').value, min: $('genMin').value, max: $('genMax').value, seed: $('genSeed').value, ing, off, ...base });
}

// The form shows the recipe as normalize() leaves it, so a brought-along ingredient shows
// as Allowed and a number out of range shows its nearest allowed value. One you set Off
// yourself stays Off, even when something else would bring it along.
// Completing the room on screen takes its size, so Width and Height only show it.
function fillForm(r) {
  $('genKeep').checked = !!r.base; $('genW').disabled = $('genH').disabled = !!r.base;
  $('genW').value = r.w; $('genH').value = r.h; $('genMin').value = r.min; $('genMax').value = r.max; $('genSeed').value = r.seed;
  for (const sel of $('genIng').querySelectorAll('select')) { sel.value = r.ing[sel.dataset.id] || ''; if ((r.off || []).includes(sel.dataset.id)) sel.dataset.off = '1'; else delete sel.dataset.off; }
}

function verdictText(entry) {
  const { recipe, verdict: v } = entry, names = id => INGREDIENTS.find(g => g.id === id).label;
  if (v.status !== 'solved') return v.status === 'off' ? 'Closest room holds something set to Off.' : 'Closest room has no solution yet.';
  const lines = [`Par ${v.par}.`];
  if (v.par < recipe.min || v.par > recipe.max) lines.push(`Wanted ${recipe.min} to ${recipe.max} moves.`);
  if (v.missing.length) lines.push(`Works the same without: ${v.missing.map(names).join(', ')}.`);
  return lines.join(' ');
}

function show(entry) {
  shown = entry;
  $('genResult').hidden = !entry;
  if (!entry) return;
  $('genThumb').src = thumbURL(entry.level);
  $('genInfo').textContent = `${entry.fit ? 'Fits.' : 'Closest so far.'} ${verdictText(entry)}`;
}

function renderShelf() {
  const list = shelf();
  $('genShelf').replaceChildren(...(list.length ? list.map(entry => {
    const li = document.createElement('li'), b = document.createElement('button'), img = new Image(), text = document.createElement('span');
    b.type = 'button'; b.className = 'roomRow';
    img.src = thumbURL(entry.level); img.className = 'thumb'; img.alt = '';
    const name = document.createElement('b'), small = document.createElement('small');
    name.textContent = recipeLabel(entry.recipe);
    small.textContent = `${entry.fit ? 'Fits' : 'Closest'}, par ${entry.verdict.par ?? '-'}, seed ${entry.recipe.seed}`;
    text.append(name, small);
    b.append(img, text);
    b.onclick = () => { fillForm(entry.recipe); show(entry); };
    li.append(b);
    return li;
  }) : [Object.assign(document.createElement('li'), { className: 'empty', textContent: 'Nothing generated yet.' })]));
}

function keep(entry) {
  write(SHELF, [entry, ...shelf()].slice(0, KEEP));
  renderShelf();
}

function setRunning(on) {
  $('genGo').disabled = on; $('genAgain').disabled = on;
  $('genStop').hidden = !on;
}

// Runs one recipe until it fits, the time runs out, or Stop. A newer run ends an older one.
export function start(recipe, seconds) {
  const my = ++run, out = {}, it = generate(recipe, { out }), until = performance.now() + seconds * 1000;
  const { base, ...form } = recipe;
  write(FORM, { recipe: { ...form, keep: !!base }, seconds });
  setRunning(true); show(null);
  say('Trying...');
  const finish = res => {
    setRunning(false);
    const entry = { recipe, level: res.level, verdict: res.verdict, fit: res.fit, at: new Date().toISOString() };
    say(res.fit ? `Found one after ${res.tries} ${res.tries === 1 ? 'try' : 'tries'}.` : `Nothing fit after ${res.tries} tries, so here is the closest.`);
    keep(entry); show(entry);
  };
  const slice = () => {
    if (my !== run) return;
    const stop = performance.now() + SLICE_MS;
    for (;;) {
      const r = it.next();
      if (r.done) { finish(r.value); return; }
      if (performance.now() > until || $('genStop').dataset.stop === String(my)) {
        if (!out.best) { setRunning(false); say('Stopped before the first room was judged.'); return; }
        finish({ fit: false, level: out.best.level, verdict: out.best.verdict, tries: out.tries });
        return;
      }
      if (performance.now() > stop) break;
    }
    say(`Trying... ${out.tries} rooms`);
    setTimeout(slice, 0);
  };
  slice();
}

// Replaces the room in the editor with a generated one, as one undo step. A room with
// unsaved changes asks twice first.
export function openInEditor(entry) {
  if (dirty()) {
    const name = S.room && S.room.name ? `"${S.room.name}"` : 'this unsaved room';
    if (!confirm('Open the generated room instead of this one, and lose its changes?')) return false;
    if (!confirm(`Replace ${name}? Undo brings back its unsaved changes.`)) return false;
  }
  if (S.mode !== 'edit') A.setMode('edit');
  const prev = S.room, prevStamp = stampOf(S.level);
  change(() => { S.level = structuredClone(entry.level); });
  S.room = { id: null, name: '', note: '', solution: entry.fit ? entry.verdict.moves : null, recipe: entry.recipe, saved: stampOf(S.level), edited: false };
  S.genPrev = { prev, prevStamp, gen: S.room, genStamp: S.room.saved };
  remember(null);
  A.syncPanel(); A.fit(); syncRoomsButton();
  $('genBox').close();
  $('placeHint').textContent = 'To keep this generated room, name it and Save.';
  return true;
}

export function buildGenerator(actions) {
  A = actions;
  for (const [id, [lo, hi]] of [['genW', LIMITS.size], ['genH', LIMITS.size], ['genMin', LIMITS.moves], ['genMax', LIMITS.moves]]) { $(id).min = lo; $(id).max = hi; }
  // Ingredients in the palette's own sections, each with the palette's icon, then the powers.
  const item = g => {
    const li = document.createElement('li'), label = document.createElement('label'), sel = document.createElement('select');
    sel.dataset.id = g.id;
    sel.append(...CHOICES.filter(([v]) => !(g.allowedOnly && v === 'must')).map(([v, t]) => new Option(t, v)));
    sel.setAttribute('aria-label', g.label);
    sel.onchange = () => { if (sel.value) delete sel.dataset.off; else sel.dataset.off = '1'; fillForm(recipeFromForm()); };
    label.title = g.allowedOnly ? `${g.label}. ${g.allowedOnly}` : g.label;
    if (g.power) label.append(Object.assign(document.createElement('span'), { className: 'genName', textContent: g.label }));
    else label.append(icon(ING_ICON[g.id] || g.id, ING_COLOUR[g.id]));
    label.append(sel);
    li.append(label);
    return li;
  };
  const sections = [...GROUPS.map(([id, name]) => [name, INGREDIENTS.filter(g => !g.power && ingGroup(g) === id)]), ['Powers', INGREDIENTS.filter(g => g.power)]];
  $('genIng').replaceChildren(...sections.filter(([, gs]) => gs.length).map(([name, gs]) => {
    const sec = document.createElement('li'), list = document.createElement('ul');
    sec.className = 'genSec'; list.className = 'genItems';
    sec.dataset.section = name;
    list.append(...gs.map(item));
    sec.append(Object.assign(document.createElement('h4'), { textContent: name }), list);
    return sec;
  }));
  const saved = read(FORM, null);
  fillForm(normalize(saved ? saved.recipe : { seed: newSeed() }));
  $('genKeep').checked = $('genW').disabled = $('genH').disabled = !!(saved && saved.recipe.keep);
  $('genKeep').onchange = () => fillForm(recipeFromForm());
  $('genTime').value = saved ? saved.seconds : 15;
  const open = () => { if (current()?.name === 'rooms') back('room'); showOffered(); if ($('genKeep').checked) fillForm(recipeFromForm()); renderShelf(); show(shown); say(''); $('genBox').showModal(); };
  $('roomGen').onclick = $('genBtn').onclick = open;
  $('genReroll').onclick = () => { $('genSeed').value = newSeed(); };
  const seconds = () => Math.max(5, Math.min(60, +$('genTime').value || 15));
  $('genGo').onclick = () => { const r = recipeFromForm(); fillForm(r); start(r, seconds()); };
  $('genAgain').onclick = () => { $('genSeed').value = newSeed(); $('genGo').onclick(); };
  $('genStop').onclick = () => { $('genStop').dataset.stop = String(run); };
  $('genOpen').onclick = () => { if (shown) openInEditor(shown); };
}
