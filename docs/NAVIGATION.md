# Navigation (register 359)

Diagnosis, 2026-10-21, at `149fab7`. Measured in a phone-sized browser (393x873, touch) with a probe that reads which pages are open, the body's mode, the URL and the browser history after each step.

**Short answer: wee has no navigation system.** It has 13 `<dialog>` pages. Each mode opens and closes them by hand, and the browser is never told that anything changed. The five defects below all come from that.

## What exists today

```
Menu ─┬─ Campaign ── Levels list ── a level ─┬─ "Levels" → Levels list
      │                                      └─ (a made level) "Maker" → Maker
      ├─ Maker ── Build it → a level (as above)
      ├─ Puzzles ── Puzzles list ── a puzzle ── "Puzzles" → Puzzles list
      ├─ Sandbox ── Rooms page ── a room ── "Rooms" → Rooms page
      │                ├─ New room page, This room page, Generate page
      │                └─ "Menu" (added today, register 357)
      └─ Copy debug
```

Every list page has its own **Menu** button (`campMenu`, `makerMenu`, `puzzleMenu`, `roomsMenu`). Every play screen has a back button named after its list. Nothing goes back more than one step at a time.

## What is wrong, measured

| # | Defect | Measured |
|---|---|---|
| 1 | **Back leaves the game.** The phone's Back gesture or the browser's Back button closes wee from any screen. | In level 1, Back → `about:blank`. `history.length` stays 2 the whole session: no screen is ever an entry. |
| 2 | **Escape drops you into a screen that is no mode.** Escape closes a native dialog, so on the menu or the Levels list it reveals the editor behind it, with every tool and the Powers tab, and none of the menu's buttons. | Escape on the menu: no page open, body class empty, header shows the full editor. Same from the Levels list. |
| 3 | **Reload loses your place.** The URL never changes, so a reload inside a level, puzzle or room always starts at the menu. | Reload inside level 1 → menu. Only `#room=` (a shared room) and `?sandbox` reach past it. |
| 4 | **The menu is two or three taps from anywhere, and the route differs by mode.** In a level: Levels, then Menu. In a puzzle: Puzzles, then Menu. In a room: Rooms, then Menu. Register 357 was this defect, found in the one mode that had no route at all. | Read from the handlers in `campaign.js`, `puzzles.js`, `maker.js`, `rooms.js`. |
| 5 | **Every page knows who else might be open.** Four modules each keep their own list of pages to close (`closeAll` in `campaign.js` and `rooms.js`, inline lists in `maker.js`, `puzzles.js`, `generator.js`). A new page means finding and editing each list; register 357 needed a fifth hand-written route. | Four different lists, none complete. |

Also seen, smaller:

- The page behind every list is the full Sandbox editor, so a page closing the wrong way (defect 2) shows tools the mode does not have.
- Opening a template from a fresh, untouched Sandbox asks "Leave the unsaved changes in this room?" (found during 358, still open).
- The two older smokes closed the Rooms page by clicking "the first header button"; adding Menu there broke them. A page's buttons have no names a test (or a router) can rely on.

## Proposal: one router, screens as places

One small module, `src/app/nav.js`, owns where you are. Every screen becomes a **place** with a path:

| place | path | parent |
|---|---|---|
| Menu | `#/` | none |
| Levels list | `#/levels` | Menu |
| A level | `#/levels/7` | Levels list |
| Maker | `#/maker` | Menu |
| A made level | `#/maker/m3` | Maker |
| Puzzles list | `#/puzzles` | Menu |
| A puzzle | `#/puzzles/<id>` | Puzzles list |
| Rooms (Sandbox library) | `#/rooms` | Menu |
| A room | `#/rooms/<id>` | Rooms |

What it gives:

1. **`go(path)` is the only way to change screen.** It closes whatever is open and opens the place's page or screen. Modules stop knowing about each other's pages; defect 5 goes.
2. **Each `go` is a history entry**, so the phone's Back and the browser's Back step back one place, and never out of the game from inside it (defect 1).
3. **The URL is the place**, so reload, a bookmark or a link lands where you were (defect 3). Shared rooms keep `#room=`.
4. **Escape means Back.** A list page catches its dialog's `cancel` event and goes to its parent instead of closing into nothing (defect 2).
5. **One header pattern for every play screen.** Top left: a back button named after the parent (Levels, Puzzles, Rooms, Maker), as now. Tapping the **wee logo** goes to the menu from anywhere, one tap (defect 4). The per-page Menu buttons stay on the list pages.
6. **Leaving with unsaved work asks once, in one place.** The router asks the room "may I leave?" before any `go`, instead of each button calling `leaveOk()` itself.

Pop-ups that are not places (confirmations, the progress code, keys, This room, New room, Generate) stay plain modal dialogs. Closing them returns to the place under them, so they need no path.

## Slices

1. **Router and paths for the four modes**, with Back, reload and the logo. Gate: a smoke that walks Menu → Levels → level → Back → Back and lands on the menu, reloads inside a level and lands in it, and presses Escape on each list page and lands on its parent.
2. **Move every page open and close onto `go`**, deleting the four `closeAll` lists. Gate: a lint test that fails when any module outside `nav.js` calls `showModal()` on a place's page.
3. **The unsaved-changes question moves into the router**, and the false prompt on a fresh Sandbox is fixed with it.

About half a day for slice 1, two hours each for 2 and 3.

## Rulings (2026-10-21)

1. **Back goes to where you came from.** A level opened from the Maker goes back to the Maker; from Levels, to Levels. So a place's parent in the table above is a default for a cold start (a reload or a link), and history decides otherwise.
2. **The wee logo goes to the menu**, one tap from any screen. No new button.
3. **A reload inside a level keeps your edits.** The current build is saved on every change and restored with the place.
