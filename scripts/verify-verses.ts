import fs from 'fs';
import path from 'path';

const chaptersDir = path.join(process.cwd(), 'client/public/data/chapters');
const outputPath = path.join(process.cwd(), 'verification_report.txt');

function normalize(text: string): string {
  return text
    .replace(/\uFEFF/g, '')
    .replace(/\u200F/g, '')
    .replace(/\u200E/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\u0640/g, '')
    .replace(/\u06DC/g, '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTashkeel(text: string): string {
  return text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08E1\u08E3-\u08FF\uFE70-\uFE7F]/g, '');
}

interface ApiVerse {
  verse_key: string;
  text_uthmani: string;
}

interface LocalVerse {
  number: number;
  arabicText: string;
}

async function fetchChapter(chapterNum: number): Promise<ApiVerse[]> {
  const url = `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${chapterNum}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status} for chapter ${chapterNum}`);
  const data = await res.json() as { verses: ApiVerse[] };
  return data.verses || [];
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const lines: string[] = [];
  const log = (msg: string) => { lines.push(msg); console.log(msg); };

  log('=== QURAN VERSE VERIFICATION REPORT ===');
  log(`Generated: ${new Date().toISOString()}`);
  log(`Source: Quran.com API v4 (Uthmani script)`);
  log(`Local data: client/public/data/chapters/*.json`);
  log('');

  let totalVerses = 0;
  let matchCount = 0;
  let mismatchCount = 0;
  let typographicCount = 0;
  const substantiveMismatches: string[] = [];
  const typographicDiffs: string[] = [];
  const countIssues: string[] = [];
  const missingVerses: string[] = [];
  const extraVerses: string[] = [];
  const errors: string[] = [];

  for (let i = 1; i <= 114; i++) {
    process.stdout.write(`Checking chapter ${i}/114...\r`);

    const localPath = path.join(chaptersDir, `${i}.json`);
    const localData = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
    const localVerses: LocalVerse[] = localData.verses;

    let apiVerses: ApiVerse[];
    try {
      apiVerses = await fetchChapter(i);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Chapter ${i}: ${message}`);
      continue;
    }

    const localByNum = new Map<number, string>();
    for (const v of localVerses) localByNum.set(v.number, v.arabicText);

    const apiByNum = new Map<number, string>();
    for (const v of apiVerses) {
      const verseNum = parseInt(v.verse_key.split(':')[1], 10);
      apiByNum.set(verseNum, v.text_uthmani);
    }

    if (localVerses.length !== apiVerses.length) {
      countIssues.push(`Chapter ${i}: Local has ${localVerses.length} verses, API has ${apiVerses.length} verses`);
    }

    for (const [num] of localByNum) {
      if (!apiByNum.has(num)) {
        missingVerses.push(`Surah ${i}, Verse ${num} — present locally but missing from API`);
      }
    }
    for (const [num] of apiByNum) {
      if (!localByNum.has(num)) {
        extraVerses.push(`Surah ${i}, Verse ${num} — present in API but missing locally`);
      }
    }

    const allNums = new Set([...localByNum.keys(), ...apiByNum.keys()]);
    for (const num of [...allNums].sort((a, b) => a - b)) {
      const localRaw = localByNum.get(num);
      const apiRaw = apiByNum.get(num);
      if (!localRaw || !apiRaw) continue;

      totalVerses++;
      const localNorm = normalize(localRaw);
      const apiNorm = normalize(apiRaw);

      if (localNorm === apiNorm) {
        matchCount++;
      } else {
        const localStripped = stripTashkeel(localNorm);
        const apiStripped = stripTashkeel(apiNorm);

        if (localStripped === apiStripped) {
          typographicCount++;
          typographicDiffs.push(
            `--- Surah ${i}, Verse ${num} ---\n` +
            `  LOCAL: ${localRaw.replace(/\uFEFF/g, '').trim()}\n` +
            `  API:   ${apiRaw.trim()}`
          );
        } else {
          mismatchCount++;
          substantiveMismatches.push(
            `--- Surah ${i}, Verse ${num} ---\n` +
            `  LOCAL: ${localRaw.replace(/\uFEFF/g, '').trim()}\n` +
            `  API:   ${apiRaw.trim()}`
          );
        }
      }
    }

    if (i % 10 === 0) await sleep(500);
    else await sleep(100);
  }

  log('--- VERSE COUNT CHECK ---');
  if (countIssues.length === 0) {
    log('All 114 chapters have correct verse counts.');
  } else {
    for (const issue of countIssues) log(`  ISSUE: ${issue}`);
  }
  log('');

  if (missingVerses.length > 0) {
    log('--- MISSING VERSES (in local but not API) ---');
    for (const v of missingVerses) log(`  ${v}`);
    log('');
  }
  if (extraVerses.length > 0) {
    log('--- EXTRA VERSES (in API but not local) ---');
    for (const v of extraVerses) log(`  ${v}`);
    log('');
  }

  log('--- SUMMARY ---');
  log(`Total verses compared: ${totalVerses}`);
  log(`Exact matches (after normalization): ${matchCount}`);
  log(`Typographic-only differences (diacritics/tashkeel): ${typographicCount}`);
  log(`Substantive text differences: ${mismatchCount}`);
  log(`Missing/extra verses: ${missingVerses.length + extraVerses.length}`);
  log(`API errors: ${errors.length}`);
  log('');

  if (mismatchCount === 0 && countIssues.length === 0 && errors.length === 0 && missingVerses.length === 0 && extraVerses.length === 0) {
    log('RESULT: PASS — All verses match the Quran.com API (substantive content is identical).');
    if (typographicCount > 0) {
      log(`NOTE: ${typographicCount} verses have minor typographic/diacritic differences (see details below).`);
    }
  } else if (mismatchCount > 0) {
    log('RESULT: SUBSTANTIVE DIFFERENCES FOUND — Review details below.');
  } else {
    log('RESULT: STRUCTURAL ISSUES FOUND — Review missing/extra verses above.');
  }

  if (errors.length > 0) {
    log('');
    log('--- API ERRORS ---');
    for (const e of errors) log(`  ${e}`);
  }

  if (substantiveMismatches.length > 0) {
    log('');
    log('--- SUBSTANTIVE MISMATCHES ---');
    for (const m of substantiveMismatches) log(m);
  }

  if (typographicDiffs.length > 0) {
    log('');
    log(`--- TYPOGRAPHIC DIFFERENCES (${typographicDiffs.length} verses) ---`);
    log('These are diacritic/tashkeel-level differences only. The base consonant text is identical.');
    for (const m of typographicDiffs) log(m);
  }

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
  console.log(`\nReport written to ${outputPath}`);
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
