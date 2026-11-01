# Challenges: the playtest (registers 558-562)

2026-11-01. Five challenges to answer one question: are challenges fun, and do players solve them by
thinking rather than by trying everything?

## What a challenge is

A room already built, a few dashed tiles that take pieces, and a handful of pieces that must all be
placed. The only goal is the star: there is no move count (registers 570-572). The star starts out of
the robot's reach, and exactly one placement of the pieces gets it there. The robot slides until
something stops it, so a block works as a stopper.

| | Name | Pieces | Placements | Solution | Ways to rest on the star | Also |
|---|---|---|---|---|---|---|
| C1 | Two blocks | 2 blocks | 55 | 5 moves | 3 | trap slot, two-job piece |
| C2 | Three blocks | 3 blocks | 120 | 10 moves | 2 | trap slot, two-job piece |
| C3 | A box | box, block | 56 | 15 moves | 2 | trap slot, two-job piece |
| C4 | The door | switch, block | 72 | 11 moves | 2 | trap slot |
| C5 | One way | one-way, block | 224 | 9 moves | 3 | trap slot, two-job piece |

Every challenge's slots are trimmed to the ones some nearly-right placement uses (register 580). "Ways
to rest on the star" counts fixed stoppers and slots only; a box can make a stopper anywhere.

A challenge with one way to rest on the star solves backwards in forced steps (register 577), so the
finder now asks for two or more, and per challenge for some of: a trap slot (the winning path slides
across it), a two-job piece (the robot rests against it from two sides), a longer solution, and slots
trimmed to the ones some nearly-right placement uses. `node tools/challenge.mjs` prints these for any
challenge, hand-made ones included; nothing gates them, the content is the designer's.

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

- `node tools/challengeFind.mjs [--seed S] [--theme Name]` searches random arenas per spec in its
  `SPECS` list (size, pieces, which tricks to ask for).
- Add one to `campaign/challenges.json`, then `node tools/challenge.mjs` checks it and
  `node tools/challenge.mjs --write` puts it in the game. `tests/challenges.test.mjs` holds every one to a
  single solution, and holds the game's Run to the checker's answer.
- The found arenas are random. A designer should hand-tune them (a clearer theme, fewer stray tiles)
  and re-check; the checker is what makes hand-tuning safe.
