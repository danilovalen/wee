# Juice plan (register 647)

What the game already moves: the menu robot scene, ghosts behind a slide, the death ring, the win card's
star burst, goal marks landing, snow gusts, flashes on stuck tiles, a press that darkens a button.
No sound at all. Buttons never move on a tap (registers 222, 235: the screen stays still), so every
idea below moves things *inside* their own box, in whole art pixels, and stops under reduced motion.

References: SNKRX (a327ex: springs on every hit and button, white hit flash, wobbling text),
Baba Is You (every sprite boils between 3 frames, a sound and a glow when a rule forms, wobble can be
turned off), Mosa Lina (minimal pixel art, physics toys, ambient sound).

| # | idea | from | cost |
|---|---|---|---|
| 1 | **Clicky buttons**: the face drops 2 px into its own shadow while held and springs back 1 px past on release; the box never moves | SNKRX | small |
| 2 | **Placing and erasing**: a placed tile pops in (2 frames small, 1 frame big, then size); an erased one drops into 4 dust pixels | SNKRX | small |
| 3 | **Blob squash and dust**: stretches 1 px as a slide starts, squashes 2 frames as it stops, 2 dust pixels behind | Baba, platformers | small |
| 4 | **Hit flash**: a block, door or box the blob hits flashes white for one frame and knocks 1 px | SNKRX | small |
| 5 | **Sound**: short synthesized bleeps (tap, place, slide, bump, door, win, star), one volume switch in the menu | all three | medium |
| 6 | **Boil**: sprites shift between 2-3 near-identical frames a few times a second; a setting turns it off | Baba | medium |
| 7 | **Counts that tick**: stars and move dots count up one by one with a tick and a 1 px hop | SNKRX | small |
| 8 | **Page changes**: a pixel checkerboard wipe (150 ms) instead of a cut | Baba (iris), many | medium |

Order proposed: 1, 2, 3, 4 (one pass, all visual), then 5, then 6-8.
