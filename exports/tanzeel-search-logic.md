# Tanzeel — Search Logic Export

**Project:** Tanzeel (Quran reading app — React + TypeScript + Vite frontend, Express + Node backend)
**Surface:** The "Surahs" tab search bar (placeholder: *"Search surahs, topics, or keywords…"*).
**Generated:** May 26, 2026

This document bundles every file that participates in search, in the order data flows through the app.

---

## How it works (high level)

A single search input feeds **three independent layers** that run in parallel as the user types. Each layer renders its own result section in the UI; they never collide.

| # | Layer                              | Where it runs | Source of truth                                | Triggers when |
|---|------------------------------------|---------------|------------------------------------------------|---------------|
| 1 | **Surah name / number filter**     | Client-side   | Static `chapters` metadata + `surahMeanings`   | Always (any non-empty query) |
| 2 | **Topic index match**              | Client-side   | Hand-curated `topicIndex` (≈60+ topics, each with keywords + canonical verse refs) | Query length ≥ 3 |
| 3 | **Full-text translation search**   | Server-side   | All 114 chapter JSONs in `public/data/chapters/*.json`, loaded into memory on first request | Query length ≥ 3, debounced 400 ms, server requires ≥ 2 chars |

Key behaviors:
- **Debounce + abort.** Layer 3 is debounced 400 ms; each new query aborts the in-flight `fetch` via `AbortController`.
- **Normalization for layer 1.** Strips Arabic-name prefixes (`al-`, `ar-`, `as-`, `an-`, `at-`, `az-`), collapses doubled vowels (`aa`→`a`, etc.), removes `-` and `'`, and treats trailing `h` as optional (so "Fatiha" and "Fatihah" both match).
- **Snippet highlighting.** A shared `highlightMatch` helper returns a ±60-char snippet around the first match with the matched substring wrapped in a primary-color span.
- **On-demand translation cache.** Topic results (layer 2) only carry chapter/verse refs; their translation preview is fetched lazily via `lazyChapterService.getVerses(chapterId)` and cached in component state, keyed `${chapterId}:${verseNumber}`.
- **Server caching.** The translation index is built once on the first `/api/search` call and held in a module-level variable for the lifetime of the process. Responses set `Cache-Control: public, max-age=3600`. Results are capped at 30 per query.

---

## File 1 — `client/src/pages/SurahJuz.tsx`

The page that owns the search input and orchestrates all three layers. Search state, layer wiring, normalization, debouncing, abort handling, snippet highlighting, and the three result-rendering sections all live here.

