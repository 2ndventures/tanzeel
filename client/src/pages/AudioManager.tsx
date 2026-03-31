import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, Download, Loader2, X, Trash2 } from "lucide-react";
import { setDownloadActive } from "@/lib/downloadState";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { chapters, getDisplayArabicName } from "@/lib/quranMetadata";
import { getReciterById } from "@/lib/reciters";
import { getCacheStats, setMaxCacheSize, getManifest } from "@/services/audioCache";
import {
  downloadSurah,
  downloadAllSurahs,
  cancelDownload,
  deleteSurahDownload,
  getDownloadStatus,
  savePendingDownload,
  getPendingDownload,
  clearPendingDownload,
  type PendingDownload,
} from "@/services/audioDownloadManager";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 MB";
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

function getStorageBreakdown(): { cached: number; downloaded: number } {
  const manifest = getManifest();
  if (!manifest) return { cached: 0, downloaded: 0 };
  let cached = 0;
  let downloaded = 0;
  for (const entry of Object.values(manifest.files)) {
    if (entry.source === "download") {
      downloaded += entry.sizeBytes;
    } else {
      cached += entry.sizeBytes;
    }
  }
  return { cached, downloaded };
}

function getSurahDownloadedSize(reciterId: string, surahNum: number): number {
  const manifest = getManifest();
  if (!manifest) return 0;
  let total = 0;
  for (const entry of Object.values(manifest.files)) {
    if (entry.reciterId === reciterId && entry.surahNumber === surahNum && entry.source === "download") {
      total += entry.sizeBytes;
    }
  }
  return total;
}

const ESTIMATED_MB_PER_SURAH = 20;

interface AudioManagerProps {
  onBack: () => void;
  reciter: string;
}

interface ActiveDownload {
  type: "surah" | "all";
  surahNum?: number;
  percent: number;
}

