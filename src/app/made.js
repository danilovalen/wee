// Levels made in the Level maker (register 302), kept in this browser. Their ids are 'm' + a number.
const KEY = 'wee-made';
export const madeLevels = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
export const saveMade = list => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage off or full */ } };
export const madeLevel = id => madeLevels().find(l => l.id === id);
// Leaving a made level goes back to the maker; the maker hands its opener in, so the two do not import each other.
let back = () => {};
export const backToMaker = () => back();
export const onMakerBack = f => { back = f; };
