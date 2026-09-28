// One-off, idempotent migration: prepends a synthetic "verse 0" Bismillah entry
// to every chapter's local verse JSON except Al-Fatiha (1, whose real verse 1
// already IS the Bismillah) and At-Tawbah (9, which doesn't recite it).
//
// Bismillah text/transliteration/translation are read directly from chapter 1's
// own verse 1 so they're byte-for-byte identical to how the phrase already
// exists in this exact dataset — not hardcoded separately.
//
// Run with: npx tsx scripts/add-bismillah-preamble.ts
import fs from 'fs';
import path from 'path';

const chaptersDir = path.join(process.cwd(), 'client/public/data/chapters');

interface Verse {
  number: number;
  arabicText: string;
  transliteration: string;
  translation: string;
  arabicWords?: string[];
}

interface ChapterFile {
  id: number;
  verses: Verse[];
}

const chapter1: ChapterFile = JSON.parse(fs.readFileSync(path.join(chaptersDir, '1.json'), 'utf-8'));
const bismillah = chapter1.verses.find(v => v.number === 1);
if (!bismillah) throw new Error('Could not find chapter 1 verse 1 (Bismillah reference text)');

let added = 0;
let skipped = 0;

for (let id = 1; id <= 114; id++) {
  if (id === 1 || id === 9) continue;

  const filePath = path.join(chaptersDir, `${id}.json`);
  const chapter: ChapterFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  if (chapter.verses.some(v => v.number === 0)) {
    skipped++;
    continue;
  }

  const preambleEntry: Verse = {
    number: 0,
    arabicText: bismillah.arabicText,
    transliteration: bismillah.transliteration,
    translation: bismillah.translation,
  };

  chapter.verses.unshift(preambleEntry);
  fs.writeFileSync(filePath, JSON.stringify(chapter));
  added++;
}

console.log(`Added verse-0 Bismillah entry to ${added} chapters (${skipped} already had one). Chapters 1 and 9 left untouched.`);
