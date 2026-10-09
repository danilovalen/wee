# Edit, save, load, play: what comparable tools do (2026-10-09)

Research by a subagent for the responsiveness diagnosis. Sources it could reach were read from
GitHub raw files; puzzlescript.net, itch.io, mariowiki, ldtk.io and mapeditor.org were blocked
from the container, so those rows rest on search summaries. **UNVERIFIED** means not confirmed.

## Practices worth copying, ranked by the researcher

1. Toggle edit and play over the same room with no reload; R resets to the state at toggle time
   (PuzzleScript `E` / `R`, github.com/increpare/PuzzleScript/blob/master/src/Documentation/leveleditor.html).
2. Autosave every change locally, skip identical saves, keep a rolling list of recent versions
   (PuzzleScript keeps ~21, src/js/toolbar.js; LDtk caps at 10 per project, docs/CHANGELOG.md).
3. Back up unsaved work on crash or close; never reopen straight into the state that crashed
   (LDtk crash backups, opens on Home after a crash).
4. Play from a tapped tile, plus a full clear from the start before the room counts as done
   (Ahorn / Lönn Ctrl+Alt+click teleport, github.com/CelestialCartographers/Ahorn README;
   Mario Maker's clear check before upload, shacknews.com/article/112654).
5. A room is done only after a recorded clear; store the inputs as the proof.
6. Validate structure while editing (one player, reachable exit, keys match doors: Sokobaned,
   kaospappa.itch.io/sokobaned); a BFS solver as an optional cached check
   (github.com/dangarfield/sokoban-solver).
7. Touch: swipe starts at ~10 px, commits at ~50 px, hold repeats at ~150 ms, undo and restart
   one tap away, inputs buffered so a fast swipe mid-slide is not dropped (PuzzleScript src/js/mobile.js).
8. History by date and title, plus one-tap export to a text or URL backup, because browser
   storage gets wiped (Bitsy users recover from localStorage by hand; PuzzleScript shares gists).

## Other notes

- PuzzleScript: Ctrl+Enter rebuilds without restarting the game; input buffer on rAF;
  `again_interval` 0.1 s; `throttle_movement` keeps spam from speeding you up.
- Tiled: safe writing (temp file then swap); Ctrl+P fuzzy "open file in project".
- LDtk: recent projects home screen, Ctrl+F across the project, tags as folders.
- Baba Is You: confirms after you beat a level you are about to upload; level codes avoid 5/S/0/O.
- Parabox: no in-game editor; a slow loop through Unity and a folder.

# How MANGA Engine measures responsiveness (2026-10-09)

Survey of /home/user/MANGA-Engine by a subagent. The lesson that transfers best:
**headless frame time is the wrong instrument.** A stutter the owner saw on his phone read as
60 fps in headless Chrome; the cause was DOM writes that changed nothing
(`setAttribute`, `style =`, `classList.add/remove` all invalidate style even when the value is
unchanged; `classList.toggle(name, force)` does not). Gates there count mutations and use
milliseconds only as a loose tripwire.

| Technique | Where | Rule | For wee |
|---|---|---|---|
| MutationObserver on the board per move | tests/castanha-move-churn-smoke.mjs | 0 nodes added/removed, ≤60 attribute writes per hop, normalised per hop | count writes to the panels during a drag and on each tick |
| Long tasks under 4x CPU throttle (CDP `Emulation.setCPUThrottlingRate`, PerformanceObserver `longtask`) | tests/castanha-inspect-churn-smoke.mjs | worst task ≤500 ms, loose baseline | the best fit for a canvas app: main-thread blocking is the real cost |
| Per-frame sampling inside the page with rAF | tests/castanha-pawn-motion-smoke.mjs, tests/lib/motionProbe.mjs | ≥4 distinct positions per hop, compare (x, y) pairs | for animations |
| Ratio-based timing, not absolute | tests/motion-animation-speed-smoke.mjs | settings compared as ratios; `instant` ≤40 ms | timing checks |
| Loading card held until art decodes, each wait raced against a timeout | public/launcher.js (`awaitTableImages` 1200 ms, `awaitDeclaredArt` ≤4000 ms) | never strand the player behind an overlay | room load from the server |
| Headless traps | tests/lib/motionProbe.mjs | headless reports `prefers-reduced-motion: reduce`; the moving thing may be a clone; read both axes | testing |

Docs: MANGA-Engine docs/backlog/BACKLOG_PLATFORM.md § "Moving pawns stutter" (169-173 → 41-57
mutations per hop; "read what the browser already knows, write only what actually changed").
