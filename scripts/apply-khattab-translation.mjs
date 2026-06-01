#!/usr/bin/env node
// One-time data migration: replace the bundled English reading translation with
// Dr. Mustafa Khattab's "The Clear Quran" across all 114 chapter data files.
//
// Why this source: Quran.com's public API no longer serves the Khattab edition
// (translation id 131 returns empty — the text is copyrighted by Book of Signs
// Foundation and was removed). The freely-mirrored fawazahmed0/quran-api hosts
// the same translation. We use the "Allah" edition (eng-mustafakhattaba) so the
// divine name renders as "Allah", matching the rest of the app.
//
// Only the `translation` field is rewritten; Arabic text and transliteration are
// left byte-for-byte untouched. Both data directories are kept in sync.
//
// The Clear Quran uses ornate brackets ˹…˺ for translator clarifications — these
// are intentional house style and are preserved. The text contains no HTML or
// footnote markup, so no stripping is needed.

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const CHAPTER_COUNT = 114;
const SOURCE_URL =
  'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/eng-mustafakhattaba.json';

// Keep both data dirs in sync, matching the existing data convention.
const CHAPTER_DIRS = [
  join(ROOT, 'client', 'public', 'data', 'chapters'),
  join(ROOT, 'public', 'data', 'chapters'),
];

async function fetchKhattab() {
  const res = await fetch(SOURCE_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Failed to fetch Khattab translation: HTTP ${res.status}`);
  const json = await res.json();
  const rows = json?.quran;
  if (!Array.isArray(rows) || rows.length !== 6236) {
    throw new Error(`Unexpected verse count from source: ${rows?.length}`);
  }
  const map = new Map();
  for (const row of rows) {
    map.set(`${row.chapter}:${row.verse}`, String(row.text || '').trim());
  }
  return map;
}

async function main() {
  console.log('Fetching Dr. Mustafa Khattab — The Clear Quran (Allah edition)...');
  const khattab = await fetchKhattab();
  console.log(`  ${khattab.size} verses`);

  for (const dir of CHAPTER_DIRS) {
    let replaced = 0;
    for (let i = 1; i <= CHAPTER_COUNT; i++) {
      const file = join(dir, `${i}.json`);
      const data = JSON.parse(await readFile(file, 'utf-8'));
      for (const verse of data.verses || []) {
        const key = `${i}:${verse.number}`;
        const text = khattab.get(key);
        if (text == null || text === '') {
          throw new Error(`Missing Khattab text for ${key} (dir ${dir})`);
        }
        verse.translation = text;
        replaced++;
      }
      // Match the existing compact single-line JSON format.
      await writeFile(file, JSON.stringify(data));
    }
    console.log(`  ${dir}: ${replaced} verses updated`);
  }

  console.log('Done. Run generate-search-corpus.mjs next to refresh the search index.');
}

main().catch((err) => {
  console.error('Failed to apply Khattab translation:', err);
  process.exit(1);
});