```tsx
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import ChapterCard from "@/components/ChapterCard";

import { chapters, juzData, surahMeanings } from "@/lib/quranMetadata";
import { searchTopicIndex } from "@/lib/topicIndex";
import { Search, BookOpen, ArrowRight, Loader, Lock, X } from "lucide-react";
import { lazyChapterService } from "@/services/lazyChapterService";
import PullToRefresh from "@/components/PullToRefresh";
import { useNetworkStatus } from "@/contexts/NetworkContext";
import { isFullChapterDownloaded } from "@/services/audioCache";

interface TopicResult {
  chapterId: number;
  verseNumber: number;
  topic: string;
}

interface VerseSearchResult {
  chapterId: number;
  verseNumber: number;
  translation: string;
}

interface SurahJuzProps {
  onNavigate: (page: string, chapterId?: number, tab?: "home" | "surah" | "settings" | "bookmarks", verseNumber?: number) => void;
  activeTab?: "home" | "surah" | "settings" | "bookmarks";
  currentReciterId?: string;
  audioCacheReady?: boolean;
}

export default function SurahJuz({ onNavigate, activeTab = "surah", currentReciterId, audioCacheReady }: SurahJuzProps) {
  const { connected } = useNetworkStatus();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<"surah" | "juz">("surah");
  const hasActiveSearch = searchQuery.trim().length >= 3;

  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});
  const [verseSearchResults, setVerseSearchResults] = useState<VerseSearchResult[]>([]);
  const [isSearchingVerses, setIsSearchingVerses] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const verseSearchRef = useRef<ReturnType<typeof setTimeout>>();
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const headerRef = useRef<HTMLDivElement>(null);
  const handleSearchBlur = useCallback(() => {
    if (headerRef.current) {
      headerRef.current.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, []);

  useEffect(() => {
    const scrollEl = scrollContainerRef.current;
    if (!scrollEl) return;
    const handleScroll = () => {
      if (document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    };
    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const normalizeSearch = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/^(al-|ar-|as-|an-|at-|az-)/i, '')
      .replace(/aa/g, 'a')
      .replace(/ee/g, 'e')
      .replace(/ii/g, 'i')
      .replace(/oo/g, 'o')
      .replace(/uu/g, 'u')
      .replace(/[-']/g, '');
  };

  const filteredChapters = chapters.filter((chapter) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const englishName = chapter.englishName.toLowerCase();
    const arabicName = chapter.arabicName.toLowerCase();

    if (englishName.includes(query) || arabicName.includes(query) || chapter.id.toString().includes(query)) {
      return true;
    }

    const meaning = (surahMeanings[chapter.id] || '').toLowerCase();
    if (meaning.includes(query)) return true;

    const normalizedQuery = normalizeSearch(query);
    const normalizedEnglish = normalizeSearch(englishName);

    if (normalizedEnglish.includes(normalizedQuery)) return true;

    if (normalizedQuery.endsWith('h')) {
      if (normalizedEnglish.includes(normalizedQuery.slice(0, -1))) return true;
    } else {
      if (normalizedEnglish.includes(normalizedQuery + 'h')) return true;
    }

    return false;
  });

  const topicResults = useMemo<TopicResult[]>(() => {
    const q = searchQuery.trim();
    if (q.length < 3) return [];
    return searchTopicIndex(q).map((r) => ({
      chapterId: r.chapterId,
      verseNumber: r.verseNumber,
      topic: r.topic,
    }));
  }, [searchQuery]);

  useEffect(() => {
    if (verseSearchRef.current) clearTimeout(verseSearchRef.current);
    if (searchAbortRef.current) searchAbortRef.current.abort();
    const q = searchQuery.trim();
    if (q.length < 3) {
      setVerseSearchResults([]);
      setIsSearchingVerses(false);
      return;
    }
    setIsSearchingVerses(true);
    verseSearchRef.current = setTimeout(() => {
      const controller = new AbortController();
      searchAbortRef.current = controller;
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then(r => {
          if (!r.ok) throw new Error('Search failed');
          return r.json();
        })
        .then(data => {
          if (!controller.signal.aborted) {
            setVerseSearchResults(data.results || []);
            setIsSearchingVerses(false);
          }
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            setVerseSearchResults([]);
            setIsSearchingVerses(false);
          }
        });
    }, 400);
    return () => { if (verseSearchRef.current) clearTimeout(verseSearchRef.current); };
  }, [searchQuery]);

  useEffect(() => {
    if (topicResults.length === 0) return;

    const chapterIds = Array.from(new Set(topicResults.map(r => r.chapterId)));
    const missingChapters = chapterIds.filter(id =>
      !topicResults.some(r => r.chapterId === id && translationCache[`${id}:${r.verseNumber}`])
    );

    if (missingChapters.length === 0) return;

    missingChapters.forEach(chId => {
      lazyChapterService.getVerses(chId).then(verses => {
        setTranslationCache(prev => {
          const updates: Record<string, string> = {};
          for (const v of verses) {
            updates[`${chId}:${v.number}`] = v.translation;
          }
          return { ...prev, ...updates };
        });
      }).catch(() => {});
    });
  }, [topicResults]);

  const hasSearchQuery = hasActiveSearch;
  const showTopicResults = hasSearchQuery && topicResults.length > 0;
  const showVerseSearch = hasSearchQuery && verseSearchResults.length > 0;

  function highlightMatch(text: string, query: string) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    const start = Math.max(0, idx - 60);
    const end = Math.min(text.length, idx + query.length + 60);
    const snippet = (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
    const snipIdx = snippet.toLowerCase().indexOf(query.toLowerCase());
    return (
      <span>
        {snippet.slice(0, snipIdx)}
        <span className="bg-primary/20 text-primary font-medium rounded-sm px-0.5">{snippet.slice(snipIdx, snipIdx + query.length)}</span>
        {snippet.slice(snipIdx + query.length)}
      </span>
    );
  }

  const handlePullRefresh = useCallback(async () => {
    scrollContainerRef.current?.scrollTo({ top: 0 });
    await new Promise(r => setTimeout(r, 300));
  }, []);

  const filteredJuz = juzData.filter((juz) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    if (juz.id.toString() === query) return true;
    const juzLabel = `juz ${juz.id}`.toLowerCase();
    if (juzLabel.includes(query)) return true;
    return chapters.some((ch) => {
      if (ch.id < juz.startChapter || ch.id > juz.endChapter) return false;
      const englishName = ch.englishName.toLowerCase();
      if (englishName.includes(query) || ch.id.toString().includes(query)) return true;
      const normalizedQuery = normalizeSearch(query);
      const normalizedEnglish = normalizeSearch(englishName);
      return normalizedEnglish.includes(normalizedQuery);
    });
  });

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background via-background/95 to-background bg-screen-gradient">

      <div ref={headerRef} className="relative shrink-0 z-10 bg-background/95 backdrop-blur-xl">
        <div className={`overflow-hidden transition-all duration-300 ${
          hasActiveSearch ? 'max-h-0 opacity-0 p-0' : 'header-safe-padding max-h-[200px] opacity-100'
        }`}>
          <div className="px-6 pt-4 pb-5">
            <div className="flex items-center justify-between">
              <h1 className="font-heading text-5xl font-black tracking-tighter text-foreground">
                Surahs
              </h1>
            </div>
          </div>
        </div>

        <div className="border-b border-border">
          <div className={`px-6 ${hasActiveSearch ? 'header-safe-padding pt-2 pb-3' : 'pt-2 pb-6'} space-y-6`}>
            <div className="relative overflow-hidden rounded-3xl p-[1px] shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-border to-transparent rounded-3xl" />
              <div className="relative">
                <label htmlFor="surah-search" className="sr-only">Search surahs or topics</label>
                <Input
                  ref={searchInputRef}
                  id="surah-search"
                  type="search"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  autoCorrect="off"
                  placeholder="Search surahs, topics, or keywords..."
                  className="h-14 bg-card/80 backdrop-blur-xl border-0 rounded-3xl text-foreground placeholder:text-muted-foreground px-6 pr-12"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={handleSearchBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      searchInputRef.current?.blur();
                    }
                  }}
                  aria-label="Search surahs, topics, or keywords"
                  data-testid="input-search"
                />
                {searchQuery.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-muted/60 hover:bg-muted active:opacity-70 transition-colors"
                    aria-label="Clear search"
                    data-testid="button-clear-search"
                  >
                    <X className="w-4 h-4 text-foreground" />
                  </button>
                ) : (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Search className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {!hasActiveSearch && (
              <div className="relative overflow-hidden rounded-3xl p-[1px] shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-border to-transparent rounded-3xl" />
                <div className="relative flex gap-2 p-1 bg-card/80 backdrop-blur-xl rounded-3xl">
                  <button
                    onClick={() => setMode("surah")}
                    className={`flex-1 py-3 rounded-3xl font-semibold text-sm transition-all ${
                      mode === "surah"
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "text-muted-foreground"
                    }`}
                    data-testid="button-mode-surah"
                  >
                    All Surahs
                  </button>
                  <button
                    onClick={() => setMode("juz")}
                    className={`flex-1 py-3 rounded-3xl font-semibold text-sm transition-all ${
                      mode === "juz"
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "text-muted-foreground"
                    }`}
                    data-testid="button-mode-juz"
                  >
                    Juz
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="relative flex-1 overflow-y-auto min-h-0"
      >
        <PullToRefresh onRefresh={handlePullRefresh} scrollRef={scrollContainerRef}>
        <div className="px-6 space-y-3 py-4 pb-nav-clearance">
          {showTopicResults && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2.5">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Verse Results</h2>
              </div>

              <div className="space-y-2">
                {topicResults.map((result, idx) => {
                  const chapter = chapters.find((c) => c.id === result.chapterId);
                  if (!chapter) return null;
                  return (
                    <button
                      key={`${result.chapterId}-${result.verseNumber}-${idx}`}
                      className="w-full text-left rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-4 hover-elevate active-elevate-2 transition-all min-h-[76px]"
                      onClick={() => { (document.activeElement as HTMLElement)?.blur(); onNavigate("chapter", result.chapterId, undefined, result.verseNumber); }}
                      data-testid={`search-result-${result.chapterId}-${result.verseNumber}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--glow-primary)/0.15)] mt-0.5">
                          <BookOpen className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="text-sm font-semibold text-foreground">
                                {chapter.englishName} {result.verseNumber}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({result.chapterId}:{result.verseNumber})
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate" data-testid={`search-result-topic-${result.chapterId}-${result.verseNumber}`}>
                            {highlightMatch(result.topic, searchQuery.trim())}
                          </p>
                          {translationCache[`${result.chapterId}:${result.verseNumber}`] && (
                            <p
                              className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-3 leading-relaxed"
                              data-testid={`search-result-preview-${result.chapterId}-${result.verseNumber}`}
                            >
                              "{highlightMatch(translationCache[`${result.chapterId}:${result.verseNumber}`], searchQuery.trim())}"
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredChapters.length > 0 && (
                <div className="flex items-center gap-2 mt-4 mb-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground">Matching Surahs</h2>
                </div>
              )}
            </div>
          )}

          {showVerseSearch && !showTopicResults && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2.5">
                <Search className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Translation Results</h2>
                <span className="text-xs text-muted-foreground ml-auto">{verseSearchResults.length} found</span>
              </div>
              <div className="space-y-2">
                {verseSearchResults.map((result, idx) => {
                  const chapter = chapters.find((c) => c.id === result.chapterId);
                  if (!chapter) return null;
                  return (
                    <button
                      key={`vs-${result.chapterId}-${result.verseNumber}-${idx}`}
                      className="w-full text-left rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-4 hover-elevate active-elevate-2 transition-all min-h-[76px]"
                      onClick={() => { (document.activeElement as HTMLElement)?.blur(); onNavigate("chapter", result.chapterId, undefined, result.verseNumber); }}
                      data-testid={`verse-search-result-${result.chapterId}-${result.verseNumber}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--glow-primary)/0.15)] mt-0.5">
                          <BookOpen className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="text-sm font-semibold text-foreground">
                                {chapter.englishName} {result.verseNumber}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({result.chapterId}:{result.verseNumber})
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-3 leading-relaxed">
                            {highlightMatch(result.translation, searchQuery.trim())}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {filteredChapters.length > 0 && (
                <div className="flex items-center gap-2 mt-6 mb-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground">Matching Surahs</h2>
                </div>
              )}
            </div>
          )}

          {showVerseSearch && showTopicResults && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2.5">
                <Search className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Translation Results</h2>
                <span className="text-xs text-muted-foreground ml-auto">{verseSearchResults.length} found</span>
              </div>
              <div className="space-y-2">
                {verseSearchResults.map((result, idx) => {
                  const chapter = chapters.find((c) => c.id === result.chapterId);
                  if (!chapter) return null;
                  return (
                    <button
                      key={`vs2-${result.chapterId}-${result.verseNumber}-${idx}`}
                      className="w-full text-left rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-4 hover-elevate active-elevate-2 transition-all min-h-[76px]"
                      onClick={() => { (document.activeElement as HTMLElement)?.blur(); onNavigate("chapter", result.chapterId, undefined, result.verseNumber); }}
                      data-testid={`verse-search-result-${result.chapterId}-${result.verseNumber}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--glow-primary)/0.15)] mt-0.5">
                          <BookOpen className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="text-sm font-semibold text-foreground">
                                {chapter.englishName} {result.verseNumber}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({result.chapterId}:{result.verseNumber})
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-3 leading-relaxed">
                            {highlightMatch(result.translation, searchQuery.trim())}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isSearchingVerses && !showTopicResults && !showVerseSearch && filteredChapters.length === 0 && (
            <div className="text-center py-12">
              <Loader className="w-5 h-5 animate-spin mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Searching translations...</p>
            </div>
          )}

          {hasActiveSearch && !showTopicResults && !showVerseSearch && !isSearchingVerses && filteredChapters.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No results found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try a different search term or topic
              </p>
            </div>
          ) : isLoading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 p-5">
                <Skeleton className="w-14 h-14 rounded-3xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="w-5 h-5 rounded" />
              </div>
            ))
          ) : hasActiveSearch && showTopicResults && filteredChapters.length === 0 ? null
          : mode === "juz" ? (
            filteredJuz.length > 0 ? (
              filteredJuz.map((juz, index) => {
                const startChapter = chapters.find(ch => ch.id === juz.startChapter);
                const endChapter = chapters.find(ch => ch.id === juz.endChapter);
                const isJuzLocked = !connected && !(currentReciterId && isFullChapterDownloaded(currentReciterId, juz.startChapter));
                const juzBadgeStyles = [
                  { bg: "bg-[hsl(var(--glow-primary)/0.18)]", text: "text-primary" },
                  { bg: "bg-[hsl(var(--glow-primary)/0.12)]", text: "text-primary" },
                  { bg: "bg-[hsl(var(--glow-primary)/0.22)]", text: "text-primary" },
                ];
                const badge = juzBadgeStyles[(juz.id - 1) % juzBadgeStyles.length];
                return (
                  <div
                    key={juz.id}
                    className={`relative group overflow-hidden rounded-3xl border border-border/50 shadow-lg animate-fade-in-up h-20 ${
                      isJuzLocked
                        ? "opacity-50 cursor-not-allowed"
                        : "hover-elevate active-elevate-2 cursor-pointer"
                    }`}
                    role="button"
                    tabIndex={isJuzLocked ? -1 : 0}
                    aria-disabled={isJuzLocked || undefined}
                    style={{ animationDelay: `${index * 30}ms` }}
                    onClick={() => { if (isJuzLocked) return; (document.activeElement as HTMLElement)?.blur(); onNavigate("chapter", juz.startChapter); }}
                    onKeyDown={(e) => { if (isJuzLocked) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate("chapter", juz.startChapter); } }}
                    data-testid={`juz-card-${juz.id}`}
                  >
                    <div className="relative overflow-hidden rounded-3xl bg-card/80 backdrop-blur-xl px-5 h-full flex items-center">
                      <div className="flex items-center gap-4 w-full">
                        <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${badge.bg} shadow-inner`}>
                          <span className={`${badge.text} text-lg font-bold`}>{juz.id}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <h3 className="text-lg font-bold text-foreground">
                              Juz {juz.id}
                            </h3>
                            {isJuzLocked && (
                              <Lock
                                className="w-3.5 h-3.5 text-muted-foreground shrink-0"
                                aria-label="Offline — not downloaded"
                              />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {startChapter?.englishName} {juz.startVerse > 1 ? `(${juz.startVerse})` : ''} — {endChapter?.englishName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-arabic text-foreground">
                            {startChapter ? `جزء ${juz.id}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : !showTopicResults ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No juz found</p>
                {hasSearchQuery && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Try a different search term
                  </p>
                )}
              </div>
            ) : null
          ) : filteredChapters.length > 0 ? (
            filteredChapters.map((chapter, index) => (
              <ChapterCard
                key={chapter.id}
                number={chapter.id}
                arabicName={chapter.arabicName}
                englishName={chapter.englishName}
                verseCount={chapter.verseCount}
                meaning={surahMeanings[chapter.id] || chapter.revelationType}
                onClick={() => { (document.activeElement as HTMLElement)?.blur(); onNavigate("chapter", chapter.id); }}
                style={{ animationDelay: `${index * 30}ms` }}
                isFirst={index === 0}
                currentReciterId={currentReciterId}
                audioCacheReady={audioCacheReady}
              />
            ))
          ) : !showTopicResults ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No chapters found</p>
              {hasSearchQuery && (
                <p className="text-sm text-muted-foreground mt-2">
                  Try a different search term or topic
                </p>
              )}
            </div>
          ) : null}
        </div>
        </PullToRefresh>
      </div>

    </div>
  );
}
```

---

## File 2 — `client/src/lib/topicIndex.ts`

Layer 2 source data + matcher. A curated array of `TopicEntry` objects; each topic has a display label, an array of trigger keywords, and the verses to surface when matched. `searchTopicIndex(query)` scans every topic's keywords for `includes(query)` and returns a deduplicated, ranked list of `{ chapterId, verseNumber, topic }`.

```ts
export interface TopicEntry {
  topic: string;
  keywords: string[];
  verses: { chapterId: number; verseNumber: number }[];
}

