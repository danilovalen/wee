// Editing a level in place: what a tile holds, the Look line, and placing or removing
// with the current tool. Returns what changed so the caller can animate it.
import { CLOCKWISE, CARRIES_TURRET } from '../rules/base.js';
import { CRATED } from '../level/format.js';
import { TOOLS, WIRE_NAME, COLOUR_NAME, CLOCK_NAME, ARROW, CORNER_NAME } from './palette.js';

const idx = (level, x, y) => y * level.w + x;
const isDoor = c => c.startsWith('door:') || c.startsWith('idoor:');
const pieceAt = (level, x, y) => level.entities.findIndex(e => e.x === x && e.y === y);
// Pushable tiles (register 336): level.crates lists them as {x, y}, and they move with their tile.
export const CRATE_TOOLS = ['sensor', 'gate', 'door', 'idoor'];
export const crateAt = (level, x, y) => !!level.crates?.some(c => c.x === x && c.y === y);
function setCrate(level, x, y, on) {
  const k = (level.crates || []).filter(c => c.x !== x || c.y !== y);
  if (on) k.push({ x, y });
  if (k.length) level.crates = k; else delete level.crates;
}

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
    if (crateAt(l, from.x, from.y)) { setCrate(l, from.x, from.y, false); setCrate(l, to.x, to.y, true); }
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
    if (l.cells[i]) { const cell = l.cells[i], crate = crateAt(l, p.x, p.y); l.cells[i] = ''; setCrate(l, p.x, p.y, false); return { cell, crate }; }
    return null;
  };
  const a = grab(from), b = grab(to);
  if (!a || !b) return null;
  const put = (t, p) => {
    const i = idx(l, p.x, p.y);
    if (t.start) l.start = { x: p.x, y: p.y };
    else if (t.piece) l.entities.push({ ...t.piece, x: p.x, y: p.y });
    else if (l.cells[i]) return false;
    else { l.cells[i] = t.cell; if (t.crate) setCrate(l, p.x, p.y, true); }
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

// Wires (register 347) lie under everything and stay put when a piece or tile moves.
export const wiresAt = (level, x, y) => (level.wires || []).filter(r => r.x === x && r.y === y);
function setWire(level, x, y, w, on) {
  const k = (level.wires || []).filter(r => r.x !== x || r.y !== y || r.w !== w);
  if (on) k.push({ x, y, w });
  if (k.length) level.wires = k; else delete level.wires;
}

export function holds(level, x, y, tool, wire) {
  if (tool === 'wire') return wiresAt(level, x, y).some(r => r.w === wire);
  const c = level.cells[idx(level, x, y)], pc = level.entities[pieceAt(level, x, y)];
  if (tool === 'wall' || tool === 'crack' || tool === 'checkpoint' || tool === 'death' || tool === 'water' || tool === 'sticky' || tool === 'gravel' || tool === 'goal') return c === tool;
  if (tool === 'spring') return c.startsWith('spring:');
  if (tool === 'button' || tool === 'toggle' || tool === 'door' || tool === 'idoor' || tool === 'tri' || tool === 'sensor' || tool === 'gate') return c.startsWith(tool + ':');
  if (tool === 'turret') return !!pc && (pc.kind === 'turret' || !!pc.turret);
  return !!pc && pc.kind === tool;
}


// A colour's name, or two joined: 'Red and blue' (register 316).
const cname = v => v.split('|').map((c, i) => i ? COLOUR_NAME[c].toLowerCase() : COLOUR_NAME[c]).join(' and ');

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
    else if (kind === 'gate') { const [ds, col] = v.split('@'); parts.push(`${col ? cname(col) + ' one-way' : 'One-way'} ${ds.split(',').map(d => ARROW[d]).join(' ')}`); }
    else if (kind === 'sensor') parts.push(`${cname(v)} laser relay`);
    else if (kind === 'idoor') parts.push(`${cname(v)} inverted door`);
    else parts.push(`${cname(v)} ${kind}`);
  }
  if (crateAt(level, x, y)) parts.push('pushable');
  const ws = wiresAt(level, x, y).map(r => WIRE_NAME[r.w].toLowerCase());
  if (ws.length) parts.push(ws.join(' and ') + (ws.length > 1 ? ' wires' : ' wire'));
  if (level.start && level.start.x === x && level.start.y === y) parts.push('Start');
  return parts.length ? parts.join(', ') : 'Empty floor';
}


