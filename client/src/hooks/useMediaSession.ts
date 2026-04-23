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

  // Native iOS: push playback state changes immediately.
  useEffect(() => {
    if (!useNative || !active) return;
    TanzeelNowPlaying.setPlaybackState({
      isPlaying,
      speed,
      position: currentTime,
      duration,
    }).catch(() => {});
  }, [useNative, active, isPlaying, speed, duration]);

  // Native iOS: throttle position updates (1Hz when playing) to keep the
  // lock-screen scrubber fluid without flooding the bridge. Reads latest
  // currentTime / duration / speed from refs each tick so the value is never
  // stale.
  useEffect(() => {
    if (!useNative || !active) return;
    if (!isPlaying) {
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
  }, [useNative, active, isPlaying]);

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
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  const updatePositionState = useCallback(() => {
    if (!('mediaSession' in navigator) || !duration || duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: speed,
        position: Math.min(currentTime, duration),
      });
    } catch {
    }
  }, [currentTime, duration, speed]);

  const positionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (isPlaying && duration > 0) {
      updatePositionState();
      positionIntervalRef.current = setInterval(updatePositionState, 1000);
    } else {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
        positionIntervalRef.current = null;
      }
      if (duration > 0) {
        updatePositionState();
      }
    }

    return () => {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
        positionIntervalRef.current = null;
      }
    };
  }, [isPlaying, duration, updatePositionState]);
}
