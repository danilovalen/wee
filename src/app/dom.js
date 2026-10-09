// The page: the elements the app talks to, and what kind of screen it is on.
export const $ = id => document.getElementById(id);
export const canvas = $('game');
export const g = canvas.getContext('2d');
export const touch = matchMedia('(pointer: coarse)').matches;
export const portrait = () => innerHeight > innerWidth;
export const now = () => performance.now();
