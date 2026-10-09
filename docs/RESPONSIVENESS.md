# Responsiveness diagnosis: create, save, load, play (2026-10-09)

Measured with `node tools/probe.mjs` (the real page, 390x844 at 3x, CPU slowed 4x, long tasks
from `PerformanceObserver`, DOM writes from a `MutationObserver`), the way MANGA Engine measures
its client. Times include the test driver's own round trips, so read them as relative; the
**long tasks** column is the one that means "the page froze". Comparable tools are in
`docs/research/EDITOR_LOOP_PRIOR_ART.md`.

## What is fine

| Action (4x slower CPU) | Time | Long tasks | Note |
|---|---|---|---|
| Boot to ready | 650 ms | worst 122 ms | one-time |
| Load a 40x30 room | 51 ms | none | |
| Tap to place, drag to paint, undo | 170 ms / 1.5 s for 15 tiles / 470 ms | none | no frame over 50 ms |
| Edit to play and back | ~480 ms | worst 52 ms | |
| Two seconds of play | | worst 58 ms | 38 DOM writes in 2 s |
| Check, his 7x12 room | 1.9 s | worst 66 ms | stays responsive |
| DOM writes per action | 5 to 53 | | the MANGA "writes that change nothing" problem is not here: the room is a canvas |

## What is not

| # | Problem | Measured | Cause |
|---|---|---|---|
| 1 | **Show stops can run for a minute** | his room: over 30 s in the page; 56 s at full speed in Node, and it hits the 20,000-state cap anyway | it explores every state of the room (box positions, doors, glue), not just where you can stand, and each state tries every mid-slide power |
| 2 | **Check freezes the page on a big room** | 40x30: one task of 1.8 s | it hands control back only between states, and one state on a big room expands into hundreds of slides |
| 3 | **The Rooms panel slows down with every room you save** | 50 small rooms: open 1.3 s, Save 1.2 s, filter 0.3 s, worst task 336 ms; 50 big rooms: open 13.6 s, Save 30 s | every open, save and filter change redraws every thumbnail at full size and re-derives every room's mechanisms, twice; Save re-lists everything |
| 4 | **It never stops drawing** | 40 to 60 full redraws a second while idle in edit mode | the frame loop redraws the whole room every frame whether or not anything changed: battery on a phone |
| 5 | **The server sends every room on every listing** | not measured (no server in the probe) | the list call returns full rooms, and Save calls it again: one save downloads them all |
| 6 | **Nothing is autosaved** | | unsaved work is lost if the tab closes or the phone kills it; the dot on Rooms is the only warning |

At one room a day, #3 reaches the 50-room numbers in seven weeks, and roughly ten times them in a year.

## Fixed (2026-10-09), and held by `tests/perf.smoke.mjs`

The gate runs in `npm test`: phone size, CPU 4x slower, no task over 250 ms.

| # | Fix | After |
|---|---|---|
| 6 | **Autosave.** Every change writes a draft to the browser 0.4 s after you stop, and at once when the tab is hidden or closed. A reload brings it back, marked unsaved ("Your unsaved changes are back. Save to keep them."). Saving clears it. | |
| 3 | **Rooms panel costs one room, not all.** Thumbnails are 4 px per tile and drawn once per version of a room; tags are worked out once per version; Save updates its own row instead of re-listing. | 100 rooms: no task over 250 ms opening, saving or filtering (the list builds a few rooms at a time) |
| 1 | **Stop map in two passes with a 2 s budget.** First pass: plain slides, positions counted by your tile only, so dots appear almost at once; second pass: the full search with powers until the budget runs out, then "N tiles you can stop on, maybe more". Dots fill in while it runs. | his room: answer in ~2 s instead of over 30 s |
| 2 | **The search hands control back after every move it tries**, even ones that lead nowhere, and a mid-slide power branches from the slide in progress instead of replaying it, and Laser is not tried in rooms where it cannot change anything. | 40x30 with 60 boxes: worst task under 250 ms (was 1.8 s); his room's Check 0.1 s |
| 4 | **Edit mode draws only when something may have changed** (any input, an effect playing, a search running), plus 10 times a second for rooms with water or a goal, which move on their own. | still room: 0 to 2 redraws a second instead of 60 |

Not done: #5, the server's room list still sends whole rooms. Rooms are small (about 1 KB), and
Save no longer re-downloads the list, so it waits until it shows up in a measurement.

## Original proposals

1. **Autosave a draft** of the open room to the browser on every edit, and offer it back after a
   crash or a closed tab (PuzzleScript keeps a ring of recent versions; LDtk keeps crash backups).
   Explicit Save stays the way a room is filed. About 1 hour.
2. **Make the Rooms panel cost one room, not all of them.** Thumbnails drawn small (a pixel per
   tile, not 32) and cached by the room's content; tags computed once per room and cached;
   Save updates its own row instead of re-listing; the server list returns names, sizes, dates,
   par and tags, not whole rooms. About half a day.
3. **Stop map from the player's moves only.** Tiles you can stop on depend on pieces too, but a
   first answer from the room with pieces frozen takes milliseconds; then refine with the full
   search under a short time budget (1 to 2 s) and say "maybe more" when it runs out. About 2 hours.
4. **Check yields every few slides, not every state,** so no single task passes ~50 ms; and moves
   to a Web Worker later if rooms get big. About 1 hour for the first part.
5. **Draw only when something changed** in edit mode (an edit, a hover, an effect still
   fading); keep the per-frame loop for play. About 1 hour.
6. **A responsiveness gate** like MANGA's: the probe's long-task numbers as a smoke with loose
   ceilings (no task over 200 ms at 4x for open Rooms with 50 rooms, Check on a big room, Show
   stops), so these do not come back. About 1 hour.

What the research suggests that wee already does: edit and play on the same page with no reload,
a solver as an optional check, play from a tapped tile, swipe input with a threshold, undo one
tap away, export to a file and to a link.
