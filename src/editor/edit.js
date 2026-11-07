// Editing a level in place: what a tile holds, the Look line, and placing or removing
// with the current tool. Returns what changed so the caller can animate it.
import { CLOCKWISE, CARRIES_TURRET } from '../rules/base.js';
import { CRATED } from '../level/format.js';
import { canStand } from '../level/stand.js';
import { TOOLS, WIRE_NAME, COLOUR_NAME, CLOCK_NAME, ARROW, CORNER_NAME } from './palette.js';

const idx = (level, x, y) => y * level.w + x;
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
const UNDER = canStand;
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
    if ((t.start || t.piece) && !canStand(l.cells[i])) return false;
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

// A tap on a coloured piece in another colour gives it the picked colour (register 739); true when it did.
// A one-way takes gateColour, null being a plain one (773); a switch keeps whether it is on.
export function recolour(level, x, y, ui) {
  const i = idx(level, x, y), c = level.cells[i] || '';
  const m = c.match(/^(button|toggle|door|idoor|sensor):([^:]+)(:on)?$/);
  const mine = m && (ui.tool === 'door' ? /^i?door$/.test(m[1]) : m[1] === ui.tool);
  if (mine && ui.colour && ui.colour !== m[2] && !ui.colour.includes('|')) {
    level.cells[i] = `${m[1]}:${ui.colour}${m[3] || ''}`; return true;
  }
  const g = c.match(/^gate:([^@]+)(?:@(.+))?$/);
  if (g && ui.tool === 'gate' && (g[2] || null) !== (ui.gateColour || null)) { level.cells[i] = `gate:${g[1]}${ui.gateColour ? '@' + ui.gateColour : ''}`; return true; }
  return false;
}

// Turns a one-way a quarter clockwise, every direction it lets through.
export function turnGate(level, x, y) {
  const i = idx(level, x, y), [ds, col] = level.cells[i].slice(5).split('@'), dirs = ds.split(',');
  level.cells[i] = 'gate:' + CLOCKWISE.filter(d => dirs.includes(CLOCKWISE[(CLOCKWISE.indexOf(d) + 3) % 4])).join(',') + (col ? '@' + col : '');
}

// Turns a spring a quarter clockwise, the way it faces (register 826).
export function turnSpring(level, x, y) {
  const i = idx(level, x, y), d = level.cells[i].slice(7);
  if (level.cells[i].startsWith('spring:')) level.cells[i] = 'spring:' + CLOCKWISE[(CLOCKWISE.indexOf(d) + 1) % 4];
}

// Turns a door into an inverted door of its colour, and back (register 675).
export function turnDoor(level, x, y) {
  const i = idx(level, x, y), c = level.cells[i];
  if (/^door:/.test(c)) level.cells[i] = 'i' + c; else if (/^idoor:/.test(c)) level.cells[i] = c.slice(1);
}

