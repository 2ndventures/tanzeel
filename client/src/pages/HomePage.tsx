import { Icon } from "@iconify/react";
import { useState, useEffect, useRef, useCallback } from "react";

import { chapters } from "@/lib/quranMetadata";
import { getReadingStats } from "@/lib/readingStats";
import PullToRefresh from "@/components/PullToRefresh";

const DAILY_VERSES = [
  { id: 1, ayah: 6, verse: "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ", translation: "Guide us to the straight path." },
  { id: 2, ayah: 152, verse: "فَٱذْكُرُونِىٓ أَذْكُرْكُمْ وَٱشْكُرُوا لِى وَلَا تَكْفُرُونِ", translation: "So remember Me; I will remember you. And be grateful to Me and do not deny Me." },
  { id: 2, ayah: 255, verse: "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ", translation: "God — there is no deity except Him, the Ever-Living, the Sustainer of existence." },
  { id: 2, ayah: 286, verse: "لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا", translation: "God does not burden a soul beyond that it can bear." },
  { id: 3, ayah: 139, verse: "وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنتُمُ ٱلْأَعْلَوْنَ", translation: "Do not weaken and do not grieve, for you will be superior." },
  { id: 3, ayah: 173, verse: "حَسْبُنَا ٱللَّهُ وَنِعْمَ ٱلْوَكِيلُ", translation: "Sufficient for us is God, and He is the best Disposer of affairs." },
  { id: 9, ayah: 51, verse: "قُل لَّن يُصِيبَنَآ إِلَّا مَا كَتَبَ ٱللَّهُ لَنَا هُوَ مَوْلَىٰنَا", translation: "Say, 'Never will we be struck except by what God has decreed for us; He is our protector.'" },
  { id: 13, ayah: 28, verse: "أَلَا بِذِكْرِ ٱللَّهِ تَطْمَئِنُّ ٱلْقُلُوبُ", translation: "Verily, in the remembrance of God do hearts find rest." },
  { id: 14, ayah: 7, verse: "لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ", translation: "If you are grateful, I will surely increase you." },
  { id: 18, ayah: 13, verse: "إِنَّهُمْ فِتْيَةٌ آمَنُوا بِرَبِّهِمْ وَزِدْنَاهُمْ هُدًى", translation: "They were youths who believed in their Lord, and We increased them in guidance." },
  { id: 21, ayah: 87, verse: "لَّآ إِلَٰهَ إِلَّآ أَنتَ سُبْحَٰنَكَ إِنِّى كُنتُ مِنَ ٱلظَّٰلِمِينَ", translation: "There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers." },
  { id: 24, ayah: 35, verse: "ٱللَّهُ نُورُ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ", translation: "God is the Light of the heavens and the earth." },
  { id: 29, ayah: 69, verse: "وَٱلَّذِينَ جَٰهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا", translation: "And those who strive for Us — We will surely guide them to Our ways." },
  { id: 36, ayah: 82, verse: "إِنَّمَآ أَمْرُهُۥٓ إِذَآ أَرَادَ شَيْـًٔا أَن يَقُولَ لَهُۥ كُن فَيَكُونُ", translation: "His command is only when He intends a thing that He says to it, 'Be,' and it is." },
  { id: 39, ayah: 53, verse: "قُلْ يَٰعِبَادِىَ ٱلَّذِينَ أَسْرَفُوا عَلَىٰٓ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ ٱللَّهِ", translation: "Say, 'O My servants who have transgressed against themselves, do not despair of the mercy of God.'" },
  { id: 40, ayah: 60, verse: "ٱدْعُونِىٓ أَسْتَجِبْ لَكُمْ", translation: "Call upon Me; I will respond to you." },
  { id: 55, ayah: 13, verse: "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ", translation: "Then which of the favors of your Lord will you deny?" },
  { id: 65, ayah: 3, verse: "وَمَن يَتَوَكَّلْ عَلَى ٱللَّهِ فَهُوَ حَسْبُهُۥٓ", translation: "And whoever relies upon God — then He is sufficient for him." },
  { id: 67, ayah: 1, verse: "تَبَٰرَكَ ٱلَّذِى بِيَدِهِ ٱلْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَىْءٍ قَدِيرٌ", translation: "Blessed is He in whose hand is dominion, and He is over all things competent." },
  { id: 93, ayah: 5, verse: "وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰٓ", translation: "And your Lord is going to give you, and you will be satisfied." },
  { id: 94, ayah: 5, verse: "فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا", translation: "For indeed, with hardship will be ease." },
  { id: 112, ayah: 1, verse: "قُلْ هُوَ ٱللَّهُ أَحَدٌ", translation: "Say, 'He is God, the One.'" },
];

