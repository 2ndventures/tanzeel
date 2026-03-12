import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const MIGRATION_FLAG = '__storage_migrated_v1';

const KEYS_TO_MIGRATE = [
  'onboardingCompleted',
  'darkMode',
  'transliteration',
  'showTranslation',
  'arabicScript',
  'reciter',
  'autoScroll',
  'repeat',
  'autoplay',
  'layoutMode',
  'arabicFontSize',
  'translationFontSize',
  'transliterationFontSize',
  'lineSpacing',
  'showVerseNumbers',
  'quran_bookmarks',
  'quran_bookmark_folders',
  'quran-reading-stats',
  'quran-playback-speed',
  'quran-chapter-speeds',
];

const cache = new Map<string, string>();
let initialized = false;

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

async function migrateFromLocalStorage(): Promise<void> {
  if (!isNative()) return;

  const { value: migrated } = await Preferences.get({ key: MIGRATION_FLAG });
  if (migrated) return;

  for (const key of KEYS_TO_MIGRATE) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) {
        await Preferences.set({ key, value });
      }
    } catch {
    }
  }

  await Preferences.set({ key: MIGRATION_FLAG, value: '1' });
}

export async function initStorage(): Promise<void> {
  if (initialized) return;

  if (isNative()) {
    await migrateFromLocalStorage();

    for (const key of KEYS_TO_MIGRATE) {
      try {
        const { value } = await Preferences.get({ key });
        if (value !== null) {
          cache.set(key, value);
        }
      } catch {
      }
    }
  } else {
    for (const key of KEYS_TO_MIGRATE) {
      try {
        const value = localStorage.getItem(key);
        if (value !== null) {
          cache.set(key, value);
        }
      } catch {
      }
    }
  }

  initialized = true;
}

export function getItem(key: string): string | null {
  if (initialized) {
    return cache.get(key) ?? null;
  }
  if (isNative()) {
    return null;
  }
  return localStorage.getItem(key);
}

export function setItem(key: string, value: string): void {
  cache.set(key, value);

  if (isNative()) {
    Preferences.set({ key, value }).catch(() => {});
  } else {
    try {
      localStorage.setItem(key, value);
    } catch {
    }
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (cache.has(key)) {
    return cache.get(key)!;
  }
  if (isNative()) {
    try {
      const { value } = await Preferences.get({ key });
      if (value !== null) {
        cache.set(key, value);
      }
      return value;
    } catch {
      return null;
    }
  }
  return localStorage.getItem(key);
}

export function isReady(): boolean {
  return initialized;
}

export function removeItem(key: string): void {
  cache.delete(key);

  if (isNative()) {
    Preferences.remove({ key }).catch(() => {});
  } else {
    try {
      localStorage.removeItem(key);
    } catch {
    }
  }
}
