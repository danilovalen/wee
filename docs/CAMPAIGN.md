# Campaign

The `wee-game` branch: the sandbox stays, and a campaign sits on top of it. **Game design is
the owner's.** Everything here is his ruling unless marked as a draft.

⚠ The first version of this file was lost with its container on 2026-10-16 and rewritten from
the conversation that day. Rulings are restated, not quoted, unless in quotes.

## The concept

- You do not solve the puzzle. **You build the room and a robot plays it.**
- The robot plays **every shortest path**. A room passes only when all of them pass.
- **Nothing starts on a button or a switch**, in any level: no box and not the robot (owner,
  2026-10-18), so no level needs to say it.
- **Every room needs at least 4 moves**, in every level: one rule for the whole campaign, the
  first line of the goal card (owner, 2026-10-18: *"a min 4 for EVERY level, the ultimate
  unquestionable minimum, high priority info"*). There is no most. Each level's former range
  x ± y went; its x stays as the optional exact count.
- Each level sets: the room size, its fixed pieces (possibly none), the robot's powers, a
  palette of elements with a min/max each, an exact move count x (an optional goal), and
  requirements the solution must meet. Hitting exactly x moves is optional.
- On a failure the robot plays the failing path, so you can watch what went wrong.
- **No scores.** A win is a win; each level then has three optional goals: the **exact move
  count**, a **room of A×B or smaller** (its area at most A times B, either way round), and
  **mix**: two of the others in the same run. A level may add path goals of its own (level 2:
  through an open door twice), met only when every shortest path meets them. The game's idea (owner, 2026-10-18): *"you don't
  have to do all objectives in the same run"*; mix tells the player two may fit one room and all
  of them probably not. Today only levels 4 and 5 have a known room meeting both (register 179). A×B
  is the smallest winning room `tools/tilesArea.mjs` found for that level. The level list keeps
  how many optional goals a level has ever met, and statistics for comparing with other players:
  the fewest and most moves of any win, and per room area the fewest and most tiles placed
  (shown at the smallest area won). Owner, 2026-10-17: *"drop both area and tile...
  one of the optional goals permanently be an area one... no more ZACHTRONICS evaluation"*,
  then *"A x B or smaller, use your smallest area search found"*. Before that a win was scored on
  cost and area (cost removed first, then area once a measurement showed the fewest-tiles win
  is also the smallest-area win in all 8 levels, register 176).
- **The room is yours to size.** Every level opens on an empty 7x7 room and you grow or shrink
  it with the grips on its edges, as in the sandbox; there is no limit. Its edge is not made of
  blocks: it stops the robot like a wall and touching it is not a death.
- **The start and the goal sit one diagonal step in from the top left and bottom right corners** when a level opens (owner: *"I prefer having start and end preplaced on the corners"*, then *"moved one diagonal step towards the center as default"*). Rooms already saved keep their own. The **Move** tool carries them, or anything placed, to another tile: press on it, release where it goes. Exactly one of each, free.
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
| 1 | block 0-10 | exactly 6 (optional) | none beyond the 4-move minimum |
| 2 | block 0-10, switch 1-1, door 1-1 | exactly 7 (optional) | robot collides with a closed door; robot goes through an open door |
| 3 | block 0-10, switch 1 or more, door 1 or more | exactly 8 (optional) | through an open door; door closed at the end (every switch on was dropped: the open door implies it) |
| 4 | block, switch 2 or more, door 1 or more | exactly 8 (optional) | through an open door; every switch off when the robot reaches the goal |
| 5 | block, box 1 or more | exactly 8 (optional) | one box is pushed in at least 2 moves and the robot collides with it once without moving it |
| 6 | block, box 1 or more, switch 1 or more, door 1 or more | exactly 7 (optional) | a box goes into an open doorway; the robot passes through an open door; only boxes flip switches |
| 7 | block, box 1 or more, button 1 or more, door 2 or more; red and blue | exactly 7 (optional, mine, provisional); 4×5 or smaller | the robot passes through doors of two colours; a box goes into an open doorway (his idea, register 243: two colours, you through two doors, the box through one) |
| 8 | block, box 1 or more, button 1 or more, door 1 or more | exactly 6 (optional; his "maybe 7" has no win found, 6 is the nearest found); 4×4 or smaller | through an open door; door closed at the end (the old level 8, register 226; the old level 7 is gone, it was nearly the same; level 7 until 243) |
| 9 | as 8 | exactly 7 (optional, mine, provisional); 4×5 or smaller; a box crushed by a closing door (optional) | a box goes into an open doorway (his design: a box through a door, the crush an extra optional goal; register 237: a box crushed in the doorway went into it, so his crush run wins too; level 8 until 243) |
| 10 | block, one-way 2 or more | exactly 8 (optional, provisional); 3×5 or smaller | the robot goes through every one-way; the robot collides with every one-way (level 9 until 243) |
| 11 | block, box 1 or more, one-way 1 or more | exactly 10 (optional, his number); 6×3 or smaller | a box goes through a one-way; a box collides with a one-way (once; register 238, was twice; level 10 until 243) |
| 12 | block, box 1 or more, button 1 or more, one-way 1 or more; red | exactly 7 (optional, mine, provisional); 5×3 or smaller | the robot goes through a one-way both ways (his idea, register 241: the one-way turns while red is pressed) |
| 13 | block, box 1 or more, switch 1 or more, one-way 1 or more, door 1 or more; red | exactly 9 (optional, mine, provisional); 7×3 or smaller | a box goes through a one-way both ways; the robot goes through an open door (his idea, register 242: one switch opens the door and turns the one-way) |

**Colours (levels 7, 12, 13; owner 2026-10-19, registers 241-245).** A level may name its colours (`colours` in its file); its buttons, doors and switches come in those, and in such a level a one-way has one too (`gate:right@red`). A coloured one-way points the other way while its colour's doors are open, and lights up: tinted, ringed, its arrow thicker (his pick of three sketches). A level with two colours shows them as a row of dots over its tools; what you place takes the chosen one and the palette draws its pieces in it (his pick). Pieces of other colours are not the level's. A level that names none is red and its one-ways are plain, as before. Level 7 was inserted before the box-and-button levels, so the old 7 to 10 are 8 to 11; saved progress moves with them.

**One-ways (levels 10 and 11, owner 2026-10-18).** Placed pointing right; a tap on one with its tool turns it a quarter clockwise (the first time, a tip on the tile says so). *Through* is entering along the arrow and leaving off the far side; stopping on it is not through. *Colliding* is a slide stopped by a one-way from any direction it does not let through, head-on or from the side. A box never slides by itself: the robot pushes it tile by tile, and the box collides when a push ends with a one-way stopping it, counted only when the box moved in that push. Exact counts for 9 and 10 are mine, each proven by a known win in `tests/campaign.test.mjs`, and wait for his numbers; size goals are the smallest wins `tools/tilesArea.mjs` found (found, not proven). "A box ends on a one-way" is reachable on level 10 (a 33-move 9×9 win) and is not a goal yet.

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

## Test

**Test**, beside Run, plays the room by hand (arrows or swipes); reaching the goal says so and in
how many moves. A test is never judged and never saved (owner, 2026-10-18).

## Why a goal was missed

A failed goal row is underlined: a tap draws on the room a shortest path that missed it, the
robot's moves numbered and each box's trail dashed, and names the goal (owner's pick, F1 of two
sketches, 2026-10-18).

## When the robot cannot finish

Run says why and flashes the tiles: the first door colour that never opens, and which of its
switches never hold, named per kind ("its button is never pressed", "1 of its 2 switches never
turns on"). If every one holds at some point but never all together, it says so. With no door
to blame: "The robot cannot reach the goal from anywhere it can get to." Tap the verdict to
flash the tiles again. All of this copy is a draft.

## The level screen

Chosen 2026-10-17 from sketches (owner: *"B but using icon instead of name for objects"*, then
both interactions). Over the room, a goal card: the level's name, then one row per goal, the
4-move minimum first and the optional goals last. Each row draws its objects as their palette
icons (the robot, a box, a door, a switch, a button) and is marked ✓ or ✕ after a Run; a
requirement is met only when every shortest path meets it. Under it, the area beside your
best. The card's height never changes: the verdict's words float over the bottom of the room
(× closes them) and the room never moves. A minimum of 2 or more is a goal row of its own ("2 or more" and
the element's icon); a minimum of 1 goes without saying, and no palette button wears a count
(owner, 2026-10-18). A tap the level refuses shakes the tile red and says why on it for a moment. Dragging with
Move shows a see-through copy on the landing tile, red with a cross where it cannot land, and a
dashed frame where the thing was. Row wording is a draft.

## Open

- Requirement keywords, Baba Is You style ("collides", "goes through"): his idea, forming.
  Do not draft any unless asked.
- ⚠ Retracted 2026-10-17: "the robot counts a key pressed again mid-slide as a separate path".
  That only happens with the dive or boomerang power on, which test rooms had and no campaign
  level has. In a level, two routes are two paths.

## Open work, in order (2026-10-18; built 2026-10-19)

All five groups are built (register rows give the detail). Still open: his final level 9 room (was 8; his screenshot room is not winnable today); his exact counts for 8 (6 now), 9, 10, 11 and the three colour levels 7, 12, 13 (7, 7, 9, mine); and the resize report if it ever happens again. Level numbers moved on 2026-10-19 (a new level 7).

His reports not yet fixed, grouped and ordered by how much they get in the way of play. Row numbers are `docs/REGISTER.md`. Each item closes with a gate and a mutant.

**1. Stop the screen moving (rows 222, 235, 221).**
1. Sweep first: a browser test records the box of every visible element (room, goal card, palette, top bar, grips) on a phone and a desktop, across Edit → Run → the robot's demo → back to Edit → Test → back, a goal turning met, a level switch, and a resize tap. Every change that is not the room's own content is a defect.
2. The room keeps its place and size from Edit to Run to Test (222): the palette's space is kept, not freed, while playing.
3. The goal card keeps its height when marks change (✓ and ✕ in place of empty circles) and when the "last run" note appears.
4. The verdict pop-up goes (221). Today it covers the room after every Run and only repeats the card. To put to him before building: drop it and let the card's marks and the trail say it, or a one-line strip in a fixed place that never covers the room.
5. The + grips stop jumping when pressed (227, part 1).

**2. Resizing that stops working (rows 153, 213, 227).**
1. Treat a cancelled touch on a + that never moved half a tile as a tap (the leading hypothesis: his phone's file viewer cancels some touches).
2. If it still happens, the Report a problem output decides the next step.

**3. Menus as full pages (rows 220, 218, 219).**
1. Every menu is a page, never a box over the game: level list, Rooms, New room, Room info, Generator, Keys, Report a problem.
2. Sandbox looks exactly like Campaign (218).
3. The menu's robot slides like the game's robot, each move a slide to the next obstacle (219).

**4. Editing (rows 230, 234).**
1. Moving a box onto a button or switch swaps them, as does the robot.
2. One-way: the tip goes; the palette label reads "ONE-WAY (TAP TO ROTATE; HOLD TO REMOVE)"; a hold on a placed one-way removes it.

**5. Levels (rows 223 to 229, 225's rule).**
1. Re-measure every level's size goal and exact count under today's rules (row 225: numbers measured under old rules are stale).
2. Today's level 7 goes; level 8, re-measured and with an exact count of 7 if he confirms (224), becomes level 7 (226).
3. His new level 8 (228): a box through a door, two boxes; his 7×9 room as its known win; a new optional goal, a box crushed by a closing door (229).
4. Exact counts for 9 and 10 (mine, provisional) wait for his numbers; "a box ends on a one-way" is a goal only if he says.
