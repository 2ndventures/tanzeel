import { Capacitor } from '@capacitor/core';
import { InAppReview } from '@capacitor-community/in-app-review';
import * as Sentry from '@sentry/capacitor';
import { getItem, setItem } from './storage';

// App Store review prompt, driven by real listening time rather than chapter
// completions. We only ever call Apple's native SKStoreReviewController via
// InAppReview.requestReview() — no custom popup, no pre-prompt. Apple decides
// whether to actually display it (never in TestFlight, always in Debug builds).

const STATE_KEY = 'quran-review-prompt-state';

// Minutes of total listening required before the 1st, 2nd and 3rd ask.
const LISTENING_MILESTONES_MIN = [10, 60, 300];
const MAX_ATTEMPTS = LISTENING_MILESTONES_MIN.length;
const MIN_DAYS_BETWEEN_ATTEMPTS = 60;
const MIN_DISTINCT_DAYS = 2;
const MIN_DAYS_SINCE_INSTALL = 2;
// A calendar day only counts as a "listening day" once it has this much audio.
const LISTENING_DAY_MIN_SECONDS = 60;

// Dev-only override for simulator testing of the native prompt. Set e.g.
//   { milestonesMin: [0.1, 0.2, 0.3], minDistinctDays: 1, minDaysSinceInstall: 0 }
// in a Debug build to see the dialog at the first pause, then restore to null
// before committing. Ignored entirely outside import.meta.env.DEV.
const DEV_THRESHOLD_OVERRIDE: {
  milestonesMin?: number[];
  minDistinctDays?: number;
  minDaysSinceInstall?: number;
  minDaysBetweenAttempts?: number;
} | null = null;

// Persist accumulated listening time at most this often while playing. Any
// natural pause flushes immediately, so at worst this much is lost on a crash.
const PERSIST_INTERVAL_MS = 15_000;

export type NaturalPauseReason = 'user_pause' | 'playback_ended' | 'navigate_home' | 'navigate_bookmarks';

interface ReviewPromptState {
  totalListeningSeconds: number;
  // Seconds listened per local calendar day ('YYYY-MM-DD'). Only days with
  // >= LISTENING_DAY_MIN_SECONDS count toward the distinct-days requirement.
  listeningSecondsByDay: Record<string, number>;
  attempts: number;
  lastAttemptAt: string | null;
  firstLaunchAt: string | null;
  // Set when the user became eligible at a natural pause while the app was
  // backgrounded; consumed at the next natural pause in the foreground.
  pendingAsk: boolean;
}

function getDefaultState(): ReviewPromptState {
  return {
    totalListeningSeconds: 0,
    listeningSecondsByDay: {},
    attempts: 0,
    lastAttemptAt: null,
    firstLaunchAt: null,
    pendingAsk: false,
  };
}

let state: ReviewPromptState = getDefaultState();
let loaded = false;
let isFirstLaunch = false;
let unsavedSeconds = 0;
let lastPersistAt = 0;
let persistChain: Promise<void> = Promise.resolve();

function thresholds() {
  const o = import.meta.env.DEV ? DEV_THRESHOLD_OVERRIDE : null;
  return {
    milestonesMin: o?.milestonesMin ?? LISTENING_MILESTONES_MIN,
    minDistinctDays: o?.minDistinctDays ?? MIN_DISTINCT_DAYS,
    minDaysSinceInstall: o?.minDaysSinceInstall ?? MIN_DAYS_SINCE_INSTALL,
    minDaysBetweenAttempts: o?.minDaysBetweenAttempts ?? MIN_DAYS_BETWEEN_ATTEMPTS,
  };
}

function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  const t = new Date(dateStr).getTime();
  if (!isFinite(t)) return Infinity;
  return (Date.now() - t) / (1000 * 60 * 60 * 24);
}

function persist(): Promise<void> {
  unsavedSeconds = 0;
  lastPersistAt = Date.now();
  const snapshot = JSON.stringify(state);
  persistChain = persistChain
    .then(() => setItem(STATE_KEY, snapshot))
    .catch((err) => { Sentry.captureException(err); });
  return persistChain;
}

/**
 * Load persisted state. Must run after initStorage(). Records the first
 * launch timestamp so the install-age and "never on first launch" rules work.
 */
export async function initReviewPrompt(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const stored = await getItem(STATE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      state = { ...getDefaultState(), ...parsed };
      if (!state.listeningSecondsByDay || typeof state.listeningSecondsByDay !== 'object') {
        state.listeningSecondsByDay = {};
      }
    }
  } catch {
    state = getDefaultState();
  }
  if (!state.firstLaunchAt) {
    isFirstLaunch = true;
    state.firstLaunchAt = new Date().toISOString();
    await persist();
  }
}

