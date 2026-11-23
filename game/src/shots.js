// shots.js — deterministic ?shot= scenes for the four screenshots.
// Each scene builds a fixed state (seeded RNG, no randomness) and sets
// window.__shotReady = true once rendered. Normal play never uses these.

import { newGame } from './state.js';
import { seededRand, SIGILS } from './cards.js';
import { render, showCallouts, renderLegend } from './render.js';

function fixedHand(s) {
  // A strong, legible hand: every sigil present, values 3..10, costs 1..4.
  s.hand = [
    { id: 'h1', name: 'Inferno',     sigil: 'flame', value: 10, cost: 4 },
    { id: 'h2', name: 'Tidal Surge', sigil: 'tide',  value: 8,  cost: 3 },
    { id: 'h3', name: 'Storm Wing',  sigil: 'gale',  value: 6,  cost: 2 },
    { id: 'h4', name: 'Granite Wall',sigil: 'stone', value: 5,  cost: 2 },
    { id: 'h5', name: 'Ember Spark', sigil: 'flame', value: 4,  cost: 1 },
    { id: 'h6', name: 'Ripple Dart', sigil: 'tide',  value: 3,  cost: 1 },
  ];
  s.rivalHand = Array.from({ length: 6 }, (_, i) => ({ id: 'r' + i, name: '?', sigil: 'flame', value: 0, cost: 0 }));
}

function baseState() {
  const s = newGame(seededRand(20261123));
  s.phase = 'commit';
  fixedHand(s);
  s.log = [];
  return s;
}

export function applyShot(shot, api) {
  const s = api.state;
  if (shot === 'title') {
    const t = baseState();
    t.phase = 'title';
    t.log = ['The arena awaits…', 'Both duelists draw 6 cards.', 'The sigils hum with power.'];
    Object.assign(s, t);
    render(s); renderLegend();
    window.__shotReady = true;
    return;
  }
  if (shot === 'cover') {
    const t = baseState();
    t.round = 6; t.youLife = 24; t.rivalLife = 8; t.focus = 6;
    t.streakYou = 2; t.streakRival = 0;
    t.rivalHint = 'Rival favours Gale ✦ — a Gale card beats Stone (+3). Counter it!';
    const you = { id: 'c1', name: 'Inferno', sigil: 'flame', value: 10, cost: 4 };
    const foe = { id: 'c2', name: 'Storm Wing', sigil: 'gale', value: 6, cost: 2 };
    t.youCommit = { card: you };
    t.rivalCommit = { card: foe };
    // Flame beats Gale: 10 + 3 = 13 vs 6 → margin 7, bonus 3, damage 10.
    t.result = { winner: 'you', margin: 7, bonus: 3, damage: 10, burst: false, youPow: 13, foePow: 6, you, foe };
    t.phase = 'reveal';
    t.lastWinner = 'you'; t.lastMargin = 7; t.lastBonus = 3; t.lastBurst = false;
    t.turns = 5; t.damageDealt = 22; t.damageTaken = 6; t.cardsPlayed = 5; t.clashesWon = 4;
    t.log = [
      'You win the clash! Inferno 13 vs 6 — 10 damage',
      'Rival wins the clash. Quake Stomp 9 vs 7 — you take 2 damage',
      'You win the clash! Tidal Surge 11 vs 8 — 3 damage',
      'Round 6 — rival committed face-down (Gale favoured).',
    ];
    Object.assign(s, t);
    render(s); renderLegend();
    showCallouts([
      { x: 300, y: 150, text: '⬆ BOTH CARDS FLIP TOGETHER — higher power wins' },
      { x: 560, y: 60,  text: 'SIGIL STREAK ×2 — one more for Burst +6!' },
      { x: 60,  y: 60,  text: 'RIVAL HINT: it favours Gale — counter it!' },
      { x: 430, y: 470, text: 'YOUR HAND — big value, big cost gem, sigil shape' },
    ]);
    window.__shotReady = true;
    return;
  }
  if (shot === 'win') {
    const t = baseState();
    t.round = 9; t.youLife = 17; t.rivalLife = 0; t.focus = 5;
    t.turns = 8; t.damageDealt = 30; t.damageTaken = 13; t.cardsPlayed = 8; t.clashesWon = 6;
    t.winner = 'you'; t.phase = 'over';
    t.log = ['You win the clash! Inferno 13 vs 6 — 10 damage', 'The rival falls to 0 Life!'];
    Object.assign(s, t);
    render(s); renderLegend();
    window.__shotReady = true;
    return;
  }
  if (shot === 'loss') {
    const t = baseState();
    t.round = 10; t.youLife = 0; t.rivalLife = 12; t.focus = 4;
    t.turns = 9; t.damageDealt = 18; t.damageTaken = 30; t.cardsPlayed = 9; t.clashesWon = 3;
    t.winner = 'rival'; t.phase = 'over';
    t.log = ['Rival wins the clash. Abyss Call 12 vs 9 — you take 3 damage', 'You fall to 0 Life…'];
    Object.assign(s, t);
    render(s); renderLegend();
    window.__shotReady = true;
    return;
  }
}
