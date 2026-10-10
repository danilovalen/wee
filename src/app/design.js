// Design notes, after a Check: what each power and each piece or tile does to the answer,
// how many shortest routes there are, and how many positions trap you. Runs a slice at a
// time and stops when the room changes. All copy is draft.
import { powerCheck, elementCheck, routes } from '../solve/design.js';
import { S } from '../editor/state.js';
import { $, now } from './dom.js';

const SLICE_MS = 25, MAX = 5000;
const NAME = { boomerang: 'Boomerang', dive: 'Dive', laser: 'Laser', cycle: 'Cycle', swim: 'Swim', armored: 'Armored' };
const PIECE = { box: 'box', heavy: 'heavy box', mover: 'moving block', enemy: 'weak enemy', strong: 'strong enemy', turret: 'turret', button: 'button', door: 'door', idoor: 'inverted door', receiver: 'laser catcher', sensor: 'laser relay', tri: 'triangle', gate: 'one-way', spring: 'spring', death: 'death block', water: 'water', sticky: 'sticky puddle', checkpoint: 'checkpoint' };
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

export function clearDesign() {
  S.design = null;
  $('designBox').hidden = true;
  $('designList').replaceChildren();
}

// Called with a finished check of a solvable room.
export function runDesign(par) {
  const level = JSON.parse(JSON.stringify(S.level)), stamp = JSON.stringify(level), list = $('designList');
  S.design = { stamp, unused: [], traps: null, working: true };
  list.replaceChildren(line('Working out the design notes...'));
  $('designBox').hidden = false;
  const lines = [];
  const show = () => { S.design.working = false; list.replaceChildren(...lines); };
  sliced(routes(level), stamp, r => {
    if (r) {
      S.design.traps = r.traps;
      lines.push(line(`${r.routes} shortest ${r.routes === 1 ? 'route' : 'routes'}.`), line(`${r.dead} of ${r.positions} positions can no longer reach the goal.`));
    } else lines.push(line('Too many positions to count routes and dead ends.'));
    show();
    sliced(powerCheck(level, MAX), stamp, ps => {
      const idle = ps.filter(p => p.without === par);
      for (const p of ps) if (p.without !== par) lines.push(line(`Without ${NAME[p.power]}: ${moves(p.without)} instead of ${par}.`));
      if (idle.length) lines.push(line(`Without ${idle.map(p => NAME[p.power]).join(', ')}: no change.`));
      show();
      sliced(elementCheck(level, MAX), stamp, es => {
        const name = e => `${PIECE[e.what] || e.what} at ${e.x}, ${e.y}`;
        const unused = es.filter(e => e.without === par), plain = es.filter(e => e.without !== par && e.standIn === par);
        S.design.unused = [...unused, ...plain];
        S.redraw = true;
        if (unused.length) lines.push(line(`Without these, nothing changes: ${unused.map(name).join('; ')}.`, unused));
        const walls = plain.filter(e => e.as === 'wall'), turrets = plain.filter(e => e.as === 'turret');
        if (walls.length) lines.push(line(`As a wall, these do the same job: ${walls.map(name).join('; ')}.`, walls));
        if (turrets.length) lines.push(line(`As a fixed turret, these do the same job: ${turrets.map(name).join('; ')}.`, turrets));
        if (!unused.length && !plain.length) lines.push(line('Each piece and tile changes the answer, and nothing could be a plain wall instead.'));
        show();
      });
    });
  });
}
