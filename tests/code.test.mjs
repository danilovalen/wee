// Share codes: a room survives the round trip, and a broken code says so.
import { readFileSync } from 'node:fs';
import { encodeRoom, decodeRoom } from '../src/level/code.js';
import { suite } from './suite.mjs';

const { check, done } = suite('code');
const first = JSON.parse(readFileSync('tests/fixtures/first-room-v1.wee', 'utf8'));
const code = await encodeRoom({ ...first, name: 'secret', note: 'n' });
check('a code is URL-safe text', /^w1[A-Za-z0-9_-]+$/.test(code), code.slice(0, 40));
check('and much shorter than the file', code.length < JSON.stringify(first).length / 2, `${code.length} vs ${JSON.stringify(first).length}`);
const back = await decodeRoom(code);
const fields = l => JSON.stringify(['format', 'version', 'w', 'h', 'cells', 'start', 'entities', 'powers', 'clock'].map(k => l[k]));
check('the room comes back exactly', fields(back) === fields(first));
check('name and note do not travel', back.name === undefined && back.note === undefined);
let linked = null;
try { linked = await decodeRoom('https://wee.example/#room=' + code); } catch { /* reported below */ }
check('a whole link works too', linked && linked.w === first.w);
let err = '';
try { await decodeRoom(code.slice(0, 30)); } catch (e) { err = e.message; }
check('a cut-off code says it is damaged', err.includes('damaged'), err);
err = '';
try { await decodeRoom('hello'); } catch (e) { err = e.message; }
check('a code from somewhere else says so', err.includes('Not a wee room code'), err);
err = '';
try { await decodeRoom(await encodeRoom({ ...first, cells: first.cells.map(() => 'lava') })); } catch (e) { err = e.message; }
check('a code for a room the game cannot read is refused', err.includes('Unknown tile'), err);
done();
