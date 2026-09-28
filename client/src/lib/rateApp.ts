import { Capacitor } from '@capacitor/core';
import { InAppReview } from '@capacitor-community/in-app-review';
import * as Sentry from '@sentry/capacitor';
import { getItem, setItem } from './storage';

const STATE_KEY = 'quran-rate-prompt-state';

// Chapter-completion counts at which we ask the OS to (maybe) show its native
// rating dialog. Spaced out and capped so we don't call the API excessively —
// the OS decides whether to actually display it either way.
const COMPLETION_MILESTONES = [3, 15, 30];
const MIN_DAYS_BETWEEN_ATTEMPTS = 60;

interface RatePromptState {
  chapterCompletions: number;
  attempts: number;
  lastAttemptAt: string | null;
}

function getDefaultState(): RatePromptState {
  return { chapterCompletions: 0, attempts: 0, lastAttemptAt: null };
}

async function getState(): Promise<RatePromptState> {
  try {
    const stored = await getItem(STATE_KEY);
    if (!stored) return getDefaultState();
    return { ...getDefaultState(), ...JSON.parse(stored) };
  } catch {
    return getDefaultState();
  }
}

async function saveState(state: RatePromptState): Promise<void> {
  await setItem(STATE_KEY, JSON.stringify(state));
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
}

export async function notifyChapterCompleted(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const state = await getState();
  state.chapterCompletions += 1;

  const eligibleMilestone = COMPLETION_MILESTONES.includes(state.chapterCompletions);
  const withinAttemptCap = state.attempts < COMPLETION_MILESTONES.length;
  const cooldownElapsed = daysSince(state.lastAttemptAt) >= MIN_DAYS_BETWEEN_ATTEMPTS;

  if (eligibleMilestone && withinAttemptCap && cooldownElapsed) {
    state.attempts += 1;
    state.lastAttemptAt = new Date().toISOString();
    try {
      await InAppReview.requestReview();
    } catch (err) {
      Sentry.captureException(err);
    }
  }

  await saveState(state);
}
