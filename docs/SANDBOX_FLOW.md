# The Sandbox flow and its buttons (registers 394-398)

## Built (2026-10-22)

- 394: the menu has no Level maker for now. Its page still exists at `#/maker`.
- 395: the menu opens the Sandbox at `#/rooms/start`. On that screen the one way back is Menu, and
  Escape goes to the menu too; Close only shows when the Rooms page is opened from a room.
- 396: New room has no templates. The library shows one example, Hex counter. The other templates
  stay in `src/level/templates.js` as test rooms, opened by tests through `window.wee.openTemplate`.

- 399, the proposal below, built (2026-10-23): every page header has one button (Menu or Close);
  action rows are one full-width bar (`.bar`), buttons sharing it equally on one line, the main one
  first; Rooms is New room, Generate and More (`src/app/more.js`: Open a code, Import, Export all);
  New room opens an empty room at once and its page is gone; the example closes your list.

## Diagnosis

The Sandbox is five pages: Rooms (the library), New room, This room, Generate a room, and the
editor. Each page grew its buttons on its own, so they follow four different layouts:

| Where | Layout today |
|---|---|
| Page headers | Title left, buttons right; Rooms had two (Menu and Close) that went to different places |
| Action rows (`.rooms .row`) | Left-aligned, wrapping, each button as wide as its label |
| The library's foot | A hint left, Export all right; on a phone the hint takes the width and Export all breaks onto two lines |
| Confirmations (`.confirm .row`) | Right-aligned |

The flow has two needless steps and one duplicate:

1. New room is a whole page that now holds two buttons (Empty room, Generate a room).
2. Generate is reached two ways: Rooms → New room → Generate a room, and the editor's Generate.
3. Open a code, Import and Export all are things done rarely, but sit at the same level as New
   room, which is done every time.

## Proposal

One rule for every page, then a shorter flow.

1. **Header:** title left, exactly one way out on the right. Menu on a page the menu opened, Close
   on a page opened over the room. Never both.
2. **Actions:** one bar per page, under the header, full width. Buttons share the width equally
   (a grid of 2 or 3), labels never wrap, the main action first and in the accent.
   Confirmations use the same bar.
3. **Rooms page:** the bar is New room (main), Generate, and More. More opens Open a code,
   Import and Export all. "Saved in this browser only" moves under the title as one hint line.
4. **New room** opens an empty room at once; the New room page goes.
5. Your rooms and the example share one list, the example last and marked.
</content>
</invoke>
