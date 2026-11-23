// render.js — DOM rendering for SIGIL CLASH: HUD, hands, arena, legend,
// callouts, log, and the title / win / loss screens. All art is CSS + text.

import { SIGILS, SIGIL_ORDER, sigilBeats } from './cards.js';
import { MAX_LIFE, STREAK_FOR_BURST } from './state.js';

function el(id) { return document.getElementById(id); }

export function cardHTML(card, opts) {
  const o = opts || {};
  const sig = SIGILS[card.sigil];
  const cls = ['card'];
  if (o.faceDown) cls.push('face-down');
  if (o.playable) cls.push('playable');
  if (o.selected) cls.push('selected');
  if (o.cant) cls.push('cant');
  if (o.glow) cls.push('glow');
  if (o.faceDown) {
    return '<div class="' + cls.join(' ') + '"><div class="back">✦</div></div>';
  }
  return '<div class="' + cls.join(' ') + '" data-card="' + card.id + '">' +
    '<div class="cost" title="Focus cost">◆' + card.cost + '</div>' +
    '<div class="sig sig-' + card.sigil + '" style="background:' + sig.color + '">' + sig.glyph + '</div>' +
    '<div class="val">' + card.value + '</div>' +
    '<div class="nm">' + card.name + '</div>' +
    '<div class="rule">' + sig.name + ' ' + sig.glyph + ' · ' + sig.rule + '<br>Power ' + card.value + ' · Cost ◆' + card.cost + '</div>' +
    '</div>';
}

export function renderLegend() {
  el('legendrows').innerHTML = SIGIL_ORDER.map(k => {
    const s = SIGILS[k];
    return '<div class="sigrow"><span class="sigicon sig-' + k + '" style="background:' + s.color + '">' + s.glyph + '</span>' +
      '<span><b>' + s.name + '</b> — beats <b>' + SIGILS[s.beats].name + '</b> (+3)</span></div>';
  }).join('');
  el('wheelbox').innerHTML =
    '<b>THE SIGIL WHEEL</b><br>Flame ▲ beats Gale ✦<br>Gale ✦ beats Stone ■<br>Stone ■ beats Tide ●<br>Tide ● beats Flame ▲<br><br>' +
    '<b>WIN A CLASH:</b> higher power deals the margin as damage.<br>' +
    '<b>3 WINS IN A ROW:</b> Sigil Burst +6 damage!<br>' +
    '<b>FOCUS:</b> +1 each round, max 10. Cards cost ◆1–4.';
}

