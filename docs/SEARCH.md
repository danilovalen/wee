# The room search (register 364)

Rebuilt 2026-10-21. Tools: `tools/levelSearch.mjs` (find wins), `tools/climb.mjs` (the climb),
`tools/roomSearch.mjs` (rooms, edits, penalty), `tools/searchScores.mjs` (partial credit),
`tools/minMoves.mjs` (the prover), `tools/searchBench.mjs` (the measurement below), `tools/searchDiag.mjs`.

## What changed

1. **Near-misses are kept.** The 16 best rooms that did not win are kept; 40% of climbs restart from one of
   them (nearer misses picked more often, shaken by 1 to 3 edits), 20% from a known room when given one,
   the rest from a fresh room. A climb gives up after 150 edits that do not help.
2. **A win is polished.** After a win the climb keeps going among winning rooms: fewer moves first, then a
   smaller room, reporting every distinct win (`polish` in `tools/climb.mjs`).
3. **Edits that aim.** 30% of edits read the last scoring of the room: a piece on the robot's path, a piece
   or the goal on a laser's beam, a block removed from an unsolvable room, the room cropped to its pieces.
4. **Partial credit for every goal.** A goal with no score of its own is scored from its own goal-card row:
   the first object it names (robot, beam, box) against the last (door, one-way, button, goal...). 28 goals
   gained credit this way; 13 count or end-state goals have none, by name in `tests/search.test.mjs`.
5. **The prover covers every piece.** `tools/minMoves.mjs` now builds rooms as the search does: lasers and
   one-ways in four directions, relays, inverted doors, pushable pieces where the level says, and `--pieces N`
   caps the pieces per room. It keeps the level's minimum moves; the old prover set it to 1, so it reported
   wins (level 1 in 1 move, level 2 in 2) the game refuses.

## Measured (2026-10-21)

`node tools/searchBench.mjs --engine old|new --seconds 30`, levels 15 to 19, seeds 1 to 3, no known rooms,
one cloud container, the runs one after the other. `old` is the search before this change (`aim: false`).

| | runs won | median first win | level 18 smallest room | level 19 best |
|---|---|---|---|---|
| old | 5 of 15 | 2.4s | 32 tiles | 10 moves, 42 tiles |
| new | 10 of 15 | 5.4s | 12 tiles | 7 moves, 18 tiles |

Per level, new: 15 none; 16 three of three (4 moves, 12 tiles); 17 one of three; 18 three of three;
19 three of three. Old: 15, 16 and 17 none. The median first win is slower only because the new search
also wins the harder levels (16 at 16-30s), which the old one never did.

## Limits

- **Level 15 still finds nothing** (150s, closest penalty 0.60): its one one-way must take the robot
  through, the laser through and a box against it, all at once. Seeded with a known room it is found.
- **The prover cannot settle big rooms.** Level 19 up to 9 tiles is 333 million rooms; a 5x5 room with
  5 pieces is 2.7 trillion. "No 6-move win in 5x5" is out of its reach.
- Wins depend on time, so a rerun of the benchmark gives close but not identical numbers.
