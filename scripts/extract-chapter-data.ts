import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { chapters, getChapterVerses } from '../client/src/lib/quranData';

const outputDir = join(process.cwd(), 'client/public/data/chapters');
mkdirSync(outputDir, { recursive: true });

console.log(`\n📚 Extracting ${chapters.length} chapters into individual JSON files...\n`);

let totalVerses = 0;

for (const chapter of chapters) {
  const verses = getChapterVerses(chapter.id);
  
  if (verses && verses.length > 0) {
    const output = {
      id: chapter.id,
      verses: verses
    };
    
    const filePath = join(outputDir, `${chapter.id}.json`);
    writeFileSync(filePath, JSON.stringify(output));
    
    totalVerses += verses.length;
    console.log(`✓ Chapter ${String(chapter.id).padStart(3)} (${chapter.englishName.padEnd(20)}): ${String(verses.length).padStart(3)} verses`);
  } else {
    console.error(`✗ Chapter ${chapter.id}: No verses found`);
  }
}

console.log(`\n✅ Successfully extracted all chapters!`);
console.log(`   Total verses: ${totalVerses}`);
console.log(`   Output: ${outputDir}\n`);
