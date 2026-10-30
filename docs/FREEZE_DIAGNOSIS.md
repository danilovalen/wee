# The freezes (registers 274, 303, 446, 451, 463, 508)

2026-10-30. "Softlocked": the game is on screen and stops answering.

## The reports

| row | what he saw | where |
|---|---|---|
| 274 | Level 6: placing, removing and growing the room stopped working | built file on his phone |
| 303 | Freezes whenever a question selector appears in the chat | the file opened inside the Claude app |
| 446 | Level 21, third win in a row, win card up: no button worked | the Claude app |
| 463 | A test: a page that sometimes does not open after a click | the test browser |

None reproduced from his steps (rows 274, 446). So the work below forces each way the code can stop
answering, rather than waiting for one to happen again.

## What was found, and fixed

1. **One error stopped the game for good.** The frame loop asked for its next frame at the end of a
   frame, so one error thrown while drawing or moving pieces ended the loop. From then on: nothing
   redraws (a placed block seems not placed), a Run's robot never finishes, the room never goes back
   to editing, the win card never shows. That matches 274 and 446. Forced in a browser: one error,
   draws stop at 29 and stay. **Fix:** the next frame is asked for first, and an error is caught and
   kept. After the fix the same error leaves the game drawing (46 to 88 draws in 0.7s).
2. **A history move that never answers swallowed every later move.** Going to the menu walks the
   browser's history back to its first entry, and every move asked for meanwhile waits for that walk.
   In a viewer inside another app (the Claude app shows the file in a frame, and its chat moves its
   own history when a selector opens), the walk can go somewhere else or nowhere, and then the game
   waits forever: the Menu button, Levels and Next level all do nothing. That matches 303 and 446.
   Forced in a browser with a history entry that says the tab is deeper than it is: the logo did
   nothing and the menu's Campaign did nothing. **Fix:** a history move with no answer in 0.6s is
   finished by the game itself, and from then on it keeps its own history. After the fix: the logo
   reaches the menu, Campaign opens the list, a level opens from it.
3. **The flaky test (463)** closed pages behind the game's back; the game took that as Back and
   started a history move that later overrode the test's next click. The test now goes to the menu
   through the logo, as a player does: 3 runs of 3 pass.

## What stays open

- Whether the Claude app's viewer still freezes the file by itself (row 303: the selector may pause the
  frame entirely). The game can now recover once the frame runs again, but it cannot run while the app
  holds it. Playing in the phone's browser avoids the viewer.
- **If it freezes again:** Menu, then Debug, then paste the text. The copy now carries the last five
  errors the page met, with the last taps and what sits on top of the room.

## Gates

`tests/freeze.smoke.mjs` forces both freezes and checks the game answers; two mutants in
`tools/mutate.mjs` put each old behaviour back and are caught.
