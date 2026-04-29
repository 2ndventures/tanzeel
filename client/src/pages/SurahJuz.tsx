import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import ChapterCard from "@/components/ChapterCard";

import { chapters, juzData, surahMeanings } from "@/lib/quranMetadata";
import { searchTopicIndex } from "@/lib/topicIndex";
import { Search, BookOpen, ArrowRight, Loader, Lock } from "lucide-react";
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
                  aria-label="Search surahs, topics, or keywords"
                  data-testid="input-search"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Search className="w-5 h-5 text-muted-foreground" />
                </div>
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
                            {result.topic}
                          </p>
                          {translationCache[`${result.chapterId}:${result.verseNumber}`] && (
                            <p
                              className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-3 leading-relaxed"
                              data-testid={`search-result-preview-${result.chapterId}-${result.verseNumber}`}
                            >
                              "{translationCache[`${result.chapterId}:${result.verseNumber}`]}"
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {(filteredChapters.length > 0 || showVerseSearch) && (
                <div className="flex items-center gap-2 mt-6 mb-2">
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
