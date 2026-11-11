# Theme plan: the crayon lab (registers 841 to 854)

Discovery, references and every ruling: `docs/THEME_DISCOVERY.md`. The approved sketch:
`docs/theme-looks-sketch.html`, look A. **Nothing here is built.** Each phase starts with a sketch or a sample
he approves, then a build, the full suite, a publish.

## What is decided

| | ruling | register |
|---|---|---|
| Look | Crayon: the outer line is a dark tint of the piece it surrounds, never black; fills softened; the piece's own edge darkened inside | 851 |
| Line weight | Doubled: 2 art pixels outside a piece, 2 darkened inside; 4 px on panels and buttons | 845 |
| Grid | 32 art pixels to a tile (today 16) | 854 |
| Pixel perfect | By construction, never a filter; no dropped or stray pixel | 846, 847 |
| Pieces | Every one redrawn with shading and features, seen from above as today's sprite is | 850, 852 |
| Joining | What joins today still joins: one outline round a mass, no seam inside | 851 |
| Type | One legible face, Departure Mono, mixed case, at whole multiples of its grid | 853 |
| Palettes | All nine stay and are re-authored; a palette may move hues between jobs | 843 |
| Voice | The lab everywhere; the blob only in its album, cutesy and sometimes resentful | 844 |
| Marks | Splats, scorches and dents stay until you leave the level | 842 |
| Moments | Every component gets one as specific as the spring's crush | 842 |
| Spring | Kills only what it cannot move: a wall right behind | 848 |
| Timing | Plan properly, then build in the web game, before the Godot move | 841 |

## What 32 to a tile changes

Read from the code: `T = 32` units and `PX = 2` (`ink.js`, `pixel.js`), so a tile is 16 art pixels; 40 sprites
drawn as pixel runs in `pieceSprites.js`, `skinSprites.js` and `sprites.js`; 13 tests read pixels back.

- **`PX` becomes 1.** Seven files use it. Effects in `juice.js` snap to `P = 2`: they move to whole art pixels.
- **Scale must be a whole number.** On a phone a 7-wide room gives a tile about 48 CSS px: 3 CSS px to an art
  pixel today, 1.5 after. Pixel perfect then needs the room's zoom snapped so one art pixel is a whole number
  of *device* pixels (`fit.js`, `camera.js`, `zoom.js`). On a 3x phone that allows 1.33, 1.67, 2 CSS px and so
  on; on a 1x desktop only 1, 2, 3. The room gets slightly smaller or larger than "fit" to land on one.
- **The HUD's icons** (`pixelIcons.js`, 16 x 16) are a separate set: they keep their grid and get the line rule.
- **Every sprite is redrawn anyway**, so the grid costs nothing extra there. Thumbnails (`thumb.js`) follow.
- **Cost on a slow phone:** four times the cells per sprite. Sprites are cached as runs; a perf check
  (`tests/perf`) gates it before the second slice.

## Phases

Each is shippable alone. Sizes are rough: S about half a day, M one to two days, L three to five.

### 1. The rules, written and gated (S)
- `docs/THEME.md` replaces `MANGA_THEME.md` as the canonical look: the table above as rules, the outline
  rule as arithmetic, the type scale, the motion numbers.
- Gates first, red before the build: an edge-on-the-grid check for a rendered room; "no sprite is one fill"
  (each has at least a shade and a light of its fill); the outline rule on every sprite.
- **He approves:** the rule sheet.

### 2. One room in the new look (L): the vertical slice
- The drawing kit from the sketch moves into `src/view/` (lumpy oval, lit, eye, tinted outline pass, joined
  masses), `PX = 1`, whole-number zoom.
- Redrawn for real: floor, wall (joined), blob, berry, box, door, button. One palette, the new default.
- The rest of the pieces keep today's drawing, doubled, so the game stays whole.
- **He approves:** the level screen on his phone. This is the first thing he can play.

