import { X, Bug } from "lucide-react";
import { Card } from "@/components/ui/card";

interface VerseTimestamp {
  verse: number;
  start: number;
  end: number;
}

interface AudioDebugPanelProps {
  currentTime: number;
  currentVerse: number;
  isInVerseRange: boolean;
  verseTimestamps: VerseTimestamp[];
  offsetMs: number;
  onClose: () => void;
}

export default function AudioDebugPanel({
  currentTime,
  currentVerse,
  isInVerseRange,
  verseTimestamps,
  offsetMs,
  onClose,
}: AudioDebugPanelProps) {
  const currentTimestamp = verseTimestamps.find(v => v.verse === currentVerse);
  
  // Find which verse we SHOULD be in based on time
  const expectedVerse = verseTimestamps.find(
    v => currentTime >= v.start && currentTime < v.end
  );
  
  const timingMismatch = expectedVerse && expectedVerse.verse !== currentVerse;
  
  return (
    <div className="fixed top-20 right-4 z-50 w-80">
      <Card className="bg-card/95 backdrop-blur-sm border-primary/20 shadow-lg">
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm text-foreground">Audio Debug</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover-elevate active-elevate-2 rounded"
              data-testid="button-close-debug"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          
          {/* Current Time */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Current Time</div>
            <div className="font-mono text-sm text-foreground">
              {currentTime.toFixed(3)}s ({(currentTime * 1000).toFixed(0)}ms)
            </div>
          </div>
          
          {/* Current Verse */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Highlighted Verse</div>
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm text-foreground">
                {currentVerse === 0 ? 'Preamble' : `Verse ${currentVerse}`}
              </div>
              <div className={`w-2 h-2 rounded-full ${isInVerseRange ? 'bg-green-500' : 'bg-yellow-500'}`} />
            </div>
          </div>
          
          {/* Expected Range */}
          {currentTimestamp && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Expected Range</div>
              <div className="font-mono text-xs text-foreground">
                {currentTimestamp.start.toFixed(2)}s - {currentTimestamp.end.toFixed(2)}s
              </div>
            </div>
          )}
          
          {/* Timing Offset */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Timing Offset</div>
            <div className="font-mono text-sm text-foreground">
              {offsetMs > 0 ? '+' : ''}{offsetMs}ms
            </div>
          </div>
          
          {/* Timing Mismatch Warning */}
          {timingMismatch && expectedVerse && (
            <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs">
              <div className="text-yellow-600 dark:text-yellow-400 font-semibold">Timing Mismatch!</div>
              <div className="text-muted-foreground mt-1">
                Should be: {expectedVerse.verse === 0 ? 'Preamble' : `Verse ${expectedVerse.verse}`}
              </div>
              <div className="text-muted-foreground">
                Range: {expectedVerse.start.toFixed(2)}s - {expectedVerse.end.toFixed(2)}s
              </div>
            </div>
          )}
          
          {/* Verse Timeline */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Verse Timeline</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {verseTimestamps.slice(0, 10).map((v) => {
                const isCurrent = v.verse === currentVerse;
                const isInRange = currentTime >= v.start && currentTime < v.end;
                
                return (
                  <div
                    key={v.verse}
                    className={`flex justify-between text-xs p-1 rounded ${
                      isCurrent ? 'bg-primary/10 text-primary' :
                      isInRange ? 'bg-green-500/10 text-green-600' :
                      'text-muted-foreground'
                    }`}
                  >
                    <span>{v.verse === 0 ? 'Preamble' : `V${v.verse}`}</span>
                    <span className="font-mono">{v.start.toFixed(1)}s - {v.end.toFixed(1)}s</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
