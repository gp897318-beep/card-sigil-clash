// input.js — click + keyboard input for SIGIL CLASH.
// Keys: 1-6 pick a hand card, Enter/Space commit, R restart, M mute.

import { sfxPick } from './audio.js';

export function bindInput(api) {
  document.getElementById('btnCommit').addEventListener('click', () => api.commit());
  document.getElementById('btnStart').addEventListener('click', () => api.start());
  document.getElementById('btnAgain').addEventListener('click', () => api.restart());
  document.getElementById('btnNew').addEventListener('click', () => api.restart());
  document.getElementById('btnMute').addEventListener('click', () => api.toggleMute());
  document.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '6') {
      const i = Number(e.key) - 1;
      api.pick(i);
      sfxPick();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      api.commit();
    } else if (e.key === 'r' || e.key === 'R') {
      api.restart();
    } else if (e.key === 'm' || e.key === 'M') {
      api.toggleMute();
    }
  });
}
