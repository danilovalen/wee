# Puzzle play screens: a benchmark for wee

Written 2026-10-31. Research only, no code changed.

Question: how do strongly puzzle-focused games lay out the play screen, especially on a phone held
upright, and how do they show goals, rules and feedback with pictures and motion instead of words?
The owner's lens: "the more we do show, don't tell, the better."

## How this was checked, read this first

- Web search worked. Fetching pages did not: this session's network blocks pocketgamer.com,
  wikipedia.org, gameuidatabase.com and thinkygames.com, so no store page, screenshot or Game UI
  Database entry was opened directly. Every **sourced** claim below comes from a search summary of
  a review or wiki, with the URL given.
- Lines marked **(unverified)** are from general knowledge of the game and were not confirmed by a
  source in this session. Treat them as leads to check against a screenshot or video before acting
  on them.
- To check the unverified lines, allow gameuidatabase.com in the session's network settings: it has
  screenshot sets for most of these games.

## Game by game

### Railbound (build tracks, then run; phone first)

- **Goal:** the carriages are numbered, and the aim is to route them in order to the locomotive
  ([Wikipedia via search](https://en.wikipedia.org/wiki/Railbound)). The goal is the board itself:
  the numbers on the cars say the order, no sentence does. (unverified: there is no goal text panel
  at all on the play screen.)
- **Pieces:** a limited set of tracks per level, placed by tap and drag on empty cells
  ([Pocket Gamer](https://www.pocketgamer.com/railbound/review)). (unverified: the remaining count
  is a single number on a track icon, not a palette of piece types.)
- **Undo and reset:** reviewers mention an undo button, and controls for reset, undo, add and
  delete ([Pocket Gamer](https://www.pocketgamer.com/railbound/review),
  [Family Gaming Database](https://www.familygamingdatabase.com/accessibility/Railbound)). A hint
  reveals the right position of one rail ([TrueAchievements walkthrough](https://www.trueachievements.com/game/Railbound/walkthrough)).
- **Build vs run:** (unverified) one Go button starts the trains; touching the board again stops
  them and returns to building. No separate "test" mode.
- **Optional goals:** none on the play screen. Optional content is whole bonus levels branching off
  the world map, rather than stars inside a level
  ([TrueAchievements walkthrough](https://www.trueachievements.com/game/Railbound/walkthrough)).
- **Level select:** a world map, about ten base puzzles per world plus side branches (same source).
- **Show, don't tell:** a failed run is shown, not explained: the train crashes or stalls on the
  board. (unverified for exact animation.)
- **Absent:** goal text, move counters, a star rating per level.

### Cosmic Express (draw tracks, aliens to homes; phone)

- **Goal:** drawn on the board. Each alien colour has a matching home; passengers mark the car they
  ride ([RAWG user reviews](https://rawg.io/games/cosmic-express/reviews)). You draw track with a
  finger ([appgefahren](https://www.appgefahren.de/?p=272791)), pinch to zoom on small screens
  ([MacStories](https://www.macstories.net/reviews/game-day-cosmic-express/)).
- **Undo, reset, run, level select:** not described by any source found. (unverified: the train
  runs automatically once the track reaches the exit, so there is no Run button; undo and restart
  are small corner icons.)
- **Show, don't tell:** the whole rule set (which alien goes where, which car is now dirty) is read
  off colours on the board.

### Baba Is You (phone port 2021)

- **Goal and rules:** the rules ARE objects on the board ("BABA IS YOU", "FLAG IS WIN"), so the
  level's goal is a sentence made of pushable blocks, not UI. (Well known; the search summaries
  describe it only indirectly.)
- **Undo and restart:** two-finger tap undoes, holding it keeps rewinding, plus an on-screen undo;
  restart is a separate button. On iPhone, pause, restart and rewind sit to the left of the play
  area; on iPad along the bottom ([TouchArcade](https://toucharcade.com/2021/07/07/baba-is-you-iphone-review-ipad-controller-support-cloud-save-puzzle/),
  [App Unwrapper](https://www.appunwrapper.com/2021/06/22/baba-is-you-translates-beautifully-to-mobile-out-now/)).
  One reviewer found the undo and restart icons confusable
  ([Android Police](https://www.androidpolice.com/2021/06/29/baba-is-you-is-a-total-blast-on-android-heres-what-the-first-20-minutes-look-like/)).
- **Level select:** a walkable map where levels are tiles. (unverified detail.)
- **Absent:** goal list, move counter, stars, any explanatory text during play.

### Opus Magnum (Zachtronics, build then run)

- **Layout:** parts tray on the left, instruction timeline along the bottom, workspace in the
  upper right ([gcores review](https://www.gcores.com/articles/95829)).
- **Goal:** (unverified) the target product is drawn as a small molecule picture beside the
  reagents, with a required count; no sentence describes it.
- **Metrics:** cost, cycles and area; after a solve you see your three numbers against histograms of
  other players ([Wikipedia](https://en.wikipedia.org/wiki/Opus_Magnum),
  [Steam discussion](https://steamcommunity.com/app/558990/discussions/0/3800524254170628358)).
  Histograms appear at the END, not during building.
- **Run:** the machine runs until it has made several products, which also proves it loops
  ([PC Gamer](https://www.pcgamer.com/uk/why-i-love-opus-magnums-alchemical-gifs)).
- **Show, don't tell:** the solution itself becomes a GIF you can share. Optional "goals" are not
  listed as rules; they are just numbers you can beat.

### Infinifactory (Zachtronics, 3D)

- Histograms return after a solve ([Microsoft Store](https://www.microsoft.com/de-at/p/infinifactory/9nhgm9cs3xlf)).
- (unverified) The required product is shown as a translucent block shape at the output; the
  game counts deliveries against it. Toolbar of blocks along the bottom.

### Patrick's Parabox

- **Controls:** Undo, Redo, Reset and Menu buttons along the side in early levels
  ([tutorial design analysis](https://siddarthrg.substack.com/p/tutorial-design-of-patricks-parabox)).
  Undo can even undo a reset ([TV Tropes](https://www.tvtropes.org/pmwiki/pmwiki.php/VideoGame/PatricksParabox)).
- **Goal:** (unverified) drawn targets on the floor: outlines for boxes and a player-shaped outline
  for the player. No goal text.
- **Level select:** hub areas with a level select in the top left of each area
  ([gamepretty walkthrough](https://gamepretty.com/patricks-parabox-walkthrough-all-achievements-levels-guide/)).

### Stephen's Sausage Roll, Snakebird, A Monster's Expedition

- **SSR:** only movement is explained in text, at the start; controls are four directions plus undo
  and reset; free undo is what makes experiments cheap
  ([GamingOnLinux](https://gamingonlinux.com/2016/04/playing-with-food-thoughts-on-stephens-sausage-roll),
  [Destructoid](https://destructoid.com/reviews/review-stephens-sausage-roll)).
- **Snakebird:** no in-depth tutorial, unlimited undo
  ([App Unwrapper](https://www.appunwrapper.com/2016/09/10/snakebird-review/)).
- **A Monster's Expedition:** unlimited undo, reset an island, older checkpoints; "no counter on the
  screen tut-tuttingly counting your errors"
  ([App Unwrapper](https://www.appunwrapper.com/2020/09/17/a-monsters-expedition-review/),
  [Buried Treasure](https://buried-treasure.org/?p=1423)).
- **Shared pattern:** the goal is a thing in the world (the grill, the fruit, the exhibit), the
  screen carries no HUD, and undo is the one control that always exists.

### Hitman GO / Lara Croft GO (phone)

- Up to three objectives per level, for example "Level Complete, Collect Briefcase, 13 Turns or
  Fewer"; the turns objective is optional
  ([All About Windows Phone](https://allaboutwindowsphone.com/flow/item/20931_Mini-review_Hitman_GO.php),
  [TrueAchievements](https://www.trueachievements.com/game/Hitman-GO/walkthrough/2)).
- (unverified) During play the objectives are three small icons in a corner, ticked as earned; the
  written list appears on the level card before play and on the result screen. This is the closest
  benchmark for wee's required plus optional goals.
- Lara Croft GO shares the control scheme
  ([MobyGames](https://www.mobygames.com/game/74996)).

### Hexcells

- Two counters beside the grid: tiles left to mark, and mistakes
  ([Thinky Games](https://thinkygames.com/games/hexcells/),
  [Pixel Poppers](https://pixelpoppers.com/review/hexcells/)). Rules are numbers drawn on the cells.
  Nothing else on screen.

### The Witness, Monument Valley

- The Witness never explains in text; rules are taught by clusters of panels
  ([Wikipedia](https://en.wikipedia.org/wiki/The_Witness_(2016_video_game)),
  [The Rotunda](https://www.therotundaonline.com/article/2017/02/witnessing-the-witness)).
  Monument Valley gives no explicit instructions and teaches by interaction
  ([Mechanics of Magic](https://mechanicsofmagic.com/?p=44619)). Feedback is a sound and light on
  the object you acted on.

### Islanders

- Score bottom left, next-island outline bottom right filling as you score; before placing, the
  gain or loss is shown as +/- numbers at the cursor and each building shows its area of effect
  ([review summaries via search](https://www.pushsquare.com/reviews/ps4/islanders_console_edition),
  [Into Indie Games](https://intoindiegames.com/reviews/islanders-review/)).
- **Show, don't tell:** the score is previewed ON the board where it will happen.

### Poly Bridge (build then test)

- A level is fully complete only within budget and with stress never above 100%
  ([GIGAZINE](https://gigazine.net/gsc_news/en/20160101-poly-bridge/)). (unverified: budget is a
  bar at the top, a single play/simulate button switches modes, and stress is drawn as colour on the
  beams green to red during the test.)

### Mosa Lina, Can of Wormholes

- **Mosa Lina:** random tool sets per level, no intended solutions
  ([GamingOnLinux](https://www.gamingonlinux.com/2023/10/mosa-lina-is-pure-physics-puzzle-platforming-chaos/)).
  Its UI was not described by any source found.
- **Can of Wormholes:** hints ("Game Insights") are a simpler version of the puzzle that isolates
  the key idea, opened from settings
  ([Ladies Gamers](https://ladiesgamers.com/can-of-wormholes-review/),
  [Thinky Games](https://thinkygames.com/features/diving-deep-into-can-of-wormholes-an-interview-with-munted-finger-games/)).
  A hint that is a puzzle, not a sentence. Undo UI not found.

## What the benchmark says, in one table

| Concern | What the best of them do | wee today |
|---|---|---|
| Goal | drawn on the board (Railbound numbers, Cosmic Express colours, Baba blocks, Parabox outlines) | ~190px text card |
| Optional goals | small icons ticked live (GO games), full text only before/after; or whole bonus levels (Railbound) | full sentences always visible |
| Undo / reset | always present, small, one place, often a gesture too (Baba) | in a crowded header row |
| Build vs run | one Go button, touching the board returns to build (Railbound, Poly Bridge) | Run and Test as two buttons |
| Pieces | few, with a count on the icon (Railbound) | tool row plus pieces row |
| Feedback | the failure plays out on the board (crash, stall, red beam) | verdict text |
| Score preview | on the board before you commit (Islanders) | none |
| Metrics vs others | after the solve only (Opus Magnum histograms) | n/a |

## Patterns that apply to wee

Ranked by expected effect on "disorganized", favouring things drawn on or next to the grid.

1. **Draw the required goals on the grid and shrink the goals card to a strip of icons.** Today's
   190px card is the biggest block on the screen and is all words. Railbound, Cosmic Express, Baba Is
   You and Patrick's Parabox put the goal in the board itself. For wee: the star is already on the
   grid; draw each door with a small "must end closed" mark (an outline lock) and show "at least 4
   moves" as a row of 4 empty pips beside the grid that fill as the robot moves. The card becomes one
   row: level name plus goal icons. Its sentences move to the level select card and to a tap on an
   icon (an inspection, not a fold-open panel, so the owner's no-folding rule holds).
2. **Optional goals as stars that light up, not a second list.** The GO games keep objectives as
   corner icons during play and spell them out only before and after the level. For wee: three star
   slots in the goal strip, each with its own pictogram (a box, a laser, a move count); they light,
   with a small pop, the moment a run earns them. The full wording lives on the level select card.
   Railbound's alternative, making side goals into separate bonus rooms, is worth noting but is a
   design change, not a layout one.
3. **Replace verdict text with the run itself.** Railbound and Poly Bridge show failure as an event
   on the board: the train stalls, the beam goes red. For wee: when a goal fails, mark it where it
   failed (the open door flashes, the unreached star dims, the move pips stop short) and keep any
   words to the icon that turned red. Success: the goal icons tick in order, then the stars.
4. **One Go button, with Run and Test merged or clearly ranked.** Railbound and Poly Bridge use a
   single play control; touching the board stops the run. Two peer buttons in a row of seven reads as
   clutter. Put Go (big, near the thumb, under the grid next to the pieces) and demote the other mode
   or fold its job into Go plus a long press. Check with the owner what Test does that Run does not.
5. **Split the header by job: navigation top, editing bottom.** Undo, redo and reset sit with the
   pieces in Railbound, Baba (left rail on iPhone) and Parabox (side), near where the hand is. For
   wee: header keeps logo and Levels only; undo, redo, reset join the tool row under the grid. That
   also groups everything the thumb uses in one band.
6. **Put counts on piece icons and merge the tool and pieces rows.** Railbound's limited supply is a
   number on the piece. For wee: one row where Look, Erase and Move are the first three tiles, set
   apart by a gap, and each piece tile carries a count badge when the level limits it. One row of
   icons reads as one palette; two rows read as two systems.
7. **Make resizing a property of the grid's edge, not eight arrow buttons.** None of the benchmarks
   show resize controls during play; Islanders and Poly Bridge keep the play surface clean. For wee:
   show the +/- handles only while the Move or a resize tool is selected, or as a single drag handle
   on each edge drawn as a dashed line beyond the wall. This removes eight permanent buttons from
   around the board without hiding anything a player needs mid-puzzle.
8. **Preview the outcome on the board before committing (Islanders).** For wee: while Run is held
   or a piece is dragged, ghost the robot's slide path on the grid. That shows the rule (slides until
   it hits something) instead of telling it, and can retire tutorial bubbles that explain sliding.

Hints, if ever added: Can of Wormholes shows that a hint can be a smaller puzzle rather than a
sentence, which fits the same lens.
