import fs from 'fs';
import path from 'path';

const chaptersDir = path.join(process.cwd(), 'client/public/data/chapters');
const outputPath = path.join(process.cwd(), 'verses_report.csv');

const BOM = '\uFEFF';
const rows: string[] = ['Surah Number,Verse Number,Arabic Text'];

for (let i = 1; i <= 114; i++) {
  const filePath = path.join(chaptersDir, `${i}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  for (const verse of data.verses) {
    const cleanText = verse.arabicText.replace(/\uFEFF/g, '');
    const escaped = `"${cleanText.replace(/"/g, '""')}"`;
    rows.push(`${data.id},${verse.number},${escaped}`);
  }
}

fs.writeFileSync(outputPath, BOM + rows.join('\n'), 'utf-8');
console.log(`Exported ${rows.length - 1} verses to ${outputPath}`);
