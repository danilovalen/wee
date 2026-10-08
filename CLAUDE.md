# wee

A canvas sandbox for an ice-slide puzzle game: build a room, play it, toggle powers.
Plan and decisions: `docs/PLAN.md`. Playtest feedback: `docs/REGISTER.md`.

## Commands

| Task | Command |
|---|---|
| Run it | `npm start`, then open http://localhost:5173 |
| All gates (node + browser) | `npm test` |
| One gate | `npm test -- --only=sim` |
| Prove the gates can go red | `node tools/mutate.mjs` |

The browser gate uses Chromium at `/opt/pw-browsers/chromium`; set `CHROMIUM` elsewhere.

## Rules

- `src/sim.js` holds every rule. It is pure: no DOM, no clock, no randomness. The renderer
  and the editor only read it. A rule change lands there with a check in `tests/sim.test.mjs`.
- `gameText()` is the one reading of the game. Gates assert on it, not on pixels, except
  where the question is what the player can see.
- Every gate ends on its own `N/M passed` line; a file without one is red.
- A new gate gets a mutant in `tools/mutate.mjs`, and the mutant must be caught.
- Draw rooms in tests with `room([...])` from `tests/lib.mjs`.
- Player-facing text: condition first, imperative, no em dashes. Flag new copy as a draft.
- Every playtest report gets a numbered item in `docs/REGISTER.md` and closes with an outcome.
