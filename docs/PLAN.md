# Plan: everything still open (2026-10-20, second plan)

From `docs/REGISTER.md`; numbers are register rows. The first plan (sections 1 to 6 of 2026-10-20) is built; its leftover questions are in `docs/QUESTIONS.md`. Nothing below is built. Order is his list's order where it does not depend on another slice.

## 1. Goals and scoring (one slice)
1. **321** Run never refuses a room for its palette: minimums ("place at least one") stop being placement errors and stay as goal rows, which the run marks met or not.
2. **327** The size optional goal reads in area again: "W×H or smaller", measured on the room (reverses the card half of row 314).
3. **328** The level's record keeps tiles as the score: the fewest tiles in a win with no optional goal, and the fewest for each optional goal met. Shown in the level list. (Confirmed.)

## 2. Levels (one slice, after slice 1)
4. **325** Level 17: exactly 1 inverted door; requirements "laser stopped by a closed inverted door" (any time) and "robot through an inverted door". Known win: `.#... / ...#. / PBo#. / e...I / ..#.. / ....G`, exactly 7 moves. Exact count stays 7; size goal re-measured.
5. **329** Level 18 gains "every relay is lit at the end". Its known room and counts are re-measured.
6. **333 / 334** Level 19 loses "laser holds its own door" (lesson: a goal must never state the trick) and is hidden. The two-colour door stays in the game and in the Sandbox.
7. **341** A new level 19, once slice 5 exists: a pushable laser, a relay and a door (plus blocks). Requirements: the laser is pushed in 3 moves; a laser goes through an open door; the robot goes through the door.

## 3. Screen (one slice, sketch: `docs/screen-sketch.png`)
8. **331** Reset sits at the right end of the level header.
9. **332** Buttons that cannot be used in the current mode are hidden, not greyed.
10. **322** The room takes more of the screen and everything else gets tighter: smaller margins, buttons joined into one strip with square seams and one shared shadow (as in the MANGA engine's footer), the goal card's padding halved.

## 4. Relay look (small, decided)
11. **326 / 339 / 340** The relay becomes a soft eight-point star (outer radius 12, inner 10.5, rounded corners), same outline and faint core as today. Sketch: `docs/relay-sketch-3.png`, version S5c.

## 5. Pushable pieces (the big one)
12. **336-338** (sketch: `docs/pushable-sketch.png`) Laser, relay, one-way, door and inverted door get a pushable version: the box's brown border around the piece's own drawing. A "Pushable" chip at the end of the tools row places it; a level offers it per piece (like two colours). Pushed like a box; a pushable one-way only along its arrow; a pushable door or inverted door is walked through while open and pushed while closed. A pushed laser keeps its aim; pushable pieces and boxes push each other as one train, like boxes (his answers).

## 5b. Laser colour
12b. **330** The laser (turret and beam) turns an electric gold, a colour no button, door or switch uses.

## 6. Search (diagnosis first)
13. **335** Find why the room search misses wins that exist (levels 17, 18): likely the climb's partial credit gives nothing for goals that need an order of events. Fix, then re-run it on every level as a check.

## 8. Older open rows, from before the campaign (his call whether they still matter)
- **27** a 7×12 room as a template; **58** generator linearity; **76 / 82 / 90 / 92** lens and look decisions; **106** Rooms dialog; **118** flicker diagnosis; **215 / 216 / 218** menu screen polish; **227** resize lost while editing.
