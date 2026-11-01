# Challenges: the playtest (registers 558-562)

2026-11-01. Five challenges to answer one question: are challenges fun, and do players solve them by
thinking rather than by trying everything?

## What a challenge is

A room already built, a few dashed tiles that take pieces, and a handful of pieces that must all be
placed. The only goal is the star: there is no move count (registers 570-572). The star starts out of
the robot's reach, and exactly one placement of the pieces gets it there. The robot slides until
something stops it, so a block works as a stopper.

| | Name | Pieces | Placements | Solution |
|---|---|---|---|---|
| C1 | Two blocks | 2 blocks | 55 | 6 moves |
| C2 | Three blocks | 3 blocks | 84 | 5 moves |
| C3 | A box | box, block | 72 | 7 moves |
| C4 | The door | switch, block | 72 | 7 moves |
| C5 | One way | one-way, block | 224 | 6 moves |

They are on the level list under "Challenges (playtest)", or open `#/level/c1` to `#/level/c5`.

## How to run it

1. 4 or 5 players who have beaten at least Level 3, so they know Run and that the robot slides.
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
  the star out of reach, exactly one solution and 50+ placements.
- Add one to `campaign/challenges.json`, then `node tools/challenge.mjs` checks it and
  `node tools/challenge.mjs --write` puts it in the game. `tests/challenges.test.mjs` holds every one to a
  single solution, and holds the game's Run to the checker's answer.
- The found arenas are random. A designer should hand-tune them (a clearer theme, fewer stray tiles)
  and re-check; the checker is what makes hand-tuning safe.
