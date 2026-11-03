// The room's metrics in plain words (register 650), apart from the page so a test can read them.
const pct = x => `${Math.round(x * 100)}%`;
export function metricLines(m) {
  if (!m) return ['Too many positions to measure the room.'];
  return [
    m.ruin ? `Ruin: ${pct(m.ruin)} of moves lose the run (${pct(m.hazard)} kill, ${pct(m.lock)} lock you out).` : 'Ruin: no move can lose the run.',
    m.firstRuin == null ? 'First ruin: never.' : m.firstRuin === 0 ? 'First ruin: the very first move can lose the run.' : `First ruin: ${m.firstRuin} ${m.firstRuin === 1 ? 'move' : 'moves'} in.`,
    `Places: the blob can reach ${m.places}.`,
    `Choices: ${m.choices.toFixed(1)} safe moves per step on the shortest path.`,
    `Forced steps: ${pct(m.forced)} of the shortest path has one safe move.`,
    `Ways to win: ${m.shortest} shortest, ${m.near} within 2 moves more.`,
  ];
}
