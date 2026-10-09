// The rooms API: GET /api/rooms lists, PUT /api/rooms/<id> saves, DELETE removes. Each
// room is one <id>.wee file in a directory; when that directory is a git repo every
// change is committed, so nothing is ever lost.
import { readFile, readdir, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { splitRoom } from '../src/level/room.js';

const ID = /^[a-z0-9][a-z0-9-]{0,40}$/;
const MAX_BYTES = 1 << 20;

function git(dir, args) {
  return new Promise(ok => execFile('git', args, { cwd: dir }, (err, out) => ok(err ? null : out)));
}
async function commit(dir, message) {
  if (!existsSync(join(dir, '.git'))) return;
  await git(dir, ['add', '-A']);
  await git(dir, ['-c', 'user.name=wee', '-c', 'user.email=wee@localhost', 'commit', '-q', '-m', message]);
}

const send = (res, code, body) => {
  res.writeHead(code, { 'content-type': typeof body === 'string' ? 'text/plain' : 'application/json', 'cache-control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};

function readBody(req) {
  return new Promise((ok, fail) => {
    let size = 0; const parts = [];
    req.on('data', c => { size += c.length; if (size > MAX_BYTES) { fail(new Error('too large')); req.destroy(); } else parts.push(c); });
    req.on('end', () => ok(Buffer.concat(parts).toString('utf8')));
    req.on('error', fail);
  });
}

// Returns true when it handled the request.
export function roomsApi(dir) {
  return async (req, res) => {
    const path = new URL(req.url, 'http://x').pathname;
    if (!path.startsWith('/api/rooms')) return false;
    const id = path.slice('/api/rooms/'.length);
    try {
      if (path === '/api/rooms' && req.method === 'GET') {
        const files = (await readdir(dir)).filter(f => f.endsWith('.wee'));
        const rooms = [];
        for (const f of files) { try { rooms.push(JSON.parse(await readFile(join(dir, f), 'utf8'))); } catch { /* skip a broken file */ } }
        send(res, 200, rooms);
      } else if (req.method === 'PUT' && ID.test(id)) {
        const room = JSON.parse(await readBody(req));
        splitRoom(room);
        const saved = { ...room, id, updated: new Date().toISOString() };
        await writeFile(join(dir, id + '.wee'), JSON.stringify(saved, null, 1));
        await commit(dir, `Save ${saved.name || id}`);
        send(res, 200, saved);
      } else if (req.method === 'DELETE' && ID.test(id)) {
        const file = join(dir, id + '.wee');
        if (!existsSync(file)) { send(res, 404, 'No such room.'); return true; }
        await unlink(file);
        await commit(dir, `Delete ${id}`);
        send(res, 200, { id });
      } else send(res, 400, 'Bad request.');
    } catch (e) { send(res, 400, e.message); }
    return true;
  };
}
