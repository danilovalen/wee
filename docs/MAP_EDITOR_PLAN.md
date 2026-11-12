# Editing the level map yourself (register 932)

The level map in `docs/sketches/levels-map2-*.png` is already a wee room: walls, floor, gravel, doors,
boxes, one-ways and turrets are the game's own tiles, and only the cards, stairs and signs sit on top.
So the map editor is the Sandbox, with three dev-only additions. Nothing about it is a second tool.

## How you would build it

1. Turn on dev mode (the menu's corner lock), open the Sandbox, open the room **Map**.
2. Draw corridors, corners, walls and the pieces beside each land with the normal tools.
3. Place **level spots** where Wee stops for a level (new dev-only tool). A spot's options pick what
   it opens: `Level 9`, `Level 9 · side`, or `Level 9 · side 2`. The card is drawn beside the spot
   on the side you choose (up or down for a corridor that runs sideways, left or right for one that
   runs up and down), with the stair between them.
4. Place **signs** (new dev-only tool): a word on the wall, typed in the options. Land names go here.
5. Play the map in the Sandbox to check that Wee can reach every spot and that the first-visit
   scenes (a box pushed, a one-way crossed) work. It is a room, so the existing checks already
   apply: unreachable spots and Wee dying show up as they do in any room.
6. **Export** and send me the file, or save it as `rooms/map.wee` and push. The game reads its map
   from that file.

## What the game does with the file (built once, then never touched by hand)

- Shows Campaign as this room, cards on their spots, the camera on Wee, dragging to pan.
- Tapping a card: Wee slides to its spot, gravel stop to gravel stop, then up the stair.
- Locks: a spot past the open ones gets a closed door on its stair; the corridor door before the
  first locked level is the door you drew there, opened by beating the level before it.
- Gravel at three-way joins is yours to place; the game does not add any.

## Gates that keep it honest

- Every level, puzzle and challenge in the plan has exactly one spot, and no spot names a level
  that does not exist (so a new level shows up as an error until you place it).
- Every spot is reachable from the start without passing a locked door it depends on.
- No turret's beam crosses a floor tile Wee can stand on.

## Steps and rough cost

1. Room size: rooms stop at 40x30 today; the map is about 60x50. Raise the limit for the Map room
   only. About 30 minutes.
2. Level spot and sign tools, dev-only, stored in the room file. About 2 hours.
3. Campaign reads `rooms/map.wee`: cards on spots, camera, drag to pan. About half a day.
4. Wee's walk to a card, and the first-visit scenes played by the real rules. About half a day.
5. The three gates above. About 2 hours.

My sketch script (`tools/sketch-map/`) can write the first `rooms/map.wee`, so you start from the
current layout instead of an empty room.
