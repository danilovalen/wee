# UI pass: diagnosis and proposal

Status: **diagnosis, 2026-10-10. U1 to U4 built the same day; U5 not built.** Owner: "these options seem like something that will
be cut on the page end due to our no-scrolling-allowed rule. We need a UI pass on this tool.
Diagnose how other similar tools work so we can improve ours. Do it thoroughly and carefully."

## 1. What is wrong today (measured)

Everything open at once: Lenses with one lens per row, design notes after a Check, the turret
tool picked (its options sit under the room), the old First room (7x12).

| Window | Page taller than window by | Room drawn | Stuff under the room |
|---|---|---|---|
| 1280x720 | **167 px, cut off** | 255 px tall, 35% of the height | 566 px |
| 1366x768 | **138 px, cut off** | 274 px | 566 px |
| 874x900 | **91 px, cut off** | 328 px | 600 px |
| 1920x1080 | 0 | 433 px | 566 px |

Why the gate stayed green: `fit.smoke` checks design notes, play mode and every tool, but never
opened Lenses. The room-sizing code gives the room whatever is left after everything under it,
with a floor of 40% of the column; once the stack under it passes 60% of the height, the floor
wins and the page grows past the window.

The root cause is not the lens panel, it is the layout's shape: **the column under the room is the
only place new things can go, and every feature added since the one-screen fix went there**:
tool options, the hint, the key line, the live solve line, Show solution, design notes, and now
four lens rows, a checkbox and up to four legend lines. Each one alone fits; together they push
the room down to a third of the screen, which is the opposite of what an editor is for.

Region budget at 1280x720 today:

| Region | Size | Changes how often |
|---|---|---|
| Header | 55 px tall | never |
| Left: 25 tools with labels, 4 groups | 300 px wide, about 520 tall | the tool changes constantly; the list never |
| Centre: room + 7 kinds of thing under it | 640 px wide | the room: always; the rest: grows with features |
| Right: room size, 8 powers, status, world clock | 260 px wide, about 540 tall | rarely: once per room |

## 2. How other tools do it