interface HomePageProps {
  onNavigate: (page: string, chapterId?: number, tab?: "home" | "surah" | "settings" | "bookmarks", verseNumber?: number) => void;
  activeTab?: "home" | "surah" | "settings" | "bookmarks";
}

function getDailyVerse() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}

export default function HomePage({ onNavigate, activeTab = "home" }: HomePageProps) {
  const [stats, setStats] = useState({ dayStreak: 0, lastReadDate: '', versesRead: 0, weeklyMinutes: 0, weekStart: '', lastReadChapter: 1, lastReadVerse: 0 });
  const [daily, setDaily] = useState(() => getDailyVerse());
  const dailyChapter = chapters.find(ch => ch.id === daily.id) || chapters[0];
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleRefresh = useCallback(async () => {
    const newStats = await getReadingStats();
    setStats(newStats);
    setDaily(getDailyVerse());
  }, []);

  useEffect(() => {
    getReadingStats().then(setStats);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        getReadingStats().then(setStats);
        setDaily(getDailyVerse());
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const currentChapter = chapters.find(ch => ch.id === stats.lastReadChapter) || chapters[0];

  const rawProgress = stats.lastReadVerse && currentChapter.verseCount > 0
    ? (stats.lastReadVerse / currentChapter.verseCount) * 100
    : 0;
  const progress = Math.max(0, Math.min(100, Math.round(rawProgress)));
  const versesLeft = Math.max(0, currentChapter.verseCount - (stats.lastReadVerse || 0));

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-card">
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-[hsl(var(--glow-primary)/0.20)] via-transparent to-[hsl(var(--glow-accent)/0.14)] dark:from-[hsl(var(--glow-primary)/0.12)] dark:to-[hsl(var(--glow-accent)/0.08)]" />

      <div className="relative flex flex-col flex-1 min-h-0">
        <div className="header-safe-padding shrink-0">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">As-salamu alaykum</p>
                <h2 className="font-heading text-4xl font-black tracking-tighter text-foreground">
                  Tanzeel
                </h2>
              </div>
              <div className="relative size-16 flex items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-secondary shadow-[0_0_20px_hsl(var(--glow-primary)/0.35)]">
                <Icon icon="solar:book-bold" className="size-8 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex flex-col flex-1 px-6 gap-4 min-h-0 overflow-y-auto pb-nav-clearance">
        <PullToRefresh onRefresh={handleRefresh} scrollRef={scrollRef}>
          <div
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(var(--glow-primary)/0.18)] via-[hsl(var(--glow-secondary)/0.10)] to-[hsl(var(--glow-accent)/0.06)] p-8 shadow-lg shadow-[0_0_30px_hsl(var(--glow-primary)/0.2)] backdrop-blur-sm cursor-pointer flex-1 flex flex-col justify-center animate-fade-in-up"
            style={{ opacity: 0, animationDelay: '0ms', animationFillMode: 'forwards' }}
            onClick={() => onNavigate("chapter", stats.lastReadChapter, undefined, stats.lastReadVerse > 0 ? stats.lastReadVerse : undefined)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate("chapter", stats.lastReadChapter, undefined, stats.lastReadVerse > 0 ? stats.lastReadVerse : undefined); }}}
            role="button"
            tabIndex={0}
            aria-label={`${stats.lastReadVerse > 0 ? 'Continue' : 'Start'} reading Surah ${currentChapter.englishName}, ${stats.lastReadVerse > 0 ? `at ayah ${stats.lastReadVerse} of ${currentChapter.verseCount}, ${progress}% complete` : `${currentChapter.verseCount} ayahs`}`}
            data-testid="card-continue-reading"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--glow-primary)/0.08)] to-[hsl(var(--glow-secondary)/0.08)] rounded-3xl" />
            <div className="relative mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/70">{stats.lastReadVerse > 0 ? 'Continue Reading' : 'Start Reading'}</p>
                <h3 className="mt-2 font-heading text-3xl font-bold tracking-tighter text-foreground">
                  Surah {currentChapter.englishName}
                </h3>
                <p className="mt-2 text-sm text-foreground/60">
                  {stats.lastReadVerse > 0 ? `Ayah ${stats.lastReadVerse} of ${currentChapter.verseCount}` : `${currentChapter.verseCount} Ayahs`}
                </p>
              </div>
              <Icon icon="solar:book-2-bold" className="size-14 text-foreground/20" />
            </div>
            <div className="mb-4 h-3 overflow-hidden rounded-full bg-foreground/10">
              <div
                style={{ width: `${progress}%` }}
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary shadow-inner"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-foreground/60">
              <span>{progress}% Complete</span>
              <span>{stats.lastReadVerse > 0 ? `${versesLeft} Ayahs left` : `Ready to start`}</span>
            </div>
          </div>

          <div className="animate-fade-in-up" style={{ opacity: 0, animationDelay: '100ms', animationFillMode: 'forwards' }}>
            <div className="grid grid-cols-3 gap-4">
              <div
                className="flex flex-col items-center justify-center rounded-3xl bg-card/80 p-4 shadow-lg backdrop-blur-sm border border-border/50 cursor-pointer"
                onClick={() => onNavigate("surah-juz", undefined, "surah")}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate("surah-juz", undefined, "surah"); }}}
                role="button"
                tabIndex={0}
                aria-label="Browse all surahs"
                data-testid="button-bookmarks"
              >
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-[hsl(var(--glow-primary)/0.15)] shadow-inner">
                  <Icon icon="solar:bookmark-bold" className="size-7 text-secondary" />
                </div>
                <span className="text-xs font-semibold text-foreground">Surahs</span>
              </div>
              <div
                className="flex flex-col items-center justify-center rounded-3xl bg-card/80 p-4 shadow-lg backdrop-blur-sm border border-border/50 cursor-pointer"
                onClick={() => onNavigate("surah-juz", undefined, "surah")}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate("surah-juz", undefined, "surah"); }}}
                role="button"
                tabIndex={0}
                aria-label="View favorites"
                data-testid="button-favorites"
              >
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-[hsl(var(--glow-secondary)/0.15)] shadow-inner">
                  <Icon icon="solar:star-bold" className="size-7 text-accent" />
                </div>
                <span className="text-xs font-semibold text-foreground">Favorites</span>
              </div>
              <div
                className="flex flex-col items-center justify-center rounded-3xl bg-card/80 p-4 shadow-lg backdrop-blur-sm border border-border/50 cursor-pointer"
                onClick={() => onNavigate("settings", undefined, "settings")}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate("settings", undefined, "settings"); }}}
                role="button"
                tabIndex={0}
                aria-label="Open settings"
                data-testid="button-settings"
              >
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-[hsl(var(--glow-accent)/0.15)] shadow-inner">
                  <Icon icon="solar:settings-bold" className="size-7 text-[hsl(var(--glow-accent))]" />
                </div>
                <span className="text-xs font-semibold text-foreground">Settings</span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 pb-4">
            <div
              className="verse-of-day-card relative overflow-hidden rounded-3xl cursor-pointer"
              onClick={() => onNavigate("chapter", daily.id, undefined, daily.ayah)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate("chapter", daily.id, undefined, daily.ayah); }}}
              role="button"
              tabIndex={0}
              aria-label={`Verse of the day: ${daily.translation} — ${dailyChapter.englishName} ${daily.id}:${daily.ayah}`}
              data-testid="card-verse-of-day"
            >
              <div className="verse-of-day-bg absolute inset-0" />
              <div className="relative px-6 py-6 flex flex-col items-center text-center">
                <p
                  className="font-arabic text-[1.7rem] leading-[2.4] text-foreground mb-4"
                  dir="rtl"
                  style={{ opacity: 0, animation: 'verseReveal 0.7s ease-out 0.3s forwards' }}
                >
                  {daily.verse}
                </p>
                <div className="w-10 h-px bg-[hsl(var(--glow-primary)/0.35)] mb-3" style={{ opacity: 0, animation: 'verseReveal 0.5s ease-out 0.7s forwards' }} />
                <p
                  className="text-xs font-medium text-secondary mb-1"
                  style={{ opacity: 0, animation: 'verseReveal 0.5s ease-out 0.8s forwards' }}
                >
                  {dailyChapter.englishName} {daily.id}:{daily.ayah}
                </p>
                <p
                  className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-muted-foreground/50"
                  style={{ opacity: 0, animation: 'verseReveal 0.5s ease-out 0.9s forwards' }}
                >
                  Verse of the Day
                </p>
              </div>
            </div>
          </div>
        </PullToRefresh>
        </div>
      </div>

    </div>
  );
}