export function render(s) {
  // --- top bar ---
  el('lifeYou').querySelector('.num').textContent = s.youLife;
  el('lifeRival').querySelector('.num').textContent = s.rivalLife;
  el('lifeYou').classList.toggle('low', s.youLife <= 8);
  el('lifeRival').classList.toggle('low', s.rivalLife <= 8);
  el('turnbox').textContent = 'ROUND ' + s.round;
  let pips = '';
  for (let i = 0; i < s.focusMax; i++) pips += '<span class="pip' + (i < s.focus ? ' on' : '') + '"></span>';
  el('pips').innerHTML = pips + ' <b style="color:#ffe08a">' + s.focus + '</b>';
  el('youcount').textContent = s.hand.length + ' cards · deck ' + s.deck.length;
  el('rivalcount').textContent = s.rivalHand.length + ' cards · deck ' + s.rivalDeck.length;

  // --- rival hand (face-down) ---
  el('rivalhand').innerHTML = s.rivalHand.map(() =>
    '<div class="mini">✦</div>').join('');

  // --- hint + streak ---
  el('hint').innerHTML = s.phase === 'commit'
    ? '🔮 <b>RIVAL HINT</b><br>' + s.rivalHint
    : (s.phase === 'reveal' && s.result
      ? '⚔ <b>CLASH!</b> ' + s.result.you.name + ' ' + s.result.youPow + ' vs ' + s.result.foe.name + ' ' + s.result.foePow
      : '🔮 <b>RIVAL HINT</b><br>' + (s.rivalHint || 'The rival is choosing…'));
  const streak = Math.max(s.streakYou, s.streakRival);
  const who = s.streakYou >= s.streakRival ? 'YOU' : 'RIVAL';
  el('streakfill').style.width = (streak / STREAK_FOR_BURST * 100) + '%';
  el('streak').classList.toggle('blaze', streak >= 2);
  el('burstline').textContent = streak > 0
    ? (who + ' streak ×' + streak + (streak >= STREAK_FOR_BURST - 1 ? ' — ONE MORE FOR BURST!' : ''))
    : 'Win 3 in a row for Sigil Burst +6';

  // --- arena slots ---
  const slotR = el('slotRival'), slotY = el('slotYou');
  if (s.phase === 'commit') {
    slotR.innerHTML = cardHTML({ id: 'rival', sigil: 'flame', value: 0, cost: 0 }, { faceDown: true });
    slotR.classList.remove('midflip');
    slotY.innerHTML = s.selected >= 0
      ? cardHTML(s.hand[s.selected], { selected: true })
      : '<div class="card face-down" style="opacity:.35"><div class="back">?</div></div>';
    slotY.classList.remove('midflip');
  } else if (s.phase === 'reveal' && s.result) {
    slotR.innerHTML = cardHTML(s.result.foe, { glow: s.result.winner === 'rival' });
    slotY.innerHTML = cardHTML(s.result.you, { glow: s.result.winner === 'you' });
    slotR.classList.add('midflip'); slotY.classList.add('midflip');
  } else {
    slotR.innerHTML = '<div class="card face-down" style="opacity:.35"><div class="back">✦</div></div>';
    slotY.innerHTML = '<div class="card face-down" style="opacity:.35"><div class="back">✦</div></div>';
  }
  el('vs').style.display = (s.phase === 'reveal') ? 'block' : 'none';

  // --- damage float ---
  const dmg = el('dmg');
  if (s.phase === 'reveal' && s.result && s.result.damage > 0) {
    dmg.textContent = (s.result.winner === 'you' ? '−' : '+') + s.result.damage +
      '  ' + (s.result.winner === 'you' ? 'TO RIVAL!' : 'TO YOU!') +
      (s.result.burst ? '  💥 SIGIL BURST!' : '');
    dmg.classList.remove('show'); void dmg.offsetWidth; dmg.classList.add('show');
  } else { dmg.classList.remove('show'); }

  // --- phase line ---
  el('phase').textContent =
    s.phase === 'commit' ? 'Commit a card to the arena — then reveal together!' :
    s.phase === 'reveal' ? (s.result.winner === 'you' ? 'You won the clash!' :
      s.result.winner === 'rival' ? 'The rival won the clash…' : 'A dead-even clash!') :
    s.phase === 'over' ? (s.winner === 'you' ? 'VICTORY!' : 'DEFEAT…') :
    'Welcome to the arena.';

  // --- player hand ---
  el('hand').innerHTML = s.hand.map((c, i) => {
    const afford = c.cost <= s.focus && s.phase === 'commit';
    return cardHTML(c, {
      playable: afford, selected: i === s.selected,
      cant: !afford && s.phase === 'commit',
    });
  }).join('');
  el('hand').querySelectorAll('.card').forEach((node, i) => {
    node.addEventListener('click', () => window.SIGIL.pick(i));
  });

  // --- log ---
  el('loglines').innerHTML = s.log.map(l => '<div>' + l + '</div>').join('') || '<div>The arena awaits…</div>';

  // --- commit button ---
  el('btnCommit').disabled = !(s.phase === 'commit' && s.selected >= 0 &&
    s.hand[s.selected] && s.hand[s.selected].cost <= s.focus);

  // --- screens ---
  el('titleScreen').classList.toggle('hidden', s.phase !== 'title');
  const over = s.phase === 'over';
  el('endScreen').classList.toggle('hidden', !over);
  if (over) {
    const win = s.winner === 'you';
    el('endTitle').textContent = win ? '★ VICTORY ★' : '☠ DEFEAT ☠';
    el('endTitle').className = 'big ' + (win ? 'win' : 'lose');
    el('endStats').innerHTML =
      'Rounds played: <b>' + s.turns + '</b> &nbsp;·&nbsp; Damage dealt: <b>' + s.damageDealt + '</b>' +
      ' &nbsp;·&nbsp; Damage taken: <b>' + s.damageTaken + '</b><br>' +
      'Cards played: <b>' + s.cardsPlayed + '</b> &nbsp;·&nbsp; Clashes won: <b>' + s.clashesWon + '</b>' +
      ' &nbsp;·&nbsp; Final Life — You <b>' + s.youLife + '</b> : Rival <b>' + s.rivalLife + '</b><br>' +
      (win ? 'The arena is yours. The sigils bow to you.' : 'The rival keeps the arena… this time. Rematch?');
  }
}

export function showCallouts(list) {
  el('callouts').innerHTML = list.map(c =>
    '<div class="callout" style="left:' + c.x + 'px; top:' + c.y + 'px;">' + c.text + '</div>').join('');
}

export function clearCallouts() { el('callouts').innerHTML = ''; }

export function flash() {
  const f = el('flash');
  f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
}
