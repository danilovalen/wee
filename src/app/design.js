// Design notes, after a Check: what each power and each piece or tile does to the answer,
// how many shortest routes there are, and how many positions trap you. Runs a slice at a
// time and stops when the room changes. All copy is draft.
import { powerCheck, elementCheck, wallCheck, baitCheck, routes, idleElements, NOTES_MAX } from '../solve/design.js';
import { roomMetrics } from '../solve/metrics.js';
import { metricLines, reuseText, pathReuseText } from './metricLines.js';
import { reuse } from '../solve/flow.js';
import { S } from '../editor/state.js';
import { $, now } from './dom.js';
import { syncWell } from './well.js';
import { trimRoom } from '../solve/shape.js';
import { removeBest, offerLine, trimText, removeText } from './shape.js';

const SLICE_MS = 25, MAX = NOTES_MAX;
const NAME = { boomerang: 'Boomerang', dive: 'Dive', laser: 'Laser', cycle: 'Cycle', swim: 'Swim', armored: 'Armored' };
const PIECE = { box: 'box', heavy: 'heavy box', bomb: 'bomb', mover: 'moving block', enemy: 'weak enemy', strong: 'strong enemy', turret: 'turret', button: 'button', toggle: 'switch', door: 'door', idoor: 'inverted door', sensor: 'laser relay', tri: 'triangle', gate: 'one-way', spring: 'spring', death: 'death block', water: 'water', sticky: 'sticky puddle', gravel: 'gravel', checkpoint: 'checkpoint' };
const moves = n => typeof n === 'number' ? `${n} ${n === 1 ? 'move' : 'moves'}` : n === 'unsolvable' ? 'no solution' : 'too many positions to tell';

// Runs one generator to the end in slices, then calls done; gives up when the room changes.
export function sliced(it, stamp, done) {
  const slice = () => {
    if (JSON.stringify(S.level) !== stamp) return;
    const until = performance.now() + SLICE_MS;
    for (;;) { const r = it.next(); if (r.done) { done(r.value); return; } if (performance.now() > until) break; }
    setTimeout(slice, 0);
  };
  slice();
}

function line(text, spots = []) {
  const li = document.createElement('li');
  if (!spots.length) { li.textContent = text; return li; }
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = text;
  b.onclick = () => { for (const s of spots) S.fx.push({ type: 'flash', x: s.x, y: s.y, at: now() }); };
  li.append(b);
  return li;
}

// The room changed: the notes stay where they are, dimmed, until a Check replaces them, so
// the well never empties and refills on every edit.
// A room just opened (nothing to undo yet) is another room: its notes go altogether.
export function clearDesign(fresh = false) {
  S.design = null; delete $('designBox').dataset.done;
  if (fresh) { $('designBox').hidden = true; $('designList').replaceChildren(); $('designBox').classList.remove('stale'); return; }
  $('designBox').classList.add('stale');
}

