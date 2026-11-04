# What leans on the browser: diagnosis (2026-11-04)

Owner (register 740): *"diagnose removing as much as possible 'things supported by the browser', like
warning screens, hovers that depend on the browser, and such, so it's easier to port later for godot.
Game ui/ux should work well with touch, controller, and mouse/keyboard. So hovers are not a good idea."*

Diagnosis only, nothing changed. Measured by reading `src/` and `index.html` at `55c9ebf`.

## The short version

1. **The game itself is already portable.** `rules/`, `solve/`, `level/`, `campaign/`, `editor/` and
   `gen/` touch the browser in **0 of 45 files**. `view/` touches it in 3 of 14 (sprite loading, the
   thumbnail canvas, the Look palette). Everything below is in `app/` (48 of 55 files) and `index.html`.
2. **The port rewrites the screens anyway.** Godot draws its own buttons, panels and popups, so the DOM
   and CSS are not carried over in any case. What carries over is the *design*: if a screen only works
   because the browser gives it a tooltip, a confirm box or a hover, the Godot version has no answer
   for it. So the work is to stop designing with browser features, not to remove code for its own sake.
3. **One rule covers touch, controller and mouse alike: everything happens on a focused thing, and
   nothing happens only when a pointer is over something.** A controller has no hover and no right
   click; a phone has no hover; a mouse has both. Design for the controller and the other two follow.
4. **The editor's room has no cursor.** Everything on the room is aimed with a pointer. A controller
   cannot edit at all today, and there is no gamepad input anywhere (`getGamepads` appears 0 times).
   Play works with keys, so a controller could play by mapping the d-pad to the arrow keys.

## Inventory

### A. Hover (works for a mouse only)

| What | Where | Count | What a touch or controller player gets today |
|---|---|---|---|
| Browser tooltips (`title`) on buttons, icons, goal rows, swatches, lens icons, level parts | `index.html` 47, `app/` about 30 sites | ~77 | Nothing. Several carry the only explanation of a thing: the lens icons (`chips.js:58`), the grey swatch ("reads only the wires under it", `panels.js:73`), a goal row's "Tap to see a shortest path" (`goalCard.js:118`), the tool group "tap for more" (`strip.js:108`). |
| The info line: tile name and design facts under the pointer | `chips.js:78-82` | 1 | The Look tool, a tap per tile (row 352). A controller has neither. |
| The tile outline and the paste ghost following the pointer | `input.js:87-91`, `select.js:114` | 2 | On touch, no outline; a paste lands where the finger lifts. |
| Button frame lighting on hover | `style.css:50-60` | 4 rules | Already limited to a real mouse (`@media (hover)`). Harmless; it is feedback, not information. |

### B. Native screens and controls the browser draws

| What | Where | Count | Problem for a port and a controller |
|---|---|---|---|
| `confirm()` boxes ("Leave the unsaved changes?", "Delete…? This cannot be undone.", "Open the generated room…", "Replace…?") | `rooms.js:27,155`, `maker.js:84`, `tilemenu.js:57`, `generator.js:145-146` | 6 | The browser's own grey box: it ignores the game's look, stops the game loop, and two of them come in a row for one action (generator). |
| `<dialog>` with `showModal` (menus, pages, sheets) | `index.html` | 15 | Fine to keep as a *pattern* (a panel over the game), but it relies on the browser for the backdrop, Esc to close and focus trapping. A Godot popup does all three; the design carries over. |
| `<details>` folds | `index.html:321,376` (Rooms "explored", Generator "made of") | 2 | Against row 524 (nothing folds). |
| `<select>` dropdown | `index.html:320` (Mechanism filter) | 1 | The browser's list, which looks different on every system; on a controller it opens a native picker. |
| Number fields (`type=number`) | Generator 6, Level maker 3 | 9 | Typing digits. A controller has no keyboard; a stepper (– value +) works for all three. |
| Text fields and text areas (room name, room note, progress code, report) | `index.html` | 6 | Needs a keyboard. On a console the system on-screen keyboard; acceptable for names, but the progress code (a long string to paste) has no controller answer. |
| File picker and downloads (import a pack, export a room) | `index.html:311`, `app/` 4 | 5 | Do not exist in Godot or on a console; already dead inside the artifact viewer (row 737). |
| Clipboard (copy progress, copy room code) | `app/` 7 | 7 | Same: a browser-and-desktop feature. |

