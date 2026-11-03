# Door and inverted door on one tap (register 675)

The question: if a tap on a placed door turned it into an inverted door and back, with inverted doors on offer
wherever doors are, would any level get easier?

## How it was measured

For every level with doors (2, 3, 4, 6, 7, 8, 11, 13, 14, 16, 19, 20, 23), the room search ran twice with the
same seeds, 60 seconds x 3 runs each: once as the level stands, once with inverted doors added to its palette
(`tools/measureLevel.mjs <level> --palette 'idoor=0'`). Inverted doors were free and unlimited in the second
run, which is more than a toggle would give (a toggled door is one door fewer), so this is the generous case.

| level | fewest moves | smallest room (tiles) | best room uses an inverted door? |
|---|---|---|---|
| 2 | 4 -> 4 | 9 -> 9 | no |
| 3 | 4 -> 4 | 9 -> 9 | no |
| 4 | 4 -> 4 | 9 -> 9 | no |
| 6 | 4 -> 4 | 12 -> 9 | no (a 9-tile room without one; the first run missed it) |
| 7 | 4 -> 4 | 12 -> 12 | yes, but a block there wins the same |
| 8 | 4 -> 4 | 9 -> 9 | no |
| 11 | 4 -> 4 | 12 -> 15 | yes (the search found less with more to try) |
| 13 | 4 -> 4 | 15 -> 18 | yes (as 11) |
| 14 | 4 -> 4 | 9 -> 9 | no |
| 16 | 4 -> 4 | 12 -> 12 | no |
| 19 | 7 -> 7 | 16 -> 12 | yes, but a block there wins the same in 7 moves |
| 20 | none in 60 s -> 7 | none -> 42 | no (the first run found nothing; this level is slow to search) |
| 23 | 4 -> 5 | 15 -> 15 | yes |

## What it says

- **No level gets shorter.** The fewest moves never dropped.
- **No level gets a smaller room because of the inverted door.** Where the smallest room held one (7, 19), putting a
  plain block in its place wins the same, so it only stood in for a block. Where the room shrank (6, 19), a room
  as small exists without one; the first run had not found it.
- **No goal is met for free.** Every door goal (through, hits, closed at the end...) counts real doors only, so an
  inverted door can never stand in for one.
- **What it does change:** an inverted door with nothing pressing its colour is open, so it is a free extra choice of
  "open now, shut when pressed". The search found it useful in places but never needed.

Not proof: a search that finds nothing has not shown nothing exists. But 13 levels, the generous case, and no gain.

## Side findings

Two rooms are smaller than their level's size goal, found without an inverted door: Level 6 in 9 tiles
(`D.# PBG uDB`, goal 3x4) and Level 19 in 12 (`Er. .DG .E. #P.`, goal 4x4). Both use switches placed on or ordinary
pieces; they are like register 671's findings and are reported, not changed.

## Built

The tap toggle is in where both doors are offered: the Sandbox, and any level whose palette has both. No campaign
level offers both today; adding inverted doors to the door levels' palettes is the owner's call, and this says it
would not make them easier.
