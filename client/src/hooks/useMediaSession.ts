import { useEffect, useRef, useCallback } from 'react';

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

  useEffect(() => { onPlayRef.current = onPlay; }, [onPlay]);
  useEffect(() => { onPauseRef.current = onPause; }, [onPause]);
  useEffect(() => { onSeekRef.current = onSeek; }, [onSeek]);
  useEffect(() => { onNextTrackRef.current = onNextTrack; }, [onNextTrack]);
  useEffect(() => { onPreviousTrackRef.current = onPreviousTrack; }, [onPreviousTrack]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!active) {
      // Only clear metadata when audio session is fully torn down (user stopped
      // playback). Clearing on every title/album change would briefly null the
      // iOS Now Playing card mid-session, which can drop the lock-screen
      // controls when advancing between surahs.
      navigator.mediaSession.metadata = null;
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album,
      artwork: MEDIA_SESSION_ARTWORK,
    });
    // Intentionally no cleanup — the metadata stays bound across title/album
    // updates so the lock-screen card transitions seamlessly. It will be
    // cleared by the `!active` branch above when audio is stopped.
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

  // Register / unregister next & previous handlers based on whether callbacks are provided.
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
