import { useEffect, useRef, useCallback } from 'react';

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
}: MediaSessionOptions) {
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onSeekRef = useRef(onSeek);

  useEffect(() => { onPlayRef.current = onPlay; }, [onPlay]);
  useEffect(() => { onPauseRef.current = onPause; }, [onPause]);
  useEffect(() => { onSeekRef.current = onSeek; }, [onSeek]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album,
    });

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
      }
    };
  }, [title, artist, album]);

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
