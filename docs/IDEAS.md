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
