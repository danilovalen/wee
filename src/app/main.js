// The entry point: builds the panels, wires input, starts the loop, and exposes the
// text state and a fixed clock for tests and agents.
import { applyHand } from './hand.js';
import { bindUnlock } from './unlock.js';
import { bindSlots } from './slots.js';
import { buildLooks } from './looks.js';
import { buildAchieve } from './achieve.js';
import { bindSound } from './sound.js';
import { repaintIcons } from './icons.js';
import { applyPalette } from '../view/look.js';
import { buildMaker } from './maker.js';
import { buildPuzzles } from './puzzles.js';
import { buildProgress } from './progressCode.js';
import { TICK_MS } from '../rules/base.js';
import { replay, gameText } from '../rules/game.js';
import { parseLevel, emptyLevel } from '../level/format.js';
import { newHistory } from '../editor/history.js';
import { S, starterLevel } from '../editor/state.js';
import { portrait, $ } from './dom.js';
import { startSnow, windNow } from './snow.js';
import { fit, watchStage } from './fit.js';
import { buildPanels, syncPanel } from './panels.js';
import { change } from './undo.js';
import { bindInput } from './input.js';
import { setMode, frame, render, tick, report, copyReport } from './play.js';
import { bindCamera } from './camera.js';
import { bindZoom } from './zoom.js';
import { buildRooms, leaveOk, openRoom } from './rooms.js';
import { bindReplay } from './replay.js';
import { buildGenerator } from './generator.js';
import { buildCampaign } from './campaign.js';
import { bindNav, start } from './nav.js';
import { bindDebug } from './debug.js';
import { bindTutorial } from './tutorial.js';
import { bindGlyphs } from './glyphs.js';

// The chosen palette is on before anything is drawn (register 613).
applyPalette();
applyHand(); addEventListener('resize', applyHand);
S.level = starterLevel(portrait());

window.renderGameToText = () => S.mode === 'play' ? gameText(S.game, 'play') : JSON.stringify({ mode: 'edit', level: S.level });
window.advanceTime = ms => {
  if (S.mode !== 'play') return;
  for (let i = 0; i < Math.round(ms / TICK_MS); i++) tick();
  S.acc = 0; render();
};
window.wee = { draws: () => S.draws, demoRunning: () => !!S.demoRunning, trail: () => S.trail, blank: (w, h) => emptyLevel(w, h), report, replay, gameText, press: k => S.pending.push(k), setMode, getLevel: () => S.level, wind: () => windNow(), fxTypes: () => S.fx.map(f => f.type),
  // Powers have no switch on screen for now (register 653); the tests still turn them on and off here.
  setPower: (p, on) => { change(() => { S.level.powers[p] = on; }); if (S.game) S.pending.push(`power:${p}:${on ? 1 : 0}`); syncPanel(); }, loadLevel: l => { S.level = parseLevel(JSON.stringify(l)); S.history = newHistory(); S.stains = []; syncPanel(); fit(); }, stains: () => S.stains, dead: () => S.dead && S.dead.death };

buildPanels({ setMode, copyReport, fit });
buildRooms({ setMode, syncPanel, fit });
buildGenerator({ setMode, syncPanel, fit });
bindDebug();
bindReplay({ setMode, leaveOk, openRoom });
bindGlyphs(); bindTutorial(); bindUnlock(); bindSlots(); buildLooks(); buildAchieve(); bindSound();
buildProgress();
buildPuzzles({ setMode, syncPanel, fit });
buildMaker();
buildCampaign({ setMode, syncPanel, fit });
bindNav();
bindInput();
bindCamera(); bindZoom();
syncPanel();
addEventListener('resize', fit);
// A new palette or skin repaints the panels' icons and the room (registers 612, 613).
addEventListener('wee:look', () => { repaintIcons(); syncPanel(); S.redraw = true; });
watchStage();
// Any input may change what the room looks like; the next frame redraws it.
for (const t of ['pointerdown', 'pointermove', 'pointerup', 'keydown', 'click', 'input', 'change', 'resize']) addEventListener(t, () => { S.redraw = true; }, true);
fit();
setMode('edit');
startSnow($('snow'));
requestAnimationFrame(frame);
// The game opens where its address says: the menu, a level, a puzzle, the Sandbox. A shared room
// link, or ?sandbox, goes straight to the Sandbox.
start();