export default function AudioManager({ onBack, reciter }: AudioManagerProps) {
  const reciterData = getReciterById(reciter);
  const reciterName = reciterData?.name || "Unknown Reciter";

  const [stats, setStats] = useState(() => getCacheStats());
  const [breakdown, setBreakdown] = useState(() => getStorageBreakdown());
  const [activeDownload, setActiveDownload] = useState<ActiveDownload | null>(null);
  const [surahStatuses, setSurahStatuses] = useState<Record<number, "none" | "partial" | "complete">>({});
  const [confirmSurah, setConfirmSurah] = useState<number | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [deleteSurahNum, setDeleteSurahNum] = useState<number | null>(null);
  const [resumePrompt, setResumePrompt] = useState<PendingDownload | null>(null);
  const downloadingRef = useRef(false);

  const refreshAll = useCallback(() => {
    setStats(getCacheStats());
    setBreakdown(getStorageBreakdown());
    const statuses: Record<number, "none" | "partial" | "complete"> = {};
    for (const ch of chapters) {
      statuses[ch.id] = getDownloadStatus(reciter, ch.id, ch.verseCount);
    }
    setSurahStatuses(statuses);
  }, [reciter]);

  useEffect(() => {
    refreshAll();
    getPendingDownload().then((pending) => {
      if (pending && pending.reciterId === reciter) {
        const isComplete = pending.type === 'all'
          ? chapters.every(ch => getDownloadStatus(reciter, ch.id, ch.verseCount) === 'complete')
          : pending.surahNum
            ? getDownloadStatus(reciter, pending.surahNum, chapters.find(c => c.id === pending.surahNum)?.verseCount || 0) === 'complete'
            : false;
        if (isComplete) {
          clearPendingDownload();
        } else {
          setResumePrompt(pending);
        }
      } else if (pending) {
        clearPendingDownload();
      }
    });
  }, [refreshAll, reciter]);

  const handleDownloadSurah = useCallback(async (surahNum: number) => {
    const ch = chapters.find((c) => c.id === surahNum);
    if (!ch || downloadingRef.current) return;

    downloadingRef.current = true;
    setActiveDownload({ type: "surah", surahNum, percent: 0 });
    setDownloadActive(true);
    await savePendingDownload({ type: "surah", reciterId: reciter, surahNum });

    try {
      await downloadSurah(reciter, surahNum, ch.verseCount, (percent) => {
        setActiveDownload((prev) => (prev ? { ...prev, percent } : null));
      });
    } finally {
      downloadingRef.current = false;
      setActiveDownload(null);
      setDownloadActive(false);
      setCancelling(false);
      await clearPendingDownload();
      refreshAll();
    }
  }, [reciter, refreshAll]);

  const handleDownloadAll = useCallback(async () => {
    if (downloadingRef.current) return;

    downloadingRef.current = true;
    setActiveDownload({ type: "all", percent: 0 });
    setDownloadActive(true);
    await savePendingDownload({ type: "all", reciterId: reciter });

    try {
      let completedSurahs = 0;
      await downloadAllSurahs(reciter, (surahNum, percent) => {
        if (percent === 100) completedSurahs++;
        const overallPercent = Math.round(((completedSurahs + (percent < 100 ? percent / 100 : 0)) / 114) * 100);
        setActiveDownload({ type: "all", surahNum, percent: overallPercent });
        if (percent === 100) {
          refreshAll();
        }
      });
    } finally {
      downloadingRef.current = false;
      setActiveDownload(null);
      setDownloadActive(false);
      setCancelling(false);
      await clearPendingDownload();
      refreshAll();
    }
  }, [reciter, refreshAll]);

  const [cancelling, setCancelling] = useState(false);

  const handleCancel = useCallback(() => {
    setCancelling(true);
    cancelDownload();
    clearPendingDownload();
    setDownloadActive(false);
  }, []);

  const handleDeleteSurah = useCallback(async (surahNum: number) => {
    const ch = chapters.find((c) => c.id === surahNum);
    if (!ch) return;
    await deleteSurahDownload(reciter, surahNum, ch.verseCount);
    refreshAll();
  }, [reciter, refreshAll]);

  const totalEstimatedSize = `~${(ESTIMATED_MB_PER_SURAH * 114 / 1024).toFixed(1)} GB`;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background via-background/95 to-background">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background via-background/95 to-background" />
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="bg-background/95 backdrop-blur-xl border-b border-border header-safe-padding shrink-0 z-10">
        <div className="px-6 pt-4 pb-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex size-10 items-center justify-center transition-colors active:opacity-60 shrink-0"
            data-testid="button-audio-manager-back"
          >
            <ChevronLeft className="w-5 h-5 text-foreground/80" />
          </button>
          <h1 className="text-xl font-semibold text-foreground" data-testid="text-audio-manager-title">
            Audio Manager
          </h1>
        </div>
      </div>

      {activeDownload && (
        <div className="px-6 py-3 border-b border-border bg-primary/5 shrink-0">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground/90 truncate" data-testid="text-download-status">
                {activeDownload.type === "all"
                  ? `Downloading full Quran${activeDownload.surahNum ? ` — Surah ${activeDownload.surahNum}` : ""}...`
                  : `Downloading Surah ${chapters.find((c) => c.id === activeDownload.surahNum)?.englishName || activeDownload.surahNum}...`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {cancelling ? "Cancelling..." : `${activeDownload.percent}% complete`}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCancel}
              disabled={cancelling}
              data-testid="button-cancel-download"
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            </Button>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "hsl(var(--sheet-muted))" }}>
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${activeDownload.percent}%` }}
              data-testid="progress-download"
            />
          </div>
        </div>
      )}

      <div className="relative flex-1 overflow-y-auto min-h-0 pb-nav-clearance">
        <div className="px-6 space-y-6 py-6">

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wide mb-3" data-testid="section-storage-summary">
              Storage Summary
            </h3>
            <div className="rounded-2xl px-4 py-1" style={{ backgroundColor: "hsl(var(--sheet-muted) / 0.4)", border: "1px solid hsl(var(--sheet-muted))" }}>
              <div className="flex items-center justify-between py-3">
                <p className="text-sm text-foreground/80">Total Audio Storage</p>
                <span className="text-sm font-medium text-foreground/70" data-testid="text-total-storage">
                  {formatBytes(stats.totalSizeBytes)}
                </span>
              </div>
              <div className="border-t" style={{ borderColor: "hsl(var(--sheet-muted))" }} />
              <div className="py-3">
                <p className="text-xs text-muted-foreground" data-testid="text-storage-breakdown">
                  {formatBytes(breakdown.cached)} auto-cached, {formatBytes(breakdown.downloaded)} downloaded
                </p>
              </div>
              <div className="border-t" style={{ borderColor: "hsl(var(--sheet-muted))" }} />
              <div className="flex items-center justify-between py-3 gap-3">
                <span className="text-sm text-foreground/80 shrink-0">Cache Limit</span>
                <div className="flex gap-1.5 overflow-x-auto flex-nowrap">
                  {[
                    { label: "500 MB", value: 524288000 },
                    { label: "1 GB", value: 1073741824 },
                    { label: "2 GB", value: 2147483648 },
                    { label: "5 GB", value: 5368709120 },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={async () => {
                        await setMaxCacheSize(opt.value);
                        refreshAll();
                      }}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                        stats.maxSizeBytes === opt.value
                          ? "bg-primary/20 ring-1 ring-primary text-primary"
                          : "text-muted-foreground"
                      }`}
                      style={stats.maxSizeBytes !== opt.value ? { backgroundColor: "hsl(var(--sheet-muted))" } : undefined}
                      data-testid={`button-cache-limit-${opt.value}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wide mb-3" data-testid="section-reciter">
              {reciterName}
            </h3>
            <div className="rounded-2xl px-4 py-1 mb-4" style={{ backgroundColor: "hsl(var(--sheet-muted) / 0.4)", border: "1px solid hsl(var(--sheet-muted))" }}>
              <div className="py-3">
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2"
                  disabled={downloadingRef.current}
                  onClick={() => setConfirmAll(true)}
                  data-testid="button-download-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download All Surahs ({totalEstimatedSize})</span>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "hsl(var(--sheet-muted) / 0.4)", border: "1px solid hsl(var(--sheet-muted))" }}>
              {chapters.map((ch, idx) => {
                const status = surahStatuses[ch.id] || "none";
                const isCurrentlyDownloading = activeDownload?.surahNum === ch.id;
                const downloadedSize = getSurahDownloadedSize(reciter, ch.id);

                return (
                  <div key={ch.id}>
                    {idx > 0 && <div className="mx-4 border-t" style={{ borderColor: "hsl(var(--sheet-muted))" }} />}
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 hover-elevate active-elevate-2 text-left"
                      onClick={() => {
                        if (isCurrentlyDownloading) return;
                        if (status === "complete") {
                          setDeleteSurahNum(ch.id);
                        } else if (!downloadingRef.current) {
                          setConfirmSurah(ch.id);
                        }
                      }}
                      disabled={isCurrentlyDownloading || (downloadingRef.current && activeDownload?.surahNum !== ch.id)}
                      data-testid={`surah-download-${ch.id}`}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0" style={{ backgroundColor: "hsl(var(--sheet-muted))" }}>
                        <span className="text-xs font-semibold text-muted-foreground">{ch.id}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground/90 truncate">{ch.englishName}</p>
                          <p className="text-xs text-muted-foreground" dir="rtl">{getDisplayArabicName(ch.arabicName)}</p>
                        </div>
                        {status === "complete" && downloadedSize > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">{formatBytes(downloadedSize)}</p>
                        )}
                        {status === "partial" && (
                          <p className="text-xs text-primary/70 mt-0.5">Partially downloaded</p>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center justify-center w-8 h-8">
                        {isCurrentlyDownloading ? (
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        ) : status === "complete" ? (
                          <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-primary" />
                        ) : status === "partial" ? (
                          <Icon icon="solar:download-minimalistic-bold" className="w-5 h-5 text-primary/60" />
                        ) : (
                          <Download className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={resumePrompt !== null} onOpenChange={(open) => { if (!open) { setResumePrompt(null); clearPendingDownload(); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume Download</AlertDialogTitle>
            <AlertDialogDescription>
              {resumePrompt?.type === 'all'
                ? 'A full Quran download was interrupted. Would you like to resume? Already downloaded surahs will be skipped.'
                : `A download for ${chapters.find(c => c.id === resumePrompt?.surahNum)?.englishName || 'a surah'} was interrupted. Would you like to resume?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => { setResumePrompt(null); clearPendingDownload(); }}
              data-testid="button-dismiss-resume"
            >
              Dismiss
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (resumePrompt?.type === 'all') {
                  handleDownloadAll();
                } else if (resumePrompt?.surahNum) {
                  handleDownloadSurah(resumePrompt.surahNum);
                }
                setResumePrompt(null);
              }}
              data-testid="button-confirm-resume"
            >
              Resume
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmSurah !== null} onOpenChange={(open) => { if (!open) setConfirmSurah(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Download Audio</AlertDialogTitle>
            <AlertDialogDescription>
              Download {chapters.find((c) => c.id === confirmSurah)?.englishName} audio (~{ESTIMATED_MB_PER_SURAH} MB)?
              This will be stored on your device for offline listening. Please keep the app open while downloading.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-confirm-surah">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmSurah !== null) {
                  handleDownloadSurah(confirmSurah);
                }
                setConfirmSurah(null);
              }}
              data-testid="button-confirm-download-surah"
            >
              Download
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAll} onOpenChange={setConfirmAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Download Full Quran</AlertDialogTitle>
            <AlertDialogDescription>
              Download full Quran audio for {reciterName} ({totalEstimatedSize})?
              This may take 15–30 minutes on a typical connection. Please keep the app open while downloading. If interrupted, you can resume from where it left off.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-confirm-all">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmAll(false);
                handleDownloadAll();
              }}
              data-testid="button-confirm-download-all"
            >
              Download
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteSurahNum !== null} onOpenChange={(open) => { if (!open) setDeleteSurahNum(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Download</AlertDialogTitle>
            <AlertDialogDescription>
              Remove downloaded audio for {chapters.find((c) => c.id === deleteSurahNum)?.englishName}?
              You can re-download it anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-surah">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteSurahNum !== null) {
                  handleDeleteSurah(deleteSurahNum);
                }
                setDeleteSurahNum(null);
              }}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-surah"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
