# Playtest register

Every report gets the next number and keeps the reporter's words. An item closes only with an
outcome: **done** (commit), **declined** (why), or **moved** (where).

| # | Report | Outcome |
|---|---|---|
| 1 | "The enemy clock is not totally aligned to the player. When I moved forth and back, the enemy went forth and back too, but stopped with one square of difference in comparison to me." (follow enemy, open space, no walls near) | **open.** Not reproduced: 400 fuzzed runs on the tile clock keep the gap exact. Found on the way: on the per-slide clock a Boomerang slide steps the world once in its final direction. Copy report added (play mode) so the next sighting can be replayed exactly. |
