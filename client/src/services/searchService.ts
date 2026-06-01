import { stemmer } from 'stemmer';
import { topicIndex } from '@/lib/topicIndex';
import { conceptSynonyms } from '@/lib/synonyms';

export type MatchType = 'exact' | 'stem' | 'concept';

export interface VerseSearchResult {
  chapterId: number;
  verseNumber: number;
  translation: string;
  translationName?: string;
  matchType: MatchType;
  /** How many bundled translations the query matched in (multi-translation boost). */
  matchedTranslationCount: number;
  /** Concept/topic labels that triggered a concept-tier match, for display. */
  concepts?: string[];
}

interface CorpusFile {
  names: string[];
  verses: [number, number, string[]][];
}

interface IndexedVerse {
  c: number;
  v: number;
  texts: string[];
  /** Diacritic-stripped, lowercased translation strings (for exact matching). */
  norm: string[];
  /** Union of stems across all translations (for fast tier screening). */
  stems: Set<string>;
}

const CORPUS_URL = '/data/search-corpus.json';
const RESULT_LIMIT = 80;

let translationNames: string[] = [];
let index: IndexedVerse[] | null = null;
let loadPromise: Promise<void> | null = null;

const WORD_RE = /[a-z']+/g;

/** Lowercase + strip diacritics/combining marks so query and text normalize alike. */
function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function tokenize(text: string): string[] {
  const matches = normalizeText(text).match(WORD_RE);
  if (!matches) return [];
  return matches.filter((w) => w.length >= 2);
}

export function stemWord(word: string): string {
  return stemmer(normalizeText(word));
}

function stemsOf(text: string): string[] {
  return tokenize(text).map(stemmer);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
      const norm = texts.map(normalizeText);
      const stems = new Set<string>();
      for (const t of texts) {
        for (const tok of tokenize(t)) stems.add(stemmer(tok));
      }
      built[i] = { c, v, texts, norm, stems };
    }
    index = built;
  })();

  try {
    await loadPromise;
  } finally {
    loadPromise = null;
  }
}

interface Expansion {
  /** Stems of related/synonym words (excludes the original query stems). */
  conceptStems: Set<string>;
  /** Verse key -> concept labels, for verses topically tagged under a matched topic. */
  taggedVerses: Map<string, Set<string>>;
}

/**
 * Build the concept expansion for a query: pull related terms from the curated
 * synonym map and the topic index, plus the verses topically tagged under any
 * matched topic (so a concept query surfaces relevant verses even when the
 * literal word is absent).
 */
function buildExpansion(queryStems: string[], qNorm: string): Expansion {
  const queryStemSet = new Set(queryStems);
  const conceptStems = new Set<string>();
  const taggedVerses = new Map<string, Set<string>>();

  const addTermStems = (term: string) => {
    for (const tok of tokenize(term)) conceptStems.add(stemmer(tok));
  };

  // Curated synonym groups.
  for (const [key, syns] of Object.entries(conceptSynonyms)) {
    const group = [key, ...syns];
    const groupStems = group.flatMap((g) => tokenize(g).map(stemmer));
    if (groupStems.some((gs) => queryStemSet.has(gs))) {
      for (const g of group) addTermStems(g);
    }
  }

  // Topic index: a topic matches when a query stem overlaps a keyword stem, or
  // the query is a substring of a keyword (e.g. "back" -> "backbiting").
  for (const entry of topicIndex) {
    let matched = false;
    for (const kw of entry.keywords) {
      const kwNorm = normalizeText(kw);
      if (qNorm.length >= 3 && kwNorm.includes(qNorm)) {
        matched = true;
        break;
      }
      const kwStems = tokenize(kw).map(stemmer);
      if (kwStems.some((ks) => queryStemSet.has(ks))) {
        matched = true;
        break;
      }
    }
    if (!matched) continue;
    for (const kw of entry.keywords) addTermStems(kw);
    for (const ve of entry.verses) {
      const key = `${ve.chapterId}:${ve.verseNumber}`;
      let labels = taggedVerses.get(key);
      if (!labels) {
        labels = new Set();
        taggedVerses.set(key, labels);
      }
      labels.add(entry.topic);
    }
  }

  // The original query stems belong to the exact/stem tiers, not concept.
  for (const qs of queryStems) conceptStems.delete(qs);

  return { conceptStems, taggedVerses };
}

