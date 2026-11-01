# Challenges: the playtest (registers 558-562)

2026-11-01. Five challenges to answer one question: are challenges fun, and do players solve them by
thinking rather than by trying everything?

## What a challenge is

A room already built, a few dashed tiles that take pieces, and a handful of pieces that must all be
placed. Run judges it as in a builder level: the robot plays every shortest path, takes 4 or more moves,
and reaches the star (plus any goal the challenge names). Each one has exactly one winning placement.

| | Name | Pieces | Placements | Reach the star | Solution |
|---|---|---|---|---|---|
| C1 | Three blocks | 3 blocks | 165 | 163 | 4 moves |
| C2 | A box and two blocks | box, 2 blocks | 168 | 1 | 12 moves |
| C3 | Through the door | switch, 2 blocks; the robot goes through the door | 168 | 13 | 8 moves |
| C4 | One way | one-way, 2 blocks | 240 | 131 | 5 moves |
| C5 | Two boxes | 2 boxes, a block | 168 | 148 | 4 moves |

"Reach the star" counts placements where the robot gets there but too fast or without its goal: the
more of those, the more near misses a player meets. C2 is the opposite: almost nothing gets there.

They are on the level list under "Challenges (playtest)", or open `#/level/c1` to `#/level/c5`.

## How to run it

1. 4 or 5 players who have beaten at least Level 3, so they know Run and the 4-move rule.
2. One at a time, C1 to C5, no help. Say only: "place every piece, then Run".
3. For each challenge note: time to solve, number of Runs, gave up (after 6 minutes or by saying so),
   and ask: "what was the trick?"
4. Then: "rate each 1 to 5 for fun", and "would you want more of these, or more builder levels?"
5. For comparison, have the same players do Levels 4 and 5 the same way.

## What passes

- Most players solve each in 1 to 5 minutes.
- Fewer than 1 in 5 give up on any one.
- Players can say the trick (not "I tried things until it worked").
- Fun is rated at least as high as the builder levels they played.

A challenge that fails these is cut or redone; if most fail, challenges are not the third level kind.

## Making more

- `node tools/challengeFind.mjs [--seed S] [--theme Name]` searches random 5x5 arenas for ones with
  exactly one solution and 150+ placements.
- Add one to `campaign/challenges.json`, then `node tools/challenge.mjs` checks it and
  `node tools/challenge.mjs --write` puts it in the game. `tests/challenges.test.mjs` holds every one to a
  single solution, and holds the game's Run to the checker's answer.
- The found arenas are random. A designer should hand-tune them (a clearer theme, fewer stray tiles)
  and re-check; the checker is what makes hand-tuning safe.
