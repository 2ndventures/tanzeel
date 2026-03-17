import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const MIGRATION_FLAG = '__storage_migrated_v1';

const KNOWN_KEYS: string[] = [
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
  'translation',
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

  for (const key of KNOWN_KEYS) {
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

    for (const key of KNOWN_KEYS) {
      try {
        const { value } = await Preferences.get({ key });
        if (value !== null) {
          cache.set(key, value);
        }
      } catch {
      }
    }
  } else {
    for (const key of KNOWN_KEYS) {
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

export async function getItem(key: string): Promise<string | null> {
  if (initialized && cache.has(key)) {
    return cache.get(key)!;
  }
  if (initialized) {
    return null;
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

export async function setItem(key: string, value: string): Promise<void> {
  cache.set(key, value);

  if (isNative()) {
    await Preferences.set({ key, value }).catch(() => {});
  } else {
    try {
      localStorage.setItem(key, value);
    } catch {
    }
  }
}

export async function removeItem(key: string): Promise<void> {
  cache.delete(key);

  if (isNative()) {
    await Preferences.remove({ key }).catch(() => {});
  } else {
    try {
      localStorage.removeItem(key);
    } catch {
    }
  }
}

export function isReady(): boolean {
  return initialized;
}
