# Global score: discovery and plan (register 839)

Owner, 2026-11-10: "Each star is worth 20 points. Your global score is ... minus the amount of things
you have placed the least in each builder objective (for each star) ... So I can have a global
leaderboard, some Speedrun methods, and some achievements for it."

## What exists already

- **The number per star is already saved.** `src/app/campaign.js` `run()` keeps `rec.best.win` (fewest
  tiles in any win) and `rec.best[goalId]` (fewest tiles in a win meeting that side goal). Tiles are
  counted as the star shows them: `tilesOf`, no blob, no berry.
- **Stars in the builder levels:** 22 listed levels (11 and 16 hidden), 131 stars: one win star each,
  plus `best` (exact moves), `small` (room size), two named side goals and `mix` (two at once). Level
  17 has one named side goal, so 5.
- **Ceiling:** 131 x 20 = 2620 in theory. Measured for the win stars only (`node tools/minWalls.mjs
  --all`, upper bounds): 347 of 440. Side-goal ceilings are not measured yet.
- **The score only goes up**: a best only ever falls, so the score is safe to rank on.
- **Stars you spend (`wallet.js`) are a different thing**: achievements also pay stars, and Looks
  cost them. The global score counts builder stars only and spending never lowers it.
- **Who's playing (`slots.js`)**: Me and Guest on one device, plus the dev lock's every-level save,
  which must never post a score.
- **A leaderboard needs somewhere shared.** The game is one HTML file with local saves. The artifact
  page can be given a shared database (`db`) and a viewer identity (`user`), but only for people
  signed in to claude.ai who can open the page; a friend on your phone has neither.

## The rule, as built

`score = sum over earned stars of max(1, 20 - fewest tiles for that star)`

- Floor 1: "each goal gives you at least something".
- The win star uses `best.win`; a side star uses `best[id]`. A save from before bests per goal falls back
  to `best.win` (as the level list already does).
- `mix` counts as its own star.

## Plan, in order

1. **Score function + gate** (`src/campaign/score.js`): pure, from a save. Test: the floor, the fallback,
   the dev save never counts. About 1 hour.
2. **Show it**: the total on the menu and the level list; each star's points on its card. About 2 hours.
3. **Ceilings per star**: extend `tools/minWalls.mjs` to side goals, so the list can show "your points /
   best known". About 1 hour plus a long run.
4. **Leaderboard, local** (owner, 2026-11-10: "Local only for now, but keep online planned for when we
   migrate to godot"): ranks the players saved on this device (Me, Guest), the dev save left out. Keep the
   score a pure function of a save, so an online board after the Godot move only has to post that number.
5. **Speedrun, enabled not built** (owner, 2026-11-10: "No Speedrun yet. Just plan. We're just enabling
   it"): record what a later timer needs and show nothing. Each save keeps when it started, time spent in
   levels, and for every star the moment it was first earned. Any%, 100%, a score target or per-level
   runs can all be read off that later, so no category is decided now.
6. **Achievements** (owner, 2026-11-10: fixed numbers): 250, 500, 1000, 1500, 2000 through the existing
   `achievements.js`; numbers to be checked against the side-goal ceilings from step 3.

## Open questions (asked one at a time)

1. ~~Where the leaderboard lives~~: answered, local now, online planned for the Godot version.
2. ~~Speedrun categories~~: answered, none yet; only record the times.
3. ~~Achievement thresholds~~: answered, fixed numbers.

All three answered; build order is steps 1, 2, 3, 6, 4, with 5 riding along on step 1.

## Built (2026-11-10, register 840, "Go all.")

- `src/campaign/score.js`: the rule; `src/app/board.js`: the device board and the clock. Gate:
  `tests/score.test.mjs`, plus checks in `campaign-play.smoke` (a real win posts, shows and keeps its times)
  and `slots.smoke` (the board in Who's playing, kept across a switch).
- Shown: `Score N` in the Campaign list's header; each earned star's hover says its points. The menu has
  no score of its own: Who's playing lists the best scores on this device.
- Times kept in the save, nothing on screen: `levels[id].at[star]` (first earned) and `clock.started` /
  `clock.ms` (time from a level's opening to each Run, a gap over 5 minutes counted as 5).
- **Ceilings measured** (`node tools/minWalls.mjs --all --stars --orders 10`): 119 of the 131 stars have a
  known winning room, worth 1730 points at their fewest; 12 stars have no known room yet (level 1 touch
  a block four times, 4 through four doors, 10 two boxes, 12, 13, 15, 17, 18, 19, 20, 22, 24 one side goal
  each). The best known score is about 1730 to 1970, so **2000 could not be reached**: the last step is
  **1750** instead. Steps: 250, 500, 1000, 1500, 1750; the first two pay 1 star, the rest 2.
- Not built: an online board (planned for the Godot move), any speedrun screen.
