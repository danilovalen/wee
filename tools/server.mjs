// The private site: serves dist/wee.html and the rooms API, behind a password.
// Environment: PORT (default 8040), WEE_ROOMS (rooms directory, a git repo),
// WEE_USER and WEE_PASSWORD (basic auth; refuses to start without a password).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';
import { roomsApi } from './api.mjs';

export function makeServer({ rooms, user = 'wee', password, page = 'dist/wee.html' }) {
  if (!password) throw new Error('Set WEE_PASSWORD.');
  mkdirSync(rooms, { recursive: true });
  if (!existsSync(rooms + '/.git')) execFileSync('git', ['init', '-q'], { cwd: rooms });
  const api = roomsApi(rooms);
  const want = Buffer.from('Basic ' + Buffer.from(`${user}:${password}`).toString('base64'));
  const authed = req => { const got = Buffer.from(req.headers.authorization || ''); return got.length === want.length && timingSafeEqual(got, want); };
  return createServer(async (req, res) => {
    if (!authed(req)) { res.writeHead(401, { 'www-authenticate': 'Basic realm="wee"' }); res.end('Password needed.'); return; }
    if (await api(req, res)) return;
    const path = new URL(req.url, 'http://x').pathname;
    if (path === '/' || path === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-cache' });
      res.end(await readFile(page));
      return;
    }
    res.writeHead(404); res.end('Not found.');
  });
}

if (process.argv[1] && process.argv[1].endsWith('server.mjs')) {
  const port = +process.env.PORT || 8040;
  makeServer({ rooms: process.env.WEE_ROOMS || 'saved-rooms', user: process.env.WEE_USER, password: process.env.WEE_PASSWORD })
    .listen(port, '127.0.0.1', () => console.log(`wee on http://127.0.0.1:${port}`));
}
