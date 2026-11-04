# The editor, measured against our references: diagnosis (2026-11-04)

Owner: *"do another ui ux diagnosis according to our references. Some things feel off yet. The
feedback above is a sample of that."* The sample is registers 718-728.

Diagnosis only, nothing changed. References: `docs/UI_PASS.md` (the twelve patterns of §3),
`docs/PUZZLE_UI_BENCHMARK.md`, `docs/SHOW_DONT_TELL_PLAN.md`, `docs/MANGA_THEME.md` (by way of
UI_PASS §5a), the copy rules in `CLAUDE.md`. Measured on the simple Sandbox (the default) with
Puzzle 1 loaded, at 1600x760 and on a 393x852 phone. Shots: `docs/feedback/2026-11-04-ux-*.png`.

## The short version

The play screens went through UI_PASS and Show, don't tell. The editor's newer parts never did:
since UI_PASS closed on 2026-10-11 (register 94), the register has run past 700, and many of those rows added something to the editor one at a
time (Check notes, metrics, offers, lenses, Best spot, the options panel), and each picked its
own spot. Every finding below comes from one of four causes:

1. **No single place for an answer.** Four regions talk, and an answer lands wherever its feature
   happened to put it.
2. **Findings is a dump, not a tool.** About a dozen lines of equal weight, all words. The parts you can
   act on come last, and the panel covers the room it talks about.
3. **What helps you build is buried; what explains is always on.** The lens you use most is four
   steps away. A paragraph about clicking sits on screen at all times.
4. **State is not tied to the room.** An offer outlives its room (726). A lens line vanishes while
   it recomputes (720). An answer is never cleared when the room changes.

## Findings, by reference

### A. Four voices (UI_PASS §3.3 "status is one line", §3.5 "detail on hover")

| Where | What it says | Problem |
|---|---|---|
| Bar under the header | "Click to place, click one again or right click to remove it, and Look changes nothing." always; Best spot's answers; "To keep your unsaved changes..." | A permanent paragraph that tells, not shows. Answers to a button land here, far from the button (724). |
| Status line (bottom) | "Solvable in 19 moves." · Show solution · "Findings 5" · "E plays this room and ? lists every key." | "Findings 5" counts something unnamed. Show solution and the Solution lens are two ways to the same thing. |
| Findings well | about a dozen note lines, then offers | See B. |
| Phone tools panel | "ONE-WAY (TAP ONE TO TURN IT, HOLD TO REMOVE IT)" in capitals | An instruction where an option should be. |

UI_PASS planned exactly two text places: the context bar for the tool, the status line for the
room. Both exist, but neither holds to that. The context bar became a general message board, and
results still land in whichever region their feature chose.

### B. Findings (benchmark: "metrics after the solve only"; Show, don't tell; rule 524)

- **All words, one weight.** "Places: the blob can reach 37.", "Forced steps: 32% of the shortest
  path has one safe move." A dozen numbers spelled out as sentences, in the same size and colour,
  so nothing tells you which ones matter. Opus Magnum shows a few numbers as numbers.
- **Actions last.** "Without these walls, nothing changes", Trim and Remove one are what you can
  act on. They come after eleven measurement lines, below the fold on both screens. Trim and Remove
  one arrive last because they are computed last (718).
- **It covers the room.** The well floats over the room's foot (689, so that nothing moves): about
  a third of the room at 1600x760, more than half on the phone. The red frames it points at are
  under it.
- **It folds.** "▼ Design notes" is a disclosure, against 524 (nothing folds open or shut).
- **The words drift.** "can no longer reach the goal" beside "the berry is still in reach".
  "Ruin: no move can lose the run." breaks 700: it makes "no move" the subject that acts. Offers
  wrap one word per line beside a full-width Apply (719).

### C. Lenses (UI_PASS §3.4, §3.6; registers 720-722, 725)

- To see the solution path in the simple Sandbox: Findings, Lenses tab, "Show lenses", Lines:
  Solution. Four steps for the lens used most. The lens chips UI_PASS put on the room's edge are
  hidden in the simple Sandbox.
