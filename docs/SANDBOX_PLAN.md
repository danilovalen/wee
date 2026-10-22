# Sandbox tools, grouped (registers 378-381)

Sketch: `docs/sandbox-groups-sketch.png`. Plan only; nothing built.

## Today

The full Sandbox (`?sandbox`) lists 28 tools as labelled buttons in five sections, with a second panel of
powers, status and world moves on the right. The simple Sandbox on a phone shows one scrolling row. Both
are "buttons everywhere" (378), and a new room still opens inside a wall border (380).

## Proposal

1. **A tool strip, one slot per group** (Adobe's toolbar). A slot shows the tool last used from its group and
   a small corner mark when it holds more. Click picks it; holding it, or clicking the mark, opens a flyout
   with the rest of the group, names and keys. Nine groups instead of 28 buttons:

   | group | tools | key |
   |---|---|---|
   | Edit | Look, Select, Move, Erase | L S M X |
   | Room | Start, Goal, Checkpoint | P G C |
   | Walls | Block, Breakable, Death block, Triangle, Spring | B |
   | Pieces | Box, Heavy box, Moving block, Bomb | O H M |
   | Enemies | Weak enemy, Strong enemy | |
   | Lasers | Laser, Relay | T |
   | Switches | Button, Switch, Wire | |
   | Doors | Door, Inverted door, One-way | D |
   | Floors | Water, Sticky puddle, Gravel | W |

   A group's key picks it; Shift and the key steps through the group.
2. **One context bar over the room** for the chosen tool's options: colour, pushable, direction, and its
   one-line hint. It replaces the options block under the palette and the hint line at the top.
3. **Room settings in one place.** Powers, status and world moves leave the right-hand panel for a Room
   button (desktop) or the existing Room sheet (phone), so the room gets the width.
4. **Phone:** the strip is the bottom row (nine slots fit 393px); a flyout rises above the slot; the
   context row sits between them. Build, Room and Rooms stay as the bottom tabs.

## Also logged, separate fixes

- 379: the generator still offers objectives no level uses.
- 380: a new room opens with a wall border; rooms lost their border in the campaign long ago.

## Open questions

1. ~~The groups~~: settled (2026-10-22): Relay stays with Lasers and One-way with Doors, "for now" (register 383).
2. Does the simple Sandbox (from the menu) get the strip too, or keep its single row?
