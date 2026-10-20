# Plan: everything still open (2026-10-20)

**Status (2026-10-20):** sections 1 to 4 are built; questions from them are in `docs/QUESTIONS.md`.

From `docs/REGISTER.md`. Numbers are register rows. Nothing below is built.

## 1. Quick fixes (one slice, about an hour)
1. **300** Remove the laser's mode badge (the dot with a triangle) in the campaign.
2. **292** Copy pass on every on-screen string, starting with "The goal stays. Use Move." (dev notes, retro-explaining, condition first).
3. **286** A "no way through" card says why, e.g. "The robot starts in a laser beam."
4. **280** Gate: a palette minimum a required goal already implies fails a test.

## 2. Editing comfort (one slice)
5. **298 / 288 / 297** Resize with a + and − pair on each edge, outside the room, tap only, never over a tile; side margins shrink so tiles grow (estimate 28 → 31px on his 10×4).
6. **291** Reset-room button with a confirmation dialog; Undo brings the room back.
7. **273-275** His level 6 softlock and "Run says no way, Test finds 4": waiting on a Debug copy from him.

## 3. Progress (one slice)
8. **254** Keep progress between visits (rooms, wins, goals, stats) with a Reset progress button and a confirmation.

## 4. The four modes (several slices, the big one)
9. **302** Menu with two sections. For the robot: Campaign (today) and a Level maker (palette min and max, requirements, optional goals). For you: Puzzles (you play as the little circle, same sliding rules) and Sandbox (today's sandbox, trimmed to the seven campaign elements, the circle instead of the robot). He builds the Puzzles levels in the Sandbox. Sketch: `docs/modes-sketch.png`.

## 5. Levels
10. **Level 16** exact 7 and 5×4 are his; a smaller or shorter win would lower them.
11. **270** Level 12 has its extra goal (row 277); nothing left.

## 6. Older open rows, from before the campaign (his call whether they still matter)
- **27** a 7×12 room as a template; **58** generator linearity; **76 / 82 / 90 / 92** lens and look decisions; **106** Rooms dialog; **118** flicker diagnosis; **215 / 216 / 218** menu screen polish; **227** resize lost while editing.
