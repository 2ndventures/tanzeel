import { useState, useEffect, useMemo, useCallback } from "react";
import { Icon } from "@iconify/react";
import useEmblaCarousel from "embla-carousel-react";
import { Verse, chapters, getDisplayArabicName } from "@/lib/quranMetadata";
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
      <div className="flex-1 flex items-center justify-center">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
    <div className="relative flex-1 overflow-hidden flex flex-col">
      {/* Translation toggle */}
      <button
        onClick={() => setTranslationVisible((v) => !v)}
        className={`fixed top-24 right-6 z-30 size-10 rounded-full bg-muted/80 backdrop-blur-xl flex items-center justify-center shadow-lg ring-1 ring-border/50 transition-all duration-300 ${
          translationVisible ? "text-primary" : "text-muted-foreground"
        }`}
        aria-label={
          translationVisible ? "Hide translation" : "Show translation"
        }
      >
        <span className="text-xs font-bold">T</span>
      </button>

      {/* ── Embla Carousel ── */}
      <div className="flex-1 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {pages.map((page) => (
            <div
              key={page.pageIndex}
              className="flex-[0_0_100%] min-w-0 h-full flex items-start justify-center px-3 pt-2 pb-2"
            >
              {/* Mushaf page */}
              <div className="mushaf-page w-full max-w-xl max-h-[calc(100vh-280px)] overflow-y-auto rounded-md px-1 py-3">
                <div className="mushaf-border px-4 py-4 relative z-[1]">
                  {/* Surah header on first page only */}
                  {page.pageIndex === 0 && (
                    <div className="mushaf-surah-header">
                      <span
                        className={`${arabicFontClass} text-base md:text-lg text-foreground/80`}
                      >
                        {displayArabicName}
                      </span>
                    </div>
                  )}

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

                      const words =
                        arabicScript !== "tajweed"
                          ? verse.arabicText.split(" ")
                          : [];

                      return (
                        <span
                          key={verse.number}
                          data-verse-number={verse.number}
                          className={`inline ${verseClass} cursor-pointer`}
                          onClick={() => onVerseClick(verse.number)}
                        >
                          {arabicScript === "tajweed" ? (
                            <span
                              dangerouslySetInnerHTML={{
                                __html: verse.arabicText,
                              }}
                            />
                          ) : (
                            words.map((word, wIdx) => {
                              const isCurrentWord =
                                isActive &&
                                currentWordIndex !== null &&
                                currentWordIndex === wIdx &&
                                currentWordIndex < words.length;
                              return (
                                <span
                                  key={`m-${chapterId}-${verse.number}-${wIdx}`}
                                  className={`transition-colors duration-150 ${
                                    isCurrentWord
                                      ? "text-primary font-bold"
                                      : ""
                                  }`}
                                >
                                  {word}
                                  {wIdx < words.length - 1 ? " " : ""}
                                </span>
                              );
                            })
                          )}
                          {/* Verse end marker */}
                          <span className="inline-block text-primary/60 mx-1 select-none text-[0.6em] align-middle font-sans">
                            ﴿{verse.number}﴾
                          </span>
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
              className="fixed bottom-[180px] left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-full bg-muted/80 backdrop-blur-xl text-xs font-semibold tabular-nums text-muted-foreground shadow-lg ring-1 ring-border/50 transition-all hover:bg-muted"
              aria-label="Jump to page"
            >
              Page {currentPageIndex + 1} / {pages.length}
            </button>
          </DrawerTrigger>

          <DrawerContent className="pb-8">
            <DrawerHeader>
              <DrawerTitle>Jump to Page</DrawerTitle>
              <DrawerDescription>
                Slide to navigate to a specific page
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-6 py-4">
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
