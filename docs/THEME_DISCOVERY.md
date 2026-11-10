# Theme discovery: cute and cynical, a lab with a blob in it (register 841)

Owner, 2026-11-10: *"I'm aiming for 'cuteness' and 'cynicism' at the same time ... Blob is a cute thing that
splashes when slammed by a spring against a wall. And the spring is fast and shakes the screen ...
Graphically, I'm thinking about binding of Isaac, and yoshi island: bright and colorful tones, dark double
borders (2px), a bit scribble like, organic, moves a bit animated. UI should be very cohesive. But the game
is still going in a lab where blob is your experiment."* Clipboard objectives, a diary for achievements,
lab backdoors for Customize. **Discovery only: nothing here is decided or built.**

Sourcing: the reference research could not open pages in full (several hosts are blocked from this
session), so it rests on search summaries **[S]** and recall **[M]**; inferences are marked **[I]**. No
colour was sampled and no shake number is a documented figure.

## Part A: the game today

Screens captured at 390x844 in `docs/shots/theme-now/`.

| area | today | gap to the brief |
|---|---|---|
| **Outline** | Sprites have a 1-cell (2 px) dark edge on some pieces; panels have a 2 px frame with stair corners; `MANGA_THEME.md` rule 1 is "no strokes" | A double border is a new rule and reverses rule 1 |
| **Colour** | Twenty slots by job (`look.js`): eight greys, six colours each with a shade. Default **Daylight** is pale grey-blue with dark text. Nine palettes are bought with stars and recolour room and page together | "Bright and colourful" has to be a palette in this system, or the system has to change. Every palette must still work |
| **Shape** | Square corners, straight edges, symmetric sprites drawn as pixel runs in code (`pieceSprites.js`, `skinSprites.js`) | "Scribble, organic" means lumpy and asymmetric: every sprite redrawn |
| **Idle motion** | Boil exists (register 647): sprites cycle near-identical frames, off in Looks and under reduced motion. Snow behind the shell. The UI itself never moves | Chrome does not boil; the blob has no blink, look or flinch |
| **Impact** | Squash on stop, dust, 1-frame white hit flash, a 3 px, 180 ms shake on crash, break and blast only. Death is a ring, 300 ms. Sound is synthesized bleeps | No splat, nothing stays behind, no hit-stop, a spring has no shake, no shake setting |
| **Type** | One face, Departure Mono, everywhere | No hand-drawn voice; a second face is a new rule |
| **Voice** | Plain instructions, one sentence per string, condition first (gated) | No institutional voice, no character voice |
| **Screens** | Menu (a real room), level list, level with a goal card (icons in a gold frame), win card, Achievements (grey rows, 19 entries, pixel icons), Looks (palette grid and skin pairs), Who's playing, Sandbox | None is an object from the lab. The goal card is the clipboard's place; Achievements is the diary's; Looks is the back room's |
| **Rules already bound** | Buttons never move the layout (registers 222, 235); everything animates inside its own box in whole art pixels; reduced motion stops it all | A screen shake breaks "the screen stays still" on purpose: it needs to be the one named exception |

Two structural facts:

1. **Sprites are code, not image files.** A new look is a redraw of roughly 60 sprites by hand in pixel runs,
   each also needing its alternate skin to still read. This is the largest single cost.
2. **Palettes are a product feature** (spendable stars, nine of them). The theme must say what happens to
   them: keep all, re-author all, or keep the system and make the new look the default.

## Part B: the references

**Super Meat Boy.** Thick black outline, flat fill, a hero that is a square with eyes [M]. Death and
respawn are near instant by design [S]. Blood stays on the level across retries, and the win replay runs
every failed attempt at once, so dying becomes the reward [S, M]. A critic's caveat: instant restart leaves no
time to see the mistake [S], which matters more in a puzzle.

**Mewgenics.** Cute and grotesque at once, expressive faces on bodies bad things happen to [S]. Its crude
humour is what reviewers call dated [S]: the cautionary end of the set.

**Tomorrow Corporation.** "Draw like you're in 4th grade and put big eyes on it" [S]. Wobbly black brush
line, big white eyes, one warm palette per scene [M]. The interface is the fiction: a mail-order catalogue,
letters, a boss handing out jobs [M]. The voice is cheerful and corporate while things get worse [S].

**Binding of Isaac.** Flash original: chunky and thickly outlined; Rebirth moved to 16-bit pixel art and
dropped the thick line, which part of the audience disliked [S]. Rooms are muted; saturated colour is kept
for what matters; the hero is near white with a black line, the highest contrast on screen [M]. Menus are
crayon on creased paper, the pause screen a child's drawing [M]. The horror is in the framing, not the
anatomy [I].

