// The main menu's background: a small room the robot plays on a loop (the box blocks a laser, the
// robot bumps the closed door, steps on the switch, goes through). Drawn in CSS, not the game's
// scene, so it costs nothing while the menu is shut.
const C = 52;
const WALLS = [[6, 0], [0, 5], [1, 5], [2, 5], [3, 5], [5, 5], [6, 5], [3, 6], [5, 6], [0, 7], [6, 7]];
const ROBOT = `<svg viewBox="0 0 52 52" width="52" height="52" aria-hidden="true">
<line x1="26" y1="6" x2="26" y2="13" stroke="#4b3fd6" stroke-width="3" stroke-linecap="round"/><circle cx="26" cy="5" r="3.5" fill="#ff6b81"/>
<rect x="9" y="13" width="34" height="28" rx="9" fill="#7d6bff"/><rect x="14" y="19" width="24" height="12" rx="6" fill="#2a2440"/>
<g class="msEyes"><circle cx="21" cy="25" r="3" fill="#7ef0ff"/><circle cx="31" cy="25" r="3" fill="#7ef0ff"/></g>
<rect x="15" y="41" width="7" height="6" rx="2" fill="#4b3fd6"/><rect x="30" y="41" width="7" height="6" rx="2" fill="#4b3fd6"/></svg>`;

const at = (c, r, dx = 0, dy = 0) => `left:${c * C + dx}px;top:${r * C + dy}px`;

export function buildMenuScene(host) {
  host.innerHTML = `<div class="msRoom">${WALLS.map(([c, r]) => `<i class="msWall" style="${at(c, r, 2, 2)}"></i>`).join('')}
<i class="msEmitter" style="${at(0, 3, 4, 12)}"></i><i class="msBeam" style="${at(0, 3, 24, 23)}"></i>
<i class="msSwitch" style="${at(1, 4, 8, 16)}"><b></b></i>
<i class="msDoor" style="${at(4, 5, 5, 5)}"></i><i class="msSpark" style="${at(4, 5, 6, -10)}">✱ ✱</i>
<i class="msGoal" style="${at(4, 6, 8, 8)}">★</i>
<i class="msBox"><b></b></i><i class="msRobot">${ROBOT}</i></div>`;
  const room = host.firstElementChild;
  // Fit: the robot's corner of the room (columns 0 to 5) fills a phone's width, and the goal row
  // always ends above the buttons; on a wide screen it is centred with floor around it.
  const fit = () => {
    const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight, top = Math.min(56, h * 0.07);
    const s = Math.max(1, Math.min(w / 260, (h - 230 - top) / 364));
    room.style.transform = `translate(${w / 2 - 143 * s}px, ${top}px) scale(${s})`;
  };
  fit();
  addEventListener('resize', fit);
  return fit;
}
