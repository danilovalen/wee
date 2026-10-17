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
  elements' costs), **tiles** (everything that is not floor, fixed tiles and the start included)
  and **optional requirements met**.
- Costs are constant across levels: block 1, box 2, button 3, door 3, toggle 2.
- Main menu: **Campaign** (the level list, opening on the last level played) and **Sandbox**
  (the Rooms list).
- Unlocking will be level 1, then batches of 3. **For now every level is open** while the levels
  are being made.
- Later: a "human" criterion.

## Moves and the robot

The robot slides like the player: a move is a press, and it slides until something stops it.
A press that goes nowhere is not a move, so a shortest path never bumps a wall or a closed door
on purpose. A key pressed again mid-slide is a distinct path to the robot (`right@1:right`).

## The toggle

A floor switch of any colour. It starts off and flips every time something enters it, the
robot or any piece, sliding across included. Standing on it at the start does not flip it.
It holds its colour's doors like any other switch: a door opens only while **every** switch of
its colour holds.

## Levels

All 7x7, robot top left, goal bottom right, no powers.

| Level | Palette (min-max) | Moves | Requirements |
|---|---|---|---|
| 1 | block 0-10 | 6 ± 2 | none beyond the range |
| 2 | block 0-10, toggle 1-1, door 1-1 | 7 ± 2 | robot hits a closed door; robot goes through an open door |
| 3 | block 0-10, toggle 2-2, door 1-1 | 8 ± 2 | every toggle on; through an open door; door closed at the end |
| 4 | block 0-10, toggle 1-1, door 1-1 | 8 ± 2 | every toggle on then off; through an open door |
| 5 | block 0-10, box 1-2, button 1-1, door 1-1 | 6 ± 2 | a box cannot start on a button; through an open door |
| 6 | as 5 | 10 ± 3 | a box cannot start on a button; through an open door; door closed at the end |

Level 2 was added on 2026-10-17 (owner: *"huge spike of difficulty between level 1 and 2"*).
He first asked for one button and one door; a button only holds while something stands on it,
so the robot could never pass its door alive, and he chose a toggle instead. "Collides" means
a slide that ends against a closed door (his words: *"touching it and stopping... use it as
somehow a wall"*). Its range 7 ± 2 is measured, not guessed: rooms meeting both requirements
were found from 5 to 16 moves, most often 6 to 9.

## Open

- Rename Toggle to **Switch** in every player-facing word (owner: *"switch is better"*), once
  he says he is done playing.
- Tell the player why a run cannot be completed (which door never opens, which switch never
  holds), and point at those tiles. Wording will be a draft.
- Requirement keywords, Baba Is You style ("collides", "goes through"): his idea, forming.
  Do not draft any unless asked.
