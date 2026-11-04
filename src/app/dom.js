// The page: the elements the app talks to, and what kind of screen it is on.
export const $ = id => document.getElementById(id);
export const canvas = $('game');
// The room is drawn on a buffer of one pixel per art pixel (2 room units), then copied up with no
// smoothing, so everything in it sits on one pixel grid, round shapes included (register 621).
const screen = canvas.getContext('2d');
export const buffer = document.createElement('canvas');
export const g = buffer.getContext('2d');
// Where the buffer lands on the screen: its scale and the part of a buffer pixel the view starts inside.
export const shown = { scale: 1, dx: 0, dy: 0 };
export function present() {
  screen.setTransform(1, 0, 0, 1, 0, 0); screen.imageSmoothingEnabled = false;
  screen.clearRect(0, 0, canvas.width, canvas.height);
  screen.drawImage(buffer, shown.dx, shown.dy, buffer.width * shown.scale, buffer.height * shown.scale);
}
export const touch = matchMedia('(pointer: coarse)').matches;
export const portrait = () => innerHeight > innerWidth;
export const now = () => performance.now();

// The bar's line when there is nothing to say: how to place and remove.
// The hint line holds messages only; how to place and remove is behind ? and in the tutorial (register 730).
export const DEFAULT_HINT = '';
