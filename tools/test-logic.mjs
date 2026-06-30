// Deterministic unit checks for Sky Word's pure logic. Run: node tools/test-logic.mjs
import {
  evaluateGuess,
  keyStates,
  dailyAnswer,
  dailyNumber,
  constellationFor,
  Game,
} from '../js/game.js';
import { answerPool, isLocalWord } from '../js/words.js';
import { buildShareText } from '../js/share.js';

let pass = 0;
let fail = 0;
function eq(name, got, want) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) {
    pass++;
  } else {
    fail++;
    console.error(`✗ ${name}\n    got:  ${g}\n    want: ${w}`);
  }
}
function ok(name, cond) {
  if (cond) pass++;
  else {
    fail++;
    console.error(`✗ ${name}`);
  }
}

// --- evaluateGuess basics ---
eq('all correct', evaluateGuess('array', 'array'), ['correct', 'correct', 'correct', 'correct', 'correct']);
eq('all absent', evaluateGuess('mount', 'array'), ['absent', 'absent', 'absent', 'absent', 'absent']);

// --- duplicate-letter handling ---
// answer "sassy" (s a s s y), guess "essay" (e s s a y)
eq('dup letters: essay vs sassy', evaluateGuess('essay', 'sassy'), [
  'absent', 'present', 'correct', 'present', 'correct',
]);
// guess has more of a letter than the answer holds
// answer "abide" (one b), guess "babes": b a b e s
eq('extra dup not over-marked', evaluateGuess('babes', 'abide'), [
  'present', 'present', 'absent', 'present', 'absent',
]);

// --- keyStates aggregation prefers best state ---
const ks = keyStates([
  { word: 'array', result: ['present', 'absent', 'absent', 'absent', 'absent'] },
  { word: 'about', result: ['correct', 'absent', 'absent', 'absent', 'absent'] },
]);
eq("keyStates upgrades 'a' present->correct", ks.a, 'correct');

// --- daily determinism ---
const d = new Date(2026, 5, 30); // 2026-06-30 local
ok('daily #181 on 2026-06-30', dailyNumber(d) === 181);
eq('daily answer 2026-06-30 == array', dailyAnswer(d), 'array');
ok('daily answer is in the answer pool', answerPool(5).includes(dailyAnswer(d)));
ok('daily answer stable across calls', dailyAnswer(d) === dailyAnswer(new Date(2026, 5, 30)));

// --- constellation determinism ---
ok('constellation 2026-06-30 == Aquarius', constellationFor('2026-06-30') === 'Aquarius');
ok('constellation stable', constellationFor('2026-06-30') === constellationFor('2026-06-30'));

// --- isLocalWord ---
ok('isLocalWord accepts a real listed word', isLocalWord('about') === true);
ok('isLocalWord rejects gibberish', isLocalWord('zzzzz') === false);
ok('isLocalWord is case-insensitive', isLocalWord('ABOUT') === true);

// --- Game flow + hard mode ---
const g = new Game({ mode: 'daily', len: 5, answer: 'array', hardMode: true });
'arose'.split('').forEach((c) => g.addLetter(c));
const r1 = g.submit(); // arose: a correct, r correct, others absent
ok('submit ok', r1.ok === true);
ok('still playing after first guess', g.status === 'playing');

// hard mode: next guess must keep the revealed greens (a_, _r) — "blink" violates
const hmErr = g.hardModeError('blink');
ok('hard mode rejects guess dropping a green', typeof hmErr === 'string');
ok('hard mode accepts guess honoring greens', g.hardModeError('array') === null);

// win transition
g.current = '';
'array'.split('').forEach((c) => g.addLetter(c));
const r2 = g.submit();
ok('wins on correct word', g.status === 'won' && r2.status === 'won');

// lose transition
const g2 = new Game({ mode: 'unlimited', len: 5, answer: 'array' });
for (let i = 0; i < 6; i++) {
  g2.current = '';
  'mount'.split('').forEach((c) => g2.addLetter(c));
  g2.submit();
}
ok('loses after 6 wrong guesses', g2.status === 'lost');

// --- share text ---
const share = buildShareText({ game: g, puzzleNumber: 181, constellation: 'Aquarius' });
ok('share has header', share.includes('Sky Word — Daily Transmission #181'));
ok('share has constellation', share.includes('Aquarius'));
ok('share grid uses star glyphs', share.includes('★'));

console.log(`\n${pass} passed, ${fail} failed.`);
process.exit(fail ? 1 : 0);
