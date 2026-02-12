/**
 * Fix transliteration data by fetching verified word-by-word transliteration
 * from Quran.com API v4 for all 114 chapters.
 *
 * Fixes ~665 truncation bugs where first letters were stripped after semicolons.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'client/public/data/chapters');
const API_BASE = 'https://api.quran.com/api/v4';
const DELAY_MS = 350; // delay between API requests to respect rate limits

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch all verses with word-by-word transliteration for a chapter.
 * Handles pagination for large chapters.
 */
async function fetchChapterTransliteration(chapterId) {
  const allVerses = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${API_BASE}/verses/by_chapter/${chapterId}?language=en&words=true&word_fields=transliteration&per_page=50&page=${page}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`API error ${resp.status} for chapter ${chapterId} page ${page}`);
    }
    const data = await resp.json();
    totalPages = data.pagination.total_pages;
    allVerses.push(...data.verses);
    page++;
    if (page <= totalPages) await sleep(DELAY_MS);
  }

  return allVerses;
}

/**
 * Build verse-level transliteration from word-by-word data.
 * Filters out end-of-verse markers (char_type_name === 'end').
 * Capitalizes the first letter.
 */
function buildTransliteration(apiVerse) {
  const words = apiVerse.words
    .filter(w => w.char_type_name !== 'end' && w.transliteration?.text)
    .map(w => w.transliteration.text);

  if (words.length === 0) return '';

  let joined = words.join(' ');
  // Capitalize first letter
  joined = joined.charAt(0).toUpperCase() + joined.slice(1);
  return joined;
}

async function main() {
  let totalFixed = 0;
  let totalVerses = 0;
  let errors = [];

  console.log('Fetching verified transliteration from Quran.com API...\n');

  for (let ch = 1; ch <= 114; ch++) {
    try {
      // Read local JSON
      const filePath = join(DATA_DIR, `${ch}.json`);
      const localData = JSON.parse(readFileSync(filePath, 'utf8'));

      // Fetch from API
      const apiVerses = await fetchChapterTransliteration(ch);

      let chapterFixed = 0;

      // Update transliterations
      for (const localVerse of localData.verses) {
        const apiVerse = apiVerses.find(v => {
          const verseNum = parseInt(v.verse_key.split(':')[1]);
          return verseNum === localVerse.number;
        });

        if (apiVerse) {
          const newTranslit = buildTransliteration(apiVerse);
          if (newTranslit && newTranslit !== localVerse.transliteration) {
            localVerse.transliteration = newTranslit;
            chapterFixed++;
          }
          totalVerses++;
        }
      }

      // Write updated JSON
      writeFileSync(filePath, JSON.stringify(localData));

      const status = chapterFixed > 0 ? `${chapterFixed} updated` : 'OK';
      console.log(`  Ch ${String(ch).padStart(3)}: ${String(localData.verses.length).padStart(3)} verses — ${status}`);
      totalFixed += chapterFixed;

      await sleep(DELAY_MS);
    } catch (err) {
      console.error(`  Ch ${ch}: ERROR — ${err.message}`);
      errors.push({ chapter: ch, error: err.message });
    }
  }

  console.log(`\nDone! ${totalFixed} transliterations updated across ${totalVerses} verses.`);
  if (errors.length > 0) {
    console.log(`${errors.length} chapters had errors:`, errors);
  }

  // Verify verse 2:2 specifically
  const ch2 = JSON.parse(readFileSync(join(DATA_DIR, '2.json'), 'utf8'));
  const v2_2 = ch2.verses.find(v => v.number === 2);
  console.log(`\nVerification — 2:2 transliteration: "${v2_2?.transliteration}"`);
}

main().catch(console.error);
