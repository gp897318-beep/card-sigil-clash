// audio.js — tiny WebAudio bleeps, generated in code. No audio files.
let ctx = null;
let muted = false;

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function beep(freq, dur, type, vol, when) {
  if (muted) return;
  const c = ac(); if (!c) return;
  const t = c.currentTime + (when || 0);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol || 0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

export function sfxFlip()  { beep(520, 0.09, 'triangle', 0.10); beep(780, 0.08, 'triangle', 0.08, 0.06); }
export function sfxPick()  { beep(660, 0.06, 'square', 0.06); }
export function sfxWin()   { [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.16, 'triangle', 0.12, i * 0.09)); }
export function sfxLose()  { [392, 330, 262, 196].forEach((f, i) => beep(f, 0.18, 'sawtooth', 0.07, i * 0.11)); }
export function sfxBurst() { [880, 1108, 1318, 1760].forEach((f, i) => beep(f, 0.12, 'sawtooth', 0.09, i * 0.05)); beep(220, 0.3, 'sine', 0.12, 0.1); }
export function sfxDraw()  { beep(440, 0.07, 'triangle', 0.07); }
export function sfxStart() { beep(523, 0.1, 'triangle', 0.1); beep(784, 0.14, 'triangle', 0.1, 0.08); }
