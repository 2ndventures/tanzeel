import { useEffect, useRef, useCallback } from 'react';
import {
  TanzeelNowPlaying,
  isNativeNowPlayingAvailable,
} from '@/lib/nativeNowPlaying';
import type { PluginListenerHandle } from '@capacitor/core';

const MEDIA_SESSION_ARTWORK: MediaImage[] = [
  { src: '/icons/tanzeel-logo-media.jpg', sizes: '512x512', type: 'image/jpeg' },
];

// Anything bigger than this between the value we last pushed (extrapolated
// forward by playbackRate) and the new currentTime counts as a real seek
// and gets a fresh snapshot pushed to the OS now-playing centre. Smaller
// drifts are left alone — the OS extrapolates between snapshots from the
// last `position + (now − lastPush) × playbackRate`, so re-pushing tiny
// corrections every tick is what made the lock-screen scrubber visibly
// snap backward 30–150 ms at a time on real iPhones (task #19).
//
// Chosen at 0.35 s: comfortably above normal extrapolation drift (audio
// clock vs wall clock during steady playback measure ≤ 50 ms apart) but
// low enough that a manual seek of just half a second still gets a fresh
// push so the lock-screen scrubber doesn't sit permanently offset.
const SEEK_DETECTION_THRESHOLD_S = 0.35;

interface MediaSessionOptions {
  title: string;
  artist: string;
  album?: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onNextTrack?: (() => void) | null;
  onPreviousTrack?: (() => void) | null;
  active?: boolean;
  // True when the underlying audio element is buffering (`waiting`/`stalled`)
  // and the playback clock is frozen. While true we report `paused` to the
  // OS so the lock-screen scrubber pins at the current position instead of
  // extrapolating forward over silence.
  isStalled?: boolean;
}