Three research passes: puzzle and level editors, information-dense games, creative tools.
**Method caveat:** the container's network policy blocked most direct page fetches, so most facts
come from search-result summaries quoting official docs and wikis; the GitHub sources (Tiled
shortcuts, Lönn README, PuzzleScript's level editor page) were read in full. Facts below are the
ones the sources agreed on; uncertain ones are marked (unconfirmed).

### Level editors
- **Super Mario Maker 2**: only the 12 most recent parts are on screen (hold one to pin it); the
  full catalogue opens as a grid or wheels by category. A part's options open in a bubble **on
  the part itself**, greying the rest. Undo, eraser and play are single buttons; play from here
  is a tap, from the start a hold. The design goal, from its director: "the right number of
  icons onscreen". Reviews still call it crammed.
- **PuzzleScript**: no option panels at all. Keys 1-0 pick tiles; a "+" at the room's edge adds
  a row or column (right click removes); E toggles edit and play; R resets.
- **Baba Is You**: a quickbar of recent objects (right click locks one); typing a word picks that
  object up; the controls are listed along the bottom of the screen, so you learn them by seeing.
- **Portal 2 Puzzle Maker**: the item palette only appears when the cursor touches the left edge;
  four buttons on top; item settings in a right-click pop-up on the item; a debug overlay for
  connections on one key.
- **Lönn (Celeste)**: right-click an object for its properties; favourites by double-click; single
  keys rotate, flip and resize; every key rebindable.
- **Tiled**: **Tab hides every dock**; H dims all but the current layer; one letter per tool;
  1-9 recall stamps; Ctrl+Shift+P searches actions.
- **LDtk**: Tab toggles a compact mode; H opens a shortcut cheat sheet; one letter per panel; the
  palette below follows the active layer.
- **Sokoban search tools**: one open-source lab overlays dead squares, the search trace and the
  optimal path on the grid, and pointing at a dead square says which rule kills it. That is the
  nearest thing to wee's lenses, and it explains on hover rather than in a panel.

### Information-dense games
- **Europa Universalis IV / Hearts of Iron IV**: map modes are a small cluster by the minimap,
  bound to keys; **pressing a key again cycles to the next mode on that key**, and players group
  related modes on one key. HoI4 shows the common few and hides the rest behind one control.
- **Crusader Kings III, Victoria 3**: tooltips inside tooltips; a highlighted word opens its own
  tooltip, locked by a timer or a click. Critics cap the useful depth at 2-3.
- **Civilization VI**: lenses from one button by the minimap; the settler lens **opens by itself
  when a settler is selected**, the district lens when placing a district. The popular More Lenses
  mod makes auto-opening a setting. The legend shows only while a lens is on (unconfirmed where).
- **Oxygen Not Included**: about 15 overlays on F-keys, **one at a time**, some with filters inside
  the overlay; switching overlay while a tool is active changes the tool's filter to match.
- **Cities: Skylines 2**: traffic as a green-to-red heat on the roads; the legend carries its own
  toggles. Heatmaps open by themselves for some tools, and players went looking for how to close
  them (the answer was one key): **an automatic overlay needs an obvious one-key dismiss.**
- **RimWorld**: a small grid of corner toggles that stack; a mod exists to hide some because they
  clutter.
- **Factorio**: alt mode is one key, often called cluttered; debug options let you pick which
  layers stay on. Heat mods use brightness, not hue, to order severity.
- **Into the Breach**: every enemy's next attack is drawn on the board; holding Alt numbers the
  order of every effect. Its lead: "we would sacrifice cool ideas for the sake of clarity every
  time". Zach Gage's GDC talk uses it for "three reads": at a glance, closer, in detail.
- **XCOM 2**: blue outline for one move, yellow for a dash; the outline of the area, not a fill
  of every tile. **Fire Emblem**: one button shows every enemy's combined danger zone.
- **Lichess**: right-drag draws arrows, modifier keys change colour, one key toggles the engine's
  arrows, `?` lists shortcuts; user and engine arrows share one look.
- **Stephen's Sausage Roll, Baba Is You**: no HUD; undo and restart are the whole interface.

### Creative tools
- **Aseprite**: the **context bar**, a strip under the menu, shows the current tool's options and
  nothing else. The timeline hides on Tab.
- **Photoshop / Photopea**: panels collapse to an icon strip; a "narrow options bar" turns the
  options' words into icons on small screens; Photopea folds each sidebar column to buttons that
  pop out one panel at a time.
- **Krita**: right-click on the canvas opens a pop-up palette at the cursor.
- **Figma (UI3)**: toolbar moved to the bottom to give the canvas room; Minimize UI folds both
  sides, and selecting something brings the properties back for a moment. Figma **reversed** its
  floating panels after launch: people who work for hours found them worse, so they float only
  in minimized mode.
- **Blender**: **Overlays** is one header button with two parts: a master on/off, and a dropdown of
  grouped checkboxes that changes with the mode. The status bar shows the keys for what you are
  doing now and updates as you hold modifiers.
- **Unity**: scene overlays collapse to an icon when docked; gizmos split "only when selected"
  from "always".
- **tldraw**: the contextual toolbar floats over the selection, shows only options every selected
  shape supports, hides while dragging, and is not drawn at all when nothing applies.
- **VS Code**: every panel has a toggle in the title bar and a command; Zen mode hides all.
- **Ableton**: the **Info View**, one small fixed box that explains whatever the mouse is over.
- **Linear and command palettes**: Ctrl+K runs anything and shows each command's key, so using it
  teaches the shortcuts; `?` lists them all.
- **Progressive disclosure** (Nielsen): show the common options, reveal the rest on request,
  never hide what people use often, and let the person drive it.

## 3. What keeps coming back

1. **Only the canvas flexes.** Every other region has a fixed size; anything that can grow goes in
   a pop-up, a drawer or a tab. (Figma, Aseprite, Blender, every strategy game.)
2. **Tool options get one fixed strip, swapped with the tool.** (Aseprite context bar, Tiled tool
   options, Blender tool settings.) Options attached to one placed piece open on the piece.
   (Mario Maker bubble, Portal 2, Lönn, LittleBigPlanet.)
3. **Status is one line.** Verdict and key hints in a status bar; detail on click. (Blender,
   VS Code, PuzzleScript, Baba.)
4. **Overlays: few visible controls, each cycling a family, on number keys.** (EU4, HoI4, ONI.)
   The legend shows only while a lens is on, and stays short. (Civ, ONI, Cities.)
5. **Detail comes on hover, not as layout.** (CK3 nested tooltips, Into the Breach, Ableton Info
   View, the Sokoban lab's "why is this dead".)
6. **Automatic overlays are a setting, look automatic, and close on one key.** (Civ, More Lenses,
   Cities 2's complaint.)
7. **Danger is drawn on the tile, order is drawn as numbers, ranges as outlines.** (Into the
   Breach, Fire Emblem, XCOM.)
8. **Rare settings live behind a tab or a pop-up.** (Photopea folding columns, LDtk level
   settings, Baba's F1.)
9. **Hide everything on one key.** (Tiled and LDtk Tab, Figma Minimize UI, Procreate, VS Code Zen.)
10. **Every control shows its key; `?` lists them all.** (Excalidraw, LDtk, Lichess, Linear.)
11. **Edit the room's own edge** instead of a size form. (PuzzleScript's "+".)
12. **Few icons on screen, the rest one step away.** (Mario Maker's recents, Baba's quickbar.)

## 4. Proposal for wee

```
+------------------------------------------------------------------+
| wee  Play  undo redo  Check  Lenses▾  Generate        ?   Rooms    |  header, fixed
+------------------------------------------------------------------+
| Turret: fires ↑→↓←  starts aiming →  clock: on your move  | hint  |  context bar, fixed, one line
+--------+------------------------------------------+-------------+
| tools  |                                          | Room|Powers  |
| (icons |              the room                    |  tab content |
|  and   |      (all the space that is left)        |  fixed       |
| labels)|                                          |              |
|        |  [C][D][L][F] lens chips, corner key     |              |
+--------+------------------------------------------+-------------+
| Solvable in 9 moves · Show · 3 notes ▸ | 1-4 lenses · Tab hides  |  status bar, fixed, one line
+------------------------------------------------------------------+
```

1. **Context bar** under the header, one line, fixed height: the current tool's options (today
   under the room), and its hint when it has no options. Absorbs the options block, the place
   hint and the key line.
2. **Status bar** at the bottom, one line, fixed: the live solve verdict, Show solution, a "notes"
   count that opens the design notes, and the key hints for the current mode. In play: moves and
   the softlock warning.
3. **Design notes in a drawer** opened from the status bar (or a right-column tab), never inline.
   Their findings stay on the room as frames, as now.
4. **Lenses as four chips**, one per row (Colour, Dots, Lines, Frames), on the room's edge. Each
   chip cycles its row on click and on its number key and shows the lens's short name; the
   header's Lenses button is the master on/off with a dropdown holding Follow the tool. The
   legend becomes **one short line per lit chip, beside the chip**, so it is bounded at four.
   A lens opened by the tool looks hollow (automatic) until you pick one yourself.
5. **Hover a tile, read everything**: one Info line (Ableton) in the status bar: "3 moves to win ·
   a laser reaches here · you only pass". Long legend words move there too.
6. **Right column as tabs**: Room (size, border) | Powers | World. Or the room's size moves to
   "+" handles on the room's edges (PuzzleScript), which frees the right column for Powers.
7. **Narrow windows**: tool labels drop to icons below about 1100 px (names and keys in the
   tooltip); the right column folds to an icon rail.
8. **Tab hides both side columns**; `?` opens a list of every key; each tool button shows its key.
9. **The gate**: `fit.smoke` opens **everything at once** (every lens row, design notes, the tool
   with the most options, play mode) at every size it tests, and asserts nothing is cut and the
   room keeps at least 60% of the height. It fails today by 167 px, which is the point.

## 5. Phases

| Phase | Ships | Rough size |
|---|---|---|
| U1 | the frame: context bar, status bar, design notes drawer, only the room flexes, the "everything open" gate | **built 2026-10-10** |
| U2 | lens chips on the room's edge, short legends, automatic look, hover Info line | **built 2026-10-10** |
| U3 | right column tabs or edge handles; icon-only tools when narrow | **built 2026-10-10**: edge handles plus a size readout; icons from 701 to 1100 px |
| U4 | Tab hides chrome, `?` key list, keys on buttons | **built 2026-10-10** |
| U5 | the Manga theme, per bag-crawler's `docs/MANGA_THEME.md` (below) | half a day |
| later | a command palette; recent tools; options in a bubble on a placed piece | open |

## 5a. U5: the Manga theme

Owner, 2026-10-10: *"include somewhere, applying manga design patterns, hopefully we have a doc."*

There is one: **bag-crawler `docs/MANGA_THEME.md`**. Its values come from manga-engine's
`public/core-ui.css`; manga-tools' `web/css/palette.css` copies them too, because a standalone page
cannot link the platform's stylesheet. wee is a fourth repo in the same position, so it takes the
same approach: copy that token table into wee as its own canonical table and gate the stylesheet
against it, the way bag-crawler's `tests/manga.mjs` does.

What carries over is the **form**, not only the palette, which is why it took four prompts last time:

1. No strokes: surfaces separate by tone, never a 1px border on a panel, field or button.
2. The sticker shadow, hard and unblurred: 4px at rest, 6px on hover (lifted 2px), 1px on press.
3. A recess is an inset shadow in a lighter rim, not the outer shadow's ink.
4. State is an inset 2px ring, never a border, so nothing moves when it lights.
5. Four radii: 16 modal, 10 panel, 8 field, 999 pill.
6. One accent, for attention only.

**What the theme does not touch: the room.** Tiles, pieces and lens marks are the game's own
language; a colour on them is a rule the player reads. The theme takes the shell: header, bars,
columns, well, buttons, fields and dialogs.

Open before building: wee's cyan accent (`#5ee0e6`) is also the player's colour and the "on" state.
Manga's accent is `#ff2a5f`. Which one wins for the shell is the owner's call.

## 6. Decisions (owner, 2026-10-10)

1. **Lens chips on the room's edge.** On phones, one row of four chips under the room.
2. **Room size by "+" handles on the room's edges**, plus a clickable size readout in the status line.
3. **Findings in a tab of a fixed-height well under the room.** On phones, the well opens as a sheet.
4. **A mockup first**, viewable on a phone; the owner will see desktop only scaled down, and goes with the flow there.

The richer page with round two of the research is `docs/ui-pass.html`.

## 7. Questions asked, kept for the record

1. Lens chips: on the room's edge (always visible, one click), or inside the header's Lenses
   dropdown (zero space, two clicks)?
2. Room size: tabs in the right column, or "+" handles on the room's edges?
3. Design notes: a drawer over the room, or a tab in the right column?
4. A mockup first (one HTML page with the proposed layout at 1280x720 and 874x900), or straight
   to U1?