// Turns a switch on or off where the room starts (register 668).
export function turnSwitch(level, x, y) {
  const i = idx(level, x, y), c = level.cells[i];
  if (c.startsWith('toggle:')) level.cells[i] = c.endsWith(':on') ? c.slice(0, -3) : c + ':on';
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
  // The Door tool owns both kinds of door: a tap turns one into the other (register 676).
  if (tool === 'door') return /^i?door:/.test(c);
  if (tool === 'button' || tool === 'toggle' || tool === 'door' || tool === 'idoor' || tool === 'tri' || tool === 'sensor' || tool === 'gate') return c.startsWith(tool + ':');
  if (tool === 'start') return !!level.start && level.start.x === x && level.start.y === y;
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
    else if (kind === 'goal') parts.push('Berry');
    else if (kind === 'spring') parts.push(`Spring ${ARROW[v]}`);
    else if (kind === 'gate') { const [ds, col] = v.split('@'); parts.push(`${col ? cname(col) + ' one-way' : 'One-way'} ${ds.split(',').map(d => ARROW[d]).join(' ')}`); }
    else if (kind === 'sensor') parts.push(`${cname(v)} laser relay`);
    else if (kind === 'idoor') parts.push(`${cname(v)} inverted door`);
    else if (kind === 'toggle') parts.push(`${cname(v)} switch${c.endsWith(':on') ? ', on' : ''}`);
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
  if (how === 'place' && holds(level, x, y, ui.tool) && recolour(level, x, y, ui)) return [{ type: 'place', x, y }];
  if (how === 'place' && holds(level, x, y, ui.tool) && (!CRATE_TOOLS.includes(ui.tool) || crateAt(level, x, y) === !!ui.crate)) return out;
  const t = how === 'erase' ? 'erase' : how === 'remove' ? 'remove' : ui.tool, i = idx(level, x, y), pi = pieceAt(level, x, y);
  const gone = { type: 'erase', x, y };
  const removePiece = () => { if (pi >= 0) { gone.piece = level.entities[pi]; level.entities.splice(pi, 1); } };
  const setCell = c => { if (level.cells[i] !== c) { if (level.cells[i]) gone.cell = level.cells[i]; level.cells[i] = c; } };
  const isStart = !!level.start && level.start.x === x && level.start.y === y;
  // Placing on the blob takes it off, unless the blob can stand on what goes there (768, 772).
  const dropStart = () => { if (isStart) { gone.start = true; level.start = null; } };
  if (t === 'erase') {
    // Erase takes the top thing first: the blob (register 705), a piece, then a tile, then the wires under them.
    if (isStart) { gone.start = true; level.start = null; } else if (pi >= 0) removePiece(); else if (level.cells[i]) setCell(''); else for (const r of wiresAt(level, x, y)) setWire(level, x, y, r.w, false);
  } else if (t === 'remove') {
    const host = pi >= 0 ? level.entities[pi] : null;
    if (ui.tool === 'start') { if (isStart) { gone.start = true; level.start = null; } }
    else if (ui.tool === 'turret' && host && host.kind !== 'turret') { gone.piece = { ...host }; delete host.turret; }
    else if (['wall', 'crack', 'checkpoint', 'button', 'toggle', 'door', 'idoor', 'tri', 'sensor', 'gate', 'spring', 'death', 'water', 'sticky', 'gravel', 'goal'].includes(ui.tool)) setCell('');
    else removePiece();
  } else if (t === 'spring' || t === 'death') {
    dropStart(); removePiece(); setCell(t === 'death' ? 'death' : 'spring:' + ui.face);
  } else if (t === 'water' || t === 'sticky' || t === 'gravel' || t === 'goal') {
    if (!canStand(t)) { dropStart(); removePiece(); }
    setCell(t);
  } else if (t === 'gate') {
    dropStart(); removePiece(); setCell('gate:' + CLOCKWISE.filter(d => ui.pass.includes(d)).join(',') + (ui.gateColour ? '@' + ui.gateColour : ''));
  } else if (t === 'tri') {
    dropStart(); removePiece(); setCell('tri:' + ui.corner);
  } else if (t === 'start') {
    if (!canStand(level.cells[i])) setCell('');
    removePiece();
    level.start = { x, y };
  } else if (t === 'wall' || t === 'crack') {
    dropStart(); removePiece(); setCell(t);
  } else if (t === 'checkpoint' || t === 'button' || t === 'toggle' || t === 'door' || t === 'idoor' || t === 'sensor') {
    const solid = t === 'door' || t === 'idoor' || t === 'sensor';
    if (solid) { dropStart(); removePiece(); }
    setCell(t === 'checkpoint' ? 'checkpoint' : t + ':' + ui.colour);
  } else if (t === 'turret') {
    dropStart();
    const dirs = CLOCKWISE.filter(d => ui.aim.includes(d));
    const turret = { dirs, mode: ui.mode, ...(dirs.includes(ui.start) && ui.start !== dirs[0] ? { start: ui.start } : {}) };
    const host = pi >= 0 ? level.entities[pi] : null;
    if (host && ui.mount !== false && (CARRIES_TURRET.includes(host.kind) || host.kind === 'turret')) {
      if (JSON.stringify(host.turret) === JSON.stringify(turret)) return out;
      host.turret = turret;
    } else {
      removePiece();
      if (!canStand(level.cells[i])) setCell('');
      level.entities.push({ kind: 'turret', x, y, ...(ui.crate ? { crate: true } : {}), turret });
    }
  } else {
    dropStart();
    const want = { kind: t, x, y, ...(t === 'mover' || t === 'enemy' || t === 'strong' ? { axis: ui.axis, dir: ui.dir, mode: ui.mode } : {}) };
    if (pi >= 0 && JSON.stringify(level.entities[pi]) === JSON.stringify(want)) return out;
    removePiece();
    if (!canStand(level.cells[i])) setCell('');
    level.entities.push(want);
  }
  const c = level.cells[i];
  setCrate(level, x, y, CRATE_TOOLS.includes(t) ? !!ui.crate && CRATED(c) : crateAt(level, x, y) && CRATED(c));
  if (gone.cell || gone.piece || gone.start) out.push(gone);
  if (t !== 'erase' && t !== 'remove') out.push({ type: 'place', x, y });
  return out;
}
