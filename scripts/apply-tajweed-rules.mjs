/**
 * Apply Tajweed pronunciation rules to Quran.com transliteration data:
 *
 * 1. Waqf (pause) — strip final short vowels/case endings from the last word
 *    of every verse, matching how reciters actually pause.
 *
 * 2. Solar letter assimilation — when the definite article (l-) precedes a
 *    solar letter, the lam assimilates: l-raḥmāni → r-raḥmāni
 *
 * 3. Idgham — when a word ends in 'n' (tanween / noon sākinah) and the next
 *    word starts with ي ر م ل و ن, the noon merges into the next consonant:
 *    hudan lil → hudal-lil
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'client/public/data/chapters');

// ── Solar Letters ──────────────────────────────────────────────────────
// Check digraphs before single chars to avoid false partial matches.
// 'l' included for completeness (l-l → l-l, no visible change).
const SOLAR_PATTERNS = [
  'sh', 'th', 'dh',                       // digraphs first
  'ṣ', 'ḍ', 'ṭ', 'ẓ',                    // dotted singles
  't', 'd', 'r', 'z', 's', 'l', 'n',      // plain singles
];

// ── Idgham target letters (يرملون) ─────────────────────────────────────
const IDGHAM_LETTERS = new Set(['y', 'r', 'm', 'l', 'w', 'n']);

// ───────────────────────────────────────────────────────────────────────
// Rule 1 — Solar letter assimilation
// ───────────────────────────────────────────────────────────────────────
function applySolarAssimilation(word) {
  let prefix, rest;

  if (word.startsWith('l-')) {
    prefix = 'l';
    rest = word.slice(2);
  } else if (word.startsWith('al-')) {
    prefix = 'al';
    rest = word.slice(3);
  } else if (word.startsWith('Al-')) {
    prefix = 'Al';
    rest = word.slice(3);
  } else {
    return word;
  }

  for (const pat of SOLAR_PATTERNS) {
    if (rest.startsWith(pat)) {
      // Replace the lam with the solar letter:
      //   l-raḥmāni  →  r-raḥmāni
      //   Al-raḥmāni →  Ar-raḥmāni
      if (prefix === 'Al') return 'A' + pat + '-' + rest;
      if (prefix === 'al') return 'a' + pat + '-' + rest;
      return pat + '-' + rest;            // connecting form (l-)
    }
  }

  return word; // lunar letter — keep l- unchanged
}

// ───────────────────────────────────────────────────────────────────────
// Rule 2 — Idgham  (noon sākinah / tanween + يرملون)
// ───────────────────────────────────────────────────────────────────────
function applyIdgham(words) {
  const result = [];
  let i = 0;

  while (i < words.length) {
    let word = words[i];
    const next = words[i + 1];

    // Only apply if word ends in 'n' and is at least 2 chars
    // (catches tanween: -an/-in/-un  AND  noon sākinah: min, man, ʿan …)
    if (next && word.length > 1 && word.endsWith('n')) {
      const nextFirst = next.charAt(0).toLowerCase();
      if (IDGHAM_LETTERS.has(nextFirst)) {
        // Drop the trailing n, prepend next word's first consonant, hyphenate
        const base = word.slice(0, -1);
        result.push(base + next.charAt(0) + '-' + next);
        i += 2;
        continue;
      }
    }

    result.push(word);
    i++;
  }

  return result;
}

// ───────────────────────────────────────────────────────────────────────
// Rule 3 — Waqf  (pause at end of verse)
// ───────────────────────────────────────────────────────────────────────
function applyWaqf(text) {
  // Masculine sound plural  -īna → -īn
  if (text.endsWith('īna')) return text.slice(0, -1);
  // Masculine sound plural  -ūna → -ūn
  if (text.endsWith('ūna')) return text.slice(0, -1);
  // Dual                    -āni → -ān
  if (text.endsWith('āni')) return text.slice(0, -1);

  // Tanween endings (noun/adjective case markers with nunation)
  // Guard: length > 3 to avoid stripping prepositions like min, man, ʿan
  if (text.length > 3) {
    // Dammah tanween: -un → drop both  (aḥadun → aḥad)
    if (text.endsWith('un') && !text.endsWith('ūn')) return text.slice(0, -2);
    // Kasrah tanween: -in → drop both  (basīrin → basīr)
    if (text.endsWith('in') && !text.endsWith('īn')) return text.slice(0, -2);
    // Fathah tanween: -an → replace with ā  (kitāban → kitābā)
    // The alif of tanween is still pronounced in waqf
    if (text.endsWith('an') && !text.endsWith('ān')) return text.slice(0, -2) + 'ā';
  }

  // Keep long vowels at the end (ā ī ū)
  if (/[āīū]$/.test(text)) return text;

  // Strip final short vowel (a i u) — the grammatical case ending
  if (/[aiu]$/.test(text)) return text.slice(0, -1);

  return text;
}

// ───────────────────────────────────────────────────────────────────────
// Process one verse
// ───────────────────────────────────────────────────────────────────────
function processVerse(transliteration) {
  if (!transliteration) return transliteration;

  let words = transliteration.split(' ').filter(w => w.length > 0);
  if (words.length === 0) return transliteration;

  // Step 1 — solar assimilation on every word
  words = words.map(applySolarAssimilation);

  // Step 2 — idgham between consecutive words
  words = applyIdgham(words);

  // Step 3 — waqf on the last element (may be a hyphenated compound)
  const last = words.length - 1;
  words[last] = applyWaqf(words[last]);

  // Ensure first letter is capitalised
  let result = words.join(' ');
  result = result.charAt(0).toUpperCase() + result.slice(1);

  return result;
}

// ───────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────
let totalChanged = 0;

for (let ch = 1; ch <= 114; ch++) {
  const filePath = join(DATA_DIR, `${ch}.json`);
  const data = JSON.parse(readFileSync(filePath, 'utf8'));
  let changed = 0;

  for (const verse of data.verses) {
    const original = verse.transliteration;
    const processed = processVerse(original);
    if (processed !== original) {
      verse.transliteration = processed;
      changed++;
    }
  }

  writeFileSync(filePath, JSON.stringify(data));

  if (changed > 0) {
    totalChanged += changed;
    console.log(`  Ch ${String(ch).padStart(3)}: ${changed} verses updated`);
  }
}

console.log(`\nDone — ${totalChanged} verses updated with tajweed rules.\n`);

// ── Verification ─────────────────────────────────────────────────────
function verify(ch, vn) {
  const d = JSON.parse(readFileSync(join(DATA_DIR, `${ch}.json`), 'utf8'));
  const v = d.verses.find(v => v.number === vn);
  console.log(`${ch}:${vn}  ${v.transliteration}`);
}

console.log('=== Verification ===');
verify(1, 1);  // solar + waqf
verify(1, 2);  // waqf on -īna
verify(1, 5);  // waqf on -u
verify(1, 7);  // solar ḍ + waqf on -īna
verify(2, 2);  // idgham + waqf
verify(2, 3);  // multiple rules
verify(2, 43); // as-salāta (solar ṣ)
verify(112, 1); // tanween -un: aḥadun → aḥad
verify(112, 2); // waqf on consonant: ṣ-ṣamad
verify(112, 4); // tanween -un in compound: aḥadun → aḥad
verify(114, 6); // tanween or nās ending
