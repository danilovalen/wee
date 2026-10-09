# Editor plan: enclosed puzzle rooms

Status: planned 2026-10-09, nothing built. Each phase ships on its own: tests, mutation run, one
`dist/wee.html`, a register line.

The point: make a single, enclosed ice room fast to build, keep, prove solvable and share.
Rooms that link into each other (metroidvania) are out of scope.

## Phase 0: architecture (no behaviour change)

Today: four flat files. `sim.js` is 640 lines holding every rule, `main.js` mixes editor state,
panels and input, and the single-file build depends on a hand-kept order and on no two files
sharing a top-level name.

### Folders, one job each

| Folder | Holds | May import |
|---|---|---|
| `src/rules/` | the game: grid geometry (`stepTo`, triangles, one-way), player, pieces, beams and water, doors and switches, sticky, `step`. Pure, deterministic. | nothing outside `rules/` |
| `src/level/` | the level format: parse, validate, versions, and pure edits (`level -> level`): place, erase, resize, rotate a region, paste. | `rules/` (for tile names) |
| `src/solve/` | solver, stop map, lint. Read-only over a level. | `rules/`, `level/` |
| `src/view/` | drawing: tiles, pieces, effects, overlays (selection, ghost paste, stop map). Reads state, writes pixels. | `rules/`, `level/` |
| `src/editor/` | editor state, history (undo/redo), tools (paint, select, resize, wall shapes), clipboard, level store. | `level/`, `solve/` |
| `src/app/` | wiring: DOM panels, keys, touch, the play loop. The only folder that touches the page. | everything |

### Rules that keep it tidy, each a test

- **The import direction is enforced.** A test reads every `import` line and fails on any arrow
  the table above does not allow, e.g. `rules/` reaching for `view/`.
- **Every edit is a pure function of a level.** That is what makes undo a stack of levels, a
  paste a preview of a function's output, and the solver able to read a level it did not draw.
- **A file over 300 lines fails a check.** That is the split point, not a style rule.
- **The mutation list moves with the files.** A mutant whose file or text no longer exists is
  already reported as stale; Phase 0 must end at 100% caught again.

### The single-file compiler

`tools/build-single.mjs` becomes a small bundler:

1. It starts from `src/app/main.js` and follows the `import` lines, so there is no order list
   to keep.
2. Each module is wrapped in its own function scope and returns its exports, so two files may
   share a private name.
3. CSS is inlined, and any file under `assets/` is inlined as a data URL.
4. It refuses an import cycle and a missing export, naming both files.
5. It writes `dist/wee.html`; `tests/single.smoke.mjs` already plays that file from disk and
   stays the gate.

`npm run build` makes it; every phase ends by sending that file.

## Phase 1: undo and redo

- A button and Ctrl+Z (Ctrl+Shift+Z or Ctrl+Y to redo).
- A whole drag is one step; resize, paste, rotate and level switches are one step each.
- The last 100 steps per level, in memory.

## Phase 2: level list, kept in the page

- A **Levels** panel: New, Save, Save as, Rename, Delete, and a list with a tiny thumbnail each.
- Kept in the browser's local storage. **Risk:** an HTML file opened from a phone's files may not
  keep local storage in every browser, so the panel also has **Export all** and **Import**, one
  `.weepack` file holding every level.
- The current level's unsaved changes are marked, and switching away asks first.

## Phase 3: crop-style resize

- In edit mode each side of the room gets a handle. Drag outward to add rows or columns on that
  side, inward to cut them, with the cut area shaded before you let go.
- Width and Height stay as boxes and grow from the bottom right, as now.
- A cut that would remove the start is refused with the reason.

## Phase 4: select, move, rotate, copy, cut, paste

Borrowed from Factorio's copy and paste and Tiled's stamps.

- **Select tool:** drag a box. **Ctrl-drag** adds another box anywhere; the selection is the
  union. Shift-drag removes.
- On a selection: **drag** to move, **R** rotates 90° clockwise (Shift+R the other way),
  **Ctrl+C** copy, **Ctrl+X** cut, **Delete** clear.
- **Paste (Ctrl+V)** shows the copy as a ghost under the cursor: green where it fits, red where
  it would land on a wall or a piece. R rotates the ghost, a click stamps it, Esc cancels.
- Rotation also turns anything that has a direction: springs, turret barrels, one-way tiles,
  triangles, patrol axes and directions.
- On a phone: Select, Rotate, Copy, Cut, Paste and Delete are buttons in the tool's option row,
  and a long press adds a box.

## Phase 5: the goal, and a room you can finish

- A **Goal** tile. Reaching it ends the run: a short celebration, the number of slides, and
  Play again / Edit.
- A **slide counter** on screen during play.
- A room with no goal plays as now, as a sandbox.

## Phase 6: solver

The rules are deterministic and tile-based, which is what makes ice puzzles solvable by search.

- Breadth-first search over (your tile, every piece's tile and state) taking one slide per edge.
- **Solvable or not**, and the **fewest slides** (that becomes the room's **par**).
- **Show solution** plays it as a ghost; you can step through it.
- **Scope, said out loud:** rooms whose pieces all move on your move. Real-time pieces make the
  state space depend on timing; the solver says "has real-time pieces, not checked" rather than
  guess. A state cap (100k) stops a runaway search and says so.
- Runs in a background worker so the editor does not freeze.

## Phase 7: stop map

- An overlay in edit mode: every tile you can come to rest on from the start, with arrows for
  each slide, and the unreachable floor shaded.
- From the player's current tile in play mode too, as a hint toggle.

## Phase 8: play from here

- Long press or right-click a tile in edit mode: **Play from here**, starting on that tile with
  the room as it is.

## Phase 9: saved solution check

- **Record solution** saves the keys of a run that reaches the goal.
- After every edit the saved solution is replayed in the background; if it stops reaching the
  goal, the level shows a warning with the slide where it breaks.

## Phase 10: lint

Each a warning in the Levels panel, with the tile highlighted on tap:

- a door with no switch of its colour, or a switch with no door;
- a turret aimed straight into an adjacent wall;
- a piece walled in on all sides;
- the start walled in;
- a goal the stop map cannot reach.

## Phase 11: wall tools

- **Rectangle** and **Line** modes for any tile tool (drag from corner to corner).
- **Wall the border** button: fills the outer ring.

## Phase 12: share code

- **Copy code** puts the room on the clipboard as one short text string (compressed, URL-safe).
- **Paste code** loads one. A link form (`wee.html#room=...`) opens straight into that room.

## Phase 13: the room from the image

Waiting on the image, which did not come through.

## Order and size

| Phase | What | Rough size |
|---|---|---|
| 0 | folders, import rule, bundler | half a day |
| 1 | undo/redo | 1 to 2 hours |
| 2 | level list, export/import | half a day |
| 3 | resize handles | 2 hours |
| 4 | select, move, rotate, copy, paste ghost | a day |
| 5 | goal, win, slide counter | 2 hours |
| 6 | solver, show solution, par | a day |
| 7 | stop map | half a day |
| 8 | play from here | 1 hour |
| 9 | saved solution check | 2 hours |
| 10 | lint | 2 hours |
| 11 | wall tools | 2 hours |
| 12 | share code | 1 to 2 hours |

## Open questions (asked one at a time before the phase that needs them)

1. Goal: does touching it win, or must you stop on it? (Phase 5)
2. Does a run still count if an enemy is alive, or are there other win conditions? (Phase 5)
3. Should a rotated selection also rotate a moving block's patrol, or keep its axis? (Phase 4)
4. Keep 20 recent copies like Factorio, or only the last one? (Phase 4)
