# Show, don't tell: the plan (registers 531-536)

2026-10-31. Sources: `docs/PUZZLE_UI_BENCHMARK.md`, `docs/show-dont-tell-sketch.html`, `docs/icon-sketch.html`.
Rules that bind every slice: nothing folds open or shut (524); English only (529); no emoji as icons (535).
Each slice ships on its own, with tests, a build, and a phone check before the next starts.

| # | Slice | What changes | Words on a level screen after | Size |
|---|---|---|---|---|
| 1 | Icons | Drawn line icons replace the 28 words and symbols in `docs/icon-sketch.html`; 10 stay words. | 39 to about 33 | small |
| 2 | Calmer header, one bottom row | Top bar: logo, Levels, level number, Run, Test. Undo, redo, Reset move down; tools and pieces share one row; the "LOOK" label goes. | about 30 | small |
| 3 | Side-goal stars | The optional goals list becomes a row of star slots, each with its picture; they light during a Run as each goal is met. | about 18 | medium |
| 4 | Required goals on the grid | Move dots under the grid that fill as the robot moves; a lock on each door that must end closed; a mark for "through an open door". The goals card is gone; the grid grows (200 to about 290px at 12x12). | about 3 | large: one drawing per kind of goal (about 30 kinds across 22 levels) |
| 5 | Failures shown | The Run message sentence goes: the part that failed is marked on the grid (reachable tiles tinted, the unreachable star dimmed, an open door pulsing, empty move dots pulsing). | about 3, also after a Run | medium |
| 6 | Tutorial follows | The bubbles point at the new marks instead of explaining them; fewer bubbles. | | small |

Still open, his to answer:
1. Where a goal's full sentence lives once the card is gone: on the level list card, or a long-press label on its icon.
2. The resize arrows: keep all eight, or show them only while a resize tool is picked (may break rule 524).
3. Whether Reset becomes an icon (the sketch draws one) or stays a word.