// Called with a finished check of a solvable room. The notes come in three parts (register 730): first what
// can be changed (Trim and Remove one, worked out first, then idle and bait pieces), then the four numbers
// the owner reads (moves, routes, traps, reuse), then the other notes; the rest of the measures sit behind
// one tap. The notes are swapped in once, when all of it is worked out, so nothing flickers.
export function runDesign(par) {
  const level = JSON.parse(JSON.stringify(S.level)), stamp = JSON.stringify(level), list = $('designList');
  S.design = { stamp, unused: [], traps: null };
  delete $('designBox').dataset.done;
  if ($('designBox').hidden) { const w = line('Working out the design notes...'); w.className = 'working'; list.replaceChildren(w); $('designBox').hidden = false; }
  const offers = [], notes = [], more = [], nums = { Moves: par, Routes: '...', Traps: '...', Reuse: '...' };
  const swap = () => { $('designBox').classList.remove('stale'); list.replaceChildren(...offers, numbers(nums), ...notes, moreButton(more.length), ...more); syncWell(); };
  const metric = t => { const li = typeof t === 'string' ? line(t) : line(t.text, t.spots); li.className = 'metric'; more.push(li); };
  sliced(routes(level), stamp, r => {
    if (r) { S.design.traps = r.traps; nums.Routes = r.routes; nums.Traps = r.dead; } else nums.Routes = nums.Traps = '?';
    sliced(trimRoom(level, MAX), stamp, t => { offers.push(offerLine(trimText(t), t));
    sliced(removeBest(level), stamp, rm => { offers.push(offerLine(removeText(rm), rm));
    sliced(reuse(level, MAX), stamp, ru => { nums.Reuse = ru ? `${ru.busiest}×` : '?'; nums.reuseOf = ru ? `${ru.blocks} ${ru.blocks === 1 ? 'block' : 'blocks'}` : ''; metric(reuseText(ru)); if (ru) metric(pathReuseText(ru));
    sliced(roomMetrics(level), stamp, m => { metricLines(m).forEach(metric);
    sliced(powerCheck(level, MAX), stamp, ps => {
      const idle = ps.filter(p => p.without === par);
      for (const p of ps) if (p.without !== par) notes.push(line(`Without ${NAME[p.power]}: ${moves(p.without)} instead of ${par}.`));
      if (idle.length) notes.push(line(`Without ${idle.map(p => NAME[p.power]).join(', ')}: the same.`));
      sliced(elementCheck(level, MAX), stamp, es => {
        const name = e => `${PIECE[e.what] || e.what} at ${e.x}, ${e.y}`;
        const { unused, plain } = idleElements(es, par);
        S.design.unused = [...plain];
        const walls = plain.filter(e => e.as === 'wall'), turrets = plain.filter(e => e.as === 'turret');
        if (walls.length) offers.push(line(`As a wall, these do the same job: ${walls.map(name).join('; ')}.`, walls));
        if (turrets.length) offers.push(line(`As a fixed turret, these do the same job: ${turrets.map(name).join('; ')}.`, turrets));
        sliced(wallCheck(level, MAX), stamp, ws => {
        // What the answer does not need is idle, unless it changes where you can get stuck: then it is bait (692).
        sliced(baitCheck(level, [...unused, ...ws.filter(w => w.without === par)], MAX), stamp, ({ idle, bait }) => {
          const pieces = idle.filter(e => e.what !== 'wall'), walls = idle.filter(e => e.what === 'wall');
          S.design.unused.push(...idle); S.redraw = true;
          if (pieces.length) offers.push(line(`These change nothing: ${pieces.map(name).join('; ')}.`, pieces));
          if (walls.length) offers.push(line(`These walls change nothing: ${walls.map(w => `${w.x}, ${w.y}`).join('; ')}.`, walls));
          if (bait.length) offers.push(line(`These leave the answer alone but change where you can get stuck: ${bait.map(name).join('; ')}.`, bait));
          if (!idle.length && !bait.length && !plain.length) notes.push(line('Each piece, tile and wall changes the answer, and each needs to be what it is.'));
          swap(); $('designBox').dataset.done = '1';
        });
        });
      });
    });
    });
    });
    });
    });
  });
}

// The four numbers, big, each with its name under it.
function numbers(nums) {
  const li = document.createElement('li');
  li.className = 'nums';
  for (const [k, v] of Object.entries(nums)) {
    if (k === 'reuseOf') continue;
    const d = document.createElement('div');
    d.dataset.num = k.toLowerCase();
    d.append(Object.assign(document.createElement('b'), { textContent: String(v) }), Object.assign(document.createElement('small'), { textContent: k === 'Reuse' && nums.reuseOf ? `Reuse, ${nums.reuseOf}` : k }));
    li.append(d);
  }
  return li;
}
// One tap shows the other measures, another hides them.
function moreButton(n) {
  const li = document.createElement('li'), b = document.createElement('button'), all = () => $('designBox').classList.contains('all');
  li.className = 'more';
  b.type = 'button'; b.id = 'moreMeasures'; b.hidden = !n;
  const label = () => { b.textContent = all() ? 'Fewer measures' : 'All measures'; };
  b.onclick = () => { $('designBox').classList.toggle('all'); label(); };
  label(); li.append(b);
  return li;
}
