# Campaign

The `wee-game` branch: the sandbox stays, and a campaign sits on top of it. **Game design is
the owner's.** Everything here is his ruling unless marked as a draft.

⚠ The first version of this file was lost with its container on 2026-10-16 and rewritten from
the conversation that day. Rulings are restated, not quoted, unless in quotes.

## The concept

- You do not solve the puzzle. **You build the room and a robot plays it.**
- The robot plays **every shortest path**. A room passes only when all of them pass.
- Each level sets: the room size, its fixed pieces (possibly none), the robot's powers, a
  palette of elements with a cost and a min/max each, a required move range x ± y, and
  requirements the solution must meet. Hitting exactly x moves is optional.
- On a failure the robot plays the failing path, so you can watch what went wrong.
- A win is scored three ways, the best of each kept separately: **cost** (sum of placed
  elements' costs), **area** (the room's width times height) and **optional requirements met**.
  Area replaced tiles on 2026-10-17 (owner: area "replaces tiles").
- **The room is yours to size.** Every level opens on an empty 7x7 room and you grow or shrink
  it with the grips on its edges, as in the sandbox; there is no limit. Its edge is not made of
  blocks: it stops the robot like a wall, costs nothing, and touching it is not a death.
- **The start and the goal sit one diagonal step in from the top left and bottom right corners** when a level opens (owner: *"I prefer having start and end preplaced on the corners"*, then *"moved one diagonal step towards the center as default"*). Rooms already saved keep their own. The **Move** tool carries them, or anything placed, to another tile: press on it, release where it goes. Exactly one of each, free.
- Costs are constant across levels: block 1, box 2, button 3, door 3, switch 2. Start and goal are free.
- The level list shows each level's elements as their palette icons (owner, 2026-10-17).
- Main menu: **Campaign** (the level list, opening on the last level played) and **Sandbox**
  (the Rooms list).
- Unlocking will be level 1, then batches of 3. **For now every level is open** while the levels
  are being made.
- Later: a "human" criterion.

## What a good level is (his words, 2026-10-17)

*"that is good puzzles for this game. it's always two layer. beating the minimum is half the
time, optimizing is the other half."* A level should take real work to win at all, and then as
much again to win well (exact count, lower cost, fewer tiles). Level 3 with one switch is the
reference.

## The campaign's shape (his notes, 2026-10-17, not built)

- A linear path where the next 3 levels are always unlocked.
- For each element, a branch of specialised levels built around it.
- Sometimes special areas of harder levels that mix two or three elements.
- Maximums: *"usually maximum limits are only needed if the solution gets boring with a high
  quantity. but the optimization aspect already kinda counts for it."* So a level leaves an
  element's maximum open unless a high count makes the solution boring.

## Moves and the robot

The robot slides like the player: a move is a press, and it slides until something stops it.
A press that goes nowhere is not a move, so a shortest path never bumps a wall or a closed door
on purpose. A key pressed again mid-slide is a distinct path to the robot (`right@1:right`).

## The switch

Called Toggle until 2026-10-17 (owner: *"switch is better"*); `toggle` is still its id in
the code and the level files. A floor switch of any colour. It starts off and flips every time something enters it, the
robot or any piece, sliding across included. Standing on it at the start does not flip it.
It holds its colour's doors like any other switch: a door opens only while **every** switch of
its colour holds.

## Levels

Every level opens on an empty 7x7 room with no border, the start at (1,1) and the goal at (5,5); no powers. **No level has a maximum on any
element for now** (owner, 2026-10-17: *"no maximums for now"*); the table's maximums are the
ones they had before.

| Level | Palette (min-max) | Moves | Requirements |
|---|---|---|---|
| 1 | block 0-10 | 6 ± 2 | none beyond the range |
| 2 | block 0-10, switch 1-1, door 1-1 | 7 ± 2 | robot collides with a closed door; robot goes through an open door |
| 3 | block 0-10, switch 1 or more, door 1 or more | 8 ± 2 | through an open door; door closed at the end (every switch on was dropped: the open door implies it) |
| 4 | block, switch 2 or more, door 1 or more | 8 ± 2 | through an open door; every switch off when the robot reaches the goal |
| 5 | block, box 1 or more | 8 ± 2 | one box is pushed in at least 2 moves and the robot collides with it once without moving it |
| 6 | block, box 1 or more, switch 1 or more, door 1 or more | 7 ± 2 | a box passes through an open door; the robot passes through an open door; only boxes flip switches |
| 7 | block 0-10, box 1-2, button 1-1, door 1-1 | 6 ± 2 | a box cannot start on a button; through an open door |
| 8 | as 7 | 10 ± 3 | a box cannot start on a button; through an open door; door closed at the end |

