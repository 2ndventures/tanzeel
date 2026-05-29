import { chapters } from './quranMetadata';
import { getItem, setItem } from './storage';

interface ReadingStats {
  dayStreak: number;
  lastReadDate: string;
  versesRead: number;
  weeklyMinutes: number;
  weekStart: string;
  lastReadChapter: number;
  lastReadVerse: number;
}

const STATS_KEY = 'quran-reading-stats';

function getDefaultStats(): ReadingStats {
  const now = new Date();
  return {
    dayStreak: 0,
    lastReadDate: '',
    versesRead: 0,
    weeklyMinutes: 0,
    weekStart: getWeekStart(now).toISOString(),
    lastReadChapter: 1,
    lastReadVerse: 0,
  };
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.toDateString() === date2.toDateString();
}

function isConsecutiveDay(lastDate: Date, currentDate: Date): boolean {
  const yesterday = new Date(currentDate);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(lastDate, yesterday);
}

export async function getReadingStats(): Promise<ReadingStats> {
  try {
    const stored = await getItem(STATS_KEY);
    if (!stored) return getDefaultStats();
    
    const stats: ReadingStats = JSON.parse(stored);
    const now = new Date();
    const weekStart = getWeekStart(now);
    let needsSave = false;
    
    if (stats.lastReadChapter !== undefined) {
      const numChapter = Number(stats.lastReadChapter);
      if (!isNaN(numChapter) && numChapter !== stats.lastReadChapter) {
        stats.lastReadChapter = numChapter;
        needsSave = true;
      }
    }
    if (stats.lastReadVerse !== undefined) {
      const numVerse = Number(stats.lastReadVerse);
      if (!isNaN(numVerse) && numVerse !== stats.lastReadVerse) {
        stats.lastReadVerse = numVerse;
        needsSave = true;
      }
    }
    
    if (stats.lastReadChapter === undefined || stats.lastReadVerse === undefined || 
        isNaN(stats.lastReadChapter) || isNaN(stats.lastReadVerse)) {
      stats.lastReadChapter = 1;
      stats.lastReadVerse = 0;
      needsSave = true;
    }
    
    if (stats.lastReadChapter < 1 || stats.lastReadChapter > 114) {
      stats.lastReadChapter = 1;
      stats.lastReadVerse = 0;
      needsSave = true;
    }

    const currentChapter = chapters.find(ch => ch.id === stats.lastReadChapter);
    if (currentChapter) {
      if (stats.lastReadVerse > currentChapter.verseCount) {
        stats.lastReadVerse = currentChapter.verseCount;
        needsSave = true;
      }
      if (stats.lastReadVerse < 0) {
        stats.lastReadVerse = 0;
        needsSave = true;
      }
    } else {
      stats.lastReadChapter = 1;
      stats.lastReadVerse = 0;
      needsSave = true;
    }
    
    if (new Date(stats.weekStart) < weekStart) {
      stats.weeklyMinutes = 0;
      stats.weekStart = weekStart.toISOString();
      needsSave = true;
    }
    
    if (stats.lastReadDate) {
      const lastRead = new Date(stats.lastReadDate);
      const today = new Date();
      
      if (!isSameDay(lastRead, today) && !isConsecutiveDay(lastRead, today)) {
        stats.dayStreak = 0;
        stats.lastReadDate = '';
        needsSave = true;
      }
    }
    
    if (needsSave) {
      await saveReadingStats(stats);
    }
    
    return stats;
  } catch (error) {
    console.error('Failed to load reading stats:', error);
    return getDefaultStats();
  }
}

export async function saveReadingStats(stats: ReadingStats): Promise<void> {
  try {
    await setItem(STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to save reading stats:', error);
  }
}

export async function updateDayStreak(): Promise<void> {
  const stats = await getReadingStats();
  const now = new Date();
  const lastRead = stats.lastReadDate ? new Date(stats.lastReadDate) : null;
  
  if (!lastRead || !isSameDay(lastRead, now)) {
    if (lastRead && isConsecutiveDay(lastRead, now)) {
      stats.dayStreak += 1;
    } else if (!lastRead || !isConsecutiveDay(lastRead, now)) {
      stats.dayStreak = 1;
    }
    stats.lastReadDate = now.toISOString();
    await saveReadingStats(stats);
  }
}

export async function incrementVersesRead(count: number = 1, verseKey?: string): Promise<void> {
  const stats = await getReadingStats();
  stats.versesRead += count;
  
  if (verseKey) {
    const [chapterStr, verseStr] = verseKey.split(':');
    const chapter = parseInt(chapterStr);
    const verse = parseInt(verseStr);
    
    if (!isNaN(chapter) && !isNaN(verse)) {
      stats.lastReadChapter = chapter;
      stats.lastReadVerse = verse;
    }
  }
  
  await saveReadingStats(stats);
  await updateDayStreak();
}

export async function addReadingTime(seconds: number): Promise<void> {
  const stats = await getReadingStats();
  stats.weeklyMinutes += seconds / 60;
  await saveReadingStats(stats);
  await updateDayStreak();
}
