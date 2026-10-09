// The mechanism index: what a room contains, and what its solution actually does.
// Both come from the room and the rules, never typed by hand, so the counts stay true.
import { createGame, step } from '../rules/game.js';

// Every tag, in the order the index lists them, with its label. Draft copy.
export const MECHANISMS = [
  ['tile:goal', 'Goal'], ['tile:checkpoint', 'Checkpoint'], ['tile:tri', 'Triangle'], ['tile:gate', 'One-way'],
  ['tile:spring', 'Spring'], ['tile:death', 'Death block'], ['tile:water', 'Water'], ['tile:sticky', 'Sticky puddle'],
  ['tile:button', 'Button'], ['tile:door', 'Door'], ['tile:idoor', 'Inverted door'], ['tile:receiver', 'Laser catcher'], ['tile:sensor', 'Laser relay'],
  ['piece:mover', 'Moving block'], ['piece:enemy', 'Weak enemy'], ['piece:strong', 'Strong enemy'], ['piece:turret', 'Laser turret'],
  ['piece:mounted', 'Mounted turret'], ['piece:box', 'Box'], ['piece:heavy', 'Heavy box'],
  ['clock:input', 'On your move'], ['clock:follow', 'Same way as you'], ['clock:realtime', 'Real time'],
  ['power:boomerang', 'Boomerang'], ['power:dive', 'Dive'], ['power:laser', 'Laser'], ['power:cycle', 'Cycle (hide)'],
  ['power:swim', 'Swim'], ['power:armored', 'Armored'],
  ['wiring:and', 'Two switches, one colour'], ['wiring:colours', 'Two or more colours'],
  ['use:push', 'You push a box'], ['use:pushed', 'A block pushes you'], ['use:spring', 'A spring launches'],
  ['use:door-opens', 'A door opens'], ['use:idoor-closes', 'An inverted door closes'], ['use:lit', 'A beam lights a switch'],
  ['use:door-kill', 'A door squashes a piece'], ['use:squash', 'A heavy box breaks something'], ['use:death', 'A piece falls into death'],
  ['use:beam-kill', 'A beam kills an enemy'], ['use:stick', 'You stick to something'], ['use:glue', 'Pieces glue together'],
  ['use:hide', 'You hide'], ['use:swim', 'You swim'], ['use:checkpoint', 'You reach a checkpoint'],
  ['use:tri', 'A triangle turns you'], ['use:gate', 'You pass a one-way'],
];
export const LABEL = Object.fromEntries(MECHANISMS);

// What the room holds, read off the level.
export function contains(level) {
  const tags = new Set();
  const colours = {};
  for (const c of level.cells) {
    if (!c || c === 'wall') continue;
    const [kind, v] = c.split(':');
    if (LABEL['tile:' + kind]) tags.add('tile:' + kind);
    if (['button', 'receiver', 'sensor'].includes(kind)) colours[v] = (colours[v] || 0) + 1;
  }
  for (const e of level.entities) {
    if (LABEL['piece:' + e.kind]) tags.add('piece:' + e.kind);
    if (e.turret && e.kind !== 'turret') tags.add('piece:mounted');
    const clock = e.turret ? e.turret.mode : e.mode;
    if (clock && ['mover', 'enemy', 'strong', 'turret'].includes(e.kind) || e.turret) tags.add('clock:' + (clock || 'input'));
  }
  for (const p of ['boomerang', 'dive', 'laser', 'cycle', 'swim', 'armored']) if (level.powers[p]) tags.add('power:' + p);
  if (Object.values(colours).some(n => n > 1)) tags.add('wiring:and');
  if (Object.keys(colours).length > 1) tags.add('wiring:colours');
  return [...tags];
}

const EVENT_TAG = { pushed: 'use:pushed', spring: 'use:spring', stick: 'use:stick', glue: 'use:glue', hide: 'use:hide', checkpoint: 'use:checkpoint' };
const KILL_TAG = { door: 'use:door-kill', squash: 'use:squash', death: 'use:death', turret: 'use:beam-kill', laser: 'use:beam-kill' };

// What the solution does: the room replayed move by move, watching events and state.
export function uses(level, moves) {
  const tags = new Set(), s = createGame(level), at = (x, y) => s.cells[y * s.w + x];
  const busy = () => s.player.dir || s.player.hidden || s.entities.some(e => !e.dead && (e.rush || e.slide));
  const watch = () => {
    for (const ev of s.events) {
      if (EVENT_TAG[ev.type]) tags.add(EVENT_TAG[ev.type]);
      if (ev.type === 'kill' && KILL_TAG[ev.how]) tags.add(KILL_TAG[ev.how]);
    }
    const p = s.player, c = at(p.x, p.y);
    if (p.pushing) tags.add('use:push');
    if (p.swimming && c === 'water') tags.add('use:swim');
    if (c.startsWith('tri:')) tags.add('use:tri');
    if (c.startsWith('gate:')) tags.add('use:gate');
    for (const [col, on] of Object.entries(s.open)) {
      if (!on) continue;
      if (s.cells.includes('door:' + col)) tags.add('use:door-opens');
      if (s.cells.includes('idoor:' + col)) tags.add('use:idoor-closes');
    }
    for (const i of s.lit) if (/^(sensor|receiver):/.test(s.cells[i])) tags.add('use:lit');
  };
  for (const k of moves) {
    step(s, [k]); watch();
    for (let i = 0; i < 4 * s.w * s.h + 40 && busy(); i++) { step(s); watch(); }
  }
  return [...tags];
}
