# Flow between screens: diagnosis (registers 909, 910)

His report, 2026-11-11: going from the menu to the level list to a level, "buttons and stuff move all around
the screen and makes me dizzy", and elements and screens are not integrated. Read from screenshots of the
three screens on a phone and on a 950 px window; positions are not measured yet. Nothing here is built.

## What moves

| Thing | Menu | Level list | Level |
|---|---|---|---|
| The way back | none | an arrow, top left | a grid icon, second from the left |
| The main action | Campaign, bottom centre | a card, anywhere | Run, top left |
| The title | the logo, top centre | "Campaign", beside the arrow | a bare number, top left |
| What is top right | sound, player, unlock | the score | help |
| The column of content | a sign about 300 px wide | about 500 px | the whole window, tools at the left |
| The header | none, buttons float over the room | a bar with a line | a bar with a line, another height |

Every row changes on every step, so the eye has to find each control again three times.

## Why

1. **There is no shared frame.** Each screen was laid out alone. The menu is a dialog over a room, the list
   is a dialog with its own head, and the level is the page itself with its own header.
2. **Two different controls mean "back"**: an arrow on the list, a grid icon in a level.
3. **The main action has no home.** It is at the bottom on the menu and at the top in a level.
4. **Each screen has its own width**, so on a wide window the left edge of the content jumps on every step.
5. **The change itself is a wipe of the whole page**, which hides that the header could have stayed still.

## Proposal

1. **One header on every screen**, the same height and the same three places: left is the way back (always
   the arrow, always one step up: level, list, menu), middle is the title (the logo, "Campaign", "Level 1"),
   right is what belongs to the screen (score, help). On the menu the left place is empty.
2. **One home for the main action**: bottom centre on a phone (Campaign on the menu, Run in a level), and the
   same column on a wide window.
3. **One column width** for the menu's sign, the list and a level's clipboard, so their edges line up.
4. **The header never moves in a change of screen.** Only what is under it changes: the card that was tapped
   opens into the level's clipboard instead of the whole page wiping.
5. **One order inside a level**: clipboard, room, tools, on a phone from top to bottom and on a wide window
   with the tools moved to the side and nothing else changed.
6. **Corner buttons on the menu** (looks, album, sound, player) become that same header's right place, so
   they do not float over the room.

## Open questions

- Is Run at the bottom of a level right for you, or do you want it to stay beside the level's number?
- Should the level list keep its two columns (level, then its puzzle and challenges), or become one list?
