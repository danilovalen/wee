# Lenses: seeing what a room does

Status: **plan, 2026-10-10. Nothing built beyond Stops.** Owner: "a proper lenses feature to see
the stuff we were discussing. Movements, movement lines, heatmaps, and such. Similar to how these
grand strategy games have them too. Or these design tooling. Include diagnose from other
software."

## What other software does

From memory of each product, not re-checked against current versions.

| Software | What it calls them | How you switch | One or many at once | What we take |
|---|---|---|---|---|
| Europa Universalis / Crusader Kings (Paradox) | map modes | a row of buttons under the minimap, plus hotkeys | one | a fixed row, one key per lens, the map itself recoloured rather than markers on top |
| Civilization VI | lenses | a lens menu by the minimap; some open by themselves (Settler lens when a settler is selected) | one | **a lens that opens by itself for the tool in hand**: placing a turret could show beams |
| Oxygen Not Included | overlays | F1 to F11, a legend panel per overlay, filters inside it | one | **a legend for every lens**, and filters within a lens (which colour's beams) |
| RimWorld | overlays | toggles in the corner (beauty, roofs, temperature) | many | some lenses are cheap marks that can stack (Stops dots + beam lines) |
| Cities: Skylines | info views | a menu of views; traffic is a green-to-red heat on roads | one | **heat as colour on the thing itself**, not numbers |
| Factorio | alt mode, map view | one key shows what every machine holds and where belts flow | one toggle | an "everything" key: directions of every piece at once |
| Unity / Unreal editors | gizmos, view modes, nav mesh overlay | a view-mode menu, a key for the nav mesh | many gizmos, one view mode | the split between **view modes** (recolour everything) and **gizmos** (marks on top) |
| Super Mario Maker 2 | death markers | shown on a course after others play it | n/a | **lenses from real plays**, not only from the solver |
| Puzzle design tools (Alan Hazelden's and others' state-graph views, PuzzleScript solvers) | state graph | a separate window | n/a | the room's whole position graph as a picture: where it branches, where it dead-ends |
| GameAnalytics, Unity Analytics | heatmaps | dashboard | n/a | aggregate where players stop, die and give up |

Three patterns repeat:
1. **One lens at a time, chosen from a fixed row with keys.** Every strategy game converges here;
   two recolourings on top of each other read as mud.
2. **A legend per lens.** Without it a heat colour is a guess.
3. **Two kinds of drawing:** recolour the tiles (heat), or draw marks on top (dots, lines,
   arrows). Marks can stack with a heat lens; two heats cannot.

## What wee already has

- **Stops** (a toggle): every tile you can come to rest on, red where every stop is a dead end.
- **Design notes** frame pieces in red when the answer does not depend on them.
- The data under both is one search: `routes()` maps every reachable position, which positions can
  still win, and how far each is from the start. Most lenses below are a new view of that map,
  plus what happens **during** each move, which the search runs but does not record yet.

## The lenses

Each is a question a designer asks. Draft names.

| Lens | Question | Drawing | Data | Cost |
|---|---|---|---|---|
| **Stops** (exists) | Where can I come to rest? | dots; red = trap | `reach`, `routes` | built |
| **Passes** | Where does motion go, even where I never stop? | thin dots on every tile a slide crosses | record the tiles crossed during each move | small: the search already steps each tick |
| **Lines** | Which stop leads to which? | arrows from each stop to each stop it reaches, thicker where more positions use it | the position graph, folded to tiles | medium: many arrows need bundling |
| **Solution** | What is the shortest way? | numbered arrows along the found path, one per move | `solve().moves`, replayed | small |
| **Distance** | How far is each place from winning? | heat: green near the goal, red far, grey hopeless | moves-to-goal per position, the best per tile | small (a reverse pass on the graph) |
| **Dead ends** | Where does the room trap you? | heat by the share of positions on a tile that can no longer win | `routes` alive set, per tile | small |
| **Beams** | Where can a laser ever reach? | red wash on every tile any beam covers, in any position | record beams per position | medium |
| **Pieces** | Where can each box, enemy or block ever be? | one colour per piece, a wash over its reachable tiles | record piece tiles per position | medium |
| **Danger** | Where can you die? | skulls where a move that would end there kills you | the search already drops those moves; count them | small |
| **Plays** | Where do real players stop, die, give up and reset? | heat from play reports and the softlock banner | the keylog every play already records | larger: needs plays stored per room |

## How it would work

1. **One row of lens buttons** under the room in edit mode, with keys 1 to 9, one lens at a time,
   Stops becoming one of them. A legend line under the row says what the colours mean.
2. **One search for all of them.** Extend `routes()` so each move records the tiles the player and
   each piece passed through, and the beams in each settled position. Every lens reads the same
   result, so switching lenses is instant and the search runs once per room change, in slices,
   like the live check.
3. **Heat lenses recolour tiles; mark lenses draw on top.** A mark lens may stay on under a heat
   lens (Solution over Distance reads well); two heats never stack.
4. **A lens can open by itself**: picking the turret tool shows Beams, picking a box shows Pieces.
   Off by default; a setting.
5. **Capped rooms say so.** A lens over a search that hit its cap draws what it found and the
   legend says "partial".

## Phases

| Phase | Ships | Rough size |
|---|---|---|
| L1 | the lens row, legend, keys; Stops moved into it; Solution and Distance | half a day |
| L2 | the search records motion: Passes, Lines, Danger | a day |
| L3 | Beams and Pieces | half a day |
| L4 | Plays: store play reports per room on the server, heat from them | a day, needs the server |

## Gates

- Each lens over a small hand-made room draws exactly the tiles the rules say (unit tests on the
  lens data, not on pixels).
- One pixel check per lens kind (a heat tile is coloured, a mark is drawn) in the browser smoke.
- The search for all lenses stays inside the page's 250 ms task budget on the perf smoke.
- Mutation entries for every lens.

## Open questions, for the owner, one at a time

1. One lens at a time with marks allowed on top of a heat (the strategy-game pattern), or free
   toggles that all stack (RimWorld)?
2. Should a lens open by itself for the tool in hand?
3. In play mode too, or only while editing?
4. Plays (L4): store every play on the server, or only plays you send with Copy report?
