// Editing a level in place: what a tile holds, the Look line, and placing or removing
// with the current tool. Returns what changed so the caller can animate it.
import { CLOCKWISE, CARRIES_TURRET } from '../rules/base.js';
import { TOOLS, COLOUR_NAME, CLOCK_NAME, ARROW, CORNER_NAME } from './palette.js';

const idx = (level, x, y) => y * level.w + x;
const isDoor = c => c.startsWith('door:') || c.startsWith('idoor:');
const pieceAt = (level, x, y) => level.entities.findIndex(e => e.x === x && e.y === y);

// Does (x, y) already hold the kind of thing this tool places?
// Moves whatever stands on one tile to another: the start, a piece, or a tile's contents.
// Onto a tile that holds something, the two swap. Returns the new level, or null when
// either would end up where it cannot stand.
const UNDER = c => c === '' || c.startsWith('toggle:') || c.startsWith('button:');
export function moveAt(level, from, to) {
  return moveOnto(level, from, to) || swapAt(level, from, to);
}
function moveOnto(level, from, to) {
  if (from.x === to.x && from.y === to.y) return null;
  const l = structuredClone(level), fi = idx(l, from.x, from.y), ti = idx(l, to.x, to.y);
  const isStart = p => !!l.start && l.start.x === p.x && l.start.y === p.y;
  const piece = pieceAt(l, from.x, from.y), there = pieceAt(l, to.x, to.y) >= 0;
  if (isStart(from)) {
    if (there || !UNDER(l.cells[ti])) return null;
    l.start = { x: to.x, y: to.y };
  } else if (piece >= 0) {
    if (there || isStart(to) || !UNDER(l.cells[ti])) return null;
    Object.assign(l.entities[piece], { x: to.x, y: to.y });
  } else if (l.cells[fi]) {
    if (l.cells[ti] || there || isStart(to)) return null;
    l.cells[ti] = l.cells[fi]; l.cells[fi] = '';
  } else return null;
  return l;
}

// What is on top of a tile goes first (the start, then a piece), else the tile itself.
export function swapAt(level, from, to) {
  if (from.x === to.x && from.y === to.y) return null;
  const l = structuredClone(level);
  const grab = p => {
    const i = idx(l, p.x, p.y);
    if (l.start && l.start.x === p.x && l.start.y === p.y) { l.start = null; return { start: true }; }
    const k = pieceAt(l, p.x, p.y);
    if (k >= 0) return { piece: l.entities.splice(k, 1)[0] };
    if (l.cells[i]) { const cell = l.cells[i]; l.cells[i] = ''; return { cell }; }
    return null;
  };
  const a = grab(from), b = grab(to);
  if (!a || !b) return null;
  const put = (t, p) => {
    const i = idx(l, p.x, p.y);
    if (t.start) l.start = { x: p.x, y: p.y };
    else if (t.piece) l.entities.push({ ...t.piece, x: p.x, y: p.y });
    else if (l.cells[i]) return false;
    else l.cells[i] = t.cell;
    return true;
  };
  // A swap frees both tiles first, so the robot or a piece always lands where one stood or on
  // bare floor; the one refusal is a tile landing under a robot or piece left on a switch or button.
  return put(a, to) && put(b, from) ? l : null;
}

// Turns a one-way a quarter clockwise, every direction it lets through.
export function turnGate(level, x, y) {
  const i = idx(level, x, y), [ds, col] = level.cells[i].slice(5).split('@'), dirs = ds.split(',');
  level.cells[i] = 'gate:' + CLOCKWISE.filter(d => dirs.includes(CLOCKWISE[(CLOCKWISE.indexOf(d) + 3) % 4])).join(',') + (col ? '@' + col : '');
}

// Turns a laser a quarter clockwise: the way it fires (register 255).
export function turnLaser(level, x, y) {
  const e = level.entities[pieceAt(level, x, y)];
  if (e && e.turret) e.turret = { ...e.turret, dirs: e.turret.dirs.map(d => CLOCKWISE[(CLOCKWISE.indexOf(d) + 1) % 4]), start: undefined };
}

export function holds(level, x, y, tool) {
  const c = level.cells[idx(level, x, y)], pc = level.entities[pieceAt(level, x, y)];
  if (tool === 'wall' || tool === 'crack' || tool === 'checkpoint' || tool === 'death' || tool === 'water' || tool === 'sticky' || tool === 'gravel' || tool === 'goal') return c === tool;
  if (tool === 'spring') return c.startsWith('spring:');
  if (tool === 'ddoor') return /^door:\w+\|/.test(c);
  if (tool === 'door') return /^door:\w+$/.test(c);
  if (tool === 'button' || tool === 'toggle' || tool === 'idoor' || tool === 'tri' || tool === 'receiver' || tool === 'sensor' || tool === 'gate') return c.startsWith(tool + ':');
  if (tool === 'turret') return !!pc && (pc.kind === 'turret' || !!pc.turret);
  return !!pc && pc.kind === tool;
}


