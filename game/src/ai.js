// ai.js — the rival's commit logic for SIGIL CLASH.
// The rival reads YOUR last clash: it favours the sigil that beats the sigil
// you played most recently, and it spends its Focus on the strongest card it
// can afford that fits that plan. Its choice is telegraphed to you as a hint
// (its favoured sigil) a full beat before you commit, so every round is a
// readable counter-pick puzzle.

import { sigilBeats } from './cards.js';

// Pick the rival's face-down commit for this round.
// s.focus is the PLAYER's focus; the rival tracks its own focus in s.rivalFocus.
export function pickRivalCard(s) {
  if (s.rivalFocus === undefined) s.rivalFocus = 3;
  const affordable = s.rivalHand.filter(c => c.cost <= s.rivalFocus);
  const pool = affordable.length ? affordable : s.rivalHand.slice();
  // The sigil you played last round is the one the rival wants to beat.
  const yourLast = s.result ? s.result.you.sigil : null;
  let best = null, bestScore = -1;
  for (const c of pool) {
    let score = c.value * 2 - c.cost;
    if (yourLast && sigilBeats(c.sigil, yourLast)) score += 2; // light counter-pick
    if (c.value >= 9) score += 1;                             // finishers
    score += Math.random() * 3;                               // a little nerve
    if (score > bestScore) { bestScore = score; best = c; }
  }
  const idx = s.rivalHand.indexOf(best);
  s.rivalHand.splice(idx, 1);
  s.rivalFocus = Math.min(10, s.rivalFocus + 1);
  s.rivalFocus -= best.cost;
  if (s.rivalFocus < 0) s.rivalFocus = 0;
  return best;
}

// A cheap, readable summary of what the rival is planning, for the log.
export function rivalPlanText(s) {
  if (!s.rivalCommit) return '';
  return 'Rival committed a face-down card to the arena.';
}
