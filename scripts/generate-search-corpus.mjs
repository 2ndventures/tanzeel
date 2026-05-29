#!/usr/bin/env node
// Generates a compact, on-device full-text search corpus combining the
// app's bundled Sahih International translation with four additional
// freely-redistributable English translations. The corpus powers the
// client-side, offline multi-translation verse search (Tier 2).
//
// Output: client/public/data/search-corpus.json
//
// Translations bundled (license notes):
//   - Sahih International  (already bundled in chapters/*.json)
//   - Yusuf Ali           (Abdullah Yusuf Ali, 1934 — public domain)
//   - Pickthall           (Marmaduke Pickthall, 1930 — public domain)
//   - Shakir              (M.H. Shakir — freely redistributed)
//   - Hilali & Khan       (King Fahd Complex — freely distributed)
//
// Source for the four added translations: api.alquran.cloud (full-edition
// endpoint, one request per edition).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
// Keep both data dirs in sync, matching the existing data convention.
const OUT_DIRS = [
  join(ROOT, 'client', 'public', 'data'),
  join(ROOT, 'public', 'data'),
];
const CHAPTERS_DIR = join(ROOT, 'client', 'public', 'data', 'chapters');

const CHAPTER_COUNT = 114;
const RETRY_LIMIT = 3;
const RETRY_DELAY_MS = 1500;

// alquran.cloud edition identifiers for the 4 added translations, in order.
const ADDED_EDITIONS = [
  { id: 'en.yusufali', name: 'Yusuf Ali' },
  { id: 'en.pickthall', name: 'Pickthall' },
  { id: 'en.shakir', name: 'Shakir' },
  { id: 'en.hilali', name: 'Hilali & Khan' },
];

const TRANSLATION_NAMES = ['Sahih International', ...ADDED_EDITIONS.map((e) => e.name)];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchEdition(editionId, attempt = 1) {
  const url = `https://api.alquran.cloud/v1/quran/${editionId}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const surahs = json?.data?.surahs;
    if (!Array.isArray(surahs) || surahs.length !== CHAPTER_COUNT) {
      throw new Error(`Unexpected surah count: ${surahs?.length}`);
    }
    // Build map "chapter:verse" -> text
    const map = new Map();
    for (const surah of surahs) {
      const cId = surah.number;
      for (const ayah of surah.ayahs || []) {
        map.set(`${cId}:${ayah.numberInSurah}`, String(ayah.text || '').trim());
      }
    }
    return map;
  } catch (err) {
    if (attempt < RETRY_LIMIT) {
      console.warn(`  retry ${attempt} for ${editionId}: ${err.message}`);
      await sleep(RETRY_DELAY_MS * attempt);
      return fetchEdition(editionId, attempt + 1);
    }
    throw err;
  }
}

async function readSahih() {
  // chapter:verse -> Sahih translation, from the app's bundled chapter files.
  const map = new Map();
  for (let i = 1; i <= CHAPTER_COUNT; i++) {
    const raw = await readFile(join(CHAPTERS_DIR, `${i}.json`), 'utf-8');
    const data = JSON.parse(raw);
    for (const v of data.verses || []) {
      map.set(`${i}:${v.number}`, String(v.translation || '').trim());
    }
  }
  return map;
}

async function main() {
  console.log('Reading bundled Sahih International translation...');
  const sahih = await readSahih();
  console.log(`  ${sahih.size} verses`);

  const editionMaps = [];
  for (const ed of ADDED_EDITIONS) {
    console.log(`Fetching ${ed.name} (${ed.id})...`);
    const map = await fetchEdition(ed.id);
    console.log(`  ${map.size} verses`);
    editionMaps.push(map);
  }

  // Build compact corpus. Each verse: [chapterId, verseNumber, [t0..t4]]
  // where the translation index aligns with TRANSLATION_NAMES.
  const verses = [];
  let missing = 0;
  for (const [key, sahihText] of sahih.entries()) {
    const [c, v] = key.split(':').map(Number);
    const texts = [sahihText];
    for (const map of editionMaps) {
      const t = map.get(key);
      if (t == null) missing++;
      texts.push(t || '');
    }
    verses.push([c, v, texts]);
  }

  // Stable order by chapter then verse.
  verses.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));

  const corpus = { names: TRANSLATION_NAMES, verses };
  const json = JSON.stringify(corpus);
  const bytes = Buffer.byteLength(json);
  console.log(`\nWrote ${verses.length} verses x ${TRANSLATION_NAMES.length} translations`);
  for (const dir of OUT_DIRS) {
    await mkdir(dir, { recursive: true });
    const file = join(dir, 'search-corpus.json');
    await writeFile(file, json);
    console.log(`  ${file}`);
  }
  console.log(`  ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  if (missing) console.warn(`  ${missing} missing translation cells (left empty)`);
}

main().catch((err) => {
  console.error('Failed to generate search corpus:', err);
  process.exit(1);
});
