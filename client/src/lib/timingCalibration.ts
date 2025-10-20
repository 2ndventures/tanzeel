/**
 * Timing Calibration System
 * 
 * Manages per-reciter timing offsets to compensate for sync inaccuracies.
 * Offsets are stored in localStorage and applied to all timestamp calculations.
 */

const STORAGE_KEY = 'quran_timing_offsets';

export interface TimingOffset {
  reciterId: string;
  offsetMs: number; // Offset in milliseconds (positive = delay, negative = advance)
  lastUpdated: string;
}

/**
 * Get the timing offset for a specific reciter
 */
export function getReciterOffset(reciterId: string): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log(`📖 No stored offset for ${reciterId}, using 0ms`);
      return 0;
    }
    
    const offsets: TimingOffset[] = JSON.parse(stored);
    const offset = offsets.find(o => o.reciterId === reciterId);
    const offsetMs = offset ? offset.offsetMs : 0;
    console.log(`📖 Retrieved timing offset for ${reciterId}: ${offsetMs}ms`);
    return offsetMs;
  } catch (error) {
    console.error('Failed to load timing offset:', error);
    return 0;
  }
}

/**
 * Set the timing offset for a specific reciter
 */
export function setReciterOffset(reciterId: string, offsetMs: number): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let offsets: TimingOffset[] = stored ? JSON.parse(stored) : [];
    
    // Remove existing offset for this reciter
    offsets = offsets.filter(o => o.reciterId !== reciterId);
    
    // Add new offset
    offsets.push({
      reciterId,
      offsetMs,
      lastUpdated: new Date().toISOString(),
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(offsets));
    console.log(`✓ Timing offset for ${reciterId}: ${offsetMs}ms`);
  } catch (error) {
    console.error('Failed to save timing offset:', error);
  }
}

/**
 * Reset the timing offset for a specific reciter
 */
export function resetReciterOffset(reciterId: string): void {
  setReciterOffset(reciterId, 0);
}

/**
 * Apply offset to a timestamp value (in seconds)
 */
export function applyOffset(timeSeconds: number, offsetMs: number): number {
  return timeSeconds + (offsetMs / 1000);
}

/**
 * Apply offset to verse timestamps
 */
export function applyOffsetsToTimestamps(
  timestamps: Array<{ verse: number; start: number; end: number }>,
  offsetMs: number
): Array<{ verse: number; start: number; end: number }> {
  if (offsetMs === 0) return timestamps;
  
  const offsetSec = offsetMs / 1000;
  return timestamps.map(t => ({
    verse: t.verse,
    start: Math.max(0, t.start + offsetSec), // Don't go negative
    end: t.end + offsetSec,
  }));
}

/**
 * Get all stored timing offsets
 */
export function getAllOffsets(): TimingOffset[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load timing offsets:', error);
    return [];
  }
}

/**
 * Clear all timing offsets
 */
export function clearAllOffsets(): void {
  localStorage.removeItem(STORAGE_KEY);
  console.log('✓ All timing offsets cleared');
}
