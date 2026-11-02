// Pieces the player has used (register 558): once a campaign level using a piece is beaten, the
// Sandbox's editor offers it. Pieces the campaign never teaches are offered from the start.
import { allOpen } from './unlock.js';

const KEY = 'wee.pieces';
const read = () => { try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); } };
export const usedPieces = () => read();
export function markUsed(tools) {
  const s = read(), n = s.size;
  for (const t of tools) s.add(t);
  if (s.size !== n) try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch { /* storage off */ }
}
// taught: the tools the campaign has a piece for. A taught tool shows once used, or while everything is open.
export const known = (tool, taught) => allOpen() || !taught.includes(tool) || read().has(tool);
