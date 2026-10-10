// What a generated room can be made of. Each ingredient says which index tags mark it in
// a room (so Off can be checked), what else it brings along, how to put one in a level, and
// how to take it out again: Must use counts only when the room without it has no solution
// or a different number of moves. Labels are draft copy.
import { CLOCKWISE, COLOURS, CORNERS, DIRS, OPPOSITE } from '../rules/base.js';

const inside = (l, i) => { const x = i % l.w, y = (i - x) / l.w; return x > 0 && y > 0 && x < l.w - 1 && y < l.h - 1; };
const taken = (l, i) => l.entities.some(e => e.y * l.w + e.x === i) || l.start.y * l.w + l.start.x === i;

// A random empty interior tile, or -1 when the room is full.
export function spot(l, r) {
  const free = [];
  for (let i = 0; i < l.cells.length; i++) if (inside(l, i) && l.cells[i] === '' && !taken(l, i)) free.push(i);
  return free.length ? r.pick(free) : -1;
}

const tile = (l, r, c) => { const i = spot(l, r); if (i >= 0) l.cells[i] = c; return i; };
const piece = (l, r, e) => { const i = spot(l, r); if (i >= 0) l.entities.push({ x: i % l.w, y: (i - i % l.w) / l.w, dir: 1, mode: 'input', ...e }); return i; };
// ctx.many: more than one colour is allowed; ctx.and: two switches of one colour are.
// Without them every switch shares red, and a colour that has a switch gets no second one.
const switchOf = (l, col) => l.cells.some(c => /^(button|receiver|sensor):/.test(c) && c.endsWith(':' + col));
const colour = (l, r, ctx) => ctx.many ? r.pick(COLOURS.filter(c => !l.cells.some(x => x.endsWith(':' + c)))) || r.pick(COLOURS) : 'red';
const switches = (l, r, col, n, ctx, door = 'door') => {
  for (let k = 0; k < n; k++) if (ctx.and || !switchOf(l, col)) tile(l, r, 'button:' + col);
  tile(l, r, door + ':' + col);
};

// A turret in line with the tile at i, facing it, so its beam can reach.
function aimAt(l, r, i) {
  const x = i % l.w, y = (i - x) / l.w, ways = [];
  for (const d of CLOCKWISE) {
    const [dx, dy] = DIRS[d];
    for (let k = 2; ; k++) {
      const tx = x + dx * k, ty = y + dy * k, j = ty * l.w + tx;
      if (!inside(l, j)) break;
      if (l.cells[j] === '' && !taken(l, j)) ways.push([j, OPPOSITE[d]]);
    }
  }
  if (!ways.length) return;
  const [j, aim] = r.pick(ways), other = r.pick(CLOCKWISE.filter(d => d !== aim));
  l.entities.push({ kind: 'turret', x: j % l.w, y: (j - j % l.w) / l.w, turret: { dirs: r.next() < 0.5 ? [aim] : [aim, other], mode: 'input' } });
}

const beamSwitch = kind => (l, r, ctx) => { const col = colour(l, r, ctx), i = tile(l, r, kind + ':' + col); tile(l, r, 'door:' + col); if (i >= 0) aimAt(l, r, i); };

// Taking an ingredient out. By default every piece and tile of its kind goes; a door stays
// shut by losing its buttons, a power is switched off.
const kindOf = g => g.tags[0].split(':')[1];
const drop = (l, kind) => ({ ...l, entities: l.entities.filter(e => e.kind !== kind), cells: l.cells.map(c => c.split(':')[0] === kind ? '' : c) });
const noButtons = l => ({ ...l, cells: l.cells.map(c => c.startsWith('button:') ? '' : c) });
// A door that is always open: floor.
const open = (l, kind) => ({ ...l, cells: l.cells.map(c => c.split(':')[0] === kind ? '' : c) });
export const knock = (g, l) => g.knock ? g.knock(l) : g.power ? { ...l, powers: { ...l.powers, [g.power]: false } } : drop(l, kindOf(g));

// The plainest thing that could do the same job: every piece of the kind a wall where it stands,
// every tile of the kind a wall where nothing stands on it. A one-way the player only stops
// against, or a box that never moves, does the same as this, so it is not being used as itself.
const asWall = (l, kind) => {
  const held = new Set([l.start.y * l.w + l.start.x, ...l.entities.filter(e => e.kind !== kind).map(e => e.y * l.w + e.x)]);
  const cells = l.cells.map((c, i) => c.split(':')[0] === kind && !held.has(i) ? 'wall' : c);
  for (const e of l.entities) if (e.kind === kind) cells[e.y * l.w + e.x] = 'wall';
  return { ...l, cells, entities: l.entities.filter(e => e.kind !== kind) };
};
export const standIn = (g, l) => g.standIn === null || g.power ? null : g.standIn ? g.standIn(l) : asWall(l, kindOf(g));

// Must use counts only when the room changes with the ingredient taken out and with its stand-in.
export const variants = (g, l) => [knock(g, l), standIn(g, l)].filter(Boolean);

