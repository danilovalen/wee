# wee

A canvas sandbox for an ice-slide puzzle game: build a room, play it, toggle powers.
Plan and decisions: `docs/PLAN.md`. Playtest feedback: `docs/REGISTER.md`.

The `wee-game` branch adds a campaign on top of the sandbox: you build the room, a robot
plays every shortest path. Its design and every ruling: `docs/CAMPAIGN.md`.

## Commands

| Task | Command |
|---|---|
| Run it | `npm start`, then open http://localhost:5173 |
| All gates (node + browser) | `npm test` |
| One gate | `npm test -- --only=sim` |
| Prove the gates can go red | `node tools/mutate.mjs` |
| One-file build for phones (`dist/wee.html`) | `node tools/build-single.mjs` |
| Find rooms that win a campaign level | `node tools/levelSearch.mjs <level> [--seconds S] [--seed N] [--all] [--require a,b] [--steps best,range]` |

The browser gate uses Chromium at `/opt/pw-browsers/chromium`; set `CHROMIUM` elsewhere.

## Rules

- **Push after every commit.** A cloud container can be reset at any moment and takes every
  unpushed commit with it: the whole `wee-game` fork was lost that way on 2026-10-16 and
  rebuilt from a downloaded `dist/wee.html`. If a new repo cannot be created, push to a branch
  of an existing one at once; never keep working on an unpushed tree.
- **Commit only after a green run.** Never chain `npm test | grep ... && git commit`: grep succeeds on a red run too. On 2026-10-17 that pushed three red smokes.
- **A search that finds nothing proves nothing.** Random or hill-climbing room searches only cover the shapes they generate (small rooms, start and goal in fixed corners, scattered walls). Say "not found in N rooms of this kind", never "impossible". Twice on 2026-10-17 a level was called unwinnable this way; the owner drew a winning room each time.
- **A gate on whether something shows reads what is painted, never the `hidden` flag.** A class that sets `display` outranks the `hidden` attribute; `.sizeBand` did, so a resize band stayed on screen for good while its gate, reading the flag, stayed green (163, then 170). Any class with a `display` rule on an element the code hides needs its own `[hidden] { display: none; }`.
- **A palette minimum a required goal already implies is redundant: set it to 1.** "A laser through two open doors" needs two doors, so "2 or more doors" only repeats it on the goal card. Built that way twice (levels 11 and 14, rows 248, 279) because minimums were set apart from the goals. When writing a level, read each minimum against the required goals.
- A count in a goal he asks for means that many or more; "exactly" only when he says exactly (register 483).
- **Game design is the owner's.** Levels, mechanics, rules and requirements are his to decide.
  Ask one question at a time; draft a level only when asked, and build it only once approved.

- `src/sim.js` holds every rule. It is pure: no DOM, no clock, no randomness. The renderer
  and the editor only read it. A rule change lands there with a check in `tests/sim.test.mjs`.
- `gameText()` is the one reading of the game. Gates assert on it, not on pixels, except
  where the question is what the player can see.
- Every gate ends on its own `N/M passed` line; a file without one is red.
- A new gate gets a mutant in `tools/mutate.mjs`, and the mutant must be caught.
- `dist/wee.html` is built, never edited; rebuild it after any change to `src/`, `index.html` or `style.css`.
- Draw rooms in tests with `room([...])` from `tests/lib.mjs`.
- Player-facing text: condition first, imperative, no em dashes. Flag new copy as a draft.
- Plain, common verbs, used with an object: "A block stops the robot", not "the robot stops"; never an odd verb like "steer" or a vague "then it plays" (register 510).
- Every playtest report gets a numbered item in `docs/REGISTER.md` and closes with an outcome.
- Menus are full pages, never a box over the game (owner, 2026-10-18, row 220). A ruling about one screen covers every screen of its kind: ask before treating it as narrower.
- Nothing moves when the mode changes: the room keeps its place and size from Edit to Run to Test and back (owner, 2026-10-18, row 222).
- When a rule changes, re-derive every number measured under the old one (size goals, exact counts, "no win found"), and say which ones moved (row 225).

- Goal sentences are direct, starting on their subject with no article: "Laser through an open door.", not "A laser goes through an open door." Opening line after line on "A" or "The" reads machine-written (register 308).
- One sentence per on-screen message: "You are X. That thing Y." strings read machine-made (register 310). The `arch` test holds it.
