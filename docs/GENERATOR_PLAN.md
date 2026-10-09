# Generator plan: a room made to order, in the page

Status: planned 2026-10-09, nothing built. Each phase ships on its own: tests, mutation run, one
`dist/wee.html`, a register line.

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
| G1 | `src/gen/` with placers for 10 common mechanisms (box, heavy, door and button, inverted door, triangle, one-way, spring, water, death block, turret and catcher), tests | half a day |
| G2 | the Generator panel, worker, shelf, Save with recipe, browser and perf smokes | half a day |
| G3 | placers for the rest, mechanisms without one shown as "not yet" until then | a day, in pieces |

## Open questions

1. ~~Must-use: used, or needed?~~ **Used** (owner, 2026-10-09): the shortest solution touches it.
   "Needed" (unsolvable without it) stays a possible later option.
2. Should a generated room start from a template's shape, or always from an empty frame?
3. Does the shelf need a name for each generated room, or is the recipe enough?
