# Moving wee to Godot: the diagnosis

2026-10-25, register 464. Written against `452175d`. The page he reads is
`docs/MIGRATION_BIBLE.html`; this file keeps the reasons and the measurements. A new decision goes
into both.

## The answer in one line

**Godot 4 fits wee better than it fitted the chip game, and the expensive half of that migration is
already done here. Port when the rules stop moving, not now; the one real risk is the solver's speed,
and it is measured in the first week, not guessed.**

## Decided

- **Every platform** (2026-10-25): phone apps, PC with Steam and Deck, console through a porting
  house, web build. Touch, mouse, keyboard and controller are all first-class from the first build;
  GDScript, not C#, since C# loses the web export and complicates the console route.
- **The look is open** (2026-10-25: "might be pixel, SVG, voxel"; the UI grows from the current
  one). So the board is one skin reading the state, swappable between 2D and 3D (voxel means Godot
  3D nodes); no rule, input or menu may depend on how a piece is drawn. The slice uses a stand-in.

## How the chip game's migration was planned (bag-crawler, 2026-09-24 to 10-01)

Read from `bag-crawler/docs/ENGINE_DIAGNOSIS.md` and `docs/MIGRATION_BIBLE.html`.

1. **It measured before it chose.** Lines per part, DOM references in the rules half (23 in 5,480),
   the 66 `render()` calls the rules made, 8 `setTimeout`, one unseeded `Math.random`.
2. **Its first answer was "no engine"**, and it named what would change it: controller, console,
   audio. He answered "I'll need audio, controller, console, and I'll want to learn a proper engine",
   so Godot moved to first in an addendum. The conditional was written down before he answered it.
3. **The split came first, as the port's test harness**: one DOM-free rules module, the web build
   kept playable, then the GDScript port run beside it on the same seed and the same actions, and the
   two states diffed. The 21 model-only gates became the diff's assertions.
4. **A vertical slice to learn on**, a week not a quarter: one chip, one socket, one tween, controller
   reachable, one sound.
5. **Decisions bound early because they are cheap early**: controller-first (a navigation model, not
   an input device), landscape frozen, base resolution (1280x720, then 640x360 pixel art), GDScript
   over C# (web export, console route, learning), multiplayer enabled but not built.
6. **Feature picks became hooks.** He marked each feature want, maybe or no; neither word scheduled
   anything, both bound the architecture. Each hook named what it pays for (plain-data state, seed plus
   intent log, catalog modifiers, a profile file, conditions over events, named input actions, text
   from tables).
7. **Two documents**: a bible he reads, a diagnosis that keeps the reasons.

What worked and carries over: measure first, split first, differential test, slice, hooks from picks.
What does not carry over: the "text-dense UI, HTML is best at it" argument. wee draws a grid on a
canvas; that is what a game engine is best at.

## What is here

| part | lines | files | what it is |
|---|---|---|---|
| `src/rules` | 1,073 | 11 | every rule: grid, player, crates and tiles, beams, life, wires |
| `src/solve` | 508 | 5 | the breadth-first solver, lenses, lint |
| `src/campaign` + `goals/` | 385 + 766 | 5 + 7 | Run's judge: placement, robot paths, every goal |
| `src/level` | 285 | 6 | level format, room codes, campaign data |
| `src/gen` | 354 | 4 | the room generator (seeded) |
| `src/editor` | 331 | 4 | edit operations and history |
| `src/view` | 957 | 8 | the canvas renderer |
| `src/app` | 3,444 | 44 | screens, input, camera, menus, saves |
| `campaign/levels/*.json` | | 25 | the levels |
| `rooms/*.wee` | | 7 | sample rooms |
| `tests` | 6,117 | 43 | 22 Node gates, 21 browser gates |
| `tools` | | 27 | search, measuring, climbing, mutation, build |

### The split is already done

**Zero DOM, clock or `localStorage` references in `src/rules`, `src/solve`, `src/campaign`,
`src/level`, `src/gen` or `src/editor`.** The three `Math.random` calls are all in `src/app` (a room
id, a new generator seed, the snow). `CLAUDE.md` has held this rule since the start: "every rule is
pure: no DOM, no clock, no randomness". `gameText()` is already the one reading of the game that the
gates assert on.

So the chip game's step 3 (one sitting to cut 66 `render()` calls) costs nothing here. **About 3,700
lines are the port; 4,400 are the rebuild.**

## Ports, survives, rebuilt

| part | what happens |
|---|---|
| `campaign/levels/*.json`, room codes, progress codes | **survive**: `JSON.parse_string()`; the code format is a port of `code.js` |
| rules, solver, campaign, goals, level, gen, editor (~3,700 lines) | **ported** to GDScript, mechanical |
| the 22 Node gates | **survive as the conformance suite** of the differential test |
| `tools/` (search, measure, climb, mutate, legend) | **survive as Node tools**: they are authoring tools, like the chip game's catalog validator, and they keep using the JS rules |
| renderer (957) | **rebuilt**: a `TileMapLayer` for the floor, a node per piece, beams as `Line2D` |
| `src/app` (3,444) | **rebuilt** as scenes: menus, level list, goal card, editor palette, camera |
| 21 browser gates | **die**; the ones about what is painted come back as Godot scene tests |

