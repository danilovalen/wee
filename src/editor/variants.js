// The ways round a piece can be set, and how to say one (registers 728, 767).
import { CLOCKWISE, CORNERS } from '../rules/base.js';

// Every way round a piece can be set (register 728): a one-way's and a turret's directions turned, a
// slope's corner, a spring's face, a mover's axis and way. One setting for a piece that has no direction.
const turn = list => [0, 1, 2, 3].map(k => list.map(d => CLOCKWISE[(CLOCKWISE.indexOf(d) + k) % 4]));
export function variants(ui) {
  const t = ui.tool, all = t === 'gate' ? turn(ui.pass).map(pass => ({ ...ui, pass })) : t === 'turret' ? turn(ui.aim).map(aim => ({ ...ui, aim }))
    : t === 'tri' ? CORNERS.map(corner => ({ ...ui, corner })) : t === 'spring' ? CLOCKWISE.map(face => ({ ...ui, face }))
      : ['mover', 'enemy', 'strong'].includes(t) ? [['h', 1], ['h', -1], ['v', 1], ['v', -1]].map(([axis, dir]) => ({ ...ui, axis, dir }))
        // A door is tried plain and inverted, a switch off and on (register 767).
        : t === 'door' ? [{ ...ui, inverted: false }, { ...ui, inverted: true }] : t === 'toggle' ? [{ ...ui, on: false }, { ...ui, on: true }] : [ui];
  const seen = new Set();
  return all.filter(u => { const k = JSON.stringify([u.pass && CLOCKWISE.filter(d => u.pass.includes(d)), u.aim && CLOCKWISE.filter(d => u.aim.includes(d)), u.corner, u.face, u.axis, u.dir, u.inverted, u.on]); return !seen.has(k) && seen.add(k); });
}
// Which way round, in words, for the sentence.
const WAY = { up: 'up', right: 'right', down: 'down', left: 'left', nw: 'up and left', ne: 'up and right', sw: 'down and left', se: 'down and right' };
const ways = l => CLOCKWISE.filter(d => l.includes(d)).join(' and ');
export function wayOf(ui) {
  const t = ui.tool;
  if (t === 'gate') return `pointing ${ways(ui.pass)}`;
  if (t === 'turret') return `aiming ${ways(ui.aim)}`;
  if (t === 'tri') return `facing ${WAY[ui.corner]}`;
  if (t === 'spring') return `facing ${ui.face}`;
  if (['mover', 'enemy', 'strong'].includes(t)) return `moving ${ui.axis === 'h' ? (ui.dir > 0 ? 'right' : 'left') : (ui.dir > 0 ? 'down' : 'up')}`;
  return '';
}

