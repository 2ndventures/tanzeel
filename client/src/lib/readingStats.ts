// Reading statistics tracking for Quran app

interface ReadingStats {
  dayStreak: number;
  lastReadDate: string; // ISO date string
  versesRead: number;
  weeklyMinutes: number;
  weekStart: string; // ISO date string for start of current week
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
    const stored = localStorage.getItem(STATS_KEY);
    if (!stored) return getDefaultStats();
    
    const stats: ReadingStats = JSON.parse(stored);
    const now = new Date();
    const weekStart = getWeekStart(now);
    let needsSave = false;
    
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
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
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

export function incrementVersesRead(count: number = 1): void {
  const stats = getReadingStats();
  stats.versesRead += count;
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
