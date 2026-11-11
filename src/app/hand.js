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
export function applyHand() {
  const dpr = window.devicePixelRatio || 1, size = handSize(dpr, innerWidth > 700);
  // The line is a whole number of device pixels too, so every line starts on the grid.
  const line = Math.ceil(size * 1.22 * dpr) / dpr;
  document.documentElement.style.setProperty('--hand-size', size + 'px');
  document.documentElement.style.setProperty('--hand-line', line + 'px');
}