export const topicIndex: TopicEntry[] = [
  {
    topic: "Creation",
    keywords: ["creation", "created", "heavens", "earth", "universe", "big bang", "origin", "cosmos"],
    verses: [
      { chapterId: 2, verseNumber: 29 },
      { chapterId: 6, verseNumber: 1 },
      { chapterId: 21, verseNumber: 30 },
      { chapterId: 36, verseNumber: 36 },
      { chapterId: 41, verseNumber: 11 },
      { chapterId: 51, verseNumber: 47 },
      { chapterId: 67, verseNumber: 3 },
    ],
  },
  {
    topic: "Prayer",
    keywords: ["prayer", "salah", "salat", "worship", "prostrate", "bow", "pray", "supplication", "dua"],
    verses: [
      { chapterId: 2, verseNumber: 43 },
      { chapterId: 2, verseNumber: 238 },
      { chapterId: 4, verseNumber: 103 },
      { chapterId: 11, verseNumber: 114 },
      { chapterId: 17, verseNumber: 78 },
      { chapterId: 20, verseNumber: 14 },
      { chapterId: 29, verseNumber: 45 },
      { chapterId: 73, verseNumber: 20 },
    ],
  },
  {
    topic: "Fasting",
    keywords: ["fasting", "fast", "ramadan", "sawm", "siyam", "abstain"],
    verses: [
      { chapterId: 2, verseNumber: 183 },
      { chapterId: 2, verseNumber: 184 },
      { chapterId: 2, verseNumber: 185 },
      { chapterId: 2, verseNumber: 187 },
    ],
  },
  {
    topic: "Charity",
    keywords: ["charity", "zakat", "sadaqah", "give", "alms", "donate", "poor", "needy", "orphan", "spending"],
    verses: [
      { chapterId: 2, verseNumber: 177 },
      { chapterId: 2, verseNumber: 261 },
      { chapterId: 2, verseNumber: 267 },
      { chapterId: 2, verseNumber: 274 },
      { chapterId: 9, verseNumber: 60 },
      { chapterId: 57, verseNumber: 18 },
      { chapterId: 63, verseNumber: 10 },
      { chapterId: 107, verseNumber: 1 },
    ],
  },
  {
    topic: "Hajj and Pilgrimage",
    keywords: ["hajj", "pilgrimage", "kaaba", "mecca", "makkah", "umrah", "sacred house", "sacrifice"],
    verses: [
      { chapterId: 2, verseNumber: 196 },
      { chapterId: 2, verseNumber: 197 },
      { chapterId: 3, verseNumber: 97 },
      { chapterId: 22, verseNumber: 27 },
      { chapterId: 22, verseNumber: 28 },
      { chapterId: 22, verseNumber: 29 },
    ],
  },
  {
    topic: "Paradise and Heaven",
    keywords: ["paradise", "heaven", "jannah", "garden", "gardens", "reward", "hereafter", "eternal", "bliss"],
    verses: [
      { chapterId: 2, verseNumber: 25 },
      { chapterId: 3, verseNumber: 133 },
      { chapterId: 9, verseNumber: 72 },
      { chapterId: 13, verseNumber: 35 },
      { chapterId: 47, verseNumber: 15 },
      { chapterId: 55, verseNumber: 46 },
      { chapterId: 56, verseNumber: 10 },
      { chapterId: 76, verseNumber: 12 },
    ],
  },
  {
    topic: "Hellfire and Punishment",
    keywords: ["hell", "hellfire", "fire", "jahannam", "punishment", "torment", "doom"],
    verses: [
      { chapterId: 2, verseNumber: 24 },
      { chapterId: 3, verseNumber: 131 },
      { chapterId: 4, verseNumber: 56 },
      { chapterId: 14, verseNumber: 16 },
      { chapterId: 22, verseNumber: 19 },
      { chapterId: 67, verseNumber: 6 },
      { chapterId: 104, verseNumber: 4 },
    ],
  },
  {
    topic: "Patience and Perseverance",
    keywords: ["patience", "patient", "sabr", "persevere", "endure", "steadfast", "hardship", "trial"],
    verses: [
      { chapterId: 2, verseNumber: 45 },
      { chapterId: 2, verseNumber: 153 },
      { chapterId: 2, verseNumber: 155 },
      { chapterId: 3, verseNumber: 200 },
      { chapterId: 11, verseNumber: 115 },
      { chapterId: 16, verseNumber: 127 },
      { chapterId: 39, verseNumber: 10 },
      { chapterId: 103, verseNumber: 3 },
    ],
  },
  {
    topic: "Forgiveness and Mercy",
    keywords: ["forgiveness", "forgive", "mercy", "merciful", "pardon", "repent", "repentance", "tawbah", "compassion"],
    verses: [
      { chapterId: 2, verseNumber: 199 },
      { chapterId: 3, verseNumber: 135 },
      { chapterId: 4, verseNumber: 110 },
      { chapterId: 7, verseNumber: 156 },
      { chapterId: 39, verseNumber: 53 },
      { chapterId: 42, verseNumber: 25 },
      { chapterId: 66, verseNumber: 8 },
      { chapterId: 110, verseNumber: 3 },
    ],
  },
  {
    topic: "Justice and Fairness",
    keywords: ["justice", "just", "fair", "equity", "judge", "judgment", "rights", "oppression"],
    verses: [
      { chapterId: 4, verseNumber: 58 },
      { chapterId: 4, verseNumber: 135 },
      { chapterId: 5, verseNumber: 8 },
      { chapterId: 16, verseNumber: 90 },
      { chapterId: 49, verseNumber: 9 },
      { chapterId: 57, verseNumber: 25 },
    ],
  },
  {
    topic: "Mary and Jesus",
    keywords: ["mary", "maryam", "jesus", "isa", "messiah", "christ", "virgin", "birth"],
    verses: [
      { chapterId: 3, verseNumber: 36 },
      { chapterId: 3, verseNumber: 37 },
      { chapterId: 3, verseNumber: 42 },
      { chapterId: 3, verseNumber: 45 },
      { chapterId: 4, verseNumber: 171 },
      { chapterId: 5, verseNumber: 46 },
      { chapterId: 5, verseNumber: 110 },
      { chapterId: 19, verseNumber: 16 },
      { chapterId: 19, verseNumber: 17 },
      { chapterId: 19, verseNumber: 19 },
      { chapterId: 19, verseNumber: 22 },
      { chapterId: 19, verseNumber: 30 },
      { chapterId: 19, verseNumber: 34 },
      { chapterId: 21, verseNumber: 91 },
    ],
  },
  {
    topic: "Moses",
    keywords: ["moses", "musa", "pharaoh", "firaun", "israelites", "red sea", "staff", "tablets"],
    verses: [
      { chapterId: 2, verseNumber: 51 },
      { chapterId: 7, verseNumber: 103 },
      { chapterId: 7, verseNumber: 142 },
      { chapterId: 10, verseNumber: 75 },
      { chapterId: 20, verseNumber: 9 },
      { chapterId: 20, verseNumber: 25 },
      { chapterId: 26, verseNumber: 10 },
      { chapterId: 26, verseNumber: 63 },
      { chapterId: 28, verseNumber: 7 },
      { chapterId: 28, verseNumber: 30 },
    ],
  },
  {
    topic: "Abraham",
    keywords: ["abraham", "ibrahim", "sacrifice", "ishmael", "ismail", "hanif", "monotheism"],
    verses: [
      { chapterId: 2, verseNumber: 124 },
      { chapterId: 2, verseNumber: 127 },
      { chapterId: 2, verseNumber: 131 },
      { chapterId: 6, verseNumber: 75 },
      { chapterId: 14, verseNumber: 35 },
      { chapterId: 21, verseNumber: 69 },
      { chapterId: 37, verseNumber: 102 },
      { chapterId: 37, verseNumber: 107 },
    ],
  },
  {
    topic: "Joseph",
    keywords: ["joseph", "yusuf", "dream", "brothers", "well", "egypt", "potiphar", "prison"],
    verses: [
      { chapterId: 12, verseNumber: 3 },
      { chapterId: 12, verseNumber: 4 },
      { chapterId: 12, verseNumber: 15 },
      { chapterId: 12, verseNumber: 21 },
      { chapterId: 12, verseNumber: 46 },
      { chapterId: 12, verseNumber: 86 },
      { chapterId: 12, verseNumber: 100 },
    ],
  },
  {
    topic: "Noah",
    keywords: ["noah", "nuh", "ark", "flood", "deluge", "ship"],
    verses: [
      { chapterId: 7, verseNumber: 59 },
      { chapterId: 11, verseNumber: 36 },
      { chapterId: 11, verseNumber: 40 },
      { chapterId: 23, verseNumber: 23 },
      { chapterId: 26, verseNumber: 105 },
      { chapterId: 54, verseNumber: 9 },
      { chapterId: 71, verseNumber: 1 },
      { chapterId: 71, verseNumber: 26 },
    ],
  },
  {
    topic: "Marriage and Family",
    keywords: ["marriage", "wife", "husband", "spouse", "family", "children", "parent", "mother", "father", "wedding"],
    verses: [
      { chapterId: 2, verseNumber: 221 },
      { chapterId: 2, verseNumber: 228 },
      { chapterId: 4, verseNumber: 1 },
      { chapterId: 4, verseNumber: 19 },
      { chapterId: 4, verseNumber: 34 },
      { chapterId: 17, verseNumber: 23 },
      { chapterId: 25, verseNumber: 74 },
      { chapterId: 30, verseNumber: 21 },
      { chapterId: 31, verseNumber: 14 },
      { chapterId: 46, verseNumber: 15 },
    ],
  },
  {
    topic: "Death and Afterlife",
    keywords: ["death", "die", "resurrection", "judgment day", "qiyamah", "grave", "soul", "afterlife", "hereafter"],
    verses: [
      { chapterId: 2, verseNumber: 28 },
      { chapterId: 3, verseNumber: 185 },
      { chapterId: 6, verseNumber: 60 },
      { chapterId: 21, verseNumber: 35 },
      { chapterId: 23, verseNumber: 99 },
      { chapterId: 29, verseNumber: 57 },
      { chapterId: 39, verseNumber: 42 },
      { chapterId: 50, verseNumber: 19 },
      { chapterId: 75, verseNumber: 1 },
    ],
  },
  {
    topic: "Trust in God",
    keywords: ["trust", "tawakkul", "reliance", "depend", "god's plan", "decree", "qadr", "fate", "destiny"],
    verses: [
      { chapterId: 3, verseNumber: 159 },
      { chapterId: 8, verseNumber: 2 },
      { chapterId: 9, verseNumber: 51 },
      { chapterId: 12, verseNumber: 67 },
      { chapterId: 14, verseNumber: 12 },
      { chapterId: 33, verseNumber: 3 },
      { chapterId: 65, verseNumber: 3 },
    ],
  },
  {
    topic: "Gratitude and Thankfulness",
    keywords: ["grateful", "gratitude", "thankful", "thanks", "shukr", "blessings", "praise", "alhamdulillah"],
    verses: [
      { chapterId: 2, verseNumber: 152 },
      { chapterId: 14, verseNumber: 7 },
      { chapterId: 16, verseNumber: 114 },
      { chapterId: 27, verseNumber: 40 },
      { chapterId: 31, verseNumber: 12 },
      { chapterId: 34, verseNumber: 13 },
      { chapterId: 55, verseNumber: 13 },
    ],
  },
  {
    topic: "Knowledge and Wisdom",
    keywords: ["knowledge", "learn", "wisdom", "understand", "intellect", "reflect", "think", "ponder", "science", "read"],
    verses: [
      { chapterId: 2, verseNumber: 269 },
      { chapterId: 3, verseNumber: 190 },
      { chapterId: 20, verseNumber: 114 },
      { chapterId: 35, verseNumber: 28 },
      { chapterId: 39, verseNumber: 9 },
      { chapterId: 58, verseNumber: 11 },
      { chapterId: 96, verseNumber: 1 },
      { chapterId: 96, verseNumber: 4 },
    ],
  },
  {
    topic: "Monotheism and Oneness of God",
    keywords: ["one god", "tawhid", "monotheism", "oneness", "no god but", "la ilaha", "unity", "shirk", "polytheism", "idol"],
    verses: [
      { chapterId: 2, verseNumber: 163 },
      { chapterId: 2, verseNumber: 255 },
      { chapterId: 3, verseNumber: 18 },
      { chapterId: 4, verseNumber: 36 },
      { chapterId: 6, verseNumber: 102 },
      { chapterId: 21, verseNumber: 25 },
      { chapterId: 23, verseNumber: 91 },
      { chapterId: 112, verseNumber: 1 },
      { chapterId: 112, verseNumber: 2 },
      { chapterId: 112, verseNumber: 3 },
      { chapterId: 112, verseNumber: 4 },
    ],
  },
  {
    topic: "Angels",
    keywords: ["angel", "angels", "jibril", "gabriel", "mika'il", "michael", "israfil", "angel of death"],
    verses: [
      { chapterId: 2, verseNumber: 30 },
      { chapterId: 2, verseNumber: 98 },
      { chapterId: 2, verseNumber: 177 },
      { chapterId: 16, verseNumber: 2 },
      { chapterId: 35, verseNumber: 1 },
      { chapterId: 53, verseNumber: 5 },
      { chapterId: 66, verseNumber: 6 },
      { chapterId: 97, verseNumber: 4 },
    ],
  },
  {
    topic: "Satan and Evil",
    keywords: ["satan", "shaytan", "iblis", "devil", "evil", "whisper", "jinn", "temptation"],
    verses: [
      { chapterId: 2, verseNumber: 34 },
      { chapterId: 2, verseNumber: 36 },
      { chapterId: 4, verseNumber: 76 },
      { chapterId: 7, verseNumber: 11 },
      { chapterId: 7, verseNumber: 16 },
      { chapterId: 15, verseNumber: 34 },
      { chapterId: 36, verseNumber: 60 },
      { chapterId: 114, verseNumber: 4 },
      { chapterId: 114, verseNumber: 5 },
    ],
  },
  {
    topic: "Day of Judgment",
    keywords: ["day of judgment", "last day", "yawm al-qiyamah", "hour", "reckoning", "trumpet", "scales", "accounting"],
    verses: [
      { chapterId: 1, verseNumber: 4 },
      { chapterId: 7, verseNumber: 187 },
      { chapterId: 21, verseNumber: 47 },
      { chapterId: 22, verseNumber: 1 },
      { chapterId: 39, verseNumber: 68 },
      { chapterId: 69, verseNumber: 13 },
      { chapterId: 78, verseNumber: 17 },
      { chapterId: 81, verseNumber: 1 },
      { chapterId: 82, verseNumber: 1 },
      { chapterId: 99, verseNumber: 1 },
    ],
  },
  {
    topic: "Quran and Revelation",
    keywords: ["quran", "book", "revelation", "recite", "scripture", "verse", "sign", "guidance", "light", "furqan"],
    verses: [
      { chapterId: 2, verseNumber: 2 },
      { chapterId: 2, verseNumber: 185 },
      { chapterId: 4, verseNumber: 82 },
      { chapterId: 6, verseNumber: 19 },
      { chapterId: 15, verseNumber: 9 },
      { chapterId: 17, verseNumber: 9 },
      { chapterId: 25, verseNumber: 1 },
      { chapterId: 36, verseNumber: 2 },
      { chapterId: 56, verseNumber: 77 },
    ],
  },
  {
    topic: "Water and Rain",
    keywords: ["water", "rain", "river", "sea", "ocean", "spring", "drink", "flood"],
    verses: [
      { chapterId: 2, verseNumber: 22 },
      { chapterId: 6, verseNumber: 99 },
      { chapterId: 16, verseNumber: 65 },
      { chapterId: 21, verseNumber: 30 },
      { chapterId: 23, verseNumber: 18 },
      { chapterId: 24, verseNumber: 43 },
      { chapterId: 25, verseNumber: 48 },
      { chapterId: 56, verseNumber: 68 },
    ],
  },
  {
    topic: "Light and Darkness",
    keywords: ["light", "darkness", "nur", "lamp", "sun", "moon", "star", "illuminate"],
    verses: [
      { chapterId: 6, verseNumber: 1 },
      { chapterId: 24, verseNumber: 35 },
      { chapterId: 33, verseNumber: 43 },
      { chapterId: 35, verseNumber: 20 },
      { chapterId: 57, verseNumber: 12 },
      { chapterId: 71, verseNumber: 16 },
    ],
  },
  {
    topic: "Honesty and Truthfulness",
    keywords: ["honest", "truth", "truthful", "lie", "lying", "sincere", "sincerity", "trustworthy", "deceit"],
    verses: [
      { chapterId: 2, verseNumber: 42 },
      { chapterId: 3, verseNumber: 17 },
      { chapterId: 9, verseNumber: 119 },
      { chapterId: 17, verseNumber: 36 },
      { chapterId: 33, verseNumber: 70 },
      { chapterId: 49, verseNumber: 6 },
    ],
  },
  {
    topic: "Modesty and Hijab",
    keywords: ["modesty", "hijab", "cover", "veil", "lower gaze", "dress", "modest", "clothing"],
    verses: [
      { chapterId: 24, verseNumber: 30 },
      { chapterId: 24, verseNumber: 31 },
      { chapterId: 33, verseNumber: 53 },
      { chapterId: 33, verseNumber: 59 },
    ],
  },
  {
    topic: "Food and Dietary Laws",
    keywords: ["food", "halal", "haram", "eat", "drink", "pork", "alcohol", "wine", "meat", "slaughter"],
    verses: [
      { chapterId: 2, verseNumber: 168 },
      { chapterId: 2, verseNumber: 173 },
      { chapterId: 5, verseNumber: 3 },
      { chapterId: 5, verseNumber: 90 },
      { chapterId: 6, verseNumber: 145 },
      { chapterId: 16, verseNumber: 114 },
    ],
  },
  {
    topic: "Wealth and Materialism",
    keywords: ["wealth", "money", "rich", "poverty", "worldly", "dunya", "greed", "materialism", "provision"],
    verses: [
      { chapterId: 2, verseNumber: 188 },
      { chapterId: 3, verseNumber: 14 },
      { chapterId: 4, verseNumber: 29 },
      { chapterId: 9, verseNumber: 34 },
      { chapterId: 18, verseNumber: 46 },
      { chapterId: 57, verseNumber: 20 },
      { chapterId: 89, verseNumber: 20 },
      { chapterId: 102, verseNumber: 1 },
    ],
  },
  {
    topic: "Kindness to Parents",
    keywords: ["parents", "mother", "father", "obedience", "kindness", "birr", "elderly", "respect"],
    verses: [
      { chapterId: 2, verseNumber: 83 },
      { chapterId: 4, verseNumber: 36 },
      { chapterId: 6, verseNumber: 151 },
      { chapterId: 17, verseNumber: 23 },
      { chapterId: 17, verseNumber: 24 },
      { chapterId: 29, verseNumber: 8 },
      { chapterId: 31, verseNumber: 14 },
      { chapterId: 46, verseNumber: 15 },
    ],
  },
  {
    topic: "Nature and Environment",
    keywords: ["nature", "environment", "animal", "plant", "tree", "mountain", "sky", "bee", "ant", "bird"],
    verses: [
      { chapterId: 6, verseNumber: 38 },
      { chapterId: 13, verseNumber: 3 },
      { chapterId: 16, verseNumber: 68 },
      { chapterId: 24, verseNumber: 41 },
      { chapterId: 27, verseNumber: 18 },
      { chapterId: 30, verseNumber: 41 },
      { chapterId: 55, verseNumber: 6 },
    ],
  },
  {
    topic: "Peace and Greeting",
    keywords: ["peace", "salam", "greeting", "harmony", "reconciliation", "tranquility"],
    verses: [
      { chapterId: 4, verseNumber: 86 },
      { chapterId: 6, verseNumber: 54 },
      { chapterId: 10, verseNumber: 25 },
      { chapterId: 25, verseNumber: 63 },
      { chapterId: 36, verseNumber: 58 },
      { chapterId: 56, verseNumber: 26 },
      { chapterId: 97, verseNumber: 5 },
    ],
  },
  {
    topic: "Muhammad the Prophet",
    keywords: ["muhammad", "prophet", "messenger", "rasul", "seal of prophets", "ahmad"],
    verses: [
      { chapterId: 3, verseNumber: 144 },
      { chapterId: 33, verseNumber: 21 },
      { chapterId: 33, verseNumber: 40 },
      { chapterId: 33, verseNumber: 56 },
      { chapterId: 47, verseNumber: 2 },
      { chapterId: 48, verseNumber: 29 },
      { chapterId: 61, verseNumber: 6 },
      { chapterId: 68, verseNumber: 4 },
    ],
  },
  {
    topic: "David and Solomon",
    keywords: ["david", "dawud", "solomon", "sulaiman", "psalms", "zabur", "kingdom", "wind"],
    verses: [
      { chapterId: 2, verseNumber: 251 },
      { chapterId: 21, verseNumber: 78 },
      { chapterId: 21, verseNumber: 79 },
      { chapterId: 27, verseNumber: 15 },
      { chapterId: 27, verseNumber: 16 },
      { chapterId: 34, verseNumber: 10 },
      { chapterId: 34, verseNumber: 12 },
      { chapterId: 38, verseNumber: 18 },
      { chapterId: 38, verseNumber: 30 },
    ],
  },
  {
    topic: "Love",
    keywords: ["love", "beloved", "affection", "compassion", "hubb", "mawaddah"],
    verses: [
      { chapterId: 2, verseNumber: 165 },
      { chapterId: 3, verseNumber: 14 },
      { chapterId: 3, verseNumber: 31 },
      { chapterId: 5, verseNumber: 54 },
      { chapterId: 19, verseNumber: 96 },
      { chapterId: 30, verseNumber: 21 },
      { chapterId: 85, verseNumber: 14 },
    ],
  },
  {
    topic: "Fear and Hope",
    keywords: ["fear", "hope", "taqwa", "god-fearing", "piety", "awe", "conscious", "afraid"],
    verses: [
      { chapterId: 2, verseNumber: 218 },
      { chapterId: 3, verseNumber: 175 },
      { chapterId: 7, verseNumber: 56 },
      { chapterId: 15, verseNumber: 49 },
      { chapterId: 32, verseNumber: 16 },
      { chapterId: 39, verseNumber: 9 },
      { chapterId: 59, verseNumber: 18 },
    ],
  },
  {
    topic: "Embryology and Human Development",
    keywords: ["embryo", "womb", "clot", "sperm", "fetus", "stages", "bone", "flesh", "human development"],
    verses: [
      { chapterId: 22, verseNumber: 5 },
      { chapterId: 23, verseNumber: 12 },
      { chapterId: 23, verseNumber: 13 },
      { chapterId: 23, verseNumber: 14 },
      { chapterId: 39, verseNumber: 6 },
      { chapterId: 75, verseNumber: 37 },
      { chapterId: 76, verseNumber: 2 },
      { chapterId: 96, verseNumber: 2 },
    ],
  },
  {
    topic: "Inheritance",
    keywords: ["inheritance", "will", "heir", "estate", "share", "bequest"],
    verses: [
      { chapterId: 2, verseNumber: 180 },
      { chapterId: 4, verseNumber: 7 },
      { chapterId: 4, verseNumber: 11 },
      { chapterId: 4, verseNumber: 12 },
      { chapterId: 4, verseNumber: 176 },
    ],
  },
  {
    topic: "Usury and Interest",
    keywords: ["usury", "interest", "riba", "loan", "debt", "banking"],
    verses: [
      { chapterId: 2, verseNumber: 275 },
      { chapterId: 2, verseNumber: 276 },
      { chapterId: 2, verseNumber: 278 },
      { chapterId: 3, verseNumber: 130 },
      { chapterId: 4, verseNumber: 161 },
      { chapterId: 30, verseNumber: 39 },
    ],
  },
  {
    topic: "War and Jihad",
    keywords: ["war", "jihad", "fight", "battle", "struggle", "defense", "combat", "martyr"],
    verses: [
      { chapterId: 2, verseNumber: 190 },
      { chapterId: 2, verseNumber: 216 },
      { chapterId: 4, verseNumber: 74 },
      { chapterId: 8, verseNumber: 60 },
      { chapterId: 9, verseNumber: 20 },
      { chapterId: 22, verseNumber: 39 },
      { chapterId: 49, verseNumber: 15 },
    ],
  },
  {
    topic: "Brotherhood and Unity",
    keywords: ["brother", "brotherhood", "unity", "ummah", "community", "together", "hold fast"],
    verses: [
      { chapterId: 3, verseNumber: 103 },
      { chapterId: 8, verseNumber: 63 },
      { chapterId: 21, verseNumber: 92 },
      { chapterId: 49, verseNumber: 10 },
      { chapterId: 49, verseNumber: 13 },
      { chapterId: 61, verseNumber: 4 },
    ],
  },
  {
    topic: "Backbiting and Gossip",
    keywords: ["backbiting", "gossip", "slander", "spy", "suspicion", "rumor", "mock"],
    verses: [
      { chapterId: 24, verseNumber: 19 },
      { chapterId: 49, verseNumber: 11 },
      { chapterId: 49, verseNumber: 12 },
      { chapterId: 68, verseNumber: 11 },
      { chapterId: 104, verseNumber: 1 },
    ],
  },
  {
    topic: "Ayat al-Kursi",
    keywords: ["ayat al-kursi", "throne verse", "kursi", "chair", "no slumber"],
    verses: [
      { chapterId: 2, verseNumber: 255 },
    ],
  },
  {
    topic: "Surah Al-Fatiha",
    keywords: ["fatiha", "opening", "opener", "guide us", "straight path"],
    verses: [
      { chapterId: 1, verseNumber: 1 },
      { chapterId: 1, verseNumber: 2 },
      { chapterId: 1, verseNumber: 3 },
      { chapterId: 1, verseNumber: 4 },
      { chapterId: 1, verseNumber: 5 },
      { chapterId: 1, verseNumber: 6 },
      { chapterId: 1, verseNumber: 7 },
    ],
  },
  {
    topic: "Night and Stars",
    keywords: ["night", "star", "stars", "constellation", "sky", "space", "orbit", "sunrise", "sunset"],
    verses: [
      { chapterId: 6, verseNumber: 97 },
      { chapterId: 16, verseNumber: 16 },
      { chapterId: 36, verseNumber: 37 },
      { chapterId: 36, verseNumber: 38 },
      { chapterId: 36, verseNumber: 40 },
      { chapterId: 51, verseNumber: 7 },
      { chapterId: 53, verseNumber: 1 },
      { chapterId: 81, verseNumber: 15 },
      { chapterId: 86, verseNumber: 1 },
    ],
  },
  {
    topic: "Surah Yaseen",
    keywords: ["yaseen", "yasin", "ya sin", "heart of quran"],
    verses: [
      { chapterId: 36, verseNumber: 1 },
      { chapterId: 36, verseNumber: 2 },
      { chapterId: 36, verseNumber: 3 },
    ],
  },
  {
    topic: "Protection and Refuge",
    keywords: ["protection", "refuge", "seek refuge", "auzu", "evil eye", "jealousy", "envy", "morning", "evening"],
    verses: [
      { chapterId: 2, verseNumber: 255 },
      { chapterId: 113, verseNumber: 1 },
      { chapterId: 113, verseNumber: 2 },
      { chapterId: 113, verseNumber: 3 },
      { chapterId: 113, verseNumber: 4 },
      { chapterId: 113, verseNumber: 5 },
      { chapterId: 114, verseNumber: 1 },
      { chapterId: 114, verseNumber: 2 },
      { chapterId: 114, verseNumber: 3 },
      { chapterId: 114, verseNumber: 4 },
      { chapterId: 114, verseNumber: 5 },
      { chapterId: 114, verseNumber: 6 },
    ],
  },
  {
    topic: "Hypocrisy",
    keywords: ["hypocrite", "hypocrisy", "munafiq", "pretend", "two-faced", "deceive believers"],
    verses: [
      { chapterId: 2, verseNumber: 8 },
      { chapterId: 2, verseNumber: 14 },
      { chapterId: 4, verseNumber: 142 },
      { chapterId: 9, verseNumber: 67 },
      { chapterId: 33, verseNumber: 1 },
      { chapterId: 63, verseNumber: 1 },
      { chapterId: 63, verseNumber: 4 },
    ],
  },
  {
    topic: "Miracles and Signs",
    keywords: ["miracle", "sign", "proof", "wonder", "evidence", "ayah"],
    verses: [
      { chapterId: 2, verseNumber: 164 },
      { chapterId: 3, verseNumber: 49 },
      { chapterId: 6, verseNumber: 95 },
      { chapterId: 10, verseNumber: 5 },
      { chapterId: 16, verseNumber: 12 },
      { chapterId: 30, verseNumber: 20 },
      { chapterId: 41, verseNumber: 53 },
      { chapterId: 45, verseNumber: 3 },
    ],
  },
  {
    topic: "Supplication (Dua)",
    keywords: ["dua", "supplication", "call upon", "invoke", "ask", "beseech", "prayer request"],
    verses: [
      { chapterId: 2, verseNumber: 186 },
      { chapterId: 7, verseNumber: 55 },
      { chapterId: 7, verseNumber: 56 },
      { chapterId: 14, verseNumber: 40 },
      { chapterId: 25, verseNumber: 77 },
      { chapterId: 27, verseNumber: 62 },
      { chapterId: 40, verseNumber: 60 },
    ],
  },
  {
    topic: "Prophets and Messengers",
    keywords: ["prophet", "messenger", "sent", "nabi", "rasool", "apostle"],
    verses: [
      { chapterId: 2, verseNumber: 136 },
      { chapterId: 2, verseNumber: 285 },
      { chapterId: 3, verseNumber: 81 },
      { chapterId: 4, verseNumber: 163 },
      { chapterId: 6, verseNumber: 84 },
      { chapterId: 21, verseNumber: 25 },
      { chapterId: 33, verseNumber: 7 },
    ],
  },
];

