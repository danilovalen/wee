// The private server: password first, then the rooms API, with every change committed.
import { mkdtempSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeServer } from '../tools/server.mjs';
import { room, suite } from './lib.mjs';

const { check, done } = suite('server');
const dir = join(mkdtempSync(join(tmpdir(), 'wee-')), 'rooms');
mkdirSync('dist', { recursive: true });
if (!readdirSync('dist').includes('wee.html')) writeFileSync('dist/wee.html', '<!doctype html><title>wee</title>');
let threw = false;
try { makeServer({ rooms: dir }); } catch { threw = true; }
check('the server will not start without a password', threw);
const server = makeServer({ rooms: dir, user: 'wee', password: 'pw' });
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}`;
const auth = { authorization: 'Basic ' + Buffer.from('wee:pw').toString('base64') };
const call = (path, opts = {}) => fetch(base + path, { ...opts, headers: { ...auth, ...(opts.headers || {}) } });

try {
  check('without the password you get nothing', (await fetch(base + '/')).status === 401 && (await fetch(base + '/api/rooms')).status === 401);
  check('a wrong password gets nothing', (await fetch(base + '/', { headers: { authorization: 'Basic ' + Buffer.from('wee:no').toString('base64') } })).status === 401);
  const page = await call('/');
  check('with it, / is the page', page.status === 200 && (await page.text()).includes('<title>'));
  check('the room list starts empty', JSON.stringify(await (await call('/api/rooms')).json()) === '[]');
  const level = { ...room(['#####', '#P..#', '#####']), name: 'First', note: 'n' };
  const put = await call('/api/rooms/r1', { method: 'PUT', body: JSON.stringify(level) });
  const saved = await put.json();
  check('saving a room returns it with its id and a time', put.status === 200 && saved.id === 'r1' && !!saved.updated && saved.name === 'First');
  const listed = await (await call('/api/rooms')).json();
  check('it is listed', listed.length === 1 && listed[0].name === 'First');
  check('it is a file, committed to git', readdirSync(dir).includes('r1.wee') && execFileSync('git', ['log', '--oneline'], { cwd: dir }).toString().includes('Save First'));
  check('a level the game cannot read is refused', (await call('/api/rooms/r2', { method: 'PUT', body: JSON.stringify({ ...level, cells: ['lava'] }) })).status === 400);
  check('so is a bad id', (await call('/api/rooms/..%2Fx', { method: 'PUT', body: JSON.stringify(level) })).status === 400);
  check('and a body over 1 MB', (await call('/api/rooms/r3', { method: 'PUT', body: 'x'.repeat((1 << 20) + 10) }).catch(() => ({ status: 400 }))).status === 400);
  const del = await call('/api/rooms/r1', { method: 'DELETE' });
  check('delete removes it and commits that too', del.status === 200 && !readdirSync(dir).includes('r1.wee') && execFileSync('git', ['log', '--oneline'], { cwd: dir }).toString().includes('Delete r1'));
  check('deleting a room that is not there says so', (await call('/api/rooms/r1', { method: 'DELETE' })).status === 404);
} catch (e) {
  check('the server test ran to the end', false, e.message);
} finally { server.close(); }
done();
