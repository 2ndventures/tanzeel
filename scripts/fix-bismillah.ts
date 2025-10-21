import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Read the quranData.ts file
const filePath = join(process.cwd(), 'client', 'src', 'lib', 'quranData.ts');
let content = readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// Extract Bismillah from chapter 1, verse 1
let BISMILLAH = '';
let foundChapter1 = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('chapter1Verses')) {
    foundChapter1 = true;
  }
  if (foundChapter1 && lines[i].includes('"number": 1,')) {
    // Next line should have arabicText
    const arabicLine = lines[i + 1];
    const match = arabicLine.match(/"arabicText": "([^"]+)"/);
    if (match) {
      BISMILLAH = match[1];
      console.log(`Extracted Bismillah from Chapter 1: "${BISMILLAH}"`);
      break;
    }
  }
}

if (!BISMILLAH) {
  console.error('Failed to extract Bismillah from Chapter 1!');
  process.exit(1);
}

// Remove BOM (Byte Order Mark - character code 65279) if present
if (BISMILLAH.charCodeAt(0) === 65279) {
  BISMILLAH = BISMILLAH.substring(1);
  console.log('Removed BOM from extracted Bismillah');
}

// Track changes
let changesCount = 0;
let currentChapter = 0;
const newLines: string[] = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // Detect chapter number (regex with optional type annotation)
  const chapterMatch = line.match(/export const chapter(\d+)Verses(?:\s*:\s*Verse\[\])?\s*=\s*\[/);
  if (chapterMatch) {
    currentChapter = parseInt(chapterMatch[1]);
  }
  
  // Check if this is verse 1 arabicText and not chapter 1 or 9
  if (currentChapter !== 1 && currentChapter !== 9 && currentChapter > 0 && line.includes('"arabicText":')) {
    // Check if previous line indicates this is verse 1
    const prevLine = i > 0 ? lines[i - 1] : '';
    if (prevLine.trim() === '"number": 1,') {
      // Extract the arabic text
      const match = line.match(/"arabicText": "([^"]+)"/);
      if (match) {
        // Normalize both strings to NFC for consistent Unicode comparison
        const normalizedText = match[1].normalize('NFC');
        const normalizedBismillah = BISMILLAH.normalize('NFC');
        
        if (normalizedText.startsWith(normalizedBismillah)) {
          // Remove Bismillah and trim any leading whitespace from what remains
          const remainingText = normalizedText.substring(normalizedBismillah.length).trimStart();
          line = line.replace(
            `"arabicText": "${match[1]}"`,
            `"arabicText": "${remainingText}"`
          );
          changesCount++;
          console.log(`Chapter ${currentChapter}, Verse 1: Removed Bismillah`);
        }
      }
    }
  }
  
  newLines.push(line);
}

// Write back the updated content
const newContent = newLines.join('\n');
writeFileSync(filePath, newContent, 'utf-8');

console.log(`\n✅ Done! Removed Bismillah from ${changesCount} chapters.`);
console.log('Note: Chapter 1 (Al-Fatihah) and Chapter 9 (At-Tawbah) were kept unchanged.');
