# Theme: second diagnosis (registers 867 to 873)

His report, 2026-11-11, with five screenshots: the interface, the title, buttons and menus do not follow the
rules; things are too distant; walls lack the proper border; things look glitchy; the idle should be the
thing itself alive, as in Baba Is You; the thick borders are missing. Nothing below is built.

Reproduced with `scratchpad/theme/his.mjs`: a 950 px desktop window at 1 device pixel, the Paper palette, a
fresh save. The screenshots match his.

## What is wrong, and why

| # | What he sees | Cause | Evidence |
|---|---|---|---|
| 1 | Walls have no line where the room meets its ring: a pale band on the right and bottom, a dark line only on inner walls | **A bug.** The ring's line toward the room is drawn inside the room's edge tiles, and the room's floor is painted over it. The room itself counts everything outside as wall, so it draws no line there either. In a level the room canvas also sits on top of the ring canvas | `h-edge.png`: the ring's inner corner has a 3 px light band and no dark line. `scene.js` draws the floor after the ring; `kindIn` returns `'wall'` outside |
| 2 | "Glitchy" notches along every wall | The scribble I added to walls: the line swells by one art pixel in 4 px stretches. At one screen pixel per art pixel that reads as noise, not as a hand | `masses.js` `swell`; his first and fourth screenshots |
| 3 | Everything is small and thin on a desktop | Two things. The room is fitted to a whole number of screen pixels per art pixel and **rounds down**, so a room that would fit at 1.9 is drawn at 1. And the interface has no scale of its own: 14 px text and a 3 px line at any window size | `his.mjs` prints `perArt: 1`, `font: 14px`, `--b: 3px`. The sketch's buttons had a 5 px line on 22 px text |
| 4 | No thick border on most elements | The double border is on `button` and on three sheets only. It is missing from: the zoom buttons, the resize grips, side-goal chips, the goal's main box, the level list's connectors, inputs, the tool strip's slots, the header | `style.css`: `.zoomBar > button { box-shadow: none }`, `.grip { box-shadow: none }` |
| 5 | Locked level cards look like they have no border | A locked card is drawn at 45% opacity, which fades its line with it | `.campRow.locked { opacity: .45 }` |
| 6 | The title is not in the look | "wee" is the old flat pixel logo with a moving gradient: no line, no lit edge, no lump | `.logo` in `style.css` |
| 7 | Too distant | The menu's buttons sit in a separate plain box well below the room, under a fade that eats the room's lower half. On the level list the page is a 720 px column in a wide window with 14 px text. In a level the tools are a strip far from a small room | first, second and fifth screenshots |
| 8 | The room's bottom dissolves on the menu | A gradient laid over the room so the buttons read. It makes the walls look unfinished | `.menu::after` |
| 9 | Corner buttons, grips and the zoom bar overlap the ring | They are placed over the ring's band, in pale shapes with no line | fifth screenshot |
| 10 | The idle is only the border cycling | That is what I built (register 859): the line swells, the piece does not move. A glint and a pulse were added on top | `crayon.js` `ink({ scribble })` |
| 11 | He is not seeing the sketch's colours | His save wears the **Paper** palette. The sketch's brown line and periwinkle walls are Crayon's only | the screenshots' grey walls and grey ink |

## Proposal

In this order, because each depends on the one before.

1. **Walls (bug fix).** The room draws its own line along its boundary wherever a floor tile meets the ring,
   so every wall side has the same 2-pixel line. Remove the swell from walls: a wall's line is straight.
2. **Scale.** Round the room's scale to the *nearest* step, not down, and never below 2 screen pixels per art
   pixel when the room fits at 1.5 or more. Give the interface one scale too: on a window wider than a phone,
   text 16 px and the line 4 px with a 4 px edge.
3. **One frame for everything.** A single CSS frame (line plus edge, cut corners) applied to every control
   and container: zoom buttons, grips, chips, the goal box, tool slots, inputs, the header, dialogs. A locked
   card keeps its full line and greys its inside instead of fading whole. A gate lists every selector that is
   a control and fails on one without the frame.
4. **Idle, as in Baba Is You.** Each piece is three whole drawings, cycled about five times a second. The
   whole piece is redrawn, not only its line: its outline and its inner features (eyes, slits, a shine) each
   move by a pixel, following a smooth field, so it wobbles as one thing rather than tearing row by row. On
   top, a few pieces get a move of their own: the blob breathes, the berry's leaf sways. The line swell, the
   glint and the pulse go. Walls and floor hold still.
5. **Title.** "wee" drawn as three crayon letters: fill, dark-tinted line, lit edge, lumpy, wobbling with the
   pieces.
6. **Distance.** Menu: no fade over the room; the title and the three buttons on one framed sign that sits
   against the room's bottom edge. Level list: tighter rows, text and cards at the interface scale. Level:
   the grips and the zoom buttons move off the ring.
7. **Palettes.** Nothing to build, one thing to know: the sketch's colours are the Crayon palette. Paper keeps
   grey walls and grey ink by design.

## Open questions

- Should a palette other than Crayon be allowed to keep a light or grey line, or must every palette's line be
  as dark as Crayon's?
- Idle speed: Baba Is You cycles about five frames a second. Faster reads as nervous, slower as breathing.
