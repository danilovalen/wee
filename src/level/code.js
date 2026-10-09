// A share code: the level as compressed, URL-safe text, so a room fits in a message or
// a link (#room=<code>). Uses the platform's own deflate, in the page and in Node.
import { parseLevel } from './format.js';

const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = text => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

async function pipe(bytes, stream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

// Only the level travels: no name, note or solution.
export async function encodeRoom(level) {
  const { format, version, w, h, cells, start, entities, powers, clock } = level;
  const text = JSON.stringify({ format, version, w, h, cells, start, entities, powers, clock });
  return 'w1' + b64url(await pipe(new TextEncoder().encode(text), new CompressionStream('deflate-raw')));
}

export async function decodeRoom(code) {
  code = code.trim().replace(/^.*#room=/, '');
  if (!code.startsWith('w1')) throw new Error('Not a wee room code.');
  let text;
  try { text = new TextDecoder().decode(await pipe(unb64url(code.slice(2)), new DecompressionStream('deflate-raw'))); }
  catch { throw new Error('This room code is damaged or incomplete.'); }
  return parseLevel(text);
}