**Yoshi's Island.** Drawn by hand, scanned, rebuilt pixel by pixel [S]. It reads as scribble because the
line varies and breaks, is a **dark tint of the fill and not black**, fills are flat pastel with one shade
step, backgrounds show crayon hatching with paper through it, and shapes are lumpy [M, I].

**Nubby's Number Factory.** 1990s shareware look on purpose; the cynicism is the factory framing: a cheerful
product being processed [S, I].

**Juice.** Nijman's "Art of Screenshake": hit pause, permanence (debris that stays), bigger effects [S].
Jonasson and Purho's "Juice it or lose it": squash, wobble, particles, sound per event, and eyes on things
[M]. Neither publishes numbers; starting points for a spring slam [I]: hit-stop 60 to 100 ms, shake 2 to 3
art pixels along the impact axis only, decaying over 150 to 250 ms, squash to about 60% for 2 frames, hold the
splat 300 to 500 ms so the cause reads, then reset fast.

**Boil.** A new drawing every few frames, 3 drawings, 6 to 8 a second, stepped and never tweened, each
element out of sync [S]. SVG turbulence filters smear below the pixel grid, so they suit panel edges, not
sprites or the board [I].

**Accessibility.** Camera shake is a named motion-sickness trigger; guidance is an off switch or a slider
[S]. Reduced motion should freeze boil and swap shake for a cue that does not move (a flash, a harder
squash), not remove the feedback [I].

**Diegetic screens.** A list works as an object when it has a fixed home, is ticked in the game's own pen,
and keeps the institution's voice (Papers Please, Portal's chamber signs) [M]. A diary works when empty
slots show and the caption has a point of view (Obra Dinn, Night in the Woods) [M]. Warning: journal text
is hard to read at phone size; one team moved to icons [S].

**Voice.** Portal [S]: *"Cake, and grief counseling, will be available at the conclusion of the test."*
Devices [I]: the institution as subject, euphemism for harm, a benefit and a horror in one flat breath, a
tone that never changes, and the cute one never complains.

## Part C: what this means for wee

Ranked by how much each decides.

1. **The outline rule is the cohesion device.** One rule on sprites, panels and buttons alike: a 2 px
   near-black outer line and a 2 px dark tint of the fill inside it. It gives the double border the brief
   asks for, Isaac's weight and Yoshi's Island's warmth.
2. **Three value bands, checked in grey.** Light low-contrast room, mid saturated pieces, darkest line. If
   everything is saturated nothing is foreground, and the room is a puzzle someone has to read.
3. **Colours that mean a rule stay reserved.** Button, door and switch colours are game state; decoration
   may not use them.
4. **Boil the chrome, not the board.** A wobbling grid makes cells ambiguous. The board holds still while
   the player thinks; panels, the clipboard edge and tape may move.
5. **The spring slam is the signature.** Hit-stop, a short shake on its axis, a splat in the blob's own
   colour that stays on the wall across retries. Kept rare so it stays loud.
6. **The blob needs a face that lives.** Blink, look, flinch before a spring. The cuteness is what gives the
   cruelty its bite.
7. **One voice for the lab, one for the blob.** The lab is polite and flat whatever happened. The blob is
   the only sincere one (its diary).
8. **Every screen or none.** A clipboard beside a stock dialog breaks it: Who's playing, reset, the dev
   lock and the sound switch need a lab form too.
9. **Motion controls ship with it.** Shake off, reduced or full; reduced motion freezes boil.
10. **Two faces at most.** A scrawl for headings and captions; the pixel face for anything small or counted.

## Risks

- **Edgy instead of charming.** Keep cruelty physical and slapstick, the voice polite. No gross-out.
- **Showing it to children.** The splat is goo in the blob's colour, no anatomy, eyes still blinking.
- **Copy rules collide.** The house rule is condition first, one sentence, no retro-explaining. A deadpan lab
  voice has to live inside that, or the rule gets a named exception for flavour lines.
- **The Godot move.** Sprites and UI authored now as code may be thrown away. What survives a port: the
  rules (outline, bands, voice, motion numbers) and the copy. What may not: the CSS and the pixel runs.
- **Cost.** About 60 sprites plus skins, every dialog, a second face, new effects. Staged, not one pass.

## Decisions needed before a plan (asked one at a time)

1. Palettes: is the new look the default palette with the other eight kept, or do all nine get re-authored?
2. How far the splat goes: stays on the wall for the level, for the session, or only until reset.
3. Whose voice the screens speak in: the lab's, the blob's, or each on its own screens.
4. Whether to sketch three looks side by side before any build (the usual route here).
5. Whether this lands before or after the Godot move.