// Pick the translation that best represents a stem-tier match (most query stems)
// and count how many translations contain *all* query stems (multi-translation boost).
function bestStemTranslation(
  verse: IndexedVerse,
  queryStems: string[],
): { idx: number; count: number } {
  let bestIdx = 0;
  let bestScore = -1;
  let allCount = 0;
  for (let i = 0; i < verse.texts.length; i++) {
    const tStems = new Set(stemsOf(verse.texts[i]));
    let score = 0;
    for (const qs of queryStems) if (tStems.has(qs)) score++;
    if (queryStems.length > 0 && score === queryStems.length) allCount++;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return { idx: bestIdx, count: allCount };
}

// Pick the translation containing the most concept-term stems (for snippet display)
// and count how many translations contain at least one concept stem (ranking boost).
function bestConceptTranslation(
  verse: IndexedVerse,
  conceptStems: Set<string>,
): { idx: number; count: number } {
  let bestIdx = 0;
  let bestScore = -1;
  let hitCount = 0;
  const stems = Array.from(conceptStems);
  for (let i = 0; i < verse.texts.length; i++) {
    const tStems = new Set(stemsOf(verse.texts[i]));
    let score = 0;
    for (const cs of stems) if (tStems.has(cs)) score++;
    if (score > 0) hitCount++;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return { idx: bestIdx, count: hitCount };
}

/**
 * Run the three-layer verse search entirely on-device (works offline):
 *   1. exact  — the query appears as a whole word/phrase in a translation
 *   2. stem   — every query word matches by stem (e.g. "mercy" -> "merciful")
 *   3. concept— related synonyms or topically-tagged verses
 * Results are deduped by verse, ranked exact > stem > concept, and within a tier
 * by how many translations matched.
 */
export async function searchVersesLocal(query: string): Promise<VerseSearchResult[]> {
  const qNorm = normalizeText(query.trim());
  if (qNorm.length < 2) return [];
  await ensureLoaded();
  if (!index) return [];

  const queryStems = Array.from(new Set(tokenize(qNorm).map(stemmer)));
  if (queryStems.length === 0) return [];

  const exactRe = new RegExp(`\\b${escapeRegExp(qNorm)}\\b`);
  const { conceptStems, taggedVerses } = buildExpansion(queryStems, qNorm);

  const tierRank: Record<MatchType, number> = { exact: 0, stem: 1, concept: 2 };
  const results: VerseSearchResult[] = [];

  for (const verse of index) {
    const key = `${verse.c}:${verse.v}`;

    // 1) Exact whole word/phrase across translations.
    let exactCount = 0;
    let exactIdx = -1;
    for (let i = 0; i < verse.norm.length; i++) {
      if (exactRe.test(verse.norm[i])) {
        exactCount++;
        if (exactIdx < 0) exactIdx = i;
      }
    }
    if (exactCount > 0) {
      results.push({
        chapterId: verse.c,
        verseNumber: verse.v,
        translation: verse.texts[exactIdx],
        translationName: translationNames[exactIdx],
        matchType: 'exact',
        matchedTranslationCount: exactCount,
      });
      continue;
    }

    // 2) Stem-AND across the verse.
    let stemAll = true;
    for (const qs of queryStems) {
      if (!verse.stems.has(qs)) {
        stemAll = false;
        break;
      }
    }
    if (stemAll) {
      const { idx, count } = bestStemTranslation(verse, queryStems);
      results.push({
        chapterId: verse.c,
        verseNumber: verse.v,
        translation: verse.texts[idx],
        translationName: translationNames[idx],
        matchType: 'stem',
        matchedTranslationCount: Math.max(count, 1),
      });
      continue;
    }

    // 3) Concept: topically tagged, or a related synonym word appears.
    const tagged = taggedVerses.get(key);
    let conceptTermHit = false;
    if (conceptStems.size) {
      for (const cs of Array.from(conceptStems)) {
        if (verse.stems.has(cs)) {
          conceptTermHit = true;
          break;
        }
      }
    }
    if (tagged || conceptTermHit) {
      const { idx, count } = conceptTermHit
        ? bestConceptTranslation(verse, conceptStems)
        : { idx: 0, count: 0 };
      results.push({
        chapterId: verse.c,
        verseNumber: verse.v,
        translation: verse.texts[idx],
        translationName: translationNames[idx],
        matchType: 'concept',
        matchedTranslationCount: count,
        concepts: tagged ? Array.from(tagged) : [],
      });
    }
  }

  results.sort(
    (a, b) =>
      tierRank[a.matchType] - tierRank[b.matchType] ||
      b.matchedTranslationCount - a.matchedTranslationCount ||
      a.chapterId - b.chapterId ||
      a.verseNumber - b.verseNumber,
  );

  return results.slice(0, RESULT_LIMIT);
}
