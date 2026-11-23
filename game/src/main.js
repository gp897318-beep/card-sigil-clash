// main.js — bootstrap for SIGIL CLASH: wires state, rendering, input,
// audio and the ?shot= scenes, and exposes window.SIGIL for playtesting.

import { newGame, startRound, commitPlayerCard, nextRound, resetGame } from './state.js';
import { effectivePower } from './cards.js';
import { pickRivalCard } from './ai.js';
import { render, renderLegend, flash, clearCallouts } from './render.js';
import { bindInput } from './input.js';
import { applyShot } from './shots.js';
import { sfxFlip, sfxWin, sfxLose, sfxBurst, sfxDraw, sfxStart, setMuted, isMuted } from './audio.js';

let state = newGame();
let revealTimer = null;

const api = {
  get state() { return state; },
  start() {
    if (state.phase !== 'title') return;
    sfxStart();
    state.phase = 'commit';
    startRound(state, pickRivalCard);
    render(state);
  },
  pick(i) {
    if (state.phase !== 'commit') return;
    if (i < 0 || i >= state.hand.length) return;
    const broke = state.hand.every(c => c.cost > state.focus);
    if (!broke && state.hand[i].cost > state.focus) return;
    state.selected = i;
    render(state);
  },
  commit() {
    if (state.phase !== 'commit' || state.selected < 0) return;
    const detail = commitPlayerCard(state, state.selected);
    if (!detail) return;
    sfxFlip();
    if (detail.burst) { sfxBurst(); flash(); }
    if (detail.winner === 'you' && state.phase === 'over') sfxWin();
    if (detail.winner === 'rival' && state.phase === 'over') sfxLose();
    clearCallouts();
    render(state);
    if (state.phase === 'reveal') {
      clearTimeout(revealTimer);
      revealTimer = setTimeout(() => {
        nextRound(state, pickRivalCard);
        sfxDraw();
        render(state);
      }, 1600);
    }
  },
  restart() {
    clearTimeout(revealTimer);
    state = resetGame();
    state.phase = 'commit';
    startRound(state, pickRivalCard);
    render(state);
  },
  toggleMute() {
    setMuted(!isMuted());
    state.muted = isMuted();
    document.getElementById('btnMute').textContent = isMuted() ? '🔇 MUTED (M)' : '🔊 SOUND (M)';
  },
};

// Headless playtest autopilot: plays whole games with a simple strategy.
// 'best'  = always commit the strongest affordable card (should usually win).
// 'worst' = always commit the weakest affordable card (should usually lose).
// Returns a promise resolving to { winner, turns, youLife, rivalLife }.
api.autoplay = function (strategy) {
  return new Promise((resolve) => {
    const step = () => {
      if (state.phase === 'title') { api.start(); }
      if (state.phase === 'over') { resolve({ winner: state.winner, turns: state.turns, youLife: state.youLife, rivalLife: state.rivalLife }); return; }
      if (state.phase === 'commit') {
        // 'best' reads the hint: score each card by effective power against
        // the rival's favoured sigil, minus a little for Focus cost.
        // 'worst' plays the weakest affordable card.
        const hintSigil = state.rivalCommit ? state.rivalCommit.card.sigil : null;
        let best = -1, bestScore = strategy === 'worst' ? Infinity : -Infinity;
        state.hand.forEach((c, i) => {
          const broke = state.hand.every(x => x.cost > state.focus);
          if (!broke && c.cost > state.focus) return;
          let sc;
          if (strategy === 'worst') sc = c.value;
          else sc = effectivePower(c, hintSigil) - c.cost * 0.5;
          if (strategy === 'worst' ? sc < bestScore : sc > bestScore) { bestScore = sc; best = i; }
        });
        if (best < 0) { // no card at all (empty hand): cannot happen in a real game
          resolve({ winner: state.winner, turns: state.turns, youLife: state.youLife, rivalLife: state.rivalLife, stuck: true });
          return;
        }
        api.pick(best);
        api.commit();
      }
      setTimeout(step, 60);
    };
    step();
  });
};

window.SIGIL = api;
window.__game = api;

renderLegend();
render(state);

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  applyShot(shot, api);
} else {
  window.__shotReady = true;
}
