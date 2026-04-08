const memoryTimingCache = new Map<string, any>();
const MAX_MEMORY_TIMING_ENTRIES = 20;

export function getTimingDataFromMemory(reciterId: number, chapterId: number): any | null {
  const key = `${reciterId}-${chapterId}`;
  const data = memoryTimingCache.get(key);
  if (data !== undefined) {
    memoryTimingCache.delete(key);
    memoryTimingCache.set(key, data);
    return data;
  }
  return null;
}

export function storeTimingDataInMemory(reciterId: number, chapterId: number, data: any): void {
  const key = `${reciterId}-${chapterId}`;
  if (memoryTimingCache.size >= MAX_MEMORY_TIMING_ENTRIES && !memoryTimingCache.has(key)) {
    const firstKey = memoryTimingCache.keys().next().value;
    if (firstKey !== undefined) memoryTimingCache.delete(firstKey);
  }
  memoryTimingCache.set(key, data);
}
