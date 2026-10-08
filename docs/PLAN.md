# wee: ice slider sandbox, plan

Status: planned 2026-10-08, nothing built. First test bed for the `game-skills` layer-1 skills.

## What it is

A Mario Maker style sandbox on a web canvas. You build a room, play it on the same screen,
and switch player powers on and off, to feel them out before committing to a set.

## Movement (decided)

- Top-down, four directions, **Pokemon ice**: one press and you slide tile by tile until a block
  stops you. Grid exact.
- A slide takes real time, one tile per tick, and accepts key presses while it runs. Most
  powers act mid-slide.
- **R** respawns you at the last checkpoint. Dying sends you there too. With no checkpoint
  touched yet, the checkpoint is the player start.
- Noted for later, not built: side view with gravity after a slide (VVVVVV style).

## World clock (decided: both, a toggle on the panel)

1. **Per tile:** the world takes one step for every tile you slide.
2. **Per slide:** the world takes one step per slide, however long.

This clock drives the **on input** movers below. The **real time** movers ignore it.

## Movers: moving block and enemy

Both patrol in a straight line, **horizontal or vertical, wall to wall**, and turn back at a block.
Each one placed in the editor picks its axis and its mode:

| Mode | Speed | When it moves |
|---|---|---|
| Real time | slower | on its own clock, whether you move or not |
| On input | faster, immediate | one step each time the world clock steps (per tile or per slide) |

- **Moving block:** stops a slide like a base block.
- **Enemy:** touching it kills you, and you go back to the last checkpoint.

## Powers (his list, his words in brackets where kept)

| Power | Rule | Needs |
|---|---|---|
| Boomerang | Mid-slide, press the reverse arrow to slide back. You stop at the far wall, past where you started. | nothing |
| Dive | Mid-slide, press the same arrow again to arrive at the stopping tile at once and crash. Skipped tiles still give the world its steps, all at once. The crash will break some blocks and maybe deal damage. | breakable block for the break |
| Laser | Mid-slide, press the clockwise or counterclockwise arrow to fire a beam perpendicular to you. You keep sliding. | laser targets for puzzles |
| Hook | You stop when arriving on Grapple tiles instead of sliding over them. | grapple tile |
| Light | You emit light in dark levels, only while you are not moving. | a dark-level setting |
| Swim | You can pass through tiles that would kill you. | hazard tile |
| Cycle | Space makes the world take one step while you stay put. A second effect is still open. | moving things to show it |

## The editor

1. Edit and play on one screen; one key switches, no reload.
2. Click adds a block, right click or the eraser removes it. Base block first; the palette is
   data, so a new block type is a new row.
3. Drag the player start. Place a checkpoint.
4. Powers panel: one checkbox per power, plus the clock toggle. A change applies at once.
5. The level and the panel settings save as JSON in the browser, with export and import.

## Block palette, in build order

1. Base block (stops a slide).
2. Checkpoint (R and death return here).
3. Moving block and enemy, each horizontal or vertical, each real time or on input.
4. Hazard (kills you; Swim passes it).
5. Grapple (Hook stops on it).
6. Breakable (Dive breaks it).
7. Laser target, dark level: later.

## Layer-1 rules this build must prove

- Fixed timestep and `renderGameToText()` from day one; every gate reads the text state.
- Input replay: a recorded key log replays to the same final state.
- Everything that appears or leaves moves; motion only on a change.
- Gates print `N/N passed`, a missing total is red, every gate is mutation-tested.
- A playtest register from the first session.

## First slice

1. Canvas grid, base block, place and erase, player start.
2. Slide until a wall, on a fixed tick, with key input mid-slide.
3. Checkpoint, R to respawn.
4. Boomerang and Dive (no new blocks needed), the clock toggle.
5. Moving block and enemy, both modes.
6. Save and load, then the first gates.

## Open

- Cycle's second effect.
- What Dive's crash damages, and how much.
- Room size and tile size.
- A moving block that reaches you: does it push you, stop against you, or crush you?
- Can an enemy be killed (Dive, Laser), or only avoided?
