# Generator plan: a room made to order, in the page

Status: **G1 to G3 built 2026-10-09.** The plan below is kept as written; where the build went
another way, "As built" says so and why.

## As built

- **The door** is a **Generate a room** button in Rooms, next to New room, not a question asked
  by New room. One tap fewer, and New room keeps meaning a blank room.
- **27 ingredients**, every mechanism in the index except two: real-time pieces (the solver
  cannot check them, and the panel says so) and "On your move" (every piece has it unless told
  otherwise). Powers are ingredients like any other. An ingredient that needs another brings it
  as Allowed (a laser catcher brings a turret and a door), and the form shows that.
- **Must use, in detail** (owner, 2026-10-09, replacing "the solution touches it"): the room
  is solved again with the ingredient taken out, and it counts only when that room has **no
  solution or a different number of moves**. Taken out means: every piece and tile of its kind
  removed; a door, inverted door or two-colour or two-button set loses its buttons, so it never
  changes; a laser catcher becomes wall; a power is switched off; a follower moves on your move;
  a mounted turret leaves its box. A search that hits its cap proves nothing and counts as not
  shown. Why: under the old rule 15 of 53 generated rooms worked the same without the
  mechanism they were asked to use; doors were all 7 of the door rooms, because a door opens
  only while its button is held and you cannot hold it and walk through, so a door now brings a
  box (two buttons, two). A checkpoint can never change the answer, since a solution never
  dies, so it is Allowed at most and the panel says why. Under the new rule 0 of 52 fits are
  decorative.
- **No Web Worker.** The loop runs in 25 ms slices on the page, like Check. The perf gate runs a
  12x12 turret-and-enemy recipe at 4x slower CPU and no task passes 250 ms, so a worker would add a
  second bundle for nothing.
- **The shelf is in the browser only** (`wee.generated`, last 20). It holds the closest room of a
  run that did not fit as well, marked "Closest".
- **Opening asks twice whenever the open room has unsaved changes**, generated or not. Undo after
  opening brings back the room before, its name included, and Redo the generated one.
- **The score** is: refused if anything Off is in the room; -1000 unsolved; then -100 per unused
  Must, -10 per move outside the range, and a small pull toward the middle of the range. The
  dead-end count in the plan is not built.
- **Found on the way: a solver bug.** A turret's aim counter grows forever, so the solver never
  saw a repeated state in any room with a turret and always ran to its cap. The state key now
  takes the aim modulo the turret's directions: Check on turret rooms ends, and laser catcher
  rooms generate in about 0.5 s instead of 20 to 50 s.
- **Measured** (Node, 8x8, 6 to 12 moves, each ingredient alone as Must, seeds 1 and 2, the
  knockout rule): 50 of 52 fit within 2,500 tries, most under 0.5 s, doors 1 to 2.5 s, the
  slowest about 4.6 s. Two buttons, one door misses on both seeds: it needs both boxes pushed
  onto both buttons, and 2,500 tries are not enough; give it more seconds or a bigger room.

The point: start a new room, pick what it should contain and how long it should take, press
Generate, and get one room that fits, made in the page while you watch. It is a way to feel the
mechanisms before building rooms by hand. It is **not** a batch of a thousand rooms made offline.

## What stays separate from your rooms

1. **Its own door.** New room asks: **Blank** or **Generate**. Generate opens the Generator
   panel. Nothing in the editor's tools changes.
2. **Its own shelf.** The last 20 generated rooms live in their own store (`wee.generated` in the
   browser, `generated/` on the server), never in your room list.
3. **It becomes yours only when you say so.** A generated room opens in the editor unsaved. Save
   moves it to your rooms and records where it came from: a `recipe` field (parameters plus seed),
   so the filter can show or hide rooms that started generated.
4. **The recipe rebuilds it.** Same parameters and seed, same room, on any device.

## The parameters

| Parameter | Default | Range |
|---|---|---|
| Size | 8 x 8 | 5 to 14 each side |
| Mechanisms | none chosen | each one: **Must use**, **Allowed** or **Off** |
| Powers | off | each on or off; a power set to Must use turns itself on |
| Moves (par) | 6 to 12 | 1 to 40 |
| Seed | random | any number; **Re-roll** picks another |
| Time | 15 s | 5 to 60 s |

"Fits" means: the room is solvable, its shortest solution is inside the move range, the solution
actually uses every Must-use mechanism (`uses()` replays it), and the room holds nothing set to
Off (`contains()`).

## How a room is made

Random rooms do not work: 4,000 random 6x6 rooms produced none that needed a power. So it is
generate, solve, score, then improve the best one (Taylor and Parberry, Murase et al., in
`PUZZLE_DESIGN_STUDY.md`).

1. **Frame.** A walled rectangle of the chosen size, a start and a goal.
2. **Seed the asked-for mechanisms.** Each Must-use mechanism has a placer that drops the tiles
   or pieces it needs where they can matter (a door with its button, a box in a lane you slide
   along, a turret facing a catcher).
3. **Scatter.** A few rocks and walls, so slides have places to stop.
4. **Score.** `solve()` with a small state cap (about 3,000). Unsolvable or out of range scores
   low; in range scores by how close par is to the middle of the range, how many Must-use
   mechanisms the solution uses, and how many stops lead nowhere useful (dead ends make a puzzle).
5. **Improve.** Change one thing at a time (move a wall, add or remove a rock, move a piece, the
   goal or the start), keep the change if the score goes up, start over from step 2 when stuck.
6. **Stop** when time runs out or you press Stop. The best room so far is always on screen.

It runs in a Web Worker, so the page never freezes. The single-file build puts the worker's code in
the page and starts it from a blob; if a browser refuses that, the same loop runs in short slices on
the page, the way Check already does.

