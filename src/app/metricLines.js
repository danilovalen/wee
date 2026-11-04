// The room's metrics in plain words (register 650), apart from the page so a test can read them.
const n = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
const pct = x => `${Math.round(x * 100)}%`;
export function metricLines(m) {
  if (!m) return ['Too many positions to measure the room.'];
  return [
    m.ruin ? `Ruin: ${pct(m.ruin)} of moves lose the run (${pct(m.hazard)} kill, ${pct(m.lock)} lock you out).` : 'Ruin: every move keeps the berry in reach.',
    m.firstRuin == null ? 'First ruin: never.' : m.firstRuin === 0 ? 'First ruin: the very first move can lose the run.' : `First ruin: ${m.firstRuin} ${m.firstRuin === 1 ? 'move' : 'moves'} in.`,
    `Places: the blob can reach ${m.places}.`,
    `Choices: ${m.choices.toFixed(1)} safe moves per step on the shortest path.`,
    `Forced steps: ${pct(m.forced)} of the shortest path has one safe move.`,
    `Ways to win: ${m.shortest} shortest, ${m.near} within 2 moves more.`,
    m.undos == null ? 'Going with the flow: the room has no answer to follow.' : m.undos ? `Going with the flow, you need about ${n(m.undos, 'undo')}.` : 'Going with the flow, you reach the berry without an undo.',
    ...turnLines(m.wrong),
    ...chokeLines(m.chokes),
  ];
}

// Wrong turns off the shortest path (register 709): how many, how many trap you, and the deepest trap,
// which flashes where it starts.
function turnLines(w) {
  if (!w) return [];
  if (!w.turns) return ['Wrong turns: every move on the shortest path keeps it shortest.'];
  const head = w.traps ? `Wrong turns: ${w.turns} on the shortest path, ${w.traps} of them ${w.traps === 1 ? 'a trap' : 'traps'}.` : `Wrong turns: ${w.turns} on the shortest path, and from each the berry is still in reach.`;
  if (!w.deep) return [head];
  const deep = w.deep.depth ? `The deepest trap lets you walk ${n(w.deep.depth, 'move')} before you are stuck.` : 'The deepest trap ends the run at once.';
  return [head, { text: deep, spots: [w.deep.at] }];
}
// Reuse (register 717): how many blocks the answer leans on, and how often the busiest one.
export const reuseText = r => r ? `Reuse: ${r.moves} ${r.moves === 1 ? 'move leans' : 'moves lean'} on ${n(r.blocks, 'block')}, the busiest ${n(r.busiest, 'time')}.` : 'Reuse: too many positions to follow the answer.';
// Path reuse (register 727): moves that run over ground an earlier move covered.
export const pathReuseText = r => r ? `Path reuse: ${r.overlap} of ${n(r.moves, 'move')} cross tiles an earlier move crossed.` : '';
// Choke points (register 727), flashable where they are.
const chokeLines = c => !c ? [] : c.length ? [{ text: `Choke points: ${c.length} ${c.length === 1 ? 'place every way to the berry goes' : 'places every way to the berry goes'} through.`, spots: c }] : ['Choke points: every place on the way has a way round.'];
