import { chapters } from './quranMetadata';
import { getItem, setItem } from './storage';

interface ReadingStats {
  dayStreak: number;
  lastReadDate: string; // ISO date string
  versesRead: number;
  weeklyMinutes: number;
  weekStart: string; // ISO date string for start of current week
  lastReadChapter: number; // Last chapter read (1-114)
  lastReadVerse: number; // Last verse read in that chapter
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
    lastReadChapter: 1, // Default to Al-Fatiha
    lastReadVerse: 0, // Verse 0 means not started yet (0% progress)
  };
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Sunday as start of week
  d.setDate(diff);
  d.setHours(0, 0, 0, 0); // Normalize to midnight
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

export function getReadingStats(): ReadingStats {
  try {
    const stored = getItem(STATS_KEY);
    if (!stored) return getDefaultStats();
    
    const stats: ReadingStats = JSON.parse(stored);
    const now = new Date();
    const weekStart = getWeekStart(now);
    let needsSave = false;
    
    // Type coercion: Ensure chapter and verse are numbers (handles string storage from legacy data)
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
    
    // Backfill missing fields for legacy data
    if (stats.lastReadChapter === undefined || stats.lastReadVerse === undefined || 
        isNaN(stats.lastReadChapter) || isNaN(stats.lastReadVerse)) {
      // For legacy users, preserve their position by defaulting to chapter 1, verse 0
      // They can navigate to where they want to continue
      stats.lastReadChapter = 1; // Default to Al-Fatiha
      stats.lastReadVerse = 0; // Verse 0 = not started/unknown position
      needsSave = true;
    }
    
    // Clamp chapter to valid range (1-114)
    if (stats.lastReadChapter < 1 || stats.lastReadChapter > 114) {
      stats.lastReadChapter = 1;
      stats.lastReadVerse = 0;
      needsSave = true;
    }
    
    // Clamp verse to valid range for the selected chapter
    const currentChapter = chapters.find(ch => ch.id === stats.lastReadChapter);
    if (currentChapter) {
      if (stats.lastReadVerse > currentChapter.verseCount) {
        stats.lastReadVerse = currentChapter.verseCount; // Completed chapter
        needsSave = true;
      }
      if (stats.lastReadVerse < 0) {
        stats.lastReadVerse = 0;
        needsSave = true;
      }
    } else {
      // Chapter lookup failed (shouldn't happen after clamping, but be safe)
      stats.lastReadChapter = 1;
      stats.lastReadVerse = 0;
      needsSave = true;
    }
    
    // Reset weekly stats if new week
    if (new Date(stats.weekStart) < weekStart) {
      stats.weeklyMinutes = 0;
      stats.weekStart = weekStart.toISOString();
      needsSave = true;
    }
    
    // Check if streak is broken
    if (stats.lastReadDate) {
      const lastRead = new Date(stats.lastReadDate);
      const today = new Date();
      
      // If last read was today or yesterday, streak is intact
      if (!isSameDay(lastRead, today) && !isConsecutiveDay(lastRead, today)) {
        // Streak is broken - reset it
        stats.dayStreak = 0;
        stats.lastReadDate = '';
        needsSave = true;
      }
    }
    
    // Save if any resets occurred
    if (needsSave) {
      saveReadingStats(stats);
    }
    
    return stats;
  } catch (error) {
    console.error('Failed to load reading stats:', error);
    return getDefaultStats();
  }
}

export function saveReadingStats(stats: ReadingStats): void {
  try {
    setItem(STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to save reading stats:', error);
  }
}

export function updateDayStreak(): void {
  const stats = getReadingStats();
  const now = new Date();
  const lastRead = stats.lastReadDate ? new Date(stats.lastReadDate) : null;
  
  if (!lastRead || !isSameDay(lastRead, now)) {
    // New day reading
    if (lastRead && isConsecutiveDay(lastRead, now)) {
      stats.dayStreak += 1;
    } else if (!lastRead || !isConsecutiveDay(lastRead, now)) {
      stats.dayStreak = 1;
    }
    stats.lastReadDate = now.toISOString();
    saveReadingStats(stats);
  }
}

export function incrementVersesRead(count: number = 1, verseKey?: string): void {
  const stats = getReadingStats();
  stats.versesRead += count;
  
  // Update last read position if verse key is provided
  if (verseKey) {
    const [chapterStr, verseStr] = verseKey.split(':');
    const chapter = parseInt(chapterStr);
    const verse = parseInt(verseStr);
    
    if (!isNaN(chapter) && !isNaN(verse)) {
      stats.lastReadChapter = chapter;
      stats.lastReadVerse = verse;
    }
  }
  
  saveReadingStats(stats);
  updateDayStreak();
}

export function addReadingTime(seconds: number): void {
  const stats = getReadingStats();
  stats.weeklyMinutes += seconds / 60;
  saveReadingStats(stats);
  updateDayStreak();
}

export function formatReadingTime(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
