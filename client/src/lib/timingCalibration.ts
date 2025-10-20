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
    
    // Parse stored data - handle both new array format and legacy object/primitive formats
    let offsets: TimingOffset[];
    const parsed = JSON.parse(stored);
    
    // If it's already an array, use it
    if (Array.isArray(parsed)) {
      offsets = parsed;
    } 
    // If it's an object (legacy map format: {reciterId: offsetMs}), migrate it
    else if (typeof parsed === 'object' && parsed !== null) {
      console.log(`📦 Migrating legacy timing offset object format to array structure`);
      offsets = Object.entries(parsed).map(([key, value]) => ({
        reciterId: key,
        offsetMs: typeof value === 'number' ? value : parseInt(String(value), 10) || 0,
        lastUpdated: new Date().toISOString(),
      }));
      // Save migrated data
      localStorage.setItem(STORAGE_KEY, JSON.stringify(offsets));
      console.log(`✓ Migrated ${offsets.length} timing offset(s) to new format`);
    }
    // If it's a primitive (legacy single-value format without reciter context)
    else {
      console.warn(`⚠️ Found primitive timing offset value but cannot determine reciter association - clearing for fresh start. Legacy value was:`, parsed);
      // Cannot reliably migrate a single primitive value without knowing which reciter it belongs to
      localStorage.removeItem(STORAGE_KEY);
      return 0;
    }
    
    const offset = offsets.find(o => o.reciterId === reciterId);
    const offsetMs = offset ? offset.offsetMs : 0;
    console.log(`📖 Retrieved timing offset for ${reciterId}: ${offsetMs}ms`);
    return offsetMs;
  } catch (error) {
    console.error('Failed to load timing offset, clearing storage:', error);
    // Clear corrupted storage
    localStorage.removeItem(STORAGE_KEY);
    return 0;
  }
}

/**
 * Set the timing offset for a specific reciter
 */
export function setReciterOffset(reciterId: string, offsetMs: number): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let offsets: TimingOffset[] = [];
    
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // If it's an array, use it
      if (Array.isArray(parsed)) {
        offsets = parsed;
      } 
      // If it's an object (legacy map format), migrate it
      else if (typeof parsed === 'object' && parsed !== null) {
        console.log(`📦 Migrating legacy object format during save`);
        offsets = Object.entries(parsed).map(([key, value]) => ({
          reciterId: key,
          offsetMs: typeof value === 'number' ? value : parseInt(String(value), 10) || 0,
          lastUpdated: new Date().toISOString(),
        }));
      }
      // Otherwise, start fresh with empty array
      else {
        console.warn(`⚠️ Unexpected format during save, starting fresh`);
      }
    }
    
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
 * Reset the timing offset for a specific reciter by removing the entry entirely
 */
export function resetReciterOffset(reciterId: string): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log(`✓ Reset timing offset for ${reciterId} (no stored data)`);
      return;
    }
    
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      // Legacy format - clear everything
      localStorage.removeItem(STORAGE_KEY);
      console.log(`✓ Reset timing offset for ${reciterId} (cleared legacy data)`);
      return;
    }
    
    // Remove the entry for this reciter
    const offsets = parsed.filter((o: TimingOffset) => o.reciterId !== reciterId);
    
    if (offsets.length === 0) {
      // If no offsets remain, remove the key entirely
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(offsets));
    }
    
    console.log(`✓ Reset timing offset for ${reciterId} to 0ms`);
  } catch (error) {
    console.error('Failed to reset timing offset:', error);
  }
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
