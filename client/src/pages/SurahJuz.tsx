import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import ChapterCard from "@/components/ChapterCard";
import BottomNav from "@/components/BottomNav";
import { chapters, juzData, surahMeanings } from "@/lib/quranMetadata";
import { searchTopicIndex } from "@/lib/topicIndex";
import { Search, BookOpen, ArrowRight } from "lucide-react";
import { lazyChapterService } from "@/services/lazyChapterService";

interface TopicResult {
  chapterId: number;
  verseNumber: number;
  topic: string;
}

interface SurahJuzProps {
  onNavigate: (page: string, chapterId?: number, tab?: "home" | "surah" | "settings" | "bookmarks", verseNumber?: number) => void;
  activeTab?: "home" | "surah" | "settings" | "bookmarks";
}

export default function SurahJuz({ onNavigate, activeTab = "surah" }: SurahJuzProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<"surah" | "juz">("surah");
  const hasActiveSearch = searchQuery.trim().length >= 3;

  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleSearchBlur = useCallback(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
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
    <div className="flex flex-col h-full bg-gradient-to-b from-background via-background/95 to-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background/50 to-background/90 dark:from-indigo-900/30 dark:via-slate-900/50 dark:to-black/70 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-amber-500/8 via-transparent to-transparent dark:from-amber-500/10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/20 dark:to-black/30 pointer-events-none" />

      <div className="relative shrink-0 z-10 bg-background/95 backdrop-blur-xl">
        <div className={`header-safe-padding overflow-hidden transition-all duration-300 ${
          hasActiveSearch ? 'max-h-0 opacity-0' : 'max-h-[200px] opacity-100'
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
          <div className={`px-6 ${hasActiveSearch ? 'header-safe-padding pt-4 pb-4' : 'pt-2 pb-6'} space-y-6`}>
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
                  className="h-14 bg-card/80 dark:bg-slate-900/60 backdrop-blur-xl border-0 rounded-3xl text-foreground placeholder:text-muted-foreground px-6 pr-12"
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
                <div className="relative flex gap-2 p-1 bg-card/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl">
                  <button
                    onClick={() => setMode("surah")}
                    className={`flex-1 py-3 rounded-3xl font-semibold text-sm transition-all ${
                      mode === "surah"
                        ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg"
                        : "text-muted-foreground"
                    }`}
                    style={mode === "surah" ? { boxShadow: '0 0 20px rgba(255,214,10,0.3)' } : undefined}
                    data-testid="button-mode-surah"
                  >
                    All Surahs
                  </button>
                  <button
                    onClick={() => setMode("juz")}
                    className={`flex-1 py-3 rounded-3xl font-semibold text-sm transition-all ${
                      mode === "juz"
                        ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg"
                        : "text-muted-foreground"
                    }`}
                    style={mode === "juz" ? { boxShadow: '0 0 20px rgba(255,214,10,0.3)' } : undefined}
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
        <div className="px-6 space-y-3 py-4 pb-[120px]">
          {showTopicResults && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
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
                      className="w-full text-left rounded-2xl border border-border/50 bg-card/60 dark:bg-slate-900/50 backdrop-blur-xl p-4 hover-elevate active-elevate-2 transition-all min-h-[76px]"
                      onClick={() => { (document.activeElement as HTMLElement)?.blur(); onNavigate("chapter", result.chapterId, undefined, result.verseNumber); }}
                      data-testid={`search-result-${result.chapterId}-${result.verseNumber}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 mt-0.5">
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

              {filteredChapters.length > 0 && (
                <div className="flex items-center gap-2 mt-6 mb-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground">Matching Surahs</h2>
                </div>
              )}
            </div>
          )}

          {hasActiveSearch && !showTopicResults && filteredChapters.length === 0 ? (
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
                const juzBadgeStyles = [
                  { bg: "bg-primary/20", text: "text-primary" },
                  { bg: "bg-secondary/20", text: "text-secondary" },
                  { bg: "bg-accent/20", text: "text-accent" },
                ];
                const badge = juzBadgeStyles[(juz.id - 1) % juzBadgeStyles.length];
                return (
                  <div
                    key={juz.id}
                    className="relative group overflow-hidden rounded-3xl border border-border/50 shadow-lg hover-elevate active-elevate-2 cursor-pointer animate-fade-in-up h-20"
                    style={{ animationDelay: `${index * 30}ms` }}
                    onClick={() => { (document.activeElement as HTMLElement)?.blur(); onNavigate("chapter", juz.startChapter); }}
                    data-testid={`juz-card-${juz.id}`}
                  >
                    <div className="relative overflow-hidden rounded-3xl bg-card/80 dark:bg-slate-900/70 backdrop-blur-xl px-5 h-full flex items-center">
                      <div className="flex items-center gap-4 w-full">
                        <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${badge.bg} shadow-inner`}>
                          <span className={`${badge.text} text-lg font-bold`}>{juz.id}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-foreground mb-1">
                            Juz {juz.id}
                          </h3>
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
      </div>

      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === "settings") {
            onNavigate("settings", undefined, "settings");
          } else if (tab === "surah") {
            onNavigate("surah-juz", undefined, "surah");
          } else if (tab === "bookmarks") {
            onNavigate("bookmarks", undefined, "bookmarks");
          } else {
            onNavigate("home", undefined, "home");
          }
        }}
      />
    </div>
  );
}
