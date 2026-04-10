import { useState, useEffect, useMemo, useCallback } from "react";
import { Icon } from "@iconify/react";
import useEmblaCarousel from "embla-carousel-react";
import { Verse, chapters, getDisplayArabicName } from "@/lib/quranMetadata";
import { tokenizeArabicWords, tokenizeTajweedWords, stripIndopakBoxChars } from "@/lib/arabicTokenizer";
import { paginateVerses, getPageIndexForVerse } from "@/lib/mushafPagination";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Slider } from "@/components/ui/slider";

interface MushafPageViewProps {
  verses: Verse[];
  isLoadingVerses: boolean;
  versesError: string | null;
  chapterId: number;
  currentVerse: number;
  currentWordIndex: number | null;
  isPlaying: boolean;
  showTranslation: boolean;
  arabicFontSize: string;
  translationFontSize: string;
  lineSpacing: string;
  arabicScript: "uthmani" | "indopak" | "tajweed";
  onVerseClick: (verseNumber: number) => void;
  isCollapsed: boolean;
}

export default function MushafPageView({
  verses,
  isLoadingVerses,
  versesError,
  chapterId,
  currentVerse,
  currentWordIndex,
  isPlaying,
  showTranslation,
  arabicFontSize,
  translationFontSize,
  lineSpacing,
  arabicScript,
  onVerseClick,
}: MushafPageViewProps) {
  const [translationVisible, setTranslationVisible] = useState(showTranslation);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toArabicIndic = (n: number): string =>
    String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);

  const arabicFontClass =
    arabicScript === "indopak" ? "font-indopak" : "font-arabic";

  // Mushaf uses smaller sizes since multiple verses share a page
  const getArabicFontSize = (size: string) => {
    switch (size) {
      case "Small":
        return "text-lg md:text-xl";
      case "Medium":
        return "text-xl md:text-2xl";
      case "Large":
        return "text-2xl md:text-3xl";
      case "Extra Large":
        return "text-3xl md:text-4xl";
      default:
        return "text-xl md:text-2xl";
    }
  };

  const getTranslationFontSize = (size: string) => {
    switch (size) {
      case "Small":
        return "text-sm";
      case "Medium":
        return "text-base";
      case "Large":
        return "text-lg";
      case "Extra Large":
        return "text-xl";
      default:
        return "text-base";
    }
  };

  const getArabicLineSpacing = (spacing: string) => {
    switch (spacing) {
      case "Compact":
        return "leading-[2]";
      case "Normal":
        return "leading-[2.4]";
      case "Relaxed":
        return "leading-[2.8]";
      case "Loose":
        return "leading-[3.2]";
      default:
        return "leading-[2.4]";
    }
  };

  // ── Embla carousel ──
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: "x",
    loop: false,
    dragFree: false,
    containScroll: "trimSnaps",
    direction: "ltr",
  });

  // ── Pagination ──
  const pages = useMemo(() => paginateVerses(verses), [verses]);

  // Track embla's selected page
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrentPageIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // Reset to page 0 when chapter changes
  useEffect(() => {
    setCurrentPageIndex(0);
    if (emblaApi) emblaApi.scrollTo(0, true);
  }, [chapterId, emblaApi]);

  // ── Auto page-flip during playback ──
  useEffect(() => {
    if (!emblaApi || !isPlaying || pages.length === 0) return;
    const targetPage = getPageIndexForVerse(pages, currentVerse);
    if (targetPage !== currentPageIndex) {
      emblaApi.scrollTo(targetPage);
    }
  }, [currentVerse, isPlaying, pages, emblaApi, currentPageIndex]);

  // Jump to a specific page from the drawer slider
  const jumpToPage = useCallback(
    (pageNum: number) => {
      if (emblaApi) {
        emblaApi.scrollTo(pageNum - 1);
      }
    },
    [emblaApi]
  );

  // Chapter info for surah header
  const chapterInfo = chapters.find((ch) => ch.id === chapterId);
  const displayArabicName = chapterInfo
    ? getDisplayArabicName(chapterInfo.arabicName)
    : "";

  // ── Loading / Error states ──
  if (isLoadingVerses) {
    return (
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-lg space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="skeleton h-8 w-48 rounded" />
            <div className="skeleton h-px w-32 rounded" />
          </div>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex justify-center">
              <div
                className={`skeleton h-6 rounded animation-delay-${(i % 5) * 100}`}
                style={{ width: `${90 - (i % 3) * 12}%` }}
              />
            </div>
          ))}
          <div className="flex justify-center pt-2">
            <div className="skeleton h-4 w-16 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (versesError) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <Icon
            icon="mdi:alert-circle"
            className="w-16 h-16 mx-auto text-destructive"
          />
          <p className="text-lg text-destructive">{versesError}</p>
        </div>
      </div>
    );
  }

  // Find the active verse's translation for overlay
  const activeVerse = verses.find((v) => v.number === currentVerse);

  return (
    <div className="relative flex-1 overflow-hidden flex flex-col content-fade-mask">

      {/* ── Embla Carousel ── */}
      <div className="flex-1 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {pages.map((page) => (
            <div
              key={page.pageIndex}
              className="flex-[0_0_100%] min-w-0 h-full flex items-start justify-center px-3 pb-2"
              style={{ paddingTop: 'calc(64px + env(safe-area-inset-top, 0px))' }}
            >
              {/* Mushaf page */}
              <div className="mushaf-page w-full max-w-xl overflow-y-auto px-1 py-3">
                <div className="mushaf-border px-4 py-3 relative z-[1]">

                  {/* Continuous RTL text block */}
                  <div
                    dir="rtl"
                    className={`${getArabicFontSize(arabicFontSize)} ${getArabicLineSpacing(lineSpacing)} ${arabicFontClass} text-justify`}
                  >
                    {page.verses.map((verse) => {
                      const isActive = verse.number === currentVerse;
                      const verseClass = isPlaying
                        ? isActive
                          ? "mushaf-verse-active"
                          : "mushaf-verse-dimmed"
                        : "mushaf-verse-idle";

                      const isTajweed = arabicScript === "tajweed";
                      // Use pre-split word array when available (IndoPak has internal spaces)
                      const rawWords = verse.arabicWords
                        ? verse.arabicWords
                        : isTajweed
                          ? tokenizeTajweedWords(verse.arabicText)
                          : tokenizeArabicWords(verse.arabicText);
                      // Sanitise IndoPak words to remove characters that render as □ boxes
                      const words = arabicScript === 'indopak'
                        ? rawWords.map(stripIndopakBoxChars)
                        : rawWords;

                      return (
                        <span
                          key={verse.number}
                          data-verse-number={verse.number}
                          className={`inline ${verseClass} cursor-pointer`}
                          onClick={() => onVerseClick(verse.number)}
                        >
                          {words.map((word, wIdx) => {
                            const isCurrentWord =
                              isActive &&
                              currentWordIndex !== null &&
                              currentWordIndex === wIdx &&
                              currentWordIndex < words.length;
                            return isTajweed ? (
                              <span
                                key={`m-${chapterId}-${verse.number}-${wIdx}`}
                                id={`word-${chapterId}-${verse.number}-${wIdx}`}
                                className={`transition-colors duration-150 ${
                                  isCurrentWord
                                    ? "active-word"
                                    : ""
                                }`}
                                dangerouslySetInnerHTML={{
                                  __html: word + (wIdx < words.length - 1 ? " " : ""),
                                }}
                              />
                            ) : (
                              <span
                                key={`m-${chapterId}-${verse.number}-${wIdx}`}
                                id={`word-${chapterId}-${verse.number}-${wIdx}`}
                                className={`transition-colors duration-150 ${
                                  isCurrentWord
                                    ? "active-word"
                                    : ""
                                }`}
                              >
                                {word}
                                {wIdx < words.length - 1 ? " " : ""}
                              </span>
                            );
                          })}
                          {arabicScript !== 'indopak' && verse.number > 0 && (
                            <span className={arabicScript === 'tajweed' ? 'verse-end-ornament-tajweed' : 'verse-end-ornament'}>
                              {toArabicIndic(verse.number)}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>

                  {/* Translation overlay for active verse on this page */}
                  {translationVisible &&
                    activeVerse &&
                    page.verses.some(
                      (v) => v.number === currentVerse
                    ) && (
                      <div className="mt-4 pt-3 border-t border-primary/10">
                        <p
                          className={`${getTranslationFontSize(translationFontSize)} text-muted-foreground text-center leading-relaxed transition-opacity duration-300`}
                          dir="ltr"
                        >
                          <span className="text-xs text-primary/50 mr-1">
                            {chapterId}:{currentVerse}
                          </span>
                          {activeVerse.translation}
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Page indicator + Jump-to-page drawer ── */}
      {pages.length > 0 && (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <button
              className="fixed bottom-[200px] left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-full bg-muted/80 backdrop-blur-xl text-xs font-semibold tabular-nums text-muted-foreground shadow-lg ring-1 ring-border/50 transition-all hover:bg-muted"
              aria-label="Jump to page"
            >
              Page {currentPageIndex + 1} / {pages.length}
            </button>
          </DrawerTrigger>

          <DrawerContent className="pb-8 overflow-hidden" style={{ backgroundColor: 'hsl(var(--sheet-bg))' }}>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--glow-primary)/0.10)] via-transparent to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[hsl(var(--glow-primary)/0.12)] via-transparent to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-[hsl(var(--glow-accent)/0.08)] via-transparent to-transparent" />
            </div>
            <DrawerHeader className="relative z-10">
              <DrawerTitle>Jump to Page</DrawerTitle>
              <DrawerDescription>
                Slide to navigate to a specific page
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-6 py-4 relative z-10">
              <Slider
                min={1}
                max={pages.length}
                step={1}
                value={[currentPageIndex + 1]}
                onValueCommit={(val: number[]) => {
                  jumpToPage(val[0]);
                  setDrawerOpen(false);
                }}
                onValueChange={(val: number[]) => {
                  setCurrentPageIndex(val[0] - 1);
                }}
                showTooltip
                tooltipContent={(v: number) => `Page ${v}`}
                disabled={pages.length <= 1}
              />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>1</span>
                <span>{pages.length}</span>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
