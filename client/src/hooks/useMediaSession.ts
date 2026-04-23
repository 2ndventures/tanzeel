import { useEffect, useRef, useCallback } from 'react';
import {
  TanzeelNowPlaying,
  isNativeNowPlayingAvailable,
} from '@/lib/nativeNowPlaying';
import type { PluginListenerHandle } from '@capacitor/core';

const MEDIA_SESSION_ARTWORK: MediaImage[] = [
  { src: '/icons/tanzeel-logo-media.jpg', sizes: '512x512', type: 'image/jpeg' },
];

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
  // and the playback clock is frozen. While true we stop pushing 1Hz position
  // updates and instead pin the OS scrubber at the current position so the
  // lock-screen / Bluetooth UI doesn't keep advancing past silence.
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
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const speedRef = useRef(speed);

  useEffect(() => { onPlayRef.current = onPlay; }, [onPlay]);
  useEffect(() => { onPauseRef.current = onPause; }, [onPause]);
  useEffect(() => { onSeekRef.current = onSeek; }, [onSeek]);
  useEffect(() => { onNextTrackRef.current = onNextTrack; }, [onNextTrack]);
  useEffect(() => { onPreviousTrackRef.current = onPreviousTrack; }, [onPreviousTrack]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const useNative = isNativeNowPlayingAvailable();

  // Native iOS: register remote-command listeners once on mount.
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

  // Native iOS: push metadata + nav availability when active.
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
  }, [useNative, active, title, artist, album, duration, !!onNextTrack, !!onPreviousTrack]);

  // Native iOS: push playback state changes immediately. Reads the latest
  // position from the ref so play/pause flips never send a stale (one-tick
  // behind) currentTime captured from closure.
  useEffect(() => {
    if (!useNative || !active) return;
    // While stalled, report paused to MPNowPlayingInfoCenter so the lock-
    // screen play/pause glyph and scrubber both freeze. The hook's
    // isPlaying state intentionally stays true (so the in-app UI keeps
    // showing the spinner / pause icon) — only the OS view is masked.
    TanzeelNowPlaying.setPlaybackState({
      isPlaying: isPlaying && !isStalled,
      speed,
      position: currentTimeRef.current,
      duration,
    }).catch(() => {});
  }, [useNative, active, isPlaying, isStalled, speed, duration]);

  // Native iOS: throttle position updates (1Hz when playing) to keep the
  // lock-screen scrubber fluid without flooding the bridge. Reads latest
  // currentTime / duration / speed from refs each tick so the value is never
  // stale. When paused, also re-pushes whenever currentTime changes so manual
  // seeks (scrubber drag, verse jump) update the lock-screen position
  // immediately instead of waiting for the next play.
  useEffect(() => {
    if (!useNative || !active) return;
    // While stalled (or paused) push a single "frozen at X" snapshot and
    // skip the 1Hz interval so MPNowPlayingInfoCenter doesn't keep
    // extrapolating the scrubber forward while audio is buffering.
    if (!isPlaying || isStalled) {
      TanzeelNowPlaying.setPosition({
        position: currentTimeRef.current,
        duration: durationRef.current,
        speed: speedRef.current,
        isPlaying: false,
      }).catch(() => {});
      return;
    }
    const id = setInterval(() => {
      TanzeelNowPlaying.setPosition({
        position: currentTimeRef.current,
        duration: durationRef.current,
        speed: speedRef.current,
        isPlaying: true,
      }).catch(() => {});
    }, 1000);
    return () => clearInterval(id);
  }, [useNative, active, isPlaying, isStalled, isPlaying && !isStalled ? 0 : currentTime]);

  // Web MediaSession path. Runs on every platform (browser, PWA, Android, and
  // iOS Capacitor) — on iOS it acts as a fallback in case the native plugin
  // fails to register or initialize. Native MPNowPlayingInfoCenter takes
  // visual precedence on iOS when it works; the duplicate handlers are
  // harmless because play/pause/seek are idempotent.
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

  // Web MediaSession position-state updates. Mirrors the native iOS path:
  // when playing, runs a steady 1Hz interval that reads currentTime/duration/
  // speed from refs (so the interval is created once and is not torn down on
  // every state tick — calling setPositionState at the React update cadence
  // confuses browser and OS media UIs and causes the lock-screen scrubber to
  // jump). When paused, re-pushes whenever currentTime changes so manual
  // scrubs / verse jumps update the lock screen immediately.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const push = () => {
      const d = durationRef.current;
      if (!d || d <= 0) return;
      try {
        // playbackRate must be > 0 per the Media Session spec, so we always
        // send the real rate. Freezing the scrubber while stalled is handled
        // by the playbackState effect above, which flips to 'paused' — the
        // OS then stops extrapolating the position forward and pins it to
        // the snapshot we send here.
        navigator.mediaSession.setPositionState({
          duration: d,
          playbackRate: speedRef.current,
          position: Math.min(currentTimeRef.current, d),
        });
      } catch {
      }
    };

    // Stalled or paused → push one snapshot and stop the 1Hz interval.
    // playbackState='paused' (set above) keeps the scrubber pinned.
    if (!isPlaying || isStalled) {
      push();
      return;
    }
    push();
    const id = setInterval(push, 1000);
    return () => clearInterval(id);
  }, [isPlaying, isStalled, isPlaying && !isStalled ? 0 : currentTime, duration > 0]);
}
