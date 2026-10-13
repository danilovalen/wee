# Probe: two rooms designed with the tool (2026-10-12)

Asked: *"Design two levels from scratch, using the tool, and add them to the roster. One basic,
one advanced. Use the generator to help you during your design. Plan beforehand. Test."*

## Plan (written before building)

**Method, per room:** one idea per room, and a catch: the obvious first move is wrong
(PUZZLE_DESIGN_STUDY.md, Blow and Traynor). The generator proposes rooms to a recipe; I read the
candidates for the one whose answer already carries the idea, then hand-edit it in the editor's own
terms (tiles and pieces) to strip noise. Every edit is checked by the same tools a designer has:
Check (the solver: par and the answer), the design notes (every piece and tile must change the
answer), lint, and the mechanism tags (contains vs uses).

**Room 1, basic: "Brake".** Teaches the two first rules: you slide until something stops you, and
a box you meet is pushed, so a box is both an obstacle and a brake. Recipe: Box Must, Door and
button Allowed, no powers, 7x7, 3 to 7 moves. Done when: solvable, par 3-7, no idle element, uses
`use:push` (and `use:door-opens` if it has a door), and the first move toward the goal fails.

**Room 2, advanced: "Short fuse".** The new bomb and breakable block. Idea: a push lights the bomb
and you then have two moves; the goal sits behind breakable blocks, so the bomb must be delivered
next to them and you must be out of its 3x3 when your second move ends. Catch: the push that
reaches the wall leaves you inside the blast. Recipe: Bomb Must, Breakable block Must, 9x9 or so,
6 to 16 moves; Dive off, so the bomb is the only way through. Done when: solvable, par in range, no
idle element, uses `use:blast` and `use:break`, and the obvious push sequence kills you.

**Tests:** both rooms go in `rooms/*.wee` (the roster), and a gate checks each one: par, the tags
its answer must use, no idle elements, and lint clean. Then the room is played through the real
page from the Library, to the win screen.

## What was built

**Overshoot** (basic, 7x7, par 5: right, up, right, down, left). The goal is the tile straight
above the start, and going for it slides you past it. The box sits in the one lane that stops on
the goal (the row the goal is in, against the left wall), so the answer is to shove the box out of
that lane and come back along it. Taken from generator seed 1 of the recipe (Box Must, Door and
button Allowed, 7x7, 3 to 7 moves) unchanged: it already carried the idea, and the design notes
flagged nothing. 8 candidates read; seeds 2, 4 and 8 were 3-move pushes with no catch.

**Short fuse** (advanced, 8x8, par 12: down, right, up, right, up, right, down, up, up, down,
left, down). The goal sits in a pocket under a breakable block. Six moves of ice steering put you
above the bomb; pushing it down into the corner beside the block lights it and leaves you inside
its 3x3; you get clear (up), then spend a move pressing up against the wall; it goes off, breaking
the block, and three moves take you into the goal. The catch: coming straight back down after
getting clear stops you beside the bomb as it goes off. Made in two steps: the generator's bomb
rooms (40 seeds, Bomb and Breakable block Must) showed the push-escape-wait shape, but every
answer ended in a long walk; so I drew the frame by hand (the goal pocket under the block) and had
the solver search it for the bomb and up to two rocks, keeping only rooms whose answer sets the
bomb off and breaks the block and that the design notes do not flag (354 candidates, 6 read).

Both are in `rooms/` and the New room page. Gates: `roster` (par, the mechanisms each answer
uses, no idle element, no lint, no power on, each catch, and every template with a goal solves)
and `roster-play` (each room picked from New room and played on the keyboard to the win screen).

## Findings about the tool

1. **Bug, fixed: a template you only opened asked about unsaved changes.** Open a template,
   change nothing, open another: *"This room has changes that are not saved. Leave them?"*. A
   template opened with no save stamp always counted as changed. It is clean now until edited;
   an edited one still asks. Found because the play-through gate opened a second template and the
   page silently stayed on the first.
2. **The generator cannot make a breakable block without Dive.** The ingredient brings Dive with
   it and Allowed cannot be refused, so every generated room had Dive on; Short fuse turns it off
   by hand. A per-ingredient Off for brought-along ingredients would fix it.
3. **The generator's fits can end in a long dull walk.** Several bomb rooms spent half their
   answer walking around after the last thing happened (seed 10: 6 of 10 moves). The judge scores
   par, not what the moves do. A score for moves after the last event would push it away from them.
4. **The most productive move was "keep my walls, place the pieces".** Drawing the frame and
   letting the solver fill it found the room in one run; neither the generator (all random) nor
   hand placement (three unsolvable tries) did. Worth a generator option: build inside the room on
   screen instead of a fresh one.
5. **Pressing against a wall is a move.** It counts on the move counter and burns a fuse, which
   Short fuse uses as a "wait". It is consistent, but nothing in the game says so; a player may
   not think of it. Worth a decision: keep it as a mechanic (and show it), or not count it.
6. Sample has no goal, so "every template solves" had to become "every template with a goal".

## Follow-ups (his answers, 2026-10-13)

He took all four. On finding 5: *"it is not a move. That's why you have to unlock one of the stall
mechanisms."* A press that goes nowhere no longer counts as a move or burns a fuse (sticking to
something you meet still counts, since it does something). **Short fuse was redesigned** for it:
the old wait (pressing into a wall) became a two-move slide away and back, which made the catch
soft. The frame search ran again with Cycle on, keeping only rooms that cannot be solved without
it: now 8x8, par 11 (down, right, up, right, up, left, down, right, up, hide, down). Push the bomb
into the corner by the breakable block, get clear, hide for the move its fuse needs, then slide
straight down into the goal. Coming straight back down instead stops you at the unbroken block,
beside the bomb.

On finding 1, a brought-along ingredient can now be set Off (register 130). On finding 2, a fit
that ends in a walk of more than 2 dull moves is held while the search looks on for 150 tries
(register 131). On finding 3 he asked whether it would be a "complete this", and chose to keep
everything placed: the Generator's **Complete this room** box starts from the room on screen and
never touches a tile, piece, start or goal in it (register 132).
