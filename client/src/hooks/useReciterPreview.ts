import { useCallback, useEffect, useRef, useState } from "react";
import { getReciterById } from "@/lib/reciters";
import { getVerseAudioUrl } from "@/lib/audioUrls";

interface UseReciterPreviewOptions {
  pauseMainAudio: () => void;
}

export interface ReciterPreviewState {
  previewingReciter: string | null;
  previewProgress: number;
  previewLoading: boolean;
  previewError: string | null;
  startPreview: (reciterId: string) => void;
  stopPreview: () => void;
}

export function useReciterPreview(options: UseReciterPreviewOptions): ReciterPreviewState {
  const [previewingReciter, setPreviewingReciter] = useState<string | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimerRef = useRef<number | null>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pauseMainAudioRef = useRef(options.pauseMainAudio);
  pauseMainAudioRef.current = options.pauseMainAudio;

  const stopPreview = useCallback(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = "";
      previewAudioRef.current = null;
    }
    if (previewTimerRef.current) {
      cancelAnimationFrame(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    setPreviewingReciter(null);
    setPreviewProgress(0);
    setPreviewLoading(false);
  }, []);

  const startPreview = useCallback((reciterId: string) => {
    stopPreview();
    setPreviewError(null);
    if (errorClearRef.current) {
      clearTimeout(errorClearRef.current);
      errorClearRef.current = null;
    }
    pauseMainAudioRef.current();

    const reciterData = getReciterById(reciterId);
    if (!reciterData) return;

    setPreviewingReciter(reciterId);
    setPreviewLoading(true);

    const audio = new Audio(getVerseAudioUrl(reciterData.everyAyahFolder, 1, 2));
    previewAudioRef.current = audio;

    const isCurrent = () => previewAudioRef.current === audio;

    const showError = () => {
      if (!isCurrent()) return;
      setPreviewError("Preview unavailable offline");
      stopPreview();
      errorClearRef.current = setTimeout(() => {
        setPreviewError(null);
        errorClearRef.current = null;
      }, 2500);
    };

    previewTimeoutRef.current = setTimeout(() => {
      if (isCurrent() && audio.paused) {
        showError();
      }
    }, 10000);

    const handleCanPlay = () => {
      if (!isCurrent()) return;
      setPreviewLoading(false);
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
      audio.play().catch(() => showError());
    };
    audio.addEventListener("canplay", handleCanPlay, { once: true });

    audio.addEventListener("error", () => {
      if (!isCurrent()) return;
      showError();
    }, { once: true });

    audio.addEventListener("ended", () => {
      if (!isCurrent()) return;
      stopPreview();
    }, { once: true });

    const updateProgress = () => {
      if (!isCurrent()) return;
      if (audio.duration && !audio.paused) {
        setPreviewProgress(audio.currentTime / audio.duration);
        previewTimerRef.current = requestAnimationFrame(updateProgress);
      }
    };
    const handlePlay = () => {
      if (!isCurrent()) return;
      previewTimerRef.current = requestAnimationFrame(updateProgress);
    };
    audio.addEventListener("play", handlePlay);

    audio.load();
  }, [stopPreview]);

  useEffect(() => {
    return () => {
      stopPreview();
      if (errorClearRef.current) {
        clearTimeout(errorClearRef.current);
        errorClearRef.current = null;
      }
    };
  }, [stopPreview]);

  return {
    previewingReciter,
    previewProgress,
    previewLoading,
    previewError,
    startPreview,
    stopPreview,
  };
}
