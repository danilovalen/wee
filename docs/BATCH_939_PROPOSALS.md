# Proposals and diagnoses from the 939-963 batch

Nothing here is built. Each section ends in the choice that is yours.

## 941: where the failed-Run line goes

Today "Wee cannot reach the berry." floats over the top of the clipboard, on the goal rows it is about.

| option | what it does | cost |
|---|---|---|
| **A. The empty band above the tray** (recommended) | The line sits in the strip between Run/Test/Replay and the tray, which is empty on a phone today. Nothing is covered and nothing moves, because the band is already there. | On a wide window the band is narrower; the line wraps to two lines there. |
| B. On the failed row | The row that failed turns red and carries the line under it. | The clipboard grows a line, which item 949 forbids. |
| C. On the room, at the tile where Wee stopped | A small tag on the room, pointing at the stop. | Covers part of the room. |

## 945: everything that moves, and when it moves wrongly

Measured from the code: every CSS animation, every Web Animation, and every drawn effect.

### Moves at the wrong time

| what | when it plays | when it should play | cause |
|---|---|---|---|
| Clipboard marks "land" | after every Run, met **and unmet**; again on every redraw | once, only the marks a Run just earned | **fixed (944)** |
| Moves count pulsing red ("too short") | after a short Run, **and again on every redraw** (switching Edit/Play, a tool change) | once, after the Run | the `short` class is put back on the rebuilt row, which replays its 3 pulses. Same cause as 944 |
| Tiles that stopped Wee flash | after a failed Run, and **again** each time you tap the failure line | after the Run only; a tap should show the drawn path, not flash | the line's tap calls the same flash |
| Tutorial ring | pulses forever | goes with the tutorial (955) | |

### Moves at the right time (kept)

The page wipe, the card opening into the clipboard, the win card rising, a win star's tick and pop,
the burst of stars, a placed piece popping in, sparks and dust, Wee's squash and stretch, a refused tap's
shake, the room's shake on a crush or blast, the snow's gust when Wee slides, the menu logo's two
drawings, and the pieces' slow "boil" (two drawings in turn, the hand-drawn look).

### Proposal

Fix the two "wrong time" rows above the same way 944 was fixed, and add one rule to the test from 949:
**a redraw never replays an animation**. The gate re-renders every screen and fails if anything starts
animating.

## 947: fluffier stars that hold a number

Sketches: `docs/sketches/stars-947.png`. Three shapes, each drawn at list size (32 px) and
clipboard size (48 px), filled and empty, with "12" inside.

## 950: the logo's inner border

Sketches: `docs/sketches/logo-950.png`. Today: an embossed inner border. A: no inner border. B: one flat
inner line. C: the frame as a plain crayon line, no emboss.

## 951: on and off switches

Sketches: `docs/sketches/switch-951.png`. Today only the white dot's end differs.
A: off is grey, on is the colour. B: on lights up (a glow ring). C: off shows a dark slot, on a lit slot
and the dot moves. All are drawn at the room's tile size.

## 952: copy that reads like AI

The pattern: "X, and Y" and "X, and then Y", two clauses glued by a comma and "and". Fifteen of the
blob's sixteen captions use it, plus seven lines elsewhere.

### The blob's captions (drafts, not shipped)

| id | today | draft |
|---|---|---|
| first | My first berry, and somebody watched me eat it. | My first berry. Somebody watched me eat it. |
| half | Halfway through, and nobody has said thank you. | Halfway. Nobody said thank you. |
| all | Every room is done, so now they will build more. | Every room done. They're building more, aren't they? |
| shelf | A full shelf of stars that I am not allowed to keep. | A full shelf of stars. None of them are mine. |
| lab | The whole lab has stars on it, and I still sleep in a jar. | Stars on every level. I still sleep in a jar. |
| challenge | They called it a challenge, and then they took notes. | A challenge. Somebody took notes the whole time. |
| pieces | I have now been hit by one of everything. | Hit by one of everything. Now I know. |
| cashback | Ten stars went on a new coat, and it was worth it. | Ten stars on a new coat. Worth it. |
| moveit | It was a tiny room and a very long walk. | Tiny room. Very long walk. |
| oneshot | One move, straight in, and nobody clapped. | One move, straight in. No applause. |
| gateway | So many doors, and every one has shut on me once. | Every door here has shut on me once. |
| guardrails | Nothing in there could hurt me, which felt like a trick. | Nothing in there could hurt me. Suspicious. |
| deadly | Every wrong step was the last one, and I counted them. | Every wrong step was the last one. I counted. |
| silver | Four side goals in one go, all for a berry. | Four side goals in one Run. For one berry. |
| score | The number got bigger, and the berries stayed the same size. | The number keeps growing. The berries don't. |

### Other lines with the pattern

| where | today | draft |
|---|---|---|
| tool hint | To switch one on or off, tap it, and to remove it, hold it. | Tap: on or off. Hold: remove. |
| tool hint | To turn one, tap it, and to remove it, hold it. | Tap: turn. Hold: remove. |
| tool hint | To make one an inverted door and back, tap it, and to remove it, hold it. | Tap: inverted door. Hold: remove. |
| progress | Keep this code somewhere, and Load progress brings everything back. | Keep this code. Load progress brings everything back. |
| progress | Copied: keep it somewhere, and Load progress brings everything back. | Copied. Load progress brings everything back. |
| rooms | Deleted, and the room is still open here, unsaved. | Deleted. The room stays open here, unsaved. |
| play hint | Swipe to slide, and while sliding, swipe again to use a power. | Swipe to slide. Swipe again mid-slide to use a power. |

The tool-hint drafts are also shorter, which helps 943: they fit on one line.

## 953 and 954: pictures with things not in the game

The campaign uses: block, switch, door, box, button, one-way, laser, relay, berry, spikes. Four album
photos show something else (the sweep first said five).

| photo | shows | not in the game | draft replacement |
|---|---|---|---|
| challenge | Wee and a red horned monster | the monster | Wee beside a placed block with its purple frame |
| lab | a relay, Wee, a switch | nothing: the sensor sprite is the relay (the sweep was wrong here) | kept |
| pieces | a box, a bomb, a heavy block | the bomb, the heavy block | a box, a laser, a relay |
| oneshot | a spring, Wee, a berry | the spring | a one-way, Wee, a berry |
| half | a checkpoint, Wee | the checkpoint | a door, Wee |

A test will then check every photo uses only pieces some listed level uses.

## Shipped (register 952)

As drafted, then joined into one sentence each (his ruling, 2026-11-13: the one-sentence rule stays), with a semicolon, comma or colon instead of a full stop.
