# Inspecting one tile under the line lenses: diagnosis and proposal (2026-11-04)

Owner (register 752): *"Maybe when an arrow lens is on, hovering a cell should show only some info.
Like, only what gets there and leaves there, or goes through... so its easier to inspect. Diagnose and
propose."*

Diagnosis only, nothing changed.

## What the line lenses draw today

The Lines group has two lenses (`app/lenses.js:20`):

- **Solution:** one shortest way to the berry, its moves numbered. Since 720/722 it also keeps the broken
  old answer, dimmed, up to a red X.
- **Moves:** every slide from stop to stop the search found, thicker where more positions make it
  (`moves: [{ a, b, n }]`, start tile, end tile, how many positions; `app/lenses.js:122`).

Both draw everything at once. On Puzzle 1 the Moves lens draws dozens of slides over the whole room, and
the shot of 751 shows the Solution lens with two answers stacked. To learn what a single tile does, you
have to follow the line with your eye from wherever it starts.

Nothing on screen narrows the drawing. Hovering a tile only fills the info line with words (`chips.js:78`),
and hover exists only for a mouse (740).

## What "inspect a tile" should answer

For one tile, three questions, the same ones the owner named:

| Question | What it is in the data | How it reads on the room |
|---|---|---|
| What arrives here? | slides whose end `b` is this tile | lines ending at the tile, arrowhead in |
| What leaves from here? | slides whose start `a` is this tile | lines starting at the tile, arrowhead out |
| What passes through? | slides from `a` to `b` whose straight run crosses this tile without stopping | lines crossing the tile, drawn thinner |

Slides are straight runs, so "passes through" is worked out from `a` and `b` with no new search. For
Solution, the same three filters pick the numbered moves that arrive, leave or pass.

## The proposal: a focused tile filters the lines

Hover alone is ruled out: it does not exist on a phone or a controller (740). So the trigger is the
**focused tile**, the room cursor that 740 proposes anyway:

- **Mouse:** hovering moves the focus (as a convenience, not the only way).
- **Touch:** a tap with the Look tool focuses a tile (as Look does today).
- **Controller and keyboard:** the d-pad or arrow keys move the room cursor.

While a line lens is on and a tile is focused:

1. **Only the slides that arrive, leave or pass are drawn at full strength.** Everything else fades to a
   faint trace, so the shape of the room stays readable and nothing jumps.
2. **Arriving and leaving read differently.** Arriving lines carry their arrowhead into the tile; leaving
   lines carry it out; passing lines are thinner. The colours do not need to change.
3. **The info line counts them:** "Tile 3, 4: 2 slides arrive, 3 leave, 1 passes through." For Solution:
   "Move 4 arrives here, move 5 leaves."
4. **No focused tile means the full drawing**, exactly as today.

A small refinement to decide: whether the filter follows the focus live (mouse hover, cursor), or holds
on a tile once tapped until it is tapped again or Esc / B. Live suits a mouse and the cursor; held suits a
phone, where the finger leaves the screen.

## How it meets the other open rows

- **751 (hard to interpret):** focusing a tile is a second way out of a busy drawing, beside a cleaner
  default.
- **750 (one dots lens):** the same filter can apply to the dots: a focused tile shows the stops reachable
  from it.
- **740 (controller):** this is the first use of the room cursor that is not editing, which makes it a good
  first slice to build the cursor with.

## Question for the owner

1. Should the filter follow the focus live, or hold on a tapped tile until released?
