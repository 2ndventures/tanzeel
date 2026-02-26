import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import ChapterCard from "@/components/ChapterCard";
import BottomNav from "@/components/BottomNav";
import { StatusBarShim } from "@/components/StatusBarShim";
import { useCollapsibleHeader } from "@/hooks/useCollapsibleHeader";
import { chapters, juzData, surahMeanings } from "@/lib/quranMetadata";
import { searchTopicIndex } from "@/lib/topicIndex";
import { Settings, Search, Sparkles, BookOpen, Loader2, ArrowRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { lazyChapterService } from "@/services/lazyChapterService";

interface SearchResult {
  chapterId: number;
  verseNumber: number;
  topic?: string;
  reason?: string;
  source: "topic" | "ai";
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
  const { isCollapsed, scrollContainerRef } = useCollapsibleHeader({ disabled: hasActiveSearch });

  const [deepSearchResults, setDeepSearchResults] = useState<SearchResult[]>([]);
  const [isDeepSearching, setIsDeepSearching] = useState(false);
  const [deepSearchDone, setDeepSearchDone] = useState(false);
  const [aiError, setAiError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const requestIdRef = useRef(0);
  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});

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

  const runDeepSearch = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 3) {
      setDeepSearchResults([]);
      setDeepSearchDone(false);
      setAiError(false);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setIsDeepSearching(true);
    setAiError(false);

    const topicResults = searchTopicIndex(q);
    const topicSearchResults: SearchResult[] = topicResults.map((r) => ({
      chapterId: r.chapterId,
      verseNumber: r.verseNumber,
      topic: r.topic,
      source: "topic" as const,
    }));

    if (currentRequestId !== requestIdRef.current) return;
    setDeepSearchResults(topicSearchResults);

    try {
      const response = await apiRequest("POST", "/api/ai-search", { query: q });
      const data = await response.json();
      if (currentRequestId !== requestIdRef.current) return;
      if (data.results && Array.isArray(data.results)) {
        const aiResults: SearchResult[] = data.results.map((r: any) => ({
          chapterId: r.chapterId,
          verseNumber: r.verseNumber,
          reason: r.reason,
          source: "ai" as const,
        }));

        setDeepSearchResults((prev) => {
          const seen = new Set(prev.map((r) => `${r.chapterId}:${r.verseNumber}`));
          const newResults = aiResults.filter((r) => !seen.has(`${r.chapterId}:${r.verseNumber}`));
          return [...prev, ...newResults];
        });
      }
    } catch {
      if (currentRequestId !== requestIdRef.current) return;
      setAiError(true);
    }

    if (currentRequestId !== requestIdRef.current) return;
    setIsDeepSearching(false);
    setDeepSearchDone(true);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = searchQuery.trim();
    if (q.length < 3) {
      setDeepSearchResults([]);
      setDeepSearchDone(false);
      setIsDeepSearching(false);
      setAiError(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      runDeepSearch(q);
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, runDeepSearch]);

  useEffect(() => {
    if (deepSearchResults.length === 0) return;

    const chapterIds = Array.from(new Set(deepSearchResults.map(r => r.chapterId)));
    const missingChapters = chapterIds.filter(id =>
      !deepSearchResults.some(r => r.chapterId === id && translationCache[`${id}:${r.verseNumber}`])
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
  }, [deepSearchResults]);

  const hasSearchQuery = hasActiveSearch;
  const showDeepSearch = hasSearchQuery && (deepSearchResults.length > 0 || isDeepSearching || deepSearchDone);
  const noSurahMatch = hasSearchQuery && filteredChapters.length === 0;

  const filteredJuz = juzData.filter((juz) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    // Match if the juz number matches, or if any surah in the juz's range matches the query
    if (juz.id.toString() === query) return true;
    const juzLabel = `juz ${juz.id}`.toLowerCase();
    if (juzLabel.includes(query)) return true;
    // Check if any chapter in this juz range matches
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background/95 to-background pb-24">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background/50 to-background/90 dark:from-indigo-900/30 dark:via-slate-900/50 dark:to-black/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-amber-500/8 via-transparent to-transparent dark:from-amber-500/10" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/20 dark:to-black/30" />

      <StatusBarShim />

      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border header-safe-padding">
        <div className="px-8 pt-4 pb-6">
          <div className="flex items-center justify-between">
            <h1 className="font-heading text-5xl font-black tracking-tighter text-foreground">
              Surahs
            </h1>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onNavigate("settings", undefined, "settings")}
              className="size-14 rounded-full"
              aria-label="Open settings"
              data-testid="button-settings"
            >
              <Settings className="w-10 h-10" aria-hidden="true" style={{ width: '40px', height: '40px' }} />
            </Button>
          </div>
        </div>
      </div>

      <div
        className={`fixed left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border transition-all duration-300 ${
          isCollapsed ? '' : 'collapsible-top-100'
        }`}
        style={{
          top: isCollapsed ? '-200px' : undefined,
        }}
      >
        <div className="px-8 pt-6 pb-6 space-y-6">
          <div className="relative overflow-hidden rounded-3xl p-[1px] shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-border to-transparent rounded-3xl" />
            <div className="relative">
              <label htmlFor="surah-search" className="sr-only">Search surahs, topics, or themes</label>
              <Input
                id="surah-search"
                type="search"
                placeholder="Search surahs, topics, or ask a question..."
                className="h-14 bg-card/80 dark:bg-slate-900/60 backdrop-blur-xl border-0 rounded-3xl text-foreground placeholder:text-muted-foreground px-6 pr-12"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search surahs, topics, or ask a question"
                data-testid="input-search"
              />
              {isDeepSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}
            </div>
          </div>

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
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className={`relative h-screen overflow-y-auto transition-[padding] duration-300 ${
          isCollapsed ? 'scroll-pt-140-safe' : 'scroll-pt-340-safe'
        }`}
      >
        <div className="px-8 space-y-3 pb-28">
          {showDeepSearch && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Verse Results</h2>
                {isDeepSearching && (
                  <span className="text-xs text-muted-foreground ml-2 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Searching with AI...
                  </span>
                )}
              </div>

              {deepSearchResults.length > 0 ? (
                <div className="space-y-2">
                  {deepSearchResults.map((result, idx) => {
                    const chapter = chapters.find((c) => c.id === result.chapterId);
                    if (!chapter) return null;
                    return (
                      <button
                        key={`${result.chapterId}-${result.verseNumber}-${idx}`}
                        className="w-full text-left rounded-2xl border border-border/50 bg-card/60 dark:bg-slate-900/50 backdrop-blur-xl p-4 hover-elevate active-elevate-2 transition-all min-h-[76px]"
                        onClick={() => onNavigate("chapter", result.chapterId, undefined, result.verseNumber)}
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
                              <div className="flex items-center gap-2 shrink-0">
                                {result.source === "ai" && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                                    AI
                                  </span>
                                )}
                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate" data-testid={`search-result-topic-${result.chapterId}-${result.verseNumber}`}>
                              {result.source === "topic" && result.topic
                                ? result.topic
                                : result.reason || surahMeanings[result.chapterId] || ""}
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
              ) : deepSearchDone && !isDeepSearching ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No verse results found for this query.
                </p>
              ) : null}

              {aiError && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  AI search unavailable. Showing topic index results only.
                </p>
              )}

              {filteredChapters.length > 0 && deepSearchResults.length > 0 && (
                <div className="flex items-center gap-2 mt-6 mb-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground">Matching Surahs</h2>
                </div>
              )}
            </div>
          )}

          {isLoading ? (
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
          ) : mode === "juz" ? (
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
                    onClick={() => onNavigate("chapter", juz.startChapter)}
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
            ) : !showDeepSearch ? (
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
                onClick={() => onNavigate("chapter", chapter.id)}
                style={{ animationDelay: `${index * 30}ms` }}
                isFirst={index === 0}
              />
            ))
          ) : !showDeepSearch ? (
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
