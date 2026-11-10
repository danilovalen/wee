// The local leaderboard (register 839): the global score of every player saved on this device. Me keeps one
// line; each Guest gets its own, kept after a fresh start. The every-level save never posts. Shared across
// saves, so it survives a switch. Times are kept for a later speedrun: when a save started and the time spent
// in levels (register 839, "enabling it").
import { globalScore } from '../campaign/score.js';

const BOARD = 'wee.board', RUN = 'wee.guestRun', SHOWN = 5;
const get = k => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage off */ } };
export const board = () => { try { return JSON.parse(get(BOARD) || '[]'); } catch { return []; } };
// The line this save writes to; a guest's line is named by when that guest started.
function lineId(slot) {
  if (slot !== 'guest') return slot;
  let run = get(RUN);
  if (!run) { run = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; set(RUN, run); }
  return 'guest:' + run;
}
export function postScore(p, slot) {
  if (slot === 'all') return null;
  const id = lineId(slot), score = globalScore(p.levels), rows = board().filter(r => r.id !== id);
  rows.push({ id, slot, score, at: Date.now() });
  set(BOARD, JSON.stringify(rows));
  return score;
}
// The highest scores first, ties to the earlier one, at most SHOWN.
export const topScores = (rows = board()) => [...rows].sort((a, b) => b.score - a.score || a.at - b.at).slice(0, SHOWN);
// A level's time counts from its opening to each Run, a gap of more than CAP read as the player away.
const CAP = 5 * 60 * 1000;
export function tick(p, from, now = Date.now()) {
  p.clock ||= { started: now, ms: 0 };
  if (from) p.clock.ms += Math.min(CAP, Math.max(0, now - from));
  return now;
}
