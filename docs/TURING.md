# Is wee Turing complete? (registers 342, 343)

Diagnosis, 2026-10-20, at `926a8a6`. Short answer: **not as it stands, and the reason is the colours, not the gates.**

## What the pieces already compute

A colour is a wire. Its switches decide it, its doors read it (`refreshDoors` in `src/rules/life.js`).

| logic | how |
|---|---|
| AND | a colour opens only when **all** its switches hold: buttons, switches, and relays lit by a beam |
| OR | a two-colour door (`door:red\|blue`) opens when **either** colour is open |
| NOT | an inverted door is the door upside down: solid while its colour is open |
| NAND | a beam meets an inverted door of colour C, and C's relays are lit by beams A and B: the beam gets through unless A and B |
| clock | a laser through an inverted door into a relay of the same colour. Measured (`tools/laserClock.mjs`): the colour flips every tick, `01010101…`, with no player input, on either laser clock |

So his hunch is right about the parts: NAND plus a clock is the textbook starting kit.

Sketch: `docs/turing-sketch.png`. Panels 1 and 2 are the game's own renders of real rooms: the NAND gate and two gates sharing red. Panel 3 is the proposed wire, drawn over a room.

## Why that is not enough

1. **Four wires, for the whole room.** There are four colours and every door of a colour reads the same value. However big the room, a circuit has at most four independent signals, so at most four gate outputs. A computer needs as many wires as the program needs; this caps them at four.
2. **A beam does not carry a signal to another beam.** The only way one beam affects another is through a relay, which writes to a colour, which is global. There is no local wire: you can't send the result of one gate into a second gate without spending one of the four colours on it.
3. **The room is finite.** Up to 40×30 in the editor, 16 on a side in the campaign. Anything with a bounded number of states is a finite machine, not a Turing machine. Every real computer has this limit too; it's the usual reason it's set aside. Points 1 and 2 are the real ones, because they hold in a room of any size.

## What could change the answer

- **Local colours.** If a relay and a door could be paired by place rather than by colour (a wire you lay down), the four-wire limit goes away, and NAND plus the clock plus a big enough room is a circuit of any size. That is the step that makes it "history".
- **Pieces as memory.** Movers, enemies and boxes keep positions, and realtime pieces move without the player. A tape built from piece positions might already make it Turing complete given an unbounded room, but that needs a construction, not a hunch. Not attempted.
- Who counts as the machine also matters: with the player pressing keys as the program, the question is a different one (whether the player's moves can drive any computation), and the answer is "only up to the room's size".

## Wires, his design (register 347, sketched, not built)

A grey "wired" colour for the editor, and three wire colours painted Terraria-style that cross without joining (`docs/wires-sketch.png`). That removes limits 1 and 2 above. What would still need checking before calling it Turing complete:

- **Memory.** A latch is two NAND gates feeding each other. The laser clock shows that feedback settles one tick at a time, so a latch should hold its state, but nobody has built one yet. It is the one test to run once wires exist.
- **Gates that drive gates.** A gate's output is a wire, a wire opens a door, and the door lets a beam reach the next gate's relay. Each step is a piece that exists today, so this should chain without anything new.
- **An endless room.** Already true in his reading, so nothing to build.

## Register 343: "if you can beat a level in X moves, you can in X+1"

A room's score is its robot's shortest path, so the claim is: if a room of some size has a shortest path of X, another room of that size has X+1.

Measured with `tools/moveLengths.mjs`, every room with only blocks, a start and a goal (its fast search is checked against the game's solver):

| room | lengths that exist |
|---|---|
| 2×2 | 1, 2 |
| 3×2 | 1 to 4 |
| 4×2 | 1 to 5 |
| 5×2 | 1 to 6 |
| 3×3 | 1 to 5 |
| 4×3 | 1 to 7 |

**True up to a ceiling, false at it.** No gaps appeared: every length from 1 to the room's maximum exists. But each room size has a maximum, so at X = the maximum, X+1 needs a bigger room. The extra "starter movement" costs a tile to stop on, and in a strict area there may be no tile left. With a palette, its piece counts set the ceiling as well.

That ceiling is where his row 344 puzzles live: many moves in a strict area means building as close to the maximum as the palette allows. `tools/moveLengths.mjs` can measure that ceiling for small rooms; larger ones need the search.
