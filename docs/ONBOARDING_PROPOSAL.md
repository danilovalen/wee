# Onboarding as two levels, not a tutorial (register 955)

Built on 2026-11-13 (register 955). Build 0 has no exact-moves goal, so its one side goal is 3x3 or smaller.

## What goes

- The Tutorial button on the menu.
- The coach bubble and its 14 scripted steps (`src/app/tutorial.js`, 128 lines). Nothing waits for one tap any more, and nothing is
  ringed so that only it answers.

## What replaces it: two rooms at the top of the level list

The list opens with one row holding **Puzzle 0** and **Build 0**. Both are open from the start. Level 1 opens when Build 0 is beaten.
Puzzle 0 is not required, but it sits first, so most people tap it first.

### Puzzle 0: you move Wee

- A small room, already built. You swipe; Wee slides until it hits a block.
- It is laid out so the first swipe in any direction ends against a block. That is how you learn the slide, without being told about it.
- The berry is two slides away, so the first win comes quickly.
- No star sentence and no side goal. Just the win.

### Build 0: you build Wee's room

- The editor, with one tool: the block.
- Wee cannot reach the berry. One block in the right place fixes it.
- Run is the only way to win, the same as every later level.
- One side goal, shown on the clipboard as a small star: **3x3 or smaller**. The room starts bigger, so the resize handles are there to
  be found. It is not needed to win.

## Nudges instead of paragraphs

A nudge is one short line, or one pulse on one control. It appears only when the player seems stuck, never before. It disappears the
moment they do the thing.

| when | nudge |
|---|---|
| Puzzle 0, no swipe for 4 s | a hand swipes across the room, and keeps swiping until Wee moves |
| Build 0, no block placed for 6 s | the block tool pulses until a block is placed |
| Build 0, a block is placed and Run has not been tapped for 6 s | Run pulses until it is tapped |
| Build 0, a Run fails | the existing failed-run path shows where Wee got stuck (no new copy) |
| Build 0, won but the room is bigger than 3x3 | the resize handles pulse until one is dragged |

Every line on screen is drawn from things the game already shows. The only new text is "3x3 or smaller", which you wrote.

## Decided (2026-11-13)

1. Players who finished the old tutorial get Puzzle 0 and Build 0 marked done.
2. A nudge repeats and then **stays on screen until the player does the thing** it points at. It never times out.
3. The stars are shown, not explained: Build 0's clipboard has the big star and the 3x3 small star, and earning them is the lesson.
