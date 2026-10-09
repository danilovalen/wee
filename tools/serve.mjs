// A static server for the repo root. Usage: node tools/serve.mjs [port] [rooms-dir]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { roomsApi } from './api.mjs';

const root = new URL('..', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

// opts.rooms: a directory to keep rooms in, which turns on the rooms API.
export function serve(port = 5173, opts = {}) {
  const api = opts.rooms ? roomsApi(opts.rooms) : null;
  const server = createServer(async (req, res) => {
    if (api && await api(req, res)) return;
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    try {
      const body = await readFile(join(root, path === '/' ? 'index.html' : path));
      res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'text/html', 'cache-control': 'no-cache' });
      res.end(body);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  return new Promise(ok => server.listen(port, () => ok(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = +process.argv[2] || 5173;
  await serve(port, { rooms: process.argv[3] });
  console.log(`wee on http://localhost:${port}`);
}