/**
 * Add wall-clock seconds during which audio was actually playing. Called from
 * the audio hook's timeupdate handler, which covers every playback path
 * (full chapter, in-place chapter advance, verse-by-verse, offline files).
 */
export function recordListening(seconds: number): void {
  if (!loaded || !(seconds > 0)) return;
  state.totalListeningSeconds += seconds;
  const key = localDayKey();
  state.listeningSecondsByDay[key] = (state.listeningSecondsByDay[key] ?? 0) + seconds;
  unsavedSeconds += seconds;
  if (Date.now() - lastPersistAt >= PERSIST_INTERVAL_MS) {
    void persist();
  }
}

export function getTotalListeningMinutes(): number {
  return state.totalListeningSeconds / 60;
}

function distinctListeningDays(): number {
  return Object.values(state.listeningSecondsByDay)
    .filter((s) => s >= LISTENING_DAY_MIN_SECONDS).length;
}

interface Eligibility {
  eligible: boolean;
  reasons: string[];
  minutesListened: number;
  distinctDays: number;
  daysSinceInstall: number;
  attempts: number;
  nextMilestoneMin: number | null;
  pendingAsk: boolean;
}

export function getEligibility(): Eligibility {
  const t = thresholds();
  const minutesListened = getTotalListeningMinutes();
  const distinctDays = distinctListeningDays();
  const daysSinceInstall = state.firstLaunchAt ? daysSince(state.firstLaunchAt) : 0;
  const nextMilestoneMin = state.attempts < MAX_ATTEMPTS ? t.milestonesMin[state.attempts] : null;
  const reasons: string[] = [];

  if (isFirstLaunch) reasons.push('first_launch');
  if (state.attempts >= MAX_ATTEMPTS || nextMilestoneMin === null) reasons.push('max_attempts');
  else if (minutesListened < nextMilestoneMin) reasons.push(`listening<${nextMilestoneMin}min`);
  if (distinctDays < t.minDistinctDays) reasons.push(`days<${t.minDistinctDays}`);
  if (daysSinceInstall < t.minDaysSinceInstall) reasons.push(`installed<${t.minDaysSinceInstall}d`);
  if (daysSince(state.lastAttemptAt) < t.minDaysBetweenAttempts) reasons.push('cooldown');

  return {
    eligible: reasons.length === 0,
    reasons,
    minutesListened,
    distinctDays,
    daysSinceInstall,
    attempts: state.attempts,
    nextMilestoneMin,
    pendingAsk: state.pendingAsk,
  };
}

/**
 * Call at a natural pause (user tapped pause, playback stopped on its own, or
 * the user navigated to Home/Bookmarks). Flushes listening time, then asks for
 * a review if eligible and the app is in the foreground. If eligible while
 * backgrounded, defers to the next foreground natural pause.
 */
export async function onNaturalPause(reason: NaturalPauseReason): Promise<void> {
  if (!loaded) return;
  if (unsavedSeconds > 0) void persist();

  const e = getEligibility();
  if (import.meta.env.DEV) {
    console.log('[reviewPrompt]', reason, {
      eligible: e.eligible,
      blockedBy: e.reasons,
      minutesListened: Number(e.minutesListened.toFixed(2)),
      distinctDays: e.distinctDays,
      daysSinceInstall: Number(e.daysSinceInstall.toFixed(2)),
      attempts: e.attempts,
      nextMilestoneMin: e.nextMilestoneMin,
      pendingAsk: e.pendingAsk,
      visible: document.visibilityState === 'visible',
    });
  }

  if (!e.eligible) {
    // Eligibility is monotonic except for the cooldown, so a stale pending
    // flag can only mean an ask already happened; clear it.
    if (state.pendingAsk) { state.pendingAsk = false; void persist(); }
    return;
  }

  if (document.visibilityState !== 'visible') {
    if (!state.pendingAsk) { state.pendingAsk = true; void persist(); }
    return;
  }

  state.pendingAsk = false;
  if (!Capacitor.isNativePlatform()) {
    void persist();
    return;
  }

  state.attempts += 1;
  state.lastAttemptAt = new Date().toISOString();
  const attempt = state.attempts;
  const minutesListened = Math.round(e.minutesListened);
  await persist();

  Sentry.captureMessage('review_prompt_requested', {
    level: 'info',
    tags: { attempt: String(attempt), trigger: reason },
    extra: { attempt, minutesListened, distinctDays: e.distinctDays },
  });

  try {
    await InAppReview.requestReview();
  } catch (err) {
    Sentry.captureException(err);
  }
}

/** Flush any unsaved listening time (e.g. when the app is backgrounded). */
export function flushListening(): void {
  if (loaded && unsavedSeconds > 0) void persist();
}

export const APP_STORE_WRITE_REVIEW_URL =
  'itms-apps://apps.apple.com/app/id6761934526?action=write-review';