## The one real risk: the solver at play time

Run is not a replay of a stored answer. Pressing Run searches the room breadth first (up to 20,000
states, up to 2,000 shortest paths), replays each path tick by tick and judges every goal. In Node,
Run's checks over every known room took **797 ms** in total (review step 3). V8 compiles that loop;
GDScript interprets it, and dictionary-heavy search code in GDScript is commonly an order of
magnitude slower. A Run that answers in 40 ms today could answer in half a second.

Three routes, cheapest first. **Which one is a measurement, not a choice:**

1. **Typed GDScript** (`var s: Dictionary`, typed arrays, packed state keys). Often enough.
2. **The state key as a `PackedByteArray`** instead of a string, so the visited set hashes bytes.
3. **GDExtension (C++) for `solve` only**, the rules staying GDScript. Costs a build per platform.

The first week's slice ports `stateKey`, `successors` and `move` and times the worst known room.

## Porting traps, counted

| JS idiom | count in the ported half | in GDScript |
|---|---|---|
| generators (`function*`, `yield`) | 14 / 27 | **none exist**. The solver and robot stream results through them; rewrite as an explicit queue the caller drains, or return arrays |
| `new Set` / `new Map` | 48 / 18 | `Dictionary` with `true` values; order is kept, as in JS |
| `WeakMap` (the per-room replay cache) | 4 | a `Dictionary` keyed by the room's id, cleared when the room changes |
| spread `...` | 133 | `duplicate()`, `append_array`, `merge`; no one-to-one form |
| `structuredClone` | 5 | `duplicate(true)` |
| `JSON.stringify` as a key | 12 | `var_to_str` or a packed key; never rely on dictionary order for equality |

## The route

1. **Freeze a rule set.** wee's rules changed on 2026-10-25 alone (pushable tiles became pieces, one
   push for every row). Porting a moving target doubles every rule change. The port starts from a
   tagged commit.
2. **Record traces from JS**: for each known room and level, every tick's `gameText()` and `stateKey`
   along each robot path, written as JSON fixtures. This is the differential test's ground truth, and
   it is one Node script.
3. **The slice** (one week): the solver core timed (above), one room drawn as a `TileMapLayer`, the
   robot sliding with a `Tween`, Run's verdict on screen, playable by touch and by controller.
4. **Port the rules, then the solver, then campaign and goals**, each gated by the traces: same room,
   same moves, same text per tick.
5. **Rebuild the screens**, editor first, because building the room is the game.
6. The web build stays playable and gated the whole time. It is where levels keep being designed.

## Must be there from the first build

These are cheap on day one and expensive later.

1. **Rules as plain data**, no node references in a room or game state. Pays for saves, undo, cloud
   saves, room sharing, replays.
2. **One room format**, the same JSON and room code as the web, so a room built on a phone opens in
   the Godot build and the Node tools.
3. **Run judged by the same rules as the tools**, gated by the traces. A level measured by
   `measureLevel` must give the same verdict in the game.
4. **Every input through a named action** (`move_up`, `place`, `undo`, `run`), touch, mouse, keyboard
   and controller alike. Pays for remapping and controller.
5. **The editor is a first-class scene**, not a debug tool: palette, place, remove, resize, undo.
6. **No sentence built in the rules**: goal text from tables. Pays for translations (pt-BR exists).
7. **Every animation has a duration scaled by one setting.** Pays for speed, skip and reduced motion.
8. **Progress in a profile file apart from the room**, with the existing progress-code import.
9. **Colour never the only signal** (red and blue doors, coloured one-ways already carry it).

## Features it could have

Grouped; he marks each want, maybe or no, as in the chip game.

- **Play**: more campaign worlds; daily room; par and star scores per level (side goals already
  exist); a hint that plays one robot move; undo history in Run.
- **Build and share**: share a room by code or link (exists as codes); a room browser; community
  levels with a verified "it wins" badge (the solver already proves it); Steam Workshop.
- **Platform**: Android and iOS apps; Steam with Deck; Switch through a porting house; cloud saves;
  achievements bound to unlocks.
- **Feel**: sound per piece (none today), music, particles on spikes and beams, haptics on phone.
- **Access**: controller, remapping, colour-blind marks, reduced motion, text size, translations.
- **Tools inside the game**: the robot's paths drawn on demand, "why is it stuck" (exists as
  `whyStuck`), the sandbox's lenses.

## What would change this answer

- If the solver measures too slow in typed GDScript and GDExtension is unwanted, the web build with a
  native wrapper (Capacitor, Tauri) becomes the route, and Godot waits.
- If phone-in-browser stays the main way he plays and shares, a Godot web build (WASM plus the
  engine, several MB) is heavier than today's one-file `dist/wee.html`.
- If wee and the chip game share a studio toolkit (menus, saves, input map, audio buses), porting both
  to one engine pays twice.