export function searchTopicIndex(query: string): { chapterId: number; verseNumber: number; topic: string }[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: { chapterId: number; verseNumber: number; topic: string }[] = [];
  const seen = new Set<string>();

  for (const entry of topicIndex) {
    const topicMatch = entry.topic.toLowerCase().includes(q);
    const keywordMatch = entry.keywords.some((kw) => kw.includes(q) || q.includes(kw));

    if (topicMatch || keywordMatch) {
      for (const v of entry.verses) {
        const key = `${v.chapterId}:${v.verseNumber}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ ...v, topic: entry.topic });
        }
      }
    }
  }

  return results;
}
```

---

## File 3 — `server/routes.ts` (search-related excerpt)

Layer 3. The `/api/search` endpoint and the lazy in-memory index builder it consumes.

```ts
import type { Express } from "express";
import { createServer, type Server } from "http";
import { Readable, pipeline } from "stream";

let searchIndex: Array<{ chapterId: number; verseNumber: number; translation: string }> | null = null;

async function getSearchIndex() {
  if (searchIndex) return searchIndex;
  const fs = await import('fs/promises');
  const path = await import('path');
  const entries: Array<{ chapterId: number; verseNumber: number; translation: string }> = [];
  for (let i = 1; i <= 114; i++) {
    try {
      const filePath = path.default.join(process.cwd(), 'public', 'data', 'chapters', `${i}.json`);
      const raw = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(raw);
      for (const verse of data.verses || []) {
        entries.push({ chapterId: i, verseNumber: verse.number, translation: verse.translation || '' });
      }
    } catch {}
  }
  searchIndex = entries;
  return searchIndex;
}

const SAFE_PARAM = /^[a-zA-Z0-9_\-]+$/;
const SAFE_NUM = /^[0-9]+$/;

export async function registerRoutes(app: Express): Promise<Server> {
  // Hidden Sentry verification endpoint. Throws so the global error handler
  // (Sentry's setupExpressErrorHandler) captures and reports it.
  app.get("/api/_debug/sentry", (_req, _res) => {
    throw new Error("Sentry test error from /api/_debug/sentry");
  });

  app.get("/api/search", async (req, res) => {
    try {
      const q = (req.query.q as string || '').trim().toLowerCase();
      if (q.length < 2) return res.json({ results: [] });

      const index = await getSearchIndex();
      const results: Array<{ chapterId: number; verseNumber: number; translation: string }> = [];
      const limit = 30;

      for (const entry of index) {
        if (entry.translation.toLowerCase().includes(q)) {
          results.push(entry);
          if (results.length >= limit) break;
        }
      }

      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.json({ results });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  // Verse-by-verse audio proxy for EveryAyah.com
```

> The file continues with unrelated routes (audio proxies, etc.) — omitted here. The search surface is fully contained in the snippet above.

---

## Request / response contract

**`GET /api/search?q=<query>`**

- `q` is lowercased and trimmed server-side; queries < 2 chars short-circuit to `{ results: [] }`.
- Response body:
  ```json
  {
    "results": [
      { "chapterId": 2, "verseNumber": 255, "translation": "Allah - there is no deity..." }
    ]
  }
  ```
- Headers: `Cache-Control: public, max-age=3600`.
- Errors return `500 { error: "Search failed" }` and are logged server-side.

---

## Dependencies referenced by the search code

- `@/lib/quranMetadata` → `chapters`, `juzData`, `surahMeanings` (static lookup tables — not part of search itself but used for filtering and result rendering).
- `@/services/lazyChapterService` → `getVerses(chapterId)` returns the full verse list for a chapter; used to backfill translation previews on topic-match results.
- `@/components/ChapterCard`, `@/components/PullToRefresh`, `@/components/ui/input`, `@/components/ui/skeleton` — presentational only.
- `lucide-react` — icons (`Search`, `BookOpen`, `ArrowRight`, `Loader`, `Lock`, `X`).

---

*End of export.*
