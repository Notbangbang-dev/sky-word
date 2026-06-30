// Deterministic sanity check for the word lists.
// Verifies every entry matches /^[a-z]{n}$/ for its bucket and flags duplicates.
// Run: node tools/check-words.mjs
import { ANSWERS, EXTRA_VALID, LENGTHS } from '../js/words.js';

let problems = 0;
const seen = new Map(); // word -> first bucket it appeared in

for (const n of LENGTHS) {
  for (const [name, table] of [['ANSWERS', ANSWERS], ['EXTRA_VALID', EXTRA_VALID]]) {
    const list = table[n] || [];
    const re = new RegExp(`^[a-z]{${n}}$`);
    for (const w of list) {
      if (!re.test(w)) {
        console.error(`BAD  ${name}[${n}] "${w}" — not ${n} lowercase letters`);
        problems++;
      }
      if (seen.has(w)) {
        console.error(`DUP  "${w}" in ${name}[${n}] (already in ${seen.get(w)})`);
        problems++;
      } else {
        seen.set(w, `${name}[${n}]`);
      }
    }
  }
}

const counts = LENGTHS.map(
  (n) => `${n}: ${(ANSWERS[n] || []).length} answers + ${(EXTRA_VALID[n] || []).length} extra`,
).join('  |  ');
console.log(`Counts -> ${counts}`);
console.log(`Total unique words: ${seen.size}`);
if (problems) {
  console.error(`\n✗ ${problems} problem(s) found.`);
  process.exit(1);
}
console.log('✓ All words pass length/format/dup checks.');