// A heavy box moves only when launched, and water stops you, so on their own both do a wall's
// job: a heavy box brings a spring, water a moving block that wades through it.
// Beam switches come before doors, so a door can share their colour instead of adding a button.
// A door opens only while its button is held, and you cannot hold it and walk through, so a
// door brings a box, and two buttons bring two.
export const INGREDIENTS = [
  { id: 'box', label: 'Box', tags: ['piece:box'], place: (l, r) => piece(l, r, { kind: 'box' }) },
  { id: 'heavy', label: 'Heavy box', tags: ['piece:heavy'], with: ['spring'], place: (l, r) => piece(l, r, { kind: 'heavy' }) },
  { id: 'receiver', label: 'Laser catcher', tags: ['tile:receiver'], with: ['turret', 'door'], knock: l => ({ ...l, cells: l.cells.map(c => c.startsWith('receiver:') ? 'wall' : c) }), standIn: null, place: beamSwitch('receiver') },
  { id: 'sensor', label: 'Laser relay', tags: ['tile:sensor'], with: ['turret', 'door'], place: beamSwitch('sensor') },
  { id: 'door', label: 'Door and button', tags: ['tile:door'], with: ['box'], knock: noButtons, standIn: l => open(l, 'door'), place: (l, r, ctx) => switches(l, r, colour(l, r, ctx), 1, ctx) },
  { id: 'idoor', label: 'Inverted door', tags: ['tile:idoor'], knock: noButtons, standIn: l => asWall(l, 'idoor'), place: (l, r, ctx) => switches(l, r, colour(l, r, ctx), 1, ctx, 'idoor') },
  { id: 'and', label: 'Two buttons, one door', tags: ['wiring:and'], with: ['door', 'box'], knock: noButtons, standIn: l => open(l, 'door'), place: (l, r, ctx) => { switches(l, r, colour(l, r, ctx), 2, ctx); piece(l, r, { kind: 'box' }); piece(l, r, { kind: 'box' }); } },
  { id: 'colours', label: 'Two colours', tags: ['wiring:colours'], with: ['door'], knock: noButtons, standIn: l => open(l, 'door'), place: (l, r, ctx) => { switches(l, r, colour(l, r, ctx), 1, ctx); switches(l, r, colour(l, r, ctx), 1, ctx); } },
  { id: 'tri', label: 'Triangle', tags: ['tile:tri'], place: (l, r) => tile(l, r, 'tri:' + r.pick(CORNERS)) },
  { id: 'gate', label: 'One-way', tags: ['tile:gate'], place: (l, r) => tile(l, r, 'gate:' + r.pick(CLOCKWISE)) },
  { id: 'spring', label: 'Spring', tags: ['tile:spring'], place: (l, r) => tile(l, r, 'spring:' + r.pick(CLOCKWISE)) },
  { id: 'death', label: 'Death block', tags: ['tile:death'], with: ['box'], place: (l, r) => { tile(l, r, 'death'); piece(l, r, { kind: 'box' }); } },
  { id: 'water', label: 'Water', tags: ['tile:water'], with: ['mover'], place: (l, r) => { const i = tile(l, r, 'water'); if (i >= 0 && l.cells[i + 1] === '' && inside(l, i + 1) && r.next() < 0.5) l.cells[i + 1] = 'water'; } },
  { id: 'sticky', label: 'Sticky puddle', tags: ['tile:sticky'], with: ['box'], place: (l, r) => { tile(l, r, 'sticky'); piece(l, r, { kind: 'box' }); } },
  { id: 'checkpoint', label: 'Checkpoint', tags: ['tile:checkpoint'], allowedOnly: 'A solution never dies, so a checkpoint cannot change it.', place: (l, r) => tile(l, r, 'checkpoint') },
  { id: 'mover', label: 'Moving block', tags: ['piece:mover'], place: (l, r) => piece(l, r, { kind: 'mover', axis: r.pick(['h', 'v']) }) },
  { id: 'follow', label: 'Moves the same way as you', tags: ['clock:follow'], with: ['mover'], standIn: null, knock: l => ({ ...l, entities: l.entities.map(e => e.mode === 'follow' ? { ...e, mode: 'input' } : e) }), place: (l, r) => piece(l, r, { kind: 'mover', axis: 'h', mode: 'follow' }) },
  { id: 'enemy', label: 'Weak enemy', tags: ['piece:enemy'], place: (l, r) => piece(l, r, { kind: 'enemy', axis: r.pick(['h', 'v']) }) },
  { id: 'strong', label: 'Strong enemy', tags: ['piece:strong'], place: (l, r) => piece(l, r, { kind: 'strong', axis: r.pick(['h', 'v']) }) },
  { id: 'turret', label: 'Laser turret', tags: ['piece:turret'], place: (l, r) => piece(l, r, { kind: 'turret', turret: { dirs: [r.pick(CLOCKWISE)], mode: 'input' } }) },
  { id: 'mounted', label: 'Mounted turret', tags: ['piece:mounted'], with: ['box'], standIn: l => ({ ...l, entities: l.entities.map(e => e.turret && e.kind !== 'turret' ? { kind: 'turret', x: e.x, y: e.y, turret: e.turret } : e) }), knock: l => ({ ...l, entities: l.entities.map(e => e.turret && e.kind !== 'turret' ? { ...e, turret: undefined } : e) }), place: (l, r) => piece(l, r, { kind: 'box', turret: { dirs: [r.pick(CLOCKWISE)], mode: 'input' } }) },
  { id: 'boomerang', label: 'Boomerang', tags: ['power:boomerang'], with: ['box'], power: 'boomerang' },
  { id: 'dive', label: 'Dive', tags: ['power:dive'], with: ['enemy'], power: 'dive' },
  { id: 'laser', label: 'Laser', tags: ['power:laser'], with: ['enemy'], power: 'laser' },
  { id: 'cycle', label: 'Cycle (hide)', tags: ['power:cycle'], with: ['mover'], power: 'cycle' },
  { id: 'swim', label: 'Swim', tags: ['power:swim'], with: ['water'], power: 'swim' },
  { id: 'armored', label: 'Armored', tags: ['power:armored'], with: ['enemy'], power: 'armored' },
];

export const ING = Object.fromEntries(INGREDIENTS.map(g => [g.id, g]));
