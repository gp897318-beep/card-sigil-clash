// cards.js — the sigil deck: every card definition for SIGIL CLASH.
// A card has: id, name, sigil (flame/gale/stone/tide), value (power), cost (Focus).
// Sigils are told apart by COLOUR and SHAPE, never by text alone:
//   Flame = red triangle ▲   Gale = green star ✦
//   Stone = amber square ■   Tide = blue droplet ●

export const SIGILS = {
  flame: { key: 'flame', name: 'Flame', color: '#ff5a3c', glyph: '▲', beats: 'gale',
           rule: 'Beats Gale (+3)' },
  gale:  { key: 'gale',  name: 'Gale',  color: '#37c978', glyph: '✦', beats: 'stone',
           rule: 'Beats Stone (+3)' },
  stone: { key: 'stone', name: 'Stone', color: '#c98f4e', glyph: '■', beats: 'tide',
           rule: 'Beats Tide (+3)' },
  tide:  { key: 'tide',  name: 'Tide',  color: '#3fa9f5', glyph: '●', beats: 'flame',
           rule: 'Beats Flame (+3)' },
};

export const SIGIL_ORDER = ['flame', 'gale', 'stone', 'tide'];

// Cost follows power: value 2-4 costs 1 Focus, 5-7 costs 2, 8-9 costs 3, 10 costs 4.
export function costForValue(v) {
  if (v <= 4) return 1;
  if (v <= 7) return 2;
  if (v <= 9) return 3;
  return 4;
}

const NAMES = {
  flame: ['Ember Spark', 'Firebrand', 'Pyre Fang', 'Cinder Roar', 'Blaze Crown', 'Inferno', 'Ash Phoenix', 'Magma Heart'],
  gale:  ['Zephyr Cut', 'Storm Wing', 'Howling Gale', 'Sky Talon', 'Tempest', 'Wind Dancer', 'Cyclone', 'Thunder Gale'],
  stone: ['Pebble Fist', 'Granite Wall', 'Boulder Slam', 'Mountain Guard', 'Quake Stomp', 'Diamond Core', 'Titan Grip', 'Iron Peak'],
  tide:  ['Ripple Dart', 'Wave Crash', 'Deep Current', 'Tidal Surge', 'Frost Drop', 'Ocean Maw', 'Rain Spear', 'Abyss Call'],
};

// Build the 30-card deck: 8 Flame, 8 Gale, 7 Stone, 7 Tide.
// Values spread 2..10 so every hand holds cheap plays and big finishers.
export function buildDeck() {
  const deck = [];
  let id = 0;
  const values = {
    flame: [3, 5, 6, 7, 8, 9, 10, 4],
    gale:  [2, 4, 5, 6, 8, 9, 10, 7],
    stone: [3, 4, 6, 7, 8, 9, 10],
    tide:  [2, 5, 6, 7, 8, 9, 10],
  };
  for (const sigil of SIGIL_ORDER) {
    values[sigil].forEach((v, i) => {
      deck.push({
        id: 'c' + (id++),
        name: NAMES[sigil][i],
        sigil,
        value: v,
        cost: costForValue(v),
      });
    });
  }
  return deck; // 30 cards
}

// Fisher-Yates shuffle. `rand` defaults to Math.random; shots pass a seeded one.
export function shuffle(deck, rand) {
  const r = rand || Math.random;
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// Small deterministic RNG (mulberry32) for the fixed ?shot= scenes.
export function seededRand(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Sigil advantage: does sigil A beat sigil B on the wheel?
export function sigilBeats(a, b) {
  return SIGILS[a].beats === b;
}

// Effective power of a card against an opposing sigil (+3 on the wheel).
export function effectivePower(card, foeSigil) {
  return card.value + (sigilBeats(card.sigil, foeSigil) ? 3 : 0);
}