// The Look tool's one line about a tile: what is on it and how it is set.
export function describe(level, x, y) {
  const c = level.cells[idx(level, x, y)], pc = level.entities[pieceAt(level, x, y)], parts = [];
  if (pc) {
    const name = TOOLS.find(t => t.id === pc.kind)?.label || pc.kind;
    parts.push(['mover', 'enemy', 'strong'].includes(pc.kind)
      ? `${name}, ${pc.mode === 'follow' ? '' : (pc.axis === 'h' ? 'across, ' : 'up and down, ')}${CLOCK_NAME[pc.mode]}` : name);
    if (pc.turret && pc.kind !== 'turret') parts.push('carries a turret');
    if (pc.turret) parts.push(`fires ${pc.turret.dirs.map(d => ARROW[d]).join(' ')}, ${CLOCK_NAME[pc.turret.mode]}`);
  }
  if (c) {
    const [kind, v] = c.split(':');
    if (kind === 'wall') parts.push('Block');
    else if (kind === 'crack') parts.push('Breakable block');
    else if (kind === 'checkpoint') parts.push('Checkpoint');
    else if (kind === 'tri') parts.push(`Triangle, solid ${CORNER_NAME[v]}`);
    else if (kind === 'death') parts.push('Death block');
    else if (kind === 'water') parts.push('Water');
    else if (kind === 'sticky') parts.push('Sticky puddle');
    else if (kind === 'gravel') parts.push('Gravel');
    else if (kind === 'goal') parts.push('Goal');
    else if (kind === 'spring') parts.push(`Spring ${ARROW[v]}`);
    else if (kind === 'gate') { const [ds, col] = v.split('@'); parts.push(`${col ? COLOUR_NAME[col] + ' one-way' : 'One-way'} ${ds.split(',').map(d => ARROW[d]).join(' ')}`); }
    else if (kind === 'sensor') parts.push(`${COLOUR_NAME[v]} laser relay`);
    else if (kind === 'receiver') parts.push(`${COLOUR_NAME[v]} laser catcher`);
    else if (kind === 'idoor') parts.push(`${COLOUR_NAME[v]} inverted door`);
    else if (kind === 'door' && v.includes('|')) parts.push(`${v.split('|').map(c => COLOUR_NAME[c]).join(' and ')} door`);
    else parts.push(`${COLOUR_NAME[v]} ${kind}`);
  }
  if (level.start && level.start.x === x && level.start.y === y) parts.push('Start');
  return parts.length ? parts.join(', ') : 'Empty floor';
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
  const isStart = !!level.start && level.start.x === x && level.start.y === y;
  if (t === 'erase') {
    if (pi >= 0) removePiece(); else setCell('');
  } else if (t === 'remove') {
    const host = pi >= 0 ? level.entities[pi] : null;
    if (ui.tool === 'turret' && host && host.kind !== 'turret') { gone.piece = { ...host }; delete host.turret; }
    else if (['wall', 'crack', 'checkpoint', 'button', 'toggle', 'door', 'ddoor', 'idoor', 'tri', 'receiver', 'sensor', 'gate', 'spring', 'death', 'water', 'sticky', 'gravel', 'goal'].includes(ui.tool)) setCell('');
    else removePiece();
  } else if (t === 'spring' || t === 'death') {
    if (isStart) return out;
    removePiece(); setCell(t === 'death' ? 'death' : 'spring:' + ui.face);
  } else if (t === 'water' || t === 'sticky' || t === 'gravel' || t === 'goal') {
    if (isStart) return out;
    setCell(t);
  } else if (t === 'gate') {
    if (isStart) return out;
    removePiece(); setCell('gate:' + CLOCKWISE.filter(d => ui.pass.includes(d)).join(',') + (ui.gateColour ? '@' + ui.gateColour : ''));
  } else if (t === 'tri') {
    if (isStart) return out;
    removePiece(); setCell('tri:' + ui.corner);
  } else if (t === 'start') {
    if (level.cells[i] === 'wall' || level.cells[i] === 'crack' || isDoor(level.cells[i])) setCell('');
    removePiece();
    level.start = { x, y };
  } else if (t === 'wall' || t === 'crack') {
    if (isStart) return out;
    removePiece(); setCell(t);
  } else if (t === 'ddoor') {
    if (isStart) return out;
    removePiece(); setCell('door:red|blue');
  } else if (t === 'checkpoint' || t === 'button' || t === 'toggle' || t === 'door' || t === 'idoor' || t === 'receiver' || t === 'sensor') {
    const solid = t === 'door' || t === 'idoor' || t === 'receiver' || t === 'sensor';
    if (solid && isStart) return out;
    if (solid) removePiece();
    setCell(t === 'checkpoint' ? 'checkpoint' : t + ':' + ui.colour);
  } else if (t === 'turret') {
    if (isStart) return out;
    const dirs = CLOCKWISE.filter(d => ui.aim.includes(d));
    const turret = { dirs, mode: ui.mode, ...(dirs.includes(ui.start) && ui.start !== dirs[0] ? { start: ui.start } : {}) };
    const host = pi >= 0 ? level.entities[pi] : null;
    if (host && ui.mount !== false && (CARRIES_TURRET.includes(host.kind) || host.kind === 'turret')) {
      if (JSON.stringify(host.turret) === JSON.stringify(turret)) return out;
      host.turret = turret;
    } else {
      removePiece();
      if (level.cells[i] === 'wall' || isDoor(level.cells[i])) setCell('');
      level.entities.push({ kind: 'turret', x, y, turret });
    }
  } else {
    if (isStart) return out;
    const want = { kind: t, x, y, ...(t === 'mover' || t === 'enemy' || t === 'strong' ? { axis: ui.axis, dir: ui.dir, mode: ui.mode } : {}) };
    if (pi >= 0 && JSON.stringify(level.entities[pi]) === JSON.stringify(want)) return out;
    removePiece();
    if (level.cells[i] === 'wall' || isDoor(level.cells[i])) setCell('');
    level.entities.push(want);
  }
  if (gone.cell || gone.piece) out.push(gone);
  if (t !== 'erase' && t !== 'remove') out.push({ type: 'place', x, y });
  return out;
}
