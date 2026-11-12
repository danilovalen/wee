// The campaign map room (register 932): its marks, the room's own size limit, and that every room the
// campaign opens has exactly one level spot on it.
import { readFileSync } from 'node:fs';
import { suite } from './suite.mjs';
import { emptyLevel, parseLevel, resizeSide, moveSide, wallBorder } from '../src/level/format.js';
import { place, describe, moveAt } from '../src/editor/edit.js';
import { plan } from '../src/campaign/progression.js';

const { check, done } = suite('map');
const map = parseLevel(readFileSync('rooms/map.wee', 'utf8'));
const ids = plan().flatMap(({ def, side, twin }) => [def, side, twin].filter(Boolean).map(r => r.id));
const fors = map.spots.map(s => s.for);
check('the map room is a map room', map.map === true && map.w > 40);
check('every room the campaign opens has a level spot on the map', ids.every(id => fors.includes(id)), ids.filter(id => !fors.includes(id)).join(' '));
check('and no spot names a room the campaign does not open', fors.every(f => ids.includes(f)), fors.filter(f => !ids.includes(f)).join(' '));
check('every land has a sign', map.signs.length >= 9, String(map.signs.length));

const refused = (l, why) => { try { parseLevel(JSON.stringify(l)); return false; } catch (e) { return why.test(e.message); } };
const room = () => { const l = emptyLevel(5, 5); l.map = true; l.start = { x: 4, y: 0 }; l.cells[12] = 'gravel'; return l; };
check('a spot off gravel is refused', refused({ ...room(), spots: [{ x: 1, y: 1, for: '1', card: 'up' }] }, /gravel/));
check('two spots for one level are refused', refused({ ...room(), cells: room().cells.map((c, i) => i === 13 ? 'gravel' : c), spots: [{ x: 2, y: 2, for: '1', card: 'up' }, { x: 3, y: 2, for: '1', card: 'up' }] }, /Two level spots/));
check('a spot with no side for its card is refused', refused({ ...room(), spots: [{ x: 2, y: 2, for: '1', card: 'north' }] }, /side/));
check('an empty or long sign is refused', refused({ ...room(), signs: [{ x: 0, y: 0, text: ' ' }] }, /sign/) && refused({ ...room(), signs: [{ x: 0, y: 0, text: 'x'.repeat(25) }] }, /sign/));

check('a room stops at 40 wide', resizeSide(emptyLevel(40, 30), 'right', 1) === null && moveSide(emptyLevel(40, 30), 'bottom', 1) === null);
check('a map room grows to 80', !!resizeSide({ ...emptyLevel(79, 30), map: true }, 'right', 1) && resizeSide({ ...emptyLevel(80, 80), map: true }, 'right', 1) === null);

const l = room(), spot = { tool: 'spot', spotFor: '9', spotCard: 'down' };
place(l, spot, 2, 2, 'place');
place(l, { tool: 'sign', signText: 'Box land' }, 0, 4, 'place');
check('a spot goes on gravel with its level and card side', l.cells[12] === 'gravel' && l.spots.length === 1 && l.spots[0].for === '9' && l.spots[0].card === 'down');
check('Look names the spot and the sign', /9/.test(describe(l, 2, 2)) && /Box land/.test(describe(l, 0, 4)));
place(l, { ...spot, spotCard: 'up', spotFor: '10' }, 2, 2, 'place');
check('a tile holds a spot for each side its cards go', l.spots.length === 2);
place(l, { ...spot, spotCard: 'up' }, 1, 1, 'place');
check('placing a level again moves its spot', l.spots.filter(s => s.for === '9').length === 1 && l.spots.some(s => s.for === '9' && s.x === 1));
const grown = resizeSide(l, 'left', 1), cut = moveSide(grown, 'left', -1), bordered = wallBorder(l);
check('a resize carries spots and signs', grown.spots.every(s => l.spots.some(o => o.for === s.for && o.x + 1 === s.x)) && grown.signs[0].x === 1);
check('a cut carries them back', JSON.stringify(cut.spots) === JSON.stringify(l.spots) && cut.signs[0].x === 0);
check('a wall border keeps a sign on its edge', bordered.signs.length === 1);
const walled = moveSide(bordered, 'bottom', 1);
check('growing inside a wall border carries them too', walled.signs[0].y === 5 && walled.spots.every(s => bordered.spots.some(o => o.for === s.for && o.y === s.y)));
const moved = moveAt(l, { x: 1, y: 1 }, { x: 3, y: 3 });
check('Move carries a spot with its gravel', moved && moved.spots.some(s => s.for === '9' && s.x === 3 && s.y === 3));
place(l, { tool: 'erase' }, 0, 4, 'erase');
check('Erase takes a sign first', !l.signs);
place(l, { tool: 'wall' }, 1, 1, 'place');
check('whatever takes the gravel takes the spot', !l.spots.some(s => s.for === '9'));
place(l, { tool: 'spot' }, 2, 2, 'remove');
check('removing takes every spot on the tile', !l.spots);
done();
