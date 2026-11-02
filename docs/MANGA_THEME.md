# The Manga theme, in wee

Owner, 2026-10-10: *"include somewhere, applying manga design patterns"*, then Manga pink for the
shell, *"but we need something more for the wee design. Something cutesy, fleeting, fast, airy,
weeeee."*, then C1 Drift from `docs/wee-look.html`.

**2026-11-01 (register 602): the palette moved to the neon lab** of `docs/lab-neon-sketch.html`: warm
greys from Monokai Pro for everything that sits, one neon per job (green the blob, orange the fruit,
cyan doors and switches, pink the beam, yellow stars, violet the accent). The page is dark only. The
pixel HUD slice (2026-11-02) replaced the sticker and the radii: see rules 2 and 5.

## Where this comes from

manga-engine's `public/core-ui.css` is the origin. bag-crawler's `docs/MANGA_THEME.md` absorbed it as
a rule set and a token table, and manga-tools' `web/css/palette.css` copies the values too, because a
standalone page cannot link the platform's stylesheet. wee is in the same position, so **this file is
wee's canonical copy**: `tests/manga.test.mjs` reads the table below and asserts `style.css` declares
exactly it. When the platform moves, edit this table and the gate makes the stylesheet follow.

## The form (the half that gets missed)

1. **No strokes.** Surfaces separate by tone. No `border` on a panel, a bar, a field or a button.
2. **Pixel panels, no sticker** (2026-11-02): a button is a 2 px frame with each corner cut by a 2-step stair; hover lightens the frame, a press darkens the button and nothing moves. The sticker tokens are 0.
3. **A recess** (a field) is an inset shadow in a lighter rim, not the outer shadow's ink.
4. **State is an inset ring**, never a border: "on" is `inset 0 0 0 2px` in the accent.
5. **Square corners** (2026-11-02): the four radius tokens are 0; only dots and marks stay round (50%).
6. **One accent**, for attention and "on" only. In wee it is violet (see the palette below).

**The room is not the shell.** Tiles, pieces, the player and lens marks keep wee's own colours: a
colour there is a rule the player reads. Each thing has its own pastel (see the palette below).

## The wee layer: Drift (C1)

- **Snow** (soft blue-gray flakes on the light ground) falls slowly behind the shell, over the page ground, never over the room.
- **Gust:** when the player starts a slide, the snow rushes the same way for a moment, then settles.
- **Frost:** the bars and columns are the panel tone at 78%, blurred, so the snow shows faintly.
- **Wordmark:** "wee" in the pixel face (Pixelify Sans 700), violet, with a lighter sheen passing over it.
- **Trail:** each tile the player leaves holds a fading ghost of the player.
- **Reduced motion:** the snow stands still, no gust, no sheen, no ghost.
- Light only: Fog is a light palette and there is no dark theme yet. The Manga light theme is not ported.

## Type (2026-11-02, register 617: one pixel face, Pixelify Sans, OFL; it replaced Bitter, Asap and Comfortaa)

Manga's roles, read from manga-engine's `public/core-ui.css`:

| role | face | where |
|---|---|---|
| text | Pixelify Sans 400 | body, notes, fields, hover lines |
| labels and actions | Pixelify Sans 400 (controls), 700 (heads) | buttons, chips, tabs, status bar, section heads |
| wee's name | Pixelify Sans 700 | the wordmark and room titles only |

Outfit is not used: in Manga it is one page's detail heading, not a role.
The faces are files in `fonts/` (OFL, licences beside them), linked from `fonts.css`, and the
single-file build inlines them as data URIs, so `dist/wee.html` needs no network.

## Palette: Fog (owner, 2026-10-11)

Blueberry gold shipped first and was turned down the same day: *"expected something more neutral
for the GUI like light gray or beige, and something more colorful and characteristic for each
thing ... like a more saturated pastel hue"*, then *"not asking for baba is you"*. Rendered options
A to D and four in-between variants (images, real wee renders); he picked **B, Fog**.

- **The shell is neutral:** light gray paper and near-white panels, dark text, one violet accent
  for "on" and attention.
- **The room is neutral too:** a light gray floor and slate walls, so nothing competes with what
  is on it.
- **Every thing has its own saturated pastel:** player sky, goal gold, enemy coral, strong enemy
  raspberry, moving block mint, box apricot, heavy box lilac, water blue, sticky green, laser pink.
  Switch colours (red, blue, yellow, green) are the same four pastels. The values live in
  `src/view/ink.js`; the room's colours are rules the player reads, so they stay out of this table.

## Joined-up tiles (owner, 2026-10-11)

Walls, water, sticky puddles and death blocks draw as one mass each (`src/view/masses.js`):
rounded outer corners, filleted inner corners, no seams, a light lip on walls' upward edges,
waves across the whole pool. Radii are deliberately small (he asked for "a bit less" than the
sketch): walls 6, water 8, sticky 10, death 6, on a 32 px tile. Triangles, springs and laser catchers join the walls (a triangle along its straight sides
only). Anything with a direction or a state stays one tile, so the player can still count it.

## The tokens

Read by `tests/manga.test.mjs`. `name | value`, one per row, values verbatim.

| token | value |
|---|---|
| `--paper` | `#221f22` |
| `--panel` | `#2d2a2e` |
| `--rule` | `#403e41` |
| `--ink` | `#fcfcfa` |
| `--soft` | `#939293` |
| `--accent` | `#ab9df2` |
| `--on-accent` | `#221f22` |
| `--field` | `rgba(255,255,255,0.06)` |
| `--field-rule` | `rgba(255,255,255,0.12)` |
| `--sticker` | `#19181a` |
| `--inset-rim` | `rgba(0,0,0,0.3)` |
| `--btn-mix` | `60%` |
| `--selectable` | `#ab9df2` |
| `--r-s` | `0px` |
| `--r-m` | `0px` |
| `--r-l` | `0px` |
| `--r-pill` | `0px` |
| `--sticker-rest` | `0px` |
| `--sticker-hover` | `0px` |
| `--sticker-press` | `0px` |
| `--ice` | `#78dce8` |
| `--frost` | `78%` |
| `--mid` | `#5b595c` |
| `--lite` | `#727072` |
| `--gold` | `#ffd866` |
| `--gold-ink` | `#c9a63a` |
| `--good` | `#a9dc76` |
| `--bad` | `#ff6188` |
| `--cyan` | `#78dce8` |
| `--orange` | `#fc9867` |
| `--kept` | `#3a3528` |
| `--shade` | `#19181a` |
| `--text-face` | `'Pixelify', monospace` |
| `--label-face` | `'Pixelify', monospace` |
| `--wee-face` | `'Pixelify', monospace` |
