// state.js — game state, round flow and clash resolution for SIGIL CLASH.
// One round: both sides commit one card face-down to the arena, reveal together,
// higher effective power wins; winner deals margin + sigil bonus damage.
// Three clash wins in a row unleash a Sigil Burst (+6 damage).

import { buildDeck, shuffle, effectivePower, sigilBeats, SIGILS } from './cards.js';

export const MAX_LIFE = 30;
export const HAND_SIZE = 6;
export const MAX_FOCUS = 10;
export const STREAK_FOR_BURST = 3;
export const BURST_DAMAGE = 6;
export const DAMAGE_CAP = 8; // clash damage (before a Burst) never exceeds 8

export function newGame(rand) {
  const deck = shuffle(buildDeck(), rand);
  const rivalDeck = shuffle(buildDeck(), rand);
  const s = {
    phase: 'title',            // title | commit | reveal | over
    round: 1,
    youLife: MAX_LIFE,
    rivalLife: MAX_LIFE,
    focus: 4,
    focusMax: MAX_FOCUS,
    deck, rivalDeck,
    discard: [], rivalDiscard: [],
    hand: [], rivalHand: [],
    selected: -1,              // index into hand, or -1
    youCommit: null,           // {card} once committed
    rivalCommit: null,         // {card, hint} — rival commits first, face-down
    rivalHint: '',             // telegraphed hint text about the rival commit
    streakYou: 0, streakRival: 0,
    lastWinner: null,          // 'you' | 'rival' | 'draw'
    lastMargin: 0, lastBonus: 0, lastBurst: false,
    turns: 0, damageDealt: 0, damageTaken: 0, cardsPlayed: 0, clashesWon: 0,
    log: [],
    winner: null,              // 'you' | 'rival' once over
    muted: false,
    result: null,              // last clash detail for the renderer
  };
  drawUp(s, rand);
  drawUpRival(s, rand);
  return s;
}

export function drawUp(s, rand) {
  while (s.hand.length < HAND_SIZE && s.deck.length > 0) {
    s.hand.push(s.deck.pop());
  }
  if (s.deck.length === 0 && s.discard.length > 0) {
    s.deck = shuffle(s.discard, rand); s.discard = [];
    drawUp(s, rand);
  }
}

export function drawUpRival(s, rand) {
  while (s.rivalHand.length < HAND_SIZE && s.rivalDeck.length > 0) {
    s.rivalHand.push(s.rivalDeck.pop());
  }
  if (s.rivalDeck.length === 0 && s.rivalDiscard.length > 0) {
    s.rivalDeck = shuffle(s.rivalDiscard, rand); s.rivalDiscard = [];
    drawUpRival(s, rand);
  }
}

export function logLine(s, text) {
  s.log.unshift(text);
  if (s.log.length > 9) s.log.length = 9;
}

// The rival commits first (face-down) and its sigil is telegraphed as a hint.
// `pickRivalCard` comes from ai.js — injected so state.js stays rule-only.
export function startRound(s, pickRivalCard) {
  s.phase = 'commit';
  s.selected = -1;
  s.youCommit = null;
  s.result = null;
  const pick = pickRivalCard(s);
  s.rivalCommit = { card: pick };
  const sig = SIGILS[pick.sigil];
  s.rivalHint = 'Rival favours ' + sig.name + ' ' + sig.glyph +
    ' — a ' + sig.name + ' card beats ' + SIGILS[sig.beats].name + ' (+3). Counter it!';
  logLine(s, 'Round ' + s.round + ' — rival committed face-down (' + sig.name + ' favoured).');
}

// Can the player afford this hand card right now?
export function canAfford(s, card) {
  return card.cost <= s.focus;
}

// Player commits a hand card to the arena, then the clash resolves.
// Desperation rule: if NO card in hand is affordable, the cheapest card
// may be committed for free, so a round can never soft-lock.
export function commitPlayerCard(s, handIndex) {
  if (s.phase !== 'commit') return null;
  if (handIndex < 0 || handIndex >= s.hand.length) return null;
  const card = s.hand[handIndex];
  const broke = s.hand.every(c => c.cost > s.focus);
  if (!broke && !canAfford(s, card)) return null;
  s.hand.splice(handIndex, 1);
  s.focus = Math.max(0, s.focus - (broke ? 0 : card.cost));
  s.cardsPlayed++;
  s.youCommit = { card };
  s.selected = -1;
  return resolveClash(s);
}

// Both cards flip together. Returns the clash detail.
export function resolveClash(s) {
  const you = s.youCommit.card;
  const foe = s.rivalCommit.card;
  const youPow = effectivePower(you, foe.sigil);
  const foePow = effectivePower(foe, you.sigil);
  const youBonus = sigilBeats(you.sigil, foe.sigil);
  const foeBonus = sigilBeats(foe.sigil, you.sigil);
  let winner, margin, bonus = 0;
  if (youPow > foePow) { winner = 'you'; margin = youPow - foePow; bonus = youBonus ? 3 : 0; }
  else if (foePow > youPow) { winner = 'rival'; margin = foePow - youPow; bonus = foeBonus ? 3 : 0; }
  else { winner = 'draw'; margin = 0; }
  let damage = winner === 'draw' ? 0 : Math.min(DAMAGE_CAP, Math.max(1, margin) + bonus);
  let burst = false;
  if (winner === 'you') {
    s.streakYou++; s.streakRival = 0;
    if (s.streakYou >= STREAK_FOR_BURST) { damage += BURST_DAMAGE; burst = true; s.streakYou = 0; }
    s.rivalLife = Math.max(0, s.rivalLife - damage);
    s.damageDealt += damage; s.clashesWon++;
  } else if (winner === 'rival') {
    s.streakRival++; s.streakYou = 0;
    if (s.streakRival >= STREAK_FOR_BURST) { damage += BURST_DAMAGE; burst = true; s.streakRival = 0; }
    s.youLife = Math.max(0, s.youLife - damage);
    s.damageTaken += damage;
  } else {
    s.streakYou = 0; s.streakRival = 0;
  }
  s.lastWinner = winner; s.lastMargin = margin; s.lastBonus = bonus; s.lastBurst = burst;
  s.turns++;
  s.discard.push(you); s.rivalDiscard.push(foe);
  const detail = { winner, margin, bonus, damage, burst, youPow, foePow, you, foe };
  s.result = detail;
  s.phase = 'reveal';
  if (winner === 'you') {
    logLine(s, 'You win the clash! ' + you.name + ' ' + youPow + ' vs ' + foePow + ' — ' + damage + ' damage' + (burst ? ' (SIGIL BURST!)' : ''));
  } else if (winner === 'rival') {
    logLine(s, 'Rival wins the clash. ' + foe.name + ' ' + foePow + ' vs ' + youPow + ' — you take ' + damage + ' damage' + (burst ? ' (RIVAL BURST!)' : ''));
  } else {
    logLine(s, 'Dead even! ' + youPow + ' vs ' + foePow + ' — no damage, streaks reset.');
  }
  if (s.rivalLife <= 0) { s.winner = 'you'; s.phase = 'over'; }
  else if (s.youLife <= 0) { s.winner = 'rival'; s.phase = 'over'; }
  return detail;
}

// After the reveal beat, deal fresh cards and open the next round.
export function nextRound(s, pickRivalCard, rand) {
  if (s.phase === 'over') return;
  s.round++;
  s.focus = Math.min(MAX_FOCUS, s.focus + 2);
  drawUp(s, rand);
  drawUpRival(s, rand);
  startRound(s, pickRivalCard);
}

export function resetGame(rand) {
  return newGame(rand);
}
