// Editing a level in place: what a tile holds, the Look line, and placing or removing
// with the current tool. Returns what changed so the caller can animate it.
import { CLOCKWISE, CARRIES_TURRET } from '../rules/base.js';
import { TOOLS, COLOUR_NAME, CLOCK_NAME, ARROW, CORNER_NAME } from './palette.js';

const idx = (level, x, y) => y * level.w + x;
const pieceAt = (level, x, y) => level.entities.findIndex(e => e.x === x && e.y === y);

// Does (x, y) already hold the kind of thing this tool places?
export function holds(level, x, y, tool) {
  const c = level.cells[idx(level, x, y)], pc = level.entities[pieceAt(level, x, y)];
  if (tool === 'wall' || tool === 'checkpoint' || tool === 'death' || tool === 'water' || tool === 'sticky') return c === tool;
  if (tool === 'spring') return c.startsWith('spring:');
  if (tool === 'button' || tool === 'door' || tool === 'tri' || tool === 'receiver' || tool === 'sensor' || tool === 'gate') return c.startsWith(tool + ':');
  if (tool === 'turret') return !!pc && (pc.kind === 'turret' || !!pc.turret);
  return !!pc && pc.kind === tool;
}


// The Look tool's one line about a tile: what is on it and how it is set.
export function describe(level, x, y) {
  const c = level.cells[idx(level, x, y)], pc = level.entities[pieceAt(level, x, y)], parts = [];
  if (pc) {
    const name = TOOLS.find(t => t.id === pc.kind)?.label || pc.kind;
    parts.push(['mover', 'enemy', 'strong'].includes(pc.kind)
      ? `${name} \u00b7 ${pc.mode === 'follow' ? '' : (pc.axis === 'h' ? 'across \u00b7 ' : 'up and down \u00b7 ')}${CLOCK_NAME[pc.mode]}` : name);
    if (pc.turret && pc.kind !== 'turret') parts.push('carries a turret');
    if (pc.turret) parts.push(`fires ${pc.turret.dirs.map(d => ARROW[d]).join(' ')} \u00b7 ${CLOCK_NAME[pc.turret.mode]}`);
  }
  if (c) {
    const [kind, v] = c.split(':');
    if (kind === 'wall') parts.push('Block');
    else if (kind === 'checkpoint') parts.push('Checkpoint');
    else if (kind === 'tri') parts.push(`Triangle, solid ${CORNER_NAME[v]}`);
    else if (kind === 'death') parts.push('Death block');
    else if (kind === 'water') parts.push('Water');
    else if (kind === 'sticky') parts.push('Sticky puddle');
    else if (kind === 'spring') parts.push(`Spring ${ARROW[v]}`);
    else if (kind === 'gate') parts.push(`One-way ${v.split(',').map(d => ARROW[d]).join(' ')}`);
    else if (kind === 'sensor') parts.push(`${COLOUR_NAME[v]} laser relay`);
    else if (kind === 'receiver') parts.push(`${COLOUR_NAME[v]} laser catcher`);
    else parts.push(`${COLOUR_NAME[v]} ${kind}`);
  }
  if (level.start.x === x && level.start.y === y) parts.push('Start');
  return parts.length ? parts.join(' \u00b7 ') : 'Empty floor';
}


// how: 'place', 'remove' (only what this tool places) or 'erase' (anything).
// Returns the effects to show: what was taken off the tile, and a pop where it placed.
export function place(level, ui, x, y, how) {
  const out = [];
  if (how === 'remove' && !holds(level, x, y, ui.tool)) return out;
  if (how === 'place' && holds(level, x, y, ui.tool)) return out;
  const t = how === 'erase' ? 'erase' : how === 'remove' ? 'remove' : ui.tool, i = idx(level, x, y), pi = pieceAt(level, x, y);
  const gone = { type: 'erase', x, y };
  const removePiece = () => { if (pi >= 0) { gone.piece = level.entities[pi]; level.entities.splice(pi, 1); } };
  const setCell = c => { if (level.cells[i] !== c) { if (level.cells[i]) gone.cell = level.cells[i]; level.cells[i] = c; } };
  const isStart = level.start.x === x && level.start.y === y;
  if (t === 'erase') {
    if (pi >= 0) removePiece(); else setCell('');
  } else if (t === 'remove') {
    const host = pi >= 0 ? level.entities[pi] : null;
    if (ui.tool === 'turret' && host && host.kind !== 'turret') { gone.piece = { ...host }; delete host.turret; }
    else if (['wall', 'checkpoint', 'button', 'door', 'tri', 'receiver', 'sensor', 'gate', 'spring', 'death', 'water', 'sticky'].includes(ui.tool)) setCell('');
    else removePiece();
  } else if (t === 'spring' || t === 'death') {
    if (isStart) return out;
    removePiece(); setCell(t === 'death' ? 'death' : 'spring:' + ui.face);
  } else if (t === 'water' || t === 'sticky') {
    if (isStart) return out;
    setCell(t);
  } else if (t === 'gate') {
    if (isStart) return out;
    removePiece(); setCell('gate:' + CLOCKWISE.filter(d => ui.pass.includes(d)).join(','));
  } else if (t === 'tri') {
    if (isStart) return out;
    removePiece(); setCell('tri:' + ui.corner);
  } else if (t === 'start') {
    if (level.cells[i] === 'wall' || level.cells[i].startsWith('door:')) setCell('');
    removePiece();
    level.start = { x, y };
  } else if (t === 'wall') {
    if (isStart) return out;
    removePiece(); setCell('wall');
  } else if (t === 'checkpoint' || t === 'button' || t === 'door' || t === 'receiver' || t === 'sensor') {
    if ((t === 'door' || t === 'receiver') && isStart) return out;
    if (t === 'door' || t === 'receiver') removePiece();
    setCell(t === 'checkpoint' ? 'checkpoint' : t + ':' + ui.colour);
  } else if (t === 'turret') {
    if (isStart) return out;
    const turret = { dirs: CLOCKWISE.filter(d => ui.aim.includes(d)), mode: ui.mode };
    const host = pi >= 0 ? level.entities[pi] : null;
    if (host && (CARRIES_TURRET.includes(host.kind) || host.kind === 'turret')) {
      if (JSON.stringify(host.turret) === JSON.stringify(turret)) return out;
      host.turret = turret;
    } else {
      removePiece();
      if (level.cells[i] === 'wall' || level.cells[i].startsWith('door:')) setCell('');
      level.entities.push({ kind: 'turret', x, y, turret });
    }
  } else {
    if (isStart) return out;
    const want = { kind: t, x, y, ...(t === 'mover' || t === 'enemy' || t === 'strong' ? { axis: ui.axis, dir: 1, mode: ui.mode } : {}) };
    if (pi >= 0 && JSON.stringify(level.entities[pi]) === JSON.stringify(want)) return out;
    removePiece();
    if (level.cells[i] === 'wall' || level.cells[i].startsWith('door:')) setCell('');
    level.entities.push(want);
  }
  if (gone.cell || gone.piece) out.push(gone);
  if (t !== 'erase' && t !== 'remove') out.push({ type: 'place', x, y });
  return out;
}