### 3. Every piece (L)
- The remaining sprites, from today's for viewpoint and footprint: switch, laser, relay, one-way, spikes,
  spring and plate, bomb, sticky, gravel, cracked floor, checkpoint, mover, enemy, strong, heavy, crate
  frame, and the twelve alternate skins.
- In sheets of about eight, each sheet a sketch he marks up before it lands.

### 4. Nine palettes (M)
- Slots renamed by job (`hero`, `fruit`, `signal`, `danger`), not by hue; nothing names a thing by colour.
- Each palette re-authored, free to move hues. Gates per palette: three value bands (room, pieces, line),
  every pair of rule colours told apart, and a mark on each coloured piece so hue is never the only sign.
- **He approves:** a contact sheet, one room in all nine.

### 5. Moments (L, in three batches)
- **The stain layer:** marks drawn under the pieces, kept until you leave the level, capped, never a rule.
- **Batch a, the deaths** (seven the rules already tell apart): spring crush, door, spikes, blast, the
  death tile, laser, fall. Each: a flinch frame, hit-stop, its own 2 to 4 frames, its mark.
- **Batch b, at rest:** the blob blinks and looks; the berry, button, switch, one-way, laser and spikes
  each get their idle from Part D.
- **Batch c, the rest:** box, heavy box, crate, sticky, gravel, cracked floor, water, checkpoint, enemies,
  the win's incident count.
- Shake is the named exception to "the screen stays still": on its axis, short, with a setting (off,
  reduced, full) and a still cue under reduced motion.
- About twelve new sounds.
- **He approves:** each batch as a short reel before it lands.

### 6. Screens as lab things (L)
- **Chrome:** panels and buttons in the double border; wobble in whole-pixel steps, chrome only.
- **Clipboard:** the level's goals, ticked in the lab's pen; the win card as its last page.
- **Album:** Achievements as the blob's album: photos (drawn from the sprites to begin with), empty slots
  showing, the score steps included.
- **Back room:** Looks as the lab's back door: palettes and skins as things on shelves.
- **The rest, so nothing is left stock:** menu, level list, Who's playing and its board, reset, the dev
  lock, sound, Sandbox panels.
- **He approves:** a sketch per screen, phone first.

### 7. Voice (M)
- Sample lines first, about twenty in the lab's voice and ten in the blob's, for him to mark. No invented
  line ships unapproved.
- How it lives with the house rules (condition first, one sentence, no retro-explaining): instructions keep
  them; flavour lines are a named, listed exception the copy gate knows.
- Then the pass over every string.

### 8. Close (S)
- `MANGA_THEME.md` and `tests/manga.test.mjs` retired or re-pointed; mutants for every new gate; perf and
  reduced-motion checks; `CAMPAIGN.md` and the register closed.

## Order and why

1, 2, 3, 4, 5, 6, 7, 8. The slice (2) comes first so the look is judged in the real game on his phone before
forty sprites are drawn to it. Palettes (4) follow the pieces because a palette is judged on finished art.
Moments (5) need the pieces. Screens (6) and voice (7) can swap or run beside 5: they touch other files.

## Risks

- **Whole-number zoom** leaves a room a little off "fit" on some screens. Seen in phase 2, on his phone.
- **Four times the pixels** on a slow phone: gated before phase 3.
- **13 pixel-reading tests and about 1,200 mutants** move with the sprites. Budgeted inside each phase.
- **The Godot move:** rules, palettes, copy and the pixel art as data survive; CSS screens may not.
- **Soft small pieces on a phone** was the sketch's warning for Crayon: phase 2 is where it shows.

## Questions still open (asked one at a time)

1. ~~The blob's colour~~: answered 2026-11-11, "Both right? Because we have both today, the green one is
   unlockable." The default blob stays violet; the green one stays the unlockable Hero skin. Both are redrawn.
2. Whether the twelve alternate skins are all redrawn, or cut to the best few.
3. The shake setting's default: full, or reduced.
4. Album photos: drawn scenes, or a real capture of the moment the achievement was earned.
5. What the new default palette is called.
