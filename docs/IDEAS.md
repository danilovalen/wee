# Ideas

Raw mechanisms and features, not planned and not promised. Each entry keeps the owner's words,
then my notes under it: questions to answer before building, and anything already checked.
When one is picked up, it moves to a plan and gets a register line.

## Magnets (2026-10-09)

> magnets: propulsion and repulsion, may be switched by buttons. Works on you if armored, heavy
> boxes, strong enemies.

Notes (mine):
- **Pull and push are two kinds, or one magnet a button flips?** "May be switched by buttons"
  reads as the second; a colour like doors would reuse the existing wiring.
- **Range and shape:** one row and column, like a turret beam, or every tile around it? Does a
  wall block the pull, as it stops a beam?
- **Timing:** does it pull on your move, like the input clock, or does a piece slide toward it
  once until something stops it, like ice?
- **What it moves is the heavy set** (you only when armored, heavy box, strong enemy), which is
  almost the list that holds a closing door open today (strong, heavy, mover). Worth deciding
  whether that is one "heavy things" list or two.
- What happens when a pulled piece reaches the magnet: it stops beside it, or sticks.

## Cloner (2026-10-09)

> cloner: when all buttons are pressed of that color and they all have the same type of thing
> above them, it will spawn a copy in front of the cloner

Notes (mine):
- "All buttons of that colour pressed" is already how a door opens (`refreshDoors`), so the
  cloner can read the same pressed state; "the same type of thing above them" is the new part.
- **Does you standing on a button count as a type?** Could it clone you?
- **Once or every time:** one copy when the condition becomes true, or one per move while it
  stays true? And what if the tile in front is taken?
- **Which way is "in front":** the cloner has a facing, like a spring.
- A spawned piece breaks a rule the solver relies on: the piece list never grows. Its state key
  and the reset (`respawn` rebuilds pieces from the level) would both need to know about copies.

## Pieces that start on a button (2026-10-09)

> allowing boxes enemies and moving platforms to start above buttons somehow
> ie separating stuff that stays on ground (like puddles) from things with volume
>
> water is also a thing that stays on floor

Checked (mine): **the rules and the editor already allow it.** A box, weak or strong enemy,
moving block or heavy box placed on a button, in either order, keeps both, and the button is
pressed from the first tick (the door opens at the start). Measured 2026-10-09 with
`src/editor/edit.js` `place()` and `createGame`.

So the gap is likely how it looks and how it is found, not the rules:
- Does the piece hide the button when drawn? If so, the fix is drawing tiles that sit on the
  ground (button, puddle, checkpoint, goal) under a piece and still visible around it.
- His split is the right model: **ground tiles** (button, puddle, checkpoint, goal, water,
  one-way, sensor; water confirmed by him) can share a tile with a piece; **solid tiles** (wall, door, spring, catcher,
  triangle) cannot. The editor already behaves this way in most places; writing the split down
  as one list would make it a rule instead of a coincidence.
- Water has one question the others do not: a piece that cannot wade (box, weak enemy, lone
  turret) starting **in** water. The rules only stop such a piece from entering water, so today
  it could leave but never come back. Allow it, or refuse it in the editor?

## Lenses on the map (2026-10-10)

> Would be good besides the "stop" having a "passes by" dots too. So you can see places you
> don't stop but you actually use for motion. And similar "lenses" for checking other things
> like lasers, boxes, enemies moving... we can diagnose this later.

Notes (mine):
- **Passes by** falls out of the same position map the Stops lens and the trap count already
  build (`routes()`): record every tile a slide crosses, not only where it ends.
- Candidate lenses: tiles you pass, tiles a beam ever covers, tiles a box can ever reach, an
  enemy's whole path. Each is "every tile X ever occupies, over every reachable position".
- One toggle that cycles lenses, or one button per lens: to decide.

## Power-up bubbles (2026-10-10)

> power up bubbles. End movement on one, you gain it for the remainder of the playthrough

Notes (mine):
- **"End movement on one"**: only a stop counts, passing over does not, which makes the bubble a
  target for the ice slide like the goal is.
- **"The remainder of the playthrough"**: until the room is reset, or across rooms in a run?
  If across rooms, it ties into the unlock tree.
- **Solver cost:** the held powers join the state key, so a bubble can double the positions.
- Does the bubble vanish once taken, and does a reset bring it back?

## One step at a time, as a power (2026-10-10)

> the ultimate power: moving one step at a time. Not sure how it will work with the other powers
> that require some movement first though.

Notes (mine):
- It ends the ice rule, so every tile becomes a stop: the solver's positions grow with the room's
  floor, not its walls. Worth measuring on First room before deciding.
- The clash he names: Boomerang, Dive and Laser are all pressed **during a slide**. With one-step
  moves there is no slide to press them in. Options: one step is a separate key (slide stays the
  default, so the other powers still work), or the other powers act from standing.
- A separate key looks like the smaller change: Shift + arrow, or a toggle on the pad.

## One step, for enemies and moving blocks (2026-10-10)

> adding "one step" to enemies and moving blocks. Every cycle, they move one, instead of full
> glide.

Checked (mine): today an on-your-move patrol **launches** each world step and glides until
blocked (`worldStep` calls `launch`). So this is a new per-piece choice, like the clock: **Glides**
or **One step**. One step makes a patrol a metronome you can count, which suits the ice rule:
your one slide is N of its steps on the tile clock, one on the slide clock.
