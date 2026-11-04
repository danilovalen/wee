# Applying a suggestion: research and proposal (2026-11-04)

Owner (registers 745, 746): *"if there is an apply button, then don't do an also clickable text box"*,
*"the current solution to 'apply a suggestion' is very weird. we should search for better"*, and *"I
understood that clicking on it shows on the screen. But it's not clear. Maybe a button for Show, and one
for Apply."*

Research only, nothing changed.

## What it does today

Every offer is one line in Findings: Trim, Remove one, the one-way, idle pieces, bait pieces, and Most
moves in the tool panel.

- **The sentence is a button.** Tapping it flashes the tiles for a moment (`shape.js:97`, `design.js:35`).
  Nothing says it is a button, and the flash is over before you have found it.
- **Apply changes the room** at once, as one undoable step (`applyRoom`, bound to its room since 726).
- **You never see the result before applying it.** "Takes 24 moves instead of 23" has to be pictured.
  Only Most moves draws a see-through ghost on the room (728). Trim, Remove one and the rest draw nothing.
- **Several offers can be open at once**, and their sentences compete in one column far from the room.

So the weirdness has three parts: two targets on one line (745), a preview that is a flash, and a preview
missing for most offers.

## What other tools do

| Tool | How a suggestion is offered | What carries over |
|---|---|---|
| Code editor quick fix (VS Code's light bulb) | A mark where the problem is; open it for a short list; refactors have a **Preview** that shows the change before it is made | The mark is on the thing, not in a far list. Preview is its own step. |
| Code completion (ghost text) | The change is drawn **in place, faded**; one key accepts, another dismisses, typing on ignores it | Show the result where it would land. Accept and dismiss are two buttons, nothing else. |
| Google Docs, Suggesting | Each change sits in the text, struck through or underlined, with ✓ and ✗ beside it | The preview *is* the suggestion. One change, one pair of buttons. |
| GitHub suggested change | The comment shows a before and after diff and one "Commit suggestion" button | Before and after side by side, then one action. |
| Chess analysis board (Lichess) | The engine's best move is an **arrow on the board**; a Hint button reveals it, a tap plays it | The board shows the idea; the list only names it. |
| Photoshop Generative Fill | The result is put in place; ‹ › cycles the variations; the layer can be hidden to compare; Keep or Discard | Cycling through offers one at a time on the real canvas; before/after by toggling. |
| Tetris ghost piece | Where the piece will land is always drawn faintly | Preview costs nothing and is always honest. |

The same shape runs through all of them: **the change is shown on the thing itself as a preview, one
suggestion at a time, with one accept and one dismiss.** None asks you to read a sentence and imagine
the change, and none makes the sentence itself the button.

## The preview on the room, the same for every offer

Whatever is chosen below, the room draws the offer the same way, building on Most moves' ghost (728):

- **A piece or tile taken out:** drawn faded with a red X (the stopper mark of 722).
- **A piece added or moved:** drawn see-through where it would go.
- **A piece changed** (a wall instead, turned): the new one see-through over the old.
- **Trim:** the rows and columns that go are shaded, with a cut line along the new edge.
- **The result in numbers on the room:** a small "23 → 24 moves" tag, so the sentence is not needed to
  read the effect. Lenses that are on (the solution line) draw for the previewed room, so you can see the
  new answer before keeping it.

## Three ways to offer it

### A. Show and Apply, two buttons per line (the owner's idea)

```
Without the one-way at 0, 4: 24 moves instead of 23.   [Show] [Apply]
```

Show turns the preview on and off; Apply keeps it. The sentence is plain text (745).

- Plain and explicit. Works the same on touch, mouse and controller.
- Two buttons on every line of a narrow column; with five offers that is ten buttons.
- Several previews could be on at once unless Show on one turns the others off.

### B. Choose a line to preview it, then Apply (recommended)

```
› Without the one-way at 0, 4: 24 moves instead of 23.          [Apply]
  These leave the answer alone but change where you can get stuck: button at 6, 2.
```

Tapping a line (or moving to it with the d-pad, or Tab) selects it, and the selected line's preview shows
on the room. Apply sits only on the selected line. Tapping it again, or another line, or Esc / B, clears it.

- One action per line (745): select is how you look, Apply is how you keep.
- It is the controller rule from 740 as it stands: moving the focus shows, a button acts.
- One preview at a time by construction.
- The line has to look selectable (the chevron and the frame of a selected row), or it is the old hidden
  button again.

### C. A suggestions mode, one at a time on the room

Findings shows a single button, "3 suggestions". It puts the room in a preview mode: the first suggestion
shows on the room with its sentence in the status line, `‹ ›` steps through them, **Keep** applies,
**Skip** moves on, Esc leaves.

- The most like Photoshop and the code tools: the room is the whole stage.
- Fits a controller well (shoulders step, A keeps, B skips).
- Hides the list; you cannot read every suggestion at a glance, and it is a new mode to learn.

## Recommendation

**B**, with the room preview above for every offer. It answers both rows with the least new UI. A and C
remain good fallbacks: A if a selected line proves hard to see, and C if the list grows past four or five
offers.

## Questions for the owner (one at a time)

1. A, B or C?
2. Should the preview also run the lenses on the previewed room (the new solution line), or show only the
   change itself?
