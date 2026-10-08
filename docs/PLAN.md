# wee: ice slider sandbox, plan

Status: first slice built 2026-10-08 (steps 1 to 7 below). Hook, Swim, Light and the
blocks they need are not built yet. First test bed for the `game-skills` layer-1 skills.

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
| Same way as you | faster, immediate | one step each world step, **the way you moved**, ignoring its patrol axis. Blocked, it waits. A jump has no direction, so it stays. |

- **Moving block:** stops a slide like a base block. When it moves into you, it **pushes** you one
  tile; if a block is behind you, it **crushes** you and you go back to the last checkpoint.
- **Weak enemy:** touching it kills you, and you go back to the last checkpoint. A **laser** or a
  **dive** into it kills it, and so does landing a jump as it steps under you.
- **Strong enemy:** only a **thrown heavy box** kills it. It is immune to every laser and stops beams. A laser stops on it; diving into it kills
  you; it steps under a jump and kills you (my call).

## Triangles

A triangle tile is solid in one corner. Anything entering through an open face leaves through
the other, turned 90 degrees: you, boxes, heavy boxes, movers, enemies, lasers, turret beams.
Its solid sides stop things like a wall.

## Laser turret

- Its beam is **on all the time** (like Portal), recomputed every tick, turned by triangles.
- It points one of its chosen barrels at a time. **Real time**: turns clockwise on its own clock.
  **On your move**: turns once per world step. **Same way as you**: points the way you moved, if
  it has that barrel.
- Stands alone like a block, or **mounts on a box, a heavy box or an enemy** and rides it.
- The beam kills you (unless you are in the air) and weak enemies. Blocks, boxes, movers and
  strong enemies stop it.

## One-way tile

Lets things move onto it and off it only along its chosen directions (one way, two ways, up to
four); any other way it is a wall. You, boxes, heavy boxes, movers, enemies and beams all obey it.

## Spring

A solid tile facing one way. Whatever stands or passes on the tile in front of it is launched its
way and slides until something stops it: you, boxes, heavy boxes, movers, enemies. A beam passes
it by. It only fires when the way ahead is free, and not at you while airborne.

## Death block

Anything moving into it is destroyed: you, boxes, heavy boxes, movers, weak and strong enemies. A
beam stops at it.

## Laser sensor

A coloured floor plate, held down while a turret beam crosses it; the beam goes on. A piece on it
keeps the beam off. It joins its colour's buttons and receivers: every one must be held.

## Receiver

A block with a coloured eye. While a turret beam ends on it, it counts as a pressed button of its
colour, so it combines with that colour's buttons (all must be held).

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
| Cycle | Space **hides** you: you stay on your tile and the world takes one step, its on-your-move pieces sliding until they stop. Meanwhile nothing meets you and beams pass over. You come back when they have stopped (at least 4 ticks); anything on your tile then, or a door closed on it, squashes you. Hidden, you are a dashed outline. | movers to show it |

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
