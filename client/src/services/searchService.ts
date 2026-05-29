import { stemmer } from 'stemmer';

export interface VerseSearchResult {
  chapterId: number;
  verseNumber: number;
  translation: string;
  translationName?: string;
}

interface CorpusFile {
  names: string[];
  verses: [number, number, string[]][];
}

interface IndexedVerse {
  c: number;
  v: number;
  texts: string[];
  lower: string[];
  stems: Set<string>;
}

const CORPUS_URL = '/data/search-corpus.json';
const RESULT_LIMIT = 80;

let translationNames: string[] = [];
let index: IndexedVerse[] | null = null;
let loadPromise: Promise<void> | null = null;

const WORD_RE = /[a-z']+/g;

export function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(WORD_RE);
  if (!matches) return [];
  return matches.filter((w) => w.length >= 2);
}

export function stemWord(word: string): string {
  return stemmer(word.toLowerCase());
}

function stemsOf(text: string): string[] {
  return tokenize(text).map(stemmer);
}

async function ensureLoaded(): Promise<void> {
  if (index) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const res = await fetch(CORPUS_URL);
    if (!res.ok) throw new Error(`Failed to load search corpus: ${res.status}`);
    const data: CorpusFile = await res.json();
    translationNames = data.names || [];

    const built: IndexedVerse[] = new Array(data.verses.length);
    for (let i = 0; i < data.verses.length; i++) {
      const [c, v, texts] = data.verses[i];
      const lower = texts.map((t) => t.toLowerCase());
      const stems = new Set<string>();
      for (const t of texts) {
        for (const tok of tokenize(t)) stems.add(stemmer(tok));
      }
      built[i] = { c, v, texts, lower, stems };
    }
    index = built;
  })();

  try {
    await loadPromise;
  } finally {
    loadPromise = null;
  }
}

// Pick which translation best represents the match, for snippet display.
function pickTranslation(
  verse: IndexedVerse,
  phrase: string,
  queryStems: string[],
): { translation: string; translationName?: string } {
  // Prefer an exact phrase substring match.
  if (phrase) {
    for (let i = 0; i < verse.lower.length; i++) {
      if (verse.lower[i].includes(phrase)) {
        return { translation: verse.texts[i], translationName: translationNames[i] };
      }
    }
  }
  // Otherwise pick the translation covering the most query stems.
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < verse.texts.length; i++) {
    const tStems = new Set(stemsOf(verse.texts[i]));
    let score = 0;
    for (const qs of queryStems) if (tStems.has(qs)) score++;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return { translation: verse.texts[bestIdx], translationName: translationNames[bestIdx] };
}

/**
 * Run full-text search across all bundled translations entirely on-device.
 * Works offline. Matches whole-query phrase substrings (ranked first) and
 * stem-based AND matches (e.g. "mercy" also matches "merciful"/"mercies").
 */
export async function searchVersesLocal(query: string): Promise<VerseSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  await ensureLoaded();
  if (!index) return [];

  const queryStems = Array.from(new Set(tokenize(q).map(stemmer)));
  if (queryStems.length === 0) return [];

  const phraseHits: VerseSearchResult[] = [];
  const stemHits: VerseSearchResult[] = [];

  for (const verse of index) {
    // Phrase match: full query appears as a substring in some translation.
    let isPhrase = false;
    for (const lt of verse.lower) {
      if (lt.includes(q)) {
        isPhrase = true;
        break;
      }
    }

    // Stem match: every query stem is present somewhere in the verse.
    let isStem = true;
    for (const qs of queryStems) {
      if (!verse.stems.has(qs)) {
        isStem = false;
        break;
      }
    }

    if (!isPhrase && !isStem) continue;

    const picked = pickTranslation(verse, isPhrase ? q : '', queryStems);
    const result: VerseSearchResult = {
      chapterId: verse.c,
      verseNumber: verse.v,
      translation: picked.translation,
      translationName: picked.translationName,
    };
    if (isPhrase) phraseHits.push(result);
    else stemHits.push(result);

    if (phraseHits.length >= RESULT_LIMIT) break;
  }

  return [...phraseHits, ...stemHits].slice(0, RESULT_LIMIT);
}
