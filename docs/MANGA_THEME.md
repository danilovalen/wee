# The Manga theme, in wee

Owner, 2026-10-10: *"include somewhere, applying manga design patterns"*, then Manga pink for the
shell, *"but we need something more for the wee design. Something cutesy, fleeting, fast, airy,
weeeee."*, then C1 Drift from `docs/wee-look.html`.

## Where this comes from

manga-engine's `public/core-ui.css` is the origin. bag-crawler's `docs/MANGA_THEME.md` absorbed it as
a rule set and a token table, and manga-tools' `web/css/palette.css` copies the values too, because a
standalone page cannot link the platform's stylesheet. wee is in the same position, so **this file is
wee's canonical copy**: `tests/manga.test.mjs` reads the table below and asserts `style.css` declares
exactly it. When the platform moves, edit this table and the gate makes the stylesheet follow.

## The form (the half that gets missed)

1. **No strokes.** Surfaces separate by tone. No `border` on a panel, a bar, a field or a button.
2. **The sticker shadow** is hard, never blurred: 4px at rest, 6px on hover lifted 2px, 1px on press.
3. **A recess** (a field) is an inset shadow in a lighter rim, not the outer shadow's ink.
4. **State is an inset ring**, never a border: "on" is `inset 0 0 0 2px` in the accent.
5. **Four radii:** 16 modal, 10 panel, 8 field and button, 999 pill.
6. **One accent**, Manga pink, for attention and "on" only.

**The room is not the shell.** Tiles, pieces, the player and lens marks keep wee's own colours: a
colour there is a rule the player reads. The player stays ice cyan.

## The wee layer: Drift (C1)

- **Snow** falls slowly behind the shell, over the page ground, never over the room.
- **Gust:** when the player starts a slide, the snow rushes the same way for a moment, then settles.
- **Frost:** the bars and columns are the panel tone at 78%, blurred, so the snow shows faintly.
- **Wordmark:** "wee" in Outfit 300, spaced, with a sheen passing over it.
- **Trail:** each tile the player leaves holds a fading ghost of the player.
- **Reduced motion:** the snow stands still, no gust, no sheen, no ghost.
- Dark only for now: wee's room is dark. The Manga light theme is not ported.

## The tokens

Read by `tests/manga.test.mjs`. `name | value`, one per row, values verbatim.

| token | value |
|---|---|
| `--paper` | `#050508` |
| `--panel` | `#151518` |
| `--rule` | `#35353d` |
| `--ink` | `#f8fafc` |
| `--soft` | `#a1a1aa` |
| `--accent` | `#ff2a5f` |
| `--on-accent` | `#fff` |
| `--field` | `rgba(255,255,255,0.07)` |
| `--field-rule` | `rgba(255,255,255,0.15)` |
| `--sticker` | `#0b0b0e` |
| `--inset-rim` | `rgba(210,210,220,0.15)` |
| `--btn-mix` | `60%` |
| `--selectable` | `#ff2a5f` |
| `--r-s` | `8px` |
| `--r-m` | `10px` |
| `--r-l` | `16px` |
| `--r-pill` | `999px` |
| `--sticker-rest` | `4px` |
| `--sticker-hover` | `6px` |
| `--sticker-press` | `1px` |
| `--ice` | `#5ee0e6` |
| `--frost` | `78%` |
