# The crayon lab: wee's look, as rules

Canonical for how wee looks, moves and speaks (registers 841 to 857). It replaces `MANGA_THEME.md`.
How it was reached: `THEME_DISCOVERY.md`; the build order: `THEME_PLAN.md`; the approved sketch:
`theme-looks-sketch.html`, look A. Each rule names its gate; a rule with no gate says why.

## The line

1. **Every piece is inked by one pass** (`src/view/crayon.js` `ink`): a line 2 art pixels wide outside it and
   its own edge darkened 2 deep. No piece draws its own outline. Gate: `tests/crayon.test.mjs`.
2. **The line is a dark tint of what it surrounds, never black** (62% toward a fixed plum-black). Same gate.
3. **The line is whole.** No cell of a piece touches bare floor without line between them; nothing is dropped
   at random. Same gate. (Register 847: a missing pixel reads as a glitch.)
4. **What joins has no seam** (`masses.js`): walls, water, goo, gravel and spikes are one mass each, lit on
   top and left where the mass ends, shaded below and right, one line round the lot.
5. **An open door, a frame and a bare overlay are not inked**: they are marks, not things.

## The grid

6. **32 art pixels to a tile**, one room unit each (`T = 32`). A sprite still on 16 is doubled.
7. **Pixel perfect by construction, never by a filter.** The room is drawn into a buffer of one pixel per
   art pixel and shown enlarged with no smoothing.
8. **A whole number of screen pixels to an art pixel** where that costs the room a fifth of its size or
   less; otherwise a half step, which keeps every 2-pixel line even (`camera.js` `fitScale`). Zooming in is
   always whole. Gate: `tests/crayon.test.mjs` (the arithmetic) and `zoom.smoke`.

## A piece

9. **Seen from straight above**, with the footprint of the sprite it replaced (register 852). The blob's
   face is the one licence.
10. **Never one fill**: a shade, a shine or a feature inside. Gate: `tests/crayon.test.mjs` counts tones.
11. **Lit from the top left.**
12. **Lumpy**: a round thing is never quite a circle (`sheet.oval`'s lump).
13. **At rest its line scribbles** (register 859): a piece moves between three drawings in which the line
    swells a pixel along short stretches, as a crayon pressed harder. The line never thins and never drops a
    pixel, and the piece itself does not move. A wall's line swells too, but stays the same drawing. Off
    under reduced motion and from Looks. Gate: `tests/crayon.test.mjs`.
13a. **The blob is a rounded square** (register 860), as it always was: `sheet.squircle`. Gate:
    `tests/look.smoke.mjs`.
13b. **A wall wears the same line on every open side** (register 861), rivets in the corners an open side
    reaches, and a line where it meets open floor outside the room (the menu). Same gate.
13c. **A beam is flat**: a band, a core that comes and goes, the dark-tinted line, no glow; it stops at the
    line of what it hits (register 862). Same gate.

## Colour

14. **A sprite is drawn in palette colours with tones**: the palette repaints the colour, the tone (a shade,
    a shine, the line) is worked out from the painted colour and no palette changes it.
15. **Nine palettes; Crayon is the free default**, the sketch's colours: cream paper, periwinkle walls, a
    brown line and brown words. A piece stands off a wall by its colour or by its line (`tests/palettes.test.mjs`).
16. **A colour that means a rule is reserved for it** and carries a mark besides.

## Type and words

17. **One face, Departure Mono, mixed case, at whole multiples of its 11 px grid** (register 853).
18. **The lab speaks everywhere; the blob only in its album**, cutesy and sometimes resentful (register 844).

## Motion

19. **The room holds still while the player thinks**; the interface may move, in whole pixels.
19a. **A thing that shines winks**: a berry, a spike, a raised button and a lit switch get a small glint
    that crosses them now and then, never two at once (`glintAt`). It is the only idle in the room besides
    the line and the blob's blink; off with the wobble and under reduced motion.
20. **A crush is the loud moment**: hit-stop, a short shake on its axis, a mark that stays until the player
    leaves the level. Shake has a setting (off, reduced, full; full by default) and a still cue under reduced
    motion.

## The lab's things

21. **A sheet of paper has one frame**: a line 2 px wide in a dark tint of the paper and a lighter edge 2 px
    inside it, square corners (`style.css`, "The lab's things"). The goals card, the win card and an album
    page all wear it.
22. **A level's goals are a clipboard**: a ruled sheet under a clip; the win card is its last page.
23. **Achievements are the blob's album**: an earned one is a photo taped to its page with the blob's caption
    under it (`src/app/voice.js`); one not earned is an empty slot with corner marks. A photo is a small drawn
    scene made of the room's own sprites (`src/app/albumScenes.js`).
24. **Looks is the back room**: palettes and skins stand on shelves.
25. **Each death has its own sound** (`src/app/sound.js`): a splat, a pop, a sizzle or the plain fall.
26. **A draft line is listed before it is kept**: `docs/THEME_COPY.md` holds every line the theme added, live
    or proposed, for the owner to mark.
27. **Every page is a sheet** with the same frame, and a popup is a note stuck over it.
