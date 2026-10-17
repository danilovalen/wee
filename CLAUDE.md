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

The browser gate uses Chromium at `/opt/pw-browsers/chromium`; set `CHROMIUM` elsewhere.

## Rules

- **Push after every commit.** A cloud container can be reset at any moment and takes every
  unpushed commit with it: the whole `wee-game` fork was lost that way on 2026-10-16 and
  rebuilt from a downloaded `dist/wee.html`. If a new repo cannot be created, push to a branch
  of an existing one at once; never keep working on an unpushed tree.
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
- Every playtest report gets a numbered item in `docs/REGISTER.md` and closes with an outcome.
