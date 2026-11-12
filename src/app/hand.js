// The hand's size (register 892). The face is drawn on a grid of twelve cells to the em, so a letter is the
// same drawing every time only when a cell is a whole number of the screen's own pixels. The size is worked
// out from the screen: a cell of about a pixel and a half of the page, rounded to whole device pixels.
export const HAND_CELLS = 12;
export function handSize(dpr, wide) {
  // A screen of one device pixel per page pixel has no whole step at a pixel and a half: a wide window takes
  // two, a narrow one (an emulated phone, never a real one) keeps the page's 18.
  if (dpr <= 1) return wide ? 24 : 18;
  return HAND_CELLS * Math.max(1, Math.round(1.5 * dpr)) / dpr;
}
export const iconSize = dpr => 16 * Math.max(1, Math.round(dpr < 1.5 ? dpr : 1.5 * dpr)) / dpr;
export function applyHand() {
  const dpr = window.devicePixelRatio || 1, size = handSize(dpr, innerWidth > 700);
  // The line is a whole number of device pixels too, so every line starts on the grid.
  const line = Math.ceil(size * 1.22 * dpr) / dpr;
  document.documentElement.style.setProperty('--hand-size', size + 'px');
  document.documentElement.style.setProperty('--hand-line', line + 'px');
  // An icon is drawn on a 16-cell grid, so it too is a whole number of device pixels to a cell, near 24 px
  // on a phone and 16 on a screen of one device pixel (register 914).
  document.documentElement.style.setProperty('--icon', iconSize(dpr) + 'px');
}

// A level's main actions (register 911): under the room on a phone, under the tools on a wide window, where
// they cost the room no height.
export function placeActions() {
  const a = document.getElementById('campActions'), tools = document.getElementById('tools'), stage = document.getElementById('stage');
  if (!a || !tools || !stage) return;
  const host = innerWidth > 700 ? tools : stage;
  if (a.parentNode === host) return;
  if (host === tools) tools.append(a); else stage.insertBefore(a, document.getElementById('lensChips'));
}
