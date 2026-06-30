// Sky Word — pure game logic (no DOM). Guess evaluation, daily seeding,
// hard-mode constraints, keyboard state aggregation, and constellation naming.

import { answerPool } from './words.js';

// Day 0 of Sky Word. The daily puzzle number counts up from here.
const EPOCH = Date.UTC(2026, 0, 1); // 2026-01-01
const DAY_MS = 86400000;

// ---- small deterministic RNG ---------------------------------------------

// xfnv1a string hash -> 32-bit seed.
function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

// mulberry32 PRNG: deterministic float in [0,1) from a 32-bit seed.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic Fisher-Yates shuffle (returns a new array).
function seededShuffle(arr, seed) {
  const out = arr.slice();
  const rnd = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---- daily puzzle ---------------------------------------------------------

/** Local YYYY-MM-DD for a given Date (defaults to now). */
export function localDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Whole days from EPOCH to the given local date (>= 0 after launch). */
export function dailyIndex(d = new Date()) {
  const local = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((local - EPOCH) / DAY_MS);
}

/** Human-facing puzzle number, 1-based. */
export function dailyNumber(d = new Date()) {
  return dailyIndex(d) + 1;
}

// The daily always uses 5-letter words, drawn from a fixed shuffled order so
// the sequence isn't the (alphabetical) source order.
const DAILY_LEN = 5;
const DAILY_ORDER = seededShuffle(answerPool(DAILY_LEN), hashSeed('sky-word-daily-v1'));

export function dailyAnswer(d = new Date()) {
  const i = ((dailyIndex(d) % DAILY_ORDER.length) + DAILY_ORDER.length) % DAILY_ORDER.length;
  return DAILY_ORDER[i];
}

/** ms until the next local midnight — for the "next transmission" countdown. */
export function msUntilTomorrow(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - now.getTime();
}

/** Random answer for Unlimited/Practice play. */
export function randomAnswer(len) {
  const pool = answerPool(len);
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---- constellations -------------------------------------------------------

const CONSTELLATIONS = [
  'Andromeda', 'Aquila', 'Ara', 'Aries', 'Auriga', 'Boötes', 'Caelum', 'Camelopardalis',
  'Cancer', 'Canis Major', 'Canis Minor', 'Capricornus', 'Carina', 'Cassiopeia', 'Centaurus',
  'Cepheus', 'Cetus', 'Columba', 'Corona Borealis', 'Corvus', 'Crater', 'Crux', 'Cygnus',
  'Delphinus', 'Draco', 'Equuleus', 'Eridanus', 'Fornax', 'Gemini', 'Grus', 'Hercules',
  'Horologium', 'Hydra', 'Hydrus', 'Indus', 'Lacerta', 'Leo', 'Leo Minor', 'Lepus', 'Libra',
  'Lupus', 'Lynx', 'Lyra', 'Mensa', 'Monoceros', 'Norma', 'Octans', 'Ophiuchus', 'Orion',
  'Pavo', 'Pegasus', 'Perseus', 'Phoenix', 'Pictor', 'Pisces', 'Puppis', 'Pyxis', 'Reticulum',
  'Sagitta', 'Sagittarius', 'Scorpius', 'Sculptor', 'Scutum', 'Serpens', 'Sextans', 'Taurus',
  'Telescopium', 'Triangulum', 'Tucana', 'Ursa Major', 'Ursa Minor', 'Vela', 'Virgo', 'Volans',
  'Vulpecula', 'Lynx Minor', 'Aquarius', 'Antlia', 'Apus', 'Chamaeleon', 'Circinus', 'Dorado',
];

/** Deterministic constellation name for a seed string (same daily -> same name). */
export function constellationFor(seedStr) {
  const i = hashSeed(String(seedStr)) % CONSTELLATIONS.length;
  return CONSTELLATIONS[i];
}

// ---- guess evaluation ------------------------------------------------------

/**
 * Score a guess against the answer with correct duplicate-letter handling.
 * Returns an array of 'correct' | 'present' | 'absent', one per position.
 */
export function evaluateGuess(guess, answer) {
  const n = answer.length;
  const result = new Array(n).fill('absent');
  const counts = {};
  for (const ch of answer) counts[ch] = (counts[ch] || 0) + 1;

  // Pass 1: exact matches consume a letter from the pool.
  for (let i = 0; i < n; i++) {
    if (guess[i] === answer[i]) {
      result[i] = 'correct';
      counts[guess[i]]--;
    }
  }
  // Pass 2: present-but-misplaced, only while letters remain in the pool.
  for (let i = 0; i < n; i++) {
    if (result[i] === 'correct') continue;
    const c = guess[i];
    if (counts[c] > 0) {
      result[i] = 'present';
      counts[c]--;
    }
  }
  return result;
}

const STATE_RANK = { absent: 0, present: 1, correct: 2 };

/** Best-known state per letter across all guesses (for keyboard coloring). */
export function keyStates(guesses) {
  const map = {};
  for (const g of guesses) {
    for (let i = 0; i < g.word.length; i++) {
      const c = g.word[i];
      const s = g.result[i];
      if (!(c in map) || STATE_RANK[s] > STATE_RANK[map[c]]) map[c] = s;
    }
  }
  return map;
}

// ---- the game model --------------------------------------------------------

export class Game {
  constructor({ mode = 'daily', len = 5, answer, seed, hardMode = false }) {
    this.mode = mode; // 'daily' | 'unlimited'
    this.len = len;
    this.maxGuesses = 6;
    this.answer = (answer || '').toLowerCase();
    this.seed = seed != null ? seed : this.answer;
    this.hardMode = hardMode;
    this.guesses = []; // [{ word, result }]
    this.current = ''; // letters typed for the active row
    this.status = 'playing'; // 'playing' | 'won' | 'lost'
  }

  get rowsLeft() {
    return this.maxGuesses - this.guesses.length;
  }

  addLetter(ch) {
    if (this.status !== 'playing') return false;
    if (this.current.length >= this.len) return false;
    if (!/^[a-z]$/.test(ch)) return false;
    this.current += ch;
    return true;
  }

  removeLetter() {
    if (this.status !== 'playing' || !this.current.length) return false;
    this.current = this.current.slice(0, -1);
    return true;
  }

  /**
   * Validate hard-mode constraints against revealed hints.
   * Returns null if OK, or an error message string.
   */
  hardModeError(guess) {
    if (!this.hardMode || !this.guesses.length) return null;
    const fixed = new Array(this.len).fill(null); // position -> required letter (greens)
    const required = new Map(); // letter -> min count it must appear (yellows+greens)

    for (const g of this.guesses) {
      const per = {};
      for (let i = 0; i < this.len; i++) {
        const c = g.word[i];
        const s = g.result[i];
        if (s === 'correct') {
          fixed[i] = c;
          per[c] = (per[c] || 0) + 1;
        } else if (s === 'present') {
          per[c] = (per[c] || 0) + 1;
        }
      }
      for (const [c, k] of Object.entries(per)) {
        required.set(c, Math.max(required.get(c) || 0, k));
      }
    }

    for (let i = 0; i < this.len; i++) {
      if (fixed[i] && guess[i] !== fixed[i]) {
        return `Hard mode: spot ${i + 1} must be ${fixed[i].toUpperCase()}.`;
      }
    }
    const have = {};
    for (const c of guess) have[c] = (have[c] || 0) + 1;
    for (const [c, k] of required) {
      if ((have[c] || 0) < k) {
        return `Hard mode: guess must use ${c.toUpperCase()}.`;
      }
    }
    return null;
  }

  /**
   * Commit the current row. Caller must have already validated the word is a
   * real word. Returns { ok, error?, result?, status }.
   */
  submit() {
    if (this.status !== 'playing') return { ok: false, error: 'Game over.' };
    if (this.current.length !== this.len) {
      return { ok: false, error: 'Signal too weak — not enough letters to lock in.' };
    }
    const hmErr = this.hardModeError(this.current);
    if (hmErr) return { ok: false, error: hmErr };

    const word = this.current;
    const result = evaluateGuess(word, this.answer);
    this.guesses.push({ word, result });
    this.current = '';

    if (word === this.answer) this.status = 'won';
    else if (this.guesses.length >= this.maxGuesses) this.status = 'lost';

    return { ok: true, result, word, status: this.status };
  }

  /** Serialize just enough to resume an in-progress game after a refresh. */
  toJSON() {
    return {
      mode: this.mode,
      len: this.len,
      answer: this.answer,
      seed: this.seed,
      hardMode: this.hardMode,
      guesses: this.guesses,
      status: this.status,
    };
  }

  static fromJSON(data) {
    const g = new Game(data);
    g.guesses = Array.isArray(data.guesses) ? data.guesses : [];
    g.status = data.status || 'playing';
    return g;
  }
}
