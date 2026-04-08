import fs from 'fs';
import path from 'path';

const chaptersDir = path.join(process.cwd(), 'client/public/data/chapters');

interface ApiVerse {
  verse_key: string;
  text_uthmani: string;
}

interface LocalVerse {
  number: number;
  arabicText: string;
  transliteration: string;
  translation: string;
}

interface ChapterData {
  id: number;
  verses: LocalVerse[];
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
  let updated = 0;
  let unchanged = 0;
  let totalVerses = 0;

  for (let i = 1; i <= 114; i++) {
    process.stdout.write(`Syncing chapter ${i}/114...\r`);

    const localPath = path.join(chaptersDir, `${i}.json`);
    const localData: ChapterData = JSON.parse(fs.readFileSync(localPath, 'utf-8'));

    let apiVerses: ApiVerse[];
    try {
      apiVerses = await fetchChapter(i);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nFailed to fetch chapter ${i}: ${message}`);
      continue;
    }

    const apiByNum = new Map<number, string>();
    for (const v of apiVerses) {
      const verseNum = parseInt(v.verse_key.split(':')[1], 10);
      apiByNum.set(verseNum, v.text_uthmani);
    }

    let chapterChanged = false;
    for (const verse of localData.verses) {
      totalVerses++;
      const apiText = apiByNum.get(verse.number);
      if (apiText && verse.arabicText.replace(/\uFEFF/g, '') !== apiText) {
        verse.arabicText = apiText;
        updated++;
        chapterChanged = true;
      } else {
        unchanged++;
      }
    }

    if (chapterChanged) {
      fs.writeFileSync(localPath, JSON.stringify(localData), 'utf-8');
    }

    if (i % 10 === 0) await sleep(500);
    else await sleep(100);
  }

  console.log(`\nSync complete.`);
  console.log(`Total verses: ${totalVerses}`);
  console.log(`Updated: ${updated}`);
  console.log(`Unchanged: ${unchanged}`);
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