### C. Pointer gestures with no other route

| What | Where | Other route today | Controller |
|---|---|---|---|
| Right click erases a tile | `input.js:83` | Hold to remove (rows 230, 683) | None |
| Right click opens a tool group / tile menu | `strip.js:34`, `tilemenu.js:14` | Long press | None |
| Wheel zooms | `camera.js:134` | Pinch | None |
| Drag to select, drag to move a selection, drag to resize | `input.js`, `select.js`, `size.js` | none | None |
| Hold to remove, hold to open a group | several | none | None |

### D. Browser plumbing (fine, but name the seam)

| What | Count | Note |
|---|---|---|
| `localStorage` | 23 | Progress, rooms, settings. One `store` module would make it a single swap (Godot: `user://`). |
| `location.hash` pages | 6 | Page routing. Godot: a scene stack. Already one router (`nav.js`). |
| `matchMedia` / `innerWidth` / CSS layout breakpoints | 17 + CSS | The phone vs wide layout. Godot: anchors and containers. |
| Web Audio | 1 | Godot has its own; already behind `sound.js`. |
| Keyboard shortcuts | 9 handlers | Good: these map straight onto a controller's buttons. |

## What "works with touch, controller and mouse" means here

| Need | Touch | Mouse | Controller | The one design that serves all three |
|---|---|---|---|---|
| Say what a thing is | (no hover) | tooltip | (no hover) | A **detail line** that shows what the *focused or last tapped* thing is, in the place answers already go (diagnosis A: the status line). |
| Aim at a tile | tap | click | — | A **room cursor**: the tile last tapped or clicked, moved by the d-pad or arrow keys, drawn the same in all three. Look, place, turn and remove act on it. |
| Second action on a thing (remove, open a group) | hold | right click | — | A **second button** on the focused thing (controller B / X), with hold and right click as shortcuts for it. |
| Confirm something that cannot be undone | browser box | browser box | — | An **in-game confirm panel** with two buttons, or better, no confirm at all because Undo brings it back. |
| Enter a number | keyboard | keyboard | — | A **stepper**: – value +. |
| Zoom | pinch | wheel | — | Shoulder buttons, plus a zoom control on screen. |

## Proposals, ranked by how much of the port and the controller gap each closes

1. **Retire the `confirm()` boxes.** Five of six guard something Undo or a "deleted, Undo" line could
   bring back (leaving unsaved changes is the one that cannot; it gets an in-game panel). Cheapest
   change, and the most "browser" thing on screen.
2. **Replace tooltips with the detail line.** The status line shows what the focused, tapped or hovered
   thing is. Hover may still *move* the focus for a mouse, but nothing is only in a tooltip. Start with
   the ~6 tooltips that carry the only explanation (list in A).
3. **A room cursor in the editor.** The last tapped tile, d-pad and arrow keys to move it, one button to
   use the tool, another for the second action. This is the controller's way in, and it also gives touch
   a visible "this is where I am" and keyboard users full editing. The info line (A) reads this cursor.
4. **Every hold and right click gets a button.** On a focused piece: Turn, Remove; on a tool group: Open.
   Holds stay as shortcuts.
5. **Steppers for numbers; no `<select>`, no `<details>`.** Generator, level maker and the Rooms filter.
6. **Gamepad input** (the browser does have a Gamepad API): d-pad, A, B, shoulders, Start, mapped to the
   same actions the keys already have. This is what lets the controller design be *tested* before a port.
7. **One storage module and one file/clipboard module**, so the port swaps two files instead of thirty
   call sites. Mark import/export and the progress code as desktop-web only, with a portable route
   (cloud or a short code) to decide later.

Suggested order: 1, 2, 3 together with 4, then 5, 6, 7. Nothing here touches the rules or the solver.

## Questions for the owner (to ask one at a time)

1. Is Undo enough to replace "This cannot be undone" deletes (rooms, made levels), or should a deleted
   room be recoverable for a while?
2. ~~Should the Sandbox editor be fully playable on a controller?~~ **Owner (2026-11-04): editor too.** A room
   cursor moved by the d-pad, A uses the tool, B the second action, shoulders zoom; touch and keyboard get the
   same cursor.
3. Should the progress code and room import/export survive the port, and in what form?
