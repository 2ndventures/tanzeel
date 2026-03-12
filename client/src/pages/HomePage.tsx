import { Icon } from "@iconify/react";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { chapters, surahMeanings } from "@/lib/quranMetadata";
import { getReadingStats } from "@/lib/readingStats";

const DAILY_SURAHS = [
  { id: 1, verse: "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ", translation: "Guide us to the straight path." },
  { id: 2, verse: "ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ فِيهِ هُدًى لِّلْمُتَّقِينَ", translation: "This is the Book about which there is no doubt, a guidance for those conscious of God." },
  { id: 18, verse: "إِنَّهُمْ فِتْيَةٌ آمَنُوا بِرَبِّهِمْ وَزِدْنَاهُمْ هُدًى", translation: "They were youths who believed in their Lord, and We increased them in guidance." },
  { id: 19, verse: "وَهُزِّىٓ إِلَيْكِ بِجِذْعِ ٱلنَّخْلَةِ تُسَٰقِطْ عَلَيْكِ رُطَبًا جَنِيًّا", translation: "Shake toward you the trunk of the palm tree; it will drop upon you ripe, fresh dates." },
  { id: 31, verse: "يَٰبُنَىَّ إِنَّهَآ إِن تَكُ مِثْقَالَ حَبَّةٍ مِّنْ خَرْدَلٍ", translation: "O my son, indeed if wrong be the weight of a mustard seed..." },
  { id: 36, verse: "إِنَّمَآ أَمْرُهُۥٓ إِذَآ أَرَادَ شَيْـًٔا أَن يَقُولَ لَهُۥ كُن فَيَكُونُ", translation: "His command is only when He intends a thing that He says to it, 'Be,' and it is." },
  { id: 39, verse: "قُلْ يَٰعِبَادِىَ ٱلَّذِينَ أَسْرَفُوا عَلَىٰٓ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ ٱللَّهِ", translation: "Say, 'O My servants who have transgressed against themselves, do not despair of the mercy of God.'" },
  { id: 55, verse: "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ", translation: "Then which of the favors of your Lord will you deny?" },
  { id: 56, verse: "فَسَبِّحْ بِٱسْمِ رَبِّكَ ٱلْعَظِيمِ", translation: "So exalt the name of your Lord, the Most Great." },
  { id: 67, verse: "تَبَٰرَكَ ٱلَّذِى بِيَدِهِ ٱلْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَىْءٍ قَدِيرٌ", translation: "Blessed is He in whose hand is dominion, and He is over all things competent." },
  { id: 93, verse: "وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰٓ", translation: "And your Lord is going to give you, and you will be satisfied." },
  { id: 94, verse: "فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا", translation: "For indeed, with hardship will be ease." },
  { id: 112, verse: "قُلْ هُوَ ٱللَّهُ أَحَدٌ", translation: "Say, 'He is God, the One.'" },
  { id: 113, verse: "قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ", translation: "Say, 'I seek refuge in the Lord of daybreak.'" },
  { id: 114, verse: "قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ", translation: "Say, 'I seek refuge in the Lord of mankind.'" },
];

interface HomePageProps {
  onNavigate: (page: string, chapterId?: number, tab?: "home" | "surah" | "settings" | "bookmarks", verseNumber?: number) => void;
  activeTab?: "home" | "surah" | "settings" | "bookmarks";
}

function getDailySurah() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return DAILY_SURAHS[dayOfYear % DAILY_SURAHS.length];
}

export default function HomePage({ onNavigate, activeTab = "home" }: HomePageProps) {
  const [stats, setStats] = useState({ dayStreak: 0, lastReadDate: '', versesRead: 0, weeklyMinutes: 0, weekStart: '', lastReadChapter: 1, lastReadVerse: 0 });
  const [daily, setDaily] = useState(() => getDailySurah());
  const dailyChapter = chapters.find(ch => ch.id === daily.id) || chapters[0];
  const dailyMeaning = surahMeanings[daily.id] || "";

  useEffect(() => {
    getReadingStats().then(setStats);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        getReadingStats().then(setStats);
        setDaily(getDailySurah());
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
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50 pointer-events-none" />

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
              <div className="relative size-16 flex items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-accent shadow-[0_0_20px_rgba(255,214,10,0.3)]">
                <Icon icon="solar:book-bold" className="size-8 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-1 px-6 gap-4 min-h-0 overflow-y-auto pb-[120px]">
          <div
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/5 p-8 shadow-lg shadow-[0_0_30px_rgba(255,214,10,0.2)] backdrop-blur-sm cursor-pointer flex-1 flex flex-col justify-center animate-fade-in-up"
            style={{ opacity: 0, animationDelay: '0ms', animationFillMode: 'forwards' }}
            onClick={() => onNavigate("chapter", stats.lastReadChapter, undefined, stats.lastReadVerse > 0 ? stats.lastReadVerse : undefined)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate("chapter", stats.lastReadChapter, undefined, stats.lastReadVerse > 0 ? stats.lastReadVerse : undefined); }}}
            role="button"
            tabIndex={0}
            aria-label={`${stats.lastReadVerse > 0 ? 'Continue' : 'Start'} reading Surah ${currentChapter.englishName}, ${stats.lastReadVerse > 0 ? `at ayah ${stats.lastReadVerse} of ${currentChapter.verseCount}, ${progress}% complete` : `${currentChapter.verseCount} ayahs`}`}
            data-testid="card-continue-reading"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl" />
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
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/20 shadow-inner">
                  <Icon icon="solar:bookmark-bold" className="size-7 text-primary" />
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
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-secondary/20 shadow-inner">
                  <Icon icon="solar:star-bold" className="size-7 text-secondary" />
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
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-accent/20 shadow-inner">
                  <Icon icon="solar:settings-bold" className="size-7 text-accent" />
                </div>
                <span className="text-xs font-semibold text-foreground">Settings</span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 animate-fade-in-up pb-4" style={{ opacity: 0, animationDelay: '200ms', animationFillMode: 'forwards' }}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">
                TODAY'S READING
              </h3>
              <Icon icon="solar:alt-arrow-right-bold" className="size-5 text-primary" />
            </div>
            <div
              className="rounded-3xl border border-border/50 bg-card/80 px-5 py-4 shadow-lg backdrop-blur-sm cursor-pointer"
              onClick={() => onNavigate("chapter", daily.id)}
              data-testid="card-todays-reading"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-heading text-xl font-bold tracking-tighter text-foreground">
                    Surah {dailyChapter.englishName}
                  </h4>
                  <p className="mt-2 text-sm text-muted-foreground">{dailyMeaning} • {dailyChapter.verseCount} Ayahs</p>
                </div>
                <div className="rounded-2xl bg-primary/20 px-4 py-2 shadow-inner">
                  <span className="text-sm font-bold text-primary">{daily.id}</span>
                </div>
              </div>
            </div>
          </div>
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
