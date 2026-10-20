# Open questions (2026-10-20)

Collected while going through `docs/PLAN.md` without stopping. Each has a default I used; change it and I redo that part.

1. **Goal sentences (row 292).** Goals read as end states ("A laser goes through an open door."), not orders ("Get a laser through an open door."). I kept the states: the card lists conditions to meet, and the row's icon line already reads as a target. Orders instead?
2. **Resize buttons (row 298).** A pair on the left and right of the room would sit in the phone's back-swipe zone (row 239) or force wider margins, which shrinks tiles. So all four pairs sit above and below the room: the top bar holds the left column (left end), the top row (middle) and the right column (right end); the bottom bar holds the bottom row. Each side's + sits on its outward end. Readable, or do you want a small mark on each pair?
3. **Reset (row 291).** The confirmation is a small dialog over the room, not a full page: your "menus are full pages" rule is read as covering menus, not yes-or-no questions. The button reads "Reset" in a level's header, after redo, and is greyed while playing.
4. **Progress code (row 254).** The code carries campaign progress only: wins, rooms per level, goals and stats. Sandbox rooms are not in it. Should one code carry both?
5. **Full sandbox (row 302).** Today's sandbox with every element (enemies, water, powers, lenses, Generate) is reachable only by adding `?sandbox` to the address; the menu's Sandbox is the simple one. Keep it that way?
6. **Level maker (row 302).** Made levels live in this browser only (not in the progress code), every goal is offered once its elements are in the palette, and "Levels" in a made level goes back to the maker. The button still reads "Levels" there; rename it to "Maker" in a made level?
7. **Puzzles (row 302).** A puzzle shows your moves and the fewest the robot's search finds. A puzzle has no par or size goal of its own yet. Want the campaign's optional goals there too?