Level 3 asked for exactly 2 switches until 2026-10-17; now 1 or more of each, with no maximum (owner: *"no limit. it already is an optimization exercise on cost"*). A palette maximum of `null` means no limit.

Level 4 asked for one switch turned on then off until 2026-10-17, which his level 3 room also won (owner: *"level 4 has the same solution than level 3 and will need a different rule set"*). Now at least two switches and a door, through the open door, and both switches off at the end.

Level 5 (one box, three pushes) was added on 2026-10-17 between levels 4 and 5 (owner: *"box must do three moves as part of the solution"*, a push being a move that slides the box at least one tile). ⚠ I measured ~230,000 random 6x6 rooms, found no shortest path pushing one box twice, and said it could not be done; he drew a room that does it in 7 moves by boxing the robot in on three sides, so the only way out is through the box. He chose 8 ± 2, then changed the requirement the same day to *"2 pushes and 1 collide w/o push"*: one box pushed in at least 2 moves (a push slides it at least one tile), and at least one move where the robot slides and stops against that box without moving it. Three pushes stays available as a requirement (`boxPushedThrice`).

The switch-and-box level (now 6) was added on 2026-10-17 between the two-switch level and the button-and-box one (owner: *"box should go over door, you should go over door, switch can only be toggled by box"*). ⚠ **One box can never win it**: the robot always steps into the tile a box leaves, so pushing a box off a switch puts the robot on it. Every winning room found uses two boxes, one parked on the switch and one pushed through the door. Measured over 259 winning rooms: 4 to 9 moves, most often 4. He chose 7 ± 2.

Level 2 was added on 2026-10-17 (owner: *"huge spike of difficulty between level 1 and 2"*).
He first asked for one button and one door; a button only holds while something stands on it,
so the robot could never pass its door alive, and he chose a switch instead. "Collides" means
a slide that ends against a closed door (his words: *"touching it and stopping... use it as
somehow a wall"*). Its range 7 ± 2 is measured, not guessed: rooms meeting both requirements
were found from 5 to 16 moves, most often 6 to 9.

## When the robot cannot finish

Run says why and flashes the tiles: the first door colour that never opens, and which of its
switches never hold, named per kind ("its button is never pressed", "1 of its 2 switches never
turns on"). If every one holds at some point but never all together, it says so. With no door
to blame: "The robot cannot reach the goal from anywhere it can get to." Tap the verdict to
flash the tiles again. All of this copy is a draft.

## The level screen

Chosen 2026-10-17 from sketches (owner: *"B but using icon instead of name for objects"*, then
both interactions). Over the room, a goal card: the level's name, then one row per goal, the
move range first and the optional exact count last. Each row draws its objects as their palette
icons (the robot, a box, a door, a switch, a button) and is marked ✓ or ✕ after a Run; a
requirement is met only when every shortest path meets it. Under it, cost and area beside your
best. The card's height never changes: the verdict's words float over the bottom of the room
(× closes them) and the room never moves. Each palette button of an element wears how many are
placed (red until the minimum, written `n/min+`; `n/max` when a level sets a maximum) and its
cost. A tap the level refuses shakes the tile red and says why on it for a moment. Dragging with
Move shows a see-through copy on the landing tile, red with a cross where it cannot land, and a
dashed frame where the thing was. Row wording is a draft.

## Open

- Requirement keywords, Baba Is You style ("collides", "goes through"): his idea, forming.
  Do not draft any unless asked.
- ⚠ Retracted 2026-10-17: "the robot counts a key pressed again mid-slide as a separate path".
  That only happens with the dive or boomerang power on, which test rooms had and no campaign
  level has. In a level, two routes are two paths.
