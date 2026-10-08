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
- Noted for later, not built: height, the way 2D Zelda fakes 3D (ledges, jumping down a level).

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

- **Moving block:** stops a slide like a base block. When it moves into you, it **pushes** you one
  tile; if a block is behind you, it **crushes** you and you go back to the last checkpoint.
- **Enemy:** touching it kills you, and you go back to the last checkpoint. **Laser kills it**
  (for now; a stun may come later).

## Puzzle pieces: box, button, door

- **Box (light):** sliding into it pushes it, and it slides on ahead of you. You both keep
  going until the box hits a block; you stop on the tile behind it. Moving blocks and enemies
  push it too. It cannot squash an enemy.
- **Heavy box:** a slide does not move it; only a **Dive** crash into it does. A moving heavy box
  squashes an enemy in its way, and squashes you if it moves against you.
- **Button:** pressed while a box or you stand on it. Released, its doors close again.
- **Door:** a block while closed.
- **Wiring is by colour.** A colour's doors open only while **every** button of that colour is
  pressed (AND), and one colour's buttons open **all** its doors.

## Powers (his list, his words in brackets where kept)

| Power | Rule | Needs |
|---|---|---|
| Boomerang | Mid-slide, press the reverse arrow to slide back. You stop at the far wall, past where you started. | nothing |
| Dive | Mid-slide, press the same arrow again to arrive at the stopping tile at once and crash. Skipped tiles still give the world its steps, all at once. The crash moves a heavy box. It damages nothing for now; breaking blocks comes later. | heavy box; breakable block later |
| Laser | Mid-slide, press the clockwise or counterclockwise arrow to fire a beam perpendicular to you. You keep sliding. Kills an enemy it hits. | laser targets for puzzles |
| Hook | You stop when arriving on Grapple tiles instead of sliding over them. | grapple tile |
| Light | You emit light in dark levels, only while you are not moving. | a dark-level setting |
| Swim | You can pass through tiles that would kill you. | hazard tile |
| Cycle | Space is a little **jump**: you stay on your tile and the world takes one step. An enemy that moves onto your tile while you are in the air is killed. The jump reads from above: the player scales up on the way up and back down on landing, with its shadow staying on the tile. | movers to show it |

## The editor

1. Edit and play on one screen; one key switches, no reload.
2. Click adds a block, right click or the eraser removes it. Base block first; the palette is
   data, so a new block type is a new row.
3. Drag the player start. Place a checkpoint.
4. Powers panel: one checkbox per power, plus the clock toggle. A change applies at once.
5. **Save and Open work on a local file, like manga-tools' project file.** Save downloads a
   `.wee` file (JSON: the room, the pieces, the powers panel, the clock). Open picks a `.wee`
   file from disk. The file is the level; nothing depends on the browser keeping it.

## Block palette, in build order

1. Base block (stops a slide).
2. Checkpoint (R and death return here).
3. Moving block and enemy, each horizontal or vertical, each real time or on input.
4. Box, heavy box, button, door.
5. Hazard (kills you; Swim passes it).
6. Grapple (Hook stops on it).
7. Breakable (Dive breaks it).
8. Laser target, dark level: later.

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
6. Box, heavy box, button, door.
7. Save and load, then the first gates.

## Open

- Room size and tile size.
