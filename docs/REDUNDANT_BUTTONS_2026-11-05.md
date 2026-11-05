# Redundant buttons: diagnosis (2026-11-05)

Owner (register 771), on the Sandbox header's ← button: *"if we have the rooms button this is not needed,
diagnose redundant buttons"*.

Diagnosis only, nothing changed. Measured from every `<button id>` in `index.html` (about 100) and its
handler, at `498416c`.

## The rule used

A button is redundant when another button **on the same screen at the same time** already reaches the same
place or does the same thing, and differs only by one tap or by a word. A key (Z, E, Esc) does not make a
button redundant, because touch and controller players need the button (740). A button that does the same
thing on a *different* screen is not redundant.

## Redundant now

| # | Screen | Buttons | What each does | Proposal |
|---|---|---|---|---|
| 1 | Sandbox room | **←** (`logo`) and **Rooms** (`roomsBtn`) | ← goes to the main menu (the room's parent is `menu`, `rooms.js:142`); Rooms opens the Rooms page, whose own **Menu** goes to the main menu | **Drop ← in the Sandbox.** Rooms is the way out; the Rooms page reaches the menu. Owner's own report. |
| 2 | Sandbox room | **Untitled** (`roomTitle`) and **Rooms** | The title opens a room info panel (name, note, code, link, `rooms.js:145`); the Rooms page shows the same room's name, Save, Save as, Copy code, Copy link, Download, Delete | **Make the title open the Rooms page** (on the current room) and drop the separate info panel, or drop the title's button role and keep it as a label. |
| 3 | Sandbox room, phone | **Rooms** and the bottom bar's rooms tab (`navRooms`) | `navRooms` just clicks Rooms (`sheets.js:16`) | Keep one per layout: the header Rooms on wide, the tab on phone, never both visible. |
| 4 | Playing a room | **Undo** (`playUndo`) and the stuck banner's **Undo** (`stuckReset`) | Both undo the last move (`play.js:44`); the header **↶** is disabled in play (`undo.js:10`), so it is not a third | One Undo in play: the stuck banner points at it (an arrow or a flash) instead of carrying its own, which also settles 757. |
| 6 | Sandbox room | **Show solution** (`showSolution`) and the **Solution lens** | One plays the answer once, the other draws it | Both stay until Replay (758) lands; then Show solution opens Replay and the lens draws. Same for the campaign's **Run** (`campRun`), which plays the robot's answer. |
| 7 | Win card | **Play again** (`again`), **Stay** (`winStay`), **Edit** (`winEdit`), **Next level**, **Levels** | Stay only closes the card, leaving the won room on screen; Play again restarts it | **Drop Stay**: closing the card (tap outside, B, Esc) does the same. Replay (758) joins the card. |
| 8 | Every page | **Menu** on each page (`campMenu`, `puzzleMenu`, `roomsMenu`, `makerMenu`, `lookMenu`, `achMenu`) and **←** where shown | Both go up | One way up per page, in the same spot on every page: **←** at the top left, with the page's name. |
| 9 | Findings, wide | **Findings** (`wellBtn`), **×** (`wellClose`) | On wide screens Findings is a fixed column (730); both are hidden there already | Fine as is; on phone they stay. |
| 10 | Old lenses | **Lenses** (`stopsBtn`), **Show lenses** (`lensOff`) | Turn the old lenses tab on (`lenses.js:195`); hidden since 721 put lenses on icons | **Delete** both and the old lenses tab; the header icons (749) are the only lens controls. |
| 11 | Rooms page | **Generate** (`roomGen`) and the header **Generate** (`genBtn`) | Both open the generator | Keep the Rooms page one; the header one goes (the header is full with lenses, 749). |
| 12 | Rooms page | **Copy code**, **Copy link**, **Download**, **Export all**, **Import**, **Open a code** | Six ways to move rooms in and out; file ones do nothing in the artifact viewer (737) and will not exist on a console (740) | Fold into one **Share** (copy code; link where there is a browser) and one **Open a code**; Download, Export all and Import behind **More** on desktop web only. |

## Not redundant, though they look it

- **Check** and the verdict line: the line is the answer, the button asks.
- **Play** (`mode`) and **Test** (`campTest`): one plays the Sandbox room, the other a campaign room in the
  builder; they never show together.
- **Reset** in play (`respawnBtn`) and the campaign's **Reset** (`campReset`): the first restarts a run and is hidden in the
  campaign (`style.css:490`); the second clears the built room in the editor and is hidden while playing. Different
  jobs, never together.
- **Fit**: appears only when zoomed (`camera.js:57`).
- **Most moves**: replaced by the What if lens (755) when that lands, not before.

## Suggested order

1. 771's case (1), and 10 (dead buttons), at no risk.
2. 4 and 7 with 757 and 758, since they touch the same play controls.
3. 2, 3, 8, 11, 12 together, as one pass over page headers and the Rooms page.
4. 6 after Replay exists.

## Question for the owner

1. ~~The room title (2)?~~ **Owner (2026-11-05): tapping the name opens the Rooms page** on the current room;
   the separate info panel goes.