- Rows of exclusive choices, cycled by keys: the owner asked for plain on/off icons (721).
- The move numbers on the solution line cannot be read (725). The line drops while it
  recomputes, and drops for good when an edit blocks it (720, 722).

### D. Tool options (UI_PASS §3.2; tldraw's floating toolbar; registers 697, 723, 724, 728)

- The panel beside the slot is right (697). Inside it: three unlabelled colour dots (the third, a
  dark grey, does not read as "no colour"), Pushable, then "Best spot" alone on a second row. Its
  answer goes to the top bar.
- On the phone the panel is a fixed 256px. In the one-way's case that is a caps instruction, the
  colours pushed right, Best spot pushed left, and about 200px of nothing above the tool strip.
- Best spot claims "best" (723), never tries a direction (728), and with the blob reads as doing
  nothing (724).

### E. Marks with no key (UI_PASS §3.7 "danger drawn on the tile", §3.5)

After Check, dashed red frames appear on walls. Nothing on screen says what they are: "these walls
do nothing" is in the eleventh line of a list under the well. Tapping a frame does nothing.
Into the Breach and the Sokoban lab explain a mark where the mark is.

### F. Header and space

- **Play** is a d-pad icon. In the wide header it sits third, between the room name and Undo;
  on the phone it is the accent button at the far right. The benchmark's one Go button carries the
  run's meaning; a d-pad reads as "move", not "play".
- **Check** greys out once it has run, with no word saying the room is checked.
- **Wide**: the room takes 620 of 1600px; about 870px either side holds only the strip and the
  starfield, while Findings is stacked over the room instead of beside it.
- **Phone**: about 110px of empty space above the room, while the tools panel below is crowded.

### G. Behaviour that breaks trust (registers 719, 726)

Apply acts on a room the offer was not found in, and a stale note keeps a live Apply. In a tool
for making rooms, this is the first thing to fix.

## Proposals, ranked by how much of the "off" feeling each removes

1. **One answer place per scope** (A, D): a tool's answer shows in its panel, under its button,
   with Apply and Cancel there. The room's answer shows in the status line. The bar under the header
   holds only the current tool's short hint, and only when the tool has one. The default paragraph
   goes; the keys stay behind `?`.
2. **Findings beside the room, not over it, on a wide screen** (B, F): a right column in the empty
   space. The room never loses height to it, and nothing moves, because the column is always there
   (empty until Check). Phones keep the sheet.
3. **Findings rebuilt as a tool** (B, E): actions first (Trim, Remove one, idle walls, each with
   Apply). Then the measures as a compact grid of big numbers with short labels (Moves 19 · Routes 2
   · Places 37 · Undos 4 · Reuse 11/4 · Traps 0), each one tappable to light the lens that shows it.
   No fold; one word for the berry; no "no X" subjects.
4. **Lens icons, on/off, always on screen** (C, 721), with Show solution folded into the Solution
   icon. Numbers that read (725), lines that stay while they update (720, 722).
5. **Every mark on the room explains itself on hover or tap** (E): one line in the status line
   ("This wall changes nothing: take it out or move it"). This is UI_PASS's Info line, which was
   proposed (§4.5) and never built for the notes' marks.
6. **Phone layout pass** (D, F): the room takes the empty space above it, the tools panel shrinks
   to what the tool has, options sit in one row, and no caps instructions.
7. **Header**: Play as a play icon (triangle). Check says "Checked" when it greys. Name stays.
8. **Trust first** (G): 726, then 719, before any of the above.

Suggested order: 8, then 1 and 3 together (they touch the same lines), then 2, 4, 5, 6, 7.
Rows 718-729 fold into these.

## Questions for the owner (to ask one at a time)

1. ~~On a wide screen, Findings in a right column, or a sheet that shrinks the room?~~ **Owner
   (2026-11-04): right column.**
2. ~~Which measures he reads~~ **Owner (2026-11-04): moves, routes, traps (positions that can no
   longer win) and reuse.** Those four show as big numbers; flow undos, wrong turns, ruin, choices,
   forced steps, places and ways to win sit behind one tap.
3. ~~Where the lens icons sit~~ **Owner (2026-11-04): a row along the room's top edge**, the same
   row over the room on a phone. **Changed (2026-11-04, register 749): in the header.**