## Regenerating a room you changed

Owner, 2026-10-09: a generated room you have edited is your work.

- **Generate again over an edited room asks twice.** First "This room has changes. Generate a new
  one?", then a second confirm naming what is lost. An unedited generated room regenerates
  without asking.
- **Undo brings it back.** A regenerate is one undo step on the open room, like a paste, so Ctrl+Z
  returns the room you had, edits included.
- Gate: edit a generated room, regenerate, confirm twice, undo; the room equals the edited one.
  And: one confirm alone changes nothing.

## What you see while it runs

- The best room so far, drawn small and redrawn when it improves.
- Its par, the mechanisms its solution uses, how many rooms were tried.
- **Stop**, **Open in editor**, **Try again** (new seed, same parameters).
- When nothing fits by the time limit, the closest room and what it missed ("par 4, wanted 6 to
  12"; "the door never opens").

## Code

A new folder, `src/gen/`, allowed to import `rules/`, `level/` and `solve/`, never `view/`,
`editor/` or `app/`. The arch test gets the new row.

| File | Job |
|---|---|
| `gen/random.js` | a seeded random number source |
| `gen/place.js` | one placer per mechanism |
| `gen/mutate.js` | the one-change edits |
| `gen/score.js` | fits, and the score |
| `gen/generate.js` | the loop, as a generator that yields the best room so far |
| `app/generator.js` | the panel, the worker, the shelf |

## Gates

- **Same recipe, same room**, byte for byte.
- **Every room it calls a fit is one**: over 20 seeds, each solves inside the range, uses every
  Must-use mechanism and holds nothing set to Off. Checked with the solver, not with the score.
- **Nothing generated reaches your rooms before Save**: the room list is unchanged after a run.
- **The page never freezes**: `perf.smoke` runs a generation at 4x slower CPU, no task over 250 ms.
- Mutation entries for every file in `src/gen/`.

## Phases

| Phase | Ships | Rough size |
|---|---|---|
| G1 (done) | `src/gen/` with placers for 10 common mechanisms (box, heavy, door and button, inverted door, triangle, one-way, spring, water, death block, turret and catcher), tests | half a day |
| G2 (done) | the Generator panel, worker, shelf, Save with recipe, browser and perf smokes | half a day |
| G3 (done) | placers for the rest, mechanisms without one shown as "not yet" until then | a day, in pieces |

## Open questions

1. ~~Must-use: used, or needed?~~ **Used** (owner, 2026-10-09): the shortest solution touches it.
   **Revised the same day** after measuring: it must **change the answer** (no solution, or a
   different number of moves, without it). See As built.
2. ~~Template or empty frame?~~ **Empty frame** (owner, 2026-10-09).
3. ~~Shelf names?~~ **Made from the recipe** (owner, 2026-10-09): e.g. "8x8 · 6-12 moves · Door,
   Box". No typing; a name of your own comes with Save.

All open questions answered and built.

## Next round (diagnosed 2026-10-10, not built)

Owner: a generated room asked for 18+ moves came back at 11, and "completely linear, there is
no dilemma, soft lock positions, almost there but lost". Measured before proposing anything:

| | his example room | generated (8x8, box + door Must, 18 to 30 moves, 4 seeds) |
|---|---|---|
| fits | yes | no: the run ran out and kept the closest, par 13 / 14 / 17 / 20 |
| positions reachable | 160 | 35 to 82 |
| positions that can no longer win | 56% | 0 to 54% |
| one wrong move off the solution traps you | 3 | 0, 0, 2, 4 |
| dead positions past half the solution | 30 | 0 to 26 |

Why: one-tile changes rarely lengthen a solution; small rooms have few positions; nothing in
the score rewards a dilemma.

Planned, in order:
1. **Your powers** (owner: "always your powers"). A generated room has exactly the powers
   checked in the editor; moves, Must use and feel are judged with them. Power rows leave the
   ingredient list.
2. **A feel score** for rooms already in the move range, from the full map of positions:
   positions, dead share, traps one wrong move off the solution, dead positions past halfway,
   one route, every piece needed. Default targets come from his example room.
3. **Long solutions:** changes that add boxes and switches, restarts from the best room, and
   climbing on after the first fit until time runs out.
4. **An honest miss:** "Did not fit: 11 moves, wanted 18 to 30", not a quiet "Closest".

## Power combinations (planned, owner 2026-10-10)

> "I'd like to plan something more generic that reveals combinations for many power
> combinations. If I'm doing a metroidbrainia, the same level could have different solutions
> and different movement quantities according to the powers you unlocked."

- **A power table in the design notes.** For the powers a room could use, solve every
  combination (6 powers is 64 solves, each capped) and show moves per combination, marking the
  **unlocks**: adding one power makes an unsolvable room solvable, or cuts it short. Example
  line: "Unsolvable until Dive. Dive: 14 moves. Dive + Boomerang: 9."
- **A different route, not just a shorter one:** for each combination, the mechanisms its
  solution uses (the index's `use:` tags), so a combination that solves the room *another way*
  shows as such, not only as a smaller number.
- **The generator can then ask for it:** a recipe line like "unsolvable without Dive, and
  Boomerang makes it at least 4 moves shorter", judged with the same table.
- **Which combinations: an unlock tree** (owner, 2026-10-10: "A tree well defined together,
  because I wish the game is not completely linear, but still have a choice of progression").
  Each node is a set of powers the player can hold; each edge is one unlock. The table solves
  the room at every node, and a branch shows where two progressions give the room different
  answers. The tree is a game-wide file the owner and I write together; nothing is built
  until it is defined.