// how: 'place', 'remove' (only what this tool places) or 'erase' (anything).
// Returns the effects to show: what was taken off the tile, and a pop where it placed.
export function place(level, ui, x, y, how) {
  const out = [];
  if (how === 'remove' && !holds(level, x, y, ui.tool, ui.wire)) return out;
  if (ui.tool === 'wire' && how !== 'erase') {
    if (holds(level, x, y, 'wire', ui.wire) === (how === 'place')) return out;
    setWire(level, x, y, ui.wire, how === 'place');
    return how === 'place' ? [{ type: 'place', x, y }] : [{ type: 'erase', x, y }];
  }
  if (how === 'place' && holds(level, x, y, ui.tool) && (!CRATE_TOOLS.includes(ui.tool) || crateAt(level, x, y) === !!ui.crate)) return out;
  const t = how === 'erase' ? 'erase' : how === 'remove' ? 'remove' : ui.tool, i = idx(level, x, y), pi = pieceAt(level, x, y);
  const gone = { type: 'erase', x, y };
  const removePiece = () => { if (pi >= 0) { gone.piece = level.entities[pi]; level.entities.splice(pi, 1); } };
  const setCell = c => { if (level.cells[i] !== c) { if (level.cells[i]) gone.cell = level.cells[i]; level.cells[i] = c; } };
  const isStart = !!level.start && level.start.x === x && level.start.y === y;
  if (t === 'erase') {
    // Erase takes the top thing first: a piece, then a tile, then the wires under them.
    if (pi >= 0) removePiece(); else if (level.cells[i]) setCell(''); else for (const r of wiresAt(level, x, y)) setWire(level, x, y, r.w, false);
  } else if (t === 'remove') {
    const host = pi >= 0 ? level.entities[pi] : null;
    if (ui.tool === 'turret' && host && host.kind !== 'turret') { gone.piece = { ...host }; delete host.turret; }
    else if (['wall', 'crack', 'checkpoint', 'button', 'toggle', 'door', 'idoor', 'tri', 'sensor', 'gate', 'spring', 'death', 'water', 'sticky', 'gravel', 'goal'].includes(ui.tool)) setCell('');
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
  } else if (t === 'checkpoint' || t === 'button' || t === 'toggle' || t === 'door' || t === 'idoor' || t === 'sensor') {
    const solid = t === 'door' || t === 'idoor' || t === 'sensor';
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
      level.entities.push({ kind: 'turret', x, y, ...(ui.crate ? { crate: true } : {}), turret });
    }
  } else {
    if (isStart) return out;
    const want = { kind: t, x, y, ...(t === 'mover' || t === 'enemy' || t === 'strong' ? { axis: ui.axis, dir: ui.dir, mode: ui.mode } : {}) };
    if (pi >= 0 && JSON.stringify(level.entities[pi]) === JSON.stringify(want)) return out;
    removePiece();
    if (level.cells[i] === 'wall' || isDoor(level.cells[i])) setCell('');
    level.entities.push(want);
  }
  const c = level.cells[i];
  setCrate(level, x, y, CRATE_TOOLS.includes(t) ? !!ui.crate && CRATED(c) : crateAt(level, x, y) && CRATED(c));
  if (gone.cell || gone.piece) out.push(gone);
  if (t !== 'erase' && t !== 'remove') out.push({ type: 'place', x, y });
  return out;
}
