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
    .normalize('NFC')
    .trim();
}

async function fetchChapter(chapterNum: number): Promise<{ verse_key: string; text_uthmani: string }[]> {
  const url = `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${chapterNum}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status} for chapter ${chapterNum}`);
  const data = await res.json();
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
  const mismatches: string[] = [];
  const countIssues: string[] = [];
  const errors: string[] = [];

  for (let i = 1; i <= 114; i++) {
    process.stdout.write(`Checking chapter ${i}/114...\r`);

    const localPath = path.join(chaptersDir, `${i}.json`);
    const localData = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
    const localVerses = localData.verses;

    let apiVerses: { verse_key: string; text_uthmani: string }[];
    try {
      apiVerses = await fetchChapter(i);
    } catch (err: any) {
      errors.push(`Chapter ${i}: ${err.message}`);
      continue;
    }

    if (localVerses.length !== apiVerses.length) {
      countIssues.push(`Chapter ${i}: Local has ${localVerses.length} verses, API has ${apiVerses.length} verses`);
    }

    const compareCount = Math.min(localVerses.length, apiVerses.length);
    for (let v = 0; v < compareCount; v++) {
      totalVerses++;
      const localText = normalize(localVerses[v].arabicText);
      const apiText = normalize(apiVerses[v].text_uthmani);

      if (localText === apiText) {
        matchCount++;
      } else {
        mismatchCount++;
        mismatches.push(
          `--- Surah ${i}, Verse ${localVerses[v].number} ---\n` +
          `  LOCAL: ${localText}\n` +
          `  API:   ${apiText}`
        );
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

  log('--- SUMMARY ---');
  log(`Total verses compared: ${totalVerses}`);
  log(`Matches: ${matchCount}`);
  log(`Mismatches: ${mismatchCount}`);
  log(`API errors: ${errors.length}`);
  log('');

  if (mismatchCount === 0 && countIssues.length === 0 && errors.length === 0) {
    log('RESULT: PASS — All verses match the Quran.com API.');
  } else {
    log('RESULT: DIFFERENCES FOUND — Review details below.');
  }

  if (errors.length > 0) {
    log('');
    log('--- API ERRORS ---');
    for (const e of errors) log(`  ${e}`);
  }

  if (mismatches.length > 0) {
    log('');
    log('--- MISMATCHED VERSES ---');
    for (const m of mismatches) log(m);
  }

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
  console.log(`\nReport written to ${outputPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
