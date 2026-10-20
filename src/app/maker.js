// The Level maker (register 302): pick the palette (in or out, a minimum, a maximum), the goals
// and the optional goals; Build it opens it like a campaign level, judged by the robot.
import { ELEMENTS } from '../campaign/rules.js';
import { REQUIREMENTS } from '../campaign/requirements.js';
import { madeLevels, saveMade, onMakerBack } from './made.js';
import { enterLevel } from './campaign.js';
import { $ } from './dom.js';

const ELS = Object.keys(ELEMENTS);
// A goal is offered when every element its short line draws is in the palette (the robot is always there).
const needs = id => REQUIREMENTS[id].short.filter(p => p && p.el && p.el !== 'start').map(p => p.el);
let editing = null;

function palRows(def) {
  $('makerPal').replaceChildren(...ELS.map(el => {
    const tr = document.createElement('tr'), [min, max] = def.palette[el] || [0, null], on = el in def.palette;
    tr.dataset.el = el;
    tr.innerHTML = `<td><label><input type="checkbox" data-in> ${ELEMENTS[el].label}</label></td><td><input type="number" min="0" data-min></td><td><input type="number" min="0" placeholder="any" data-max></td>`;
    tr.querySelector('[data-in]').checked = on;
    tr.querySelector('[data-min]').value = on ? min : 0;
    tr.querySelector('[data-max]').value = on && max != null ? max : '';
    tr.querySelector('[data-in]').onchange = goalRows;
    return tr;
  }));
}
const palette = () => Object.fromEntries([...$('makerPal').children].filter(tr => tr.querySelector('[data-in]').checked).map(tr => {
  const min = Math.max(0, +tr.querySelector('[data-min]').value || 0), m = tr.querySelector('[data-max]').value;
  return [tr.dataset.el, [min, m === '' ? null : Math.max(min, +m)]];
}));
let picked = {};
function goalRows() {
  const have = new Set(Object.keys(palette()));
  for (const li of $('makerGoals').children) picked[li.dataset.goal] = li.querySelector('select').value;
  $('makerGoals').replaceChildren(...Object.keys(REQUIREMENTS).filter(id => needs(id).every(el => have.has(el))).map(id => {
    const li = document.createElement('li'); li.dataset.goal = id;
    li.innerHTML = `<select aria-label="Use"><option value="">Not used</option><option value="require">Required</option><option value="optional">Optional</option></select><span></span>`;
    li.querySelector('span').textContent = REQUIREMENTS[id].text;
    li.querySelector('select').value = picked[id] || '';
    return li;
  }));
}
function fill(def) {
  editing = def.id || null; picked = {};
  for (const id of def.require || []) picked[id] = 'require';
  for (const id of def.optional || []) picked[id] = 'optional';
  $('makerName').value = def.name || '';
  $('makerTwo').checked = !!(def.colours && def.colours.length > 1);
  $('makerBest').value = def.steps && def.steps.best != null ? def.steps.best : '';
  $('makerW').value = def.small ? def.small[0] : ''; $('makerH').value = def.small ? def.small[1] : '';
  $('makerDelete').hidden = !editing; $('makerSay').textContent = '';
  palRows(def); goalRows();
}
const blank = () => ({ palette: { block: [0, null] }, require: [], optional: [] });
function listMade() {
  $('madeList').replaceChildren(...madeLevels().map(def => {
    const li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.className = 'campRow'; b.dataset.made = def.id;
    b.append(Object.assign(document.createElement('b'), { textContent: def.name }), Object.assign(document.createElement('small'), { textContent: `${def.require.length} goals, ${Object.keys(def.palette).length} elements` }));
    b.onclick = () => fill(def);
    li.append(b); return li;
  }));
}
export function openMaker() {
  for (const id of ['menuBox', 'campBox']) if ($(id).open) $(id).close();
  listMade(); if (!editing) fill(blank());
  if (!$('makerBox').open) $('makerBox').showModal();
}
function build() {
  const pal = palette(), list = madeLevels();
  for (const li of $('makerGoals').children) picked[li.dataset.goal] = li.querySelector('select').value;
  const shown = new Set([...$('makerGoals').children].map(li => li.dataset.goal));
  const ids = k => Object.keys(picked).filter(id => picked[id] === k && shown.has(id));
  if (!ids('require').length) { $('makerSay').textContent = 'Pick at least one required goal.'; return; }
  const best = +$('makerBest').value || null, w = +$('makerW').value, h = +$('makerH').value, small = w >= 1 && h >= 1 ? [w, h] : null;
  const id = editing || 'm' + (Math.max(0, ...list.map(l => +l.id.slice(1))) + 1);
  const def = { id, made: true, name: $('makerName').value.trim() || `My level ${id.slice(1)}`, size: [7, 7], palette: pal, steps: best ? { best } : {}, rules: [], require: ids('require'), optional: ids('optional'), ...(small ? { small } : {}), ...($('makerTwo').checked ? { colours: ['red', 'blue'] } : {}) };
  saveMade([...list.filter(l => l.id !== id), def]);
  editing = id;
  $('makerBox').close();
  enterLevel(id);
}

export function buildMaker() {
  onMakerBack(openMaker);
  $('menuMaker').onclick = openMaker;
  $('makerMenu').onclick = () => { $('makerBox').close(); $('menuBox').showModal(); };
  $('makerNew').onclick = () => fill(blank());
  $('makerBuild').onclick = build;
  $('makerDelete').onclick = () => { if (!editing || !confirm('Delete this level? This cannot be undone.')) return; saveMade(madeLevels().filter(l => l.id !== editing)); fill(blank()); listMade(); };
}
