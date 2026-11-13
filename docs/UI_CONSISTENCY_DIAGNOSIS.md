# UI consistency: what still differs between screens (register 937)

Measured on 2026-11-13 from screenshots of every page at 390 px and 1280 px: menu, level list, a level,
Looks, Achievements, Rooms, the win card, the reset and player dialogs, the tutorial and the Sandbox in
both modes. Fixed while diagnosing: a locked Place or Remove card did not fade its name and pieces (936).

## Do first: the same thing drawn differently

1. **Locked has three looks.** A locked level fades and shows a padlock; a locked palette in Looks stays in
   full colour with a padlock and a price; an achievement not yet earned has a dashed frame and no padlock.
   Proposal: locked always fades and shows the padlock; a price, when there is one, sits beside it.
2. **The number on the right of the bar has three looks.** "Score 18" is plain text on the level list, the
   star count is a framed button on Looks and plain text on Achievements, and a level shows it after the
   mode button. Proposal: one counter, star or score glyph then the number, never framed unless it is a button.
3. **Undo and redo move.** In a level they are in the tool tray; in the Sandbox they are in the top bar; in
   the Sandbox's play mode Undo, Reset and Replay are words while a level uses the icons. Proposal: the
   tray holds them everywhere, as icons.
4. **Stars have three drawings.** The win card's row of round coin stars, the outline stars on goal lines,
   and the list's filled star. Proposal: one star glyph, filled or empty.
5. **A goal is ticked two ways.** The clipboard shows a box to tick while editing and a star once beaten.
   Proposal: the box, ticked, everywhere; the star stays for the level's own score.

## Then: layout

6. **On a wide window the column changes width on every page**: the list about 430 px, Looks about 350 px and
   pushed to the left, Achievements and Rooms about 340 px, centred. Proposal: one column width, centred,
   as the theme plan's item 3 asked.
7. **Cards wear four frames**: the list's double frame, Looks' single frame, Achievements' dashed frame and
   Rooms' double frame. Proposal: the list's frame for every card; state shows by fill and fade, not frame.
8. **Only the Sandbox has a bottom tab bar** (Play, Check, Notes, Room) on a phone. Proposal: keep it (the
   Sandbox has more to show), but give it the bar's height and button size so it reads as the same kit.

## Smaller

9. **Only Looks has section labels** (PALETTE, SKINS, FEEL), in small capitals no other page uses, and its
   Feel switches are outlined chips found nowhere else. Proposal: section labels in the bar's title type, and
   Feel as the same buttons as the rest of the page.
10. **Dialogs lay buttons out three ways**: two equal buttons (Reset), one full-width (the player picker's
   Cancel), two by two (the win card). A destructive Reset looks the same as Cancel. Proposal: the confirming
   button first and coloured, Cancel plain, both on one row; the win card keeps its grid.
