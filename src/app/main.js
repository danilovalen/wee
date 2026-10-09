// The entry point: builds the panels, wires input, starts the loop, and exposes the
// text state and a fixed clock for tests and agents.
import { TICK_MS } from '../rules/base.js';
import { replay, gameText } from '../rules/game.js';
import { parseLevel } from '../level/format.js';
import { S, starterLevel } from '../editor/state.js';
import { portrait } from './dom.js';
import { fit } from './fit.js';
import { buildPanels, syncPanel } from './panels.js';
import { bindInput } from './input.js';
import { setMode, frame, render, tick, report, copyReport } from './play.js';

S.level = starterLevel(portrait());

window.renderGameToText = () => S.mode === 'play' ? gameText(S.game, 'play') : JSON.stringify({ mode: 'edit', level: S.level });
window.advanceTime = ms => {
  if (S.mode !== 'play') return;
  for (let i = 0; i < Math.round(ms / TICK_MS); i++) tick();
  S.acc = 0; render();
};
window.wee = { report, replay, gameText, press: k => S.pending.push(k), setMode, getLevel: () => S.level, loadLevel: l => { S.level = parseLevel(JSON.stringify(l)); syncPanel(); fit(); } };

buildPanels({ setMode, copyReport, fit });
bindInput();
syncPanel();
addEventListener('resize', fit);
fit();
setMode('edit');
requestAnimationFrame(frame);