export function useMediaSession({
  title,
  artist,
  album = 'Tanzeel',
  isPlaying,
  currentTime,
  duration,
  speed,
  onPlay,
  onPause,
  onSeek,
  onNextTrack,
  onPreviousTrack,
  active = true,
  isStalled = false,
}: MediaSessionOptions) {
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onSeekRef = useRef(onSeek);
  const onNextTrackRef = useRef(onNextTrack);
  const onPreviousTrackRef = useRef(onPreviousTrack);
  const isPlayingRef = useRef(isPlaying);
  const isStalledRef = useRef(isStalled);
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const speedRef = useRef(speed);
  const activeRef = useRef(active);

  // Snapshot bookkeeping — what was the last position we pushed to each
  // surface, and at what wall-clock time. The seek-detection effects compare
  // each new `currentTime` against the position the OS would have
  // extrapolated to by now, and only push a fresh snapshot when the gap
  // exceeds SEEK_DETECTION_THRESHOLD_S.
  const lastNativePosRef = useRef(currentTime);
  const lastNativeAtRef = useRef(Date.now());
  const lastWebPosRef = useRef(currentTime);
  const lastWebAtRef = useRef(Date.now());

  useEffect(() => { onPlayRef.current = onPlay; }, [onPlay]);
  useEffect(() => { onPauseRef.current = onPause; }, [onPause]);
  useEffect(() => { onSeekRef.current = onSeek; }, [onSeek]);
  useEffect(() => { onNextTrackRef.current = onNextTrack; }, [onNextTrack]);
  useEffect(() => { onPreviousTrackRef.current = onPreviousTrack; }, [onPreviousTrack]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isStalledRef.current = isStalled; }, [isStalled]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { activeRef.current = active; }, [active]);

  const useNative = isNativeNowPlayingAvailable();

  // ── Native iOS: remote-command listeners (registered once) ────────────────
  useEffect(() => {
    if (!useNative) return;
    let handles: PluginListenerHandle[] = [];
    let cancelled = false;

    (async () => {
      const subs = await Promise.all([
        TanzeelNowPlaying.addListener('play', () => onPlayRef.current()),
        TanzeelNowPlaying.addListener('pause', () => onPauseRef.current()),
        TanzeelNowPlaying.addListener('togglePlayPause', () => {
          // Some older Bluetooth headsets send a single toggle command instead
          // of explicit play/pause. Route by current playback state.
          if (isPlayingRef.current) {
            onPauseRef.current();
          } else {
            onPlayRef.current();
          }
        }),
        TanzeelNowPlaying.addListener('nexttrack', () => onNextTrackRef.current?.()),
        TanzeelNowPlaying.addListener('previoustrack', () => onPreviousTrackRef.current?.()),
        TanzeelNowPlaying.addListener('seekto', (e) => onSeekRef.current(e.time)),
      ]);
      if (cancelled) {
        subs.forEach(h => h.remove());
        return;
      }
      handles = subs;
    })();

    return () => {
      cancelled = true;
      handles.forEach(h => h.remove());
    };
  }, [useNative]);

  // ── Native iOS: event-driven snapshot push ────────────────────────────────
  // Replaces the old 1 Hz polling loop. iOS's MPNowPlayingInfoCenter already
  // extrapolates the displayed elapsed time as
  //   displayedPos = lastPushedPosition + (now − lastPushedAt) × playbackRate
  // so re-pushing JS's currentTime every second only contradicts that
  // extrapolation by the bridge + React lag (~30–150 ms) and visibly snaps
  // the scrubber backward each tick. We push exactly once per *event*
  // (play, pause, speed change, surah change, stall begin/end, real seek)
  // and let iOS handle the in-between motion. Reads everything from refs so
  // the value is always current at the moment the event fires.
  const pushNativeSnapshot = useCallback(() => {
    if (!useNative || !active) return;
    const dur = durationRef.current;
    // Skip the brief duration=0 transient at chapter swap. The audio hook
    // resets currentTime/duration to 0 synchronously on chapter change, then
    // refills duration after `loadedmetadata` fires (~100–500 ms later).
    // Pushing a 0/0 snapshot during that window would briefly blank the
    // lock-screen scrubber. The metadata effect re-runs (it depends on
    // duration) once the real value lands, which fires this push correctly.
    if (!dur || dur <= 0) return;
    const pos = currentTimeRef.current;
    TanzeelNowPlaying.setPlaybackState({
      isPlaying: isPlayingRef.current && !isStalledRef.current,
      speed: speedRef.current,
      position: pos,
      duration: dur,
    }).catch(() => {});
    lastNativePosRef.current = pos;
    lastNativeAtRef.current = Date.now();
  }, [useNative, active]);

  // Metadata + nav availability. Pushes title/artist/duration first, then a
  // fresh position snapshot so elapsed time and total duration always reset
  // together at surah change. Without the trailing snapshot the lock screen
  // briefly shows the previous surah's elapsed time against the new total.
  useEffect(() => {
    if (!useNative) return;
    if (!active) {
      TanzeelNowPlaying.clear().catch(() => {});
      return;
    }
    TanzeelNowPlaying.setMetadata({ title, artist, album, duration }).catch(() => {});
    TanzeelNowPlaying.setNavEnabled({
      next: !!onNextTrack,
      previous: !!onPreviousTrack,
    }).catch(() => {});
    pushNativeSnapshot();
  }, [useNative, active, title, artist, album, duration, !!onNextTrack, !!onPreviousTrack, pushNativeSnapshot]);

  // Push on play/pause flip, stall begin/end, speed change.
  useEffect(() => {
    pushNativeSnapshot();
  }, [pushNativeSnapshot, isPlaying, isStalled, speed]);

  // Seek detection. `currentTime` ticks up to ~12 Hz from the audio hook's
  // rAF loop while playing — we never push at that cadence. Instead, on
  // every change, compare to where iOS would have extrapolated to by now;
  // only a real jump (slider drag, verse jump, chapter restart) gets a
  // fresh push.
  useEffect(() => {
    if (!useNative || !active) return;
    const now = Date.now();
    const elapsedSec = (now - lastNativeAtRef.current) / 1000;
    const rate = isPlayingRef.current && !isStalledRef.current ? speedRef.current : 0;
    const extrapolated = lastNativePosRef.current + elapsedSec * rate;
    if (Math.abs(currentTime - extrapolated) > SEEK_DETECTION_THRESHOLD_S) {
      pushNativeSnapshot();
    }
  }, [useNative, active, currentTime, pushNativeSnapshot]);

  // ── Web MediaSession path (Android lock screen, desktop browsers, BT) ─────
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!active) {
      navigator.mediaSession.metadata = null;
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album,
      artwork: MEDIA_SESSION_ARTWORK,
    });
  }, [title, artist, album, active]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const playHandler = () => onPlayRef.current();
    const pauseHandler = () => onPauseRef.current();
    const seekHandler = (details: MediaSessionActionDetails) => {
      if (details.seekTime != null) {
        onSeekRef.current(details.seekTime);
      }
    };

    navigator.mediaSession.setActionHandler('play', playHandler);
    navigator.mediaSession.setActionHandler('pause', pauseHandler);
    navigator.mediaSession.setActionHandler('seekto', seekHandler);

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      }
    };
  }, []);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler(
        'nexttrack',
        onNextTrack ? () => onNextTrackRef.current?.() : null
      );
    } catch {}
    return () => {
      try { navigator.mediaSession.setActionHandler('nexttrack', null); } catch {}
    };
  }, [!!onNextTrack]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler(
        'previoustrack',
        onPreviousTrack ? () => onPreviousTrackRef.current?.() : null
      );
    } catch {}
    return () => {
      try { navigator.mediaSession.setActionHandler('previoustrack', null); } catch {}
    };
  }, [!!onPreviousTrack]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    // Report 'paused' to the OS while stalled so the lock-screen / Bluetooth
    // scrubber freezes alongside the position snapshot we push below. The
    // hook's own isPlaying state stays true so the in-app UI can keep
    // showing a spinner / pause icon.
    navigator.mediaSession.playbackState =
      isPlaying && !isStalled ? 'playing' : 'paused';
  }, [isPlaying, isStalled]);

  // Web MediaSession positionState — same event-driven model as native.
  // Browsers extrapolate displayed position from `playbackRate` between
  // setPositionState calls, so we only push on real events and let the
  // browser handle the in-between motion.
  const pushWebPositionState = useCallback(() => {
    if (!('mediaSession' in navigator)) return;
    if (!activeRef.current) return;
    const d = durationRef.current;
    if (!d || d <= 0) return;
    try {
      const pos = Math.min(currentTimeRef.current, d);
      navigator.mediaSession.setPositionState({
        duration: d,
        playbackRate: speedRef.current,
        position: pos,
      });
      lastWebPosRef.current = pos;
      lastWebAtRef.current = Date.now();
    } catch {
      // setPositionState throws on some browsers if duration/rate are 0
      // mid-transition. Safe to ignore — the next event-driven push
      // re-syncs.
    }
  }, []);

  useEffect(() => {
    pushWebPositionState();
  }, [pushWebPositionState, isPlaying, isStalled, speed, duration]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!active) return;
    const now = Date.now();
    const elapsedSec = (now - lastWebAtRef.current) / 1000;
    const rate = isPlayingRef.current && !isStalledRef.current ? speedRef.current : 0;
    const extrapolated = lastWebPosRef.current + elapsedSec * rate;
    if (Math.abs(currentTime - extrapolated) > SEEK_DETECTION_THRESHOLD_S) {
      pushWebPositionState();
    }
  }, [active, currentTime, pushWebPositionState]);
}
