import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const quranData = await import('../client/src/lib/quranData.ts');

const outputDir = join(__dirname, '../public/data/chapters');
mkdirSync(outputDir, { recursive: true });

console.log(`Splitting ${quranData.chapters.length} chapters into individual JSON files...`);

for (const chapter of quranData.chapters) {
  const chapterData = quranData.getChapterById(chapter.id);
  
  if (chapterData && chapterData.verses) {
    const output = {
      id: chapter.id,
      verses: chapterData.verses
    };
    
    const filePath = join(outputDir, `${chapter.id}.json`);
    writeFileSync(filePath, JSON.stringify(output, null, 2));
    console.log(`✓ Chapter ${chapter.id} (${chapter.englishName}): ${chapterData.verses.length} verses`);
  }
}

console.log('\n✓ Successfully split all chapters!');
console.log(`Output directory: ${outputDir}`);
