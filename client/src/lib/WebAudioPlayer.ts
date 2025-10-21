/**
 * Web Audio API-based player for smooth verse-by-verse playback with crossfading
 * 
 * Features:
 * - Sample-accurate scheduling for gapless transitions
 * - Equal-power crossfading (100-120ms) between verses
 * - Smart buffer management (decode 2-3 verses ahead)
 * - Perfect verse boundary callbacks for highlighting
 */

export interface WebAudioPlayerConfig {
  getAudioUrl: (verse: number) => string;
  totalVerses: number;
  onVerseChange?: (verse: number) => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  onError?: (error: string) => void;
}

interface VerseBuffer {
  verseNumber: number;
  buffer: AudioBuffer;
  duration: number;
}

export class WebAudioPlayer {
  private context: AudioContext;
  private config: WebAudioPlayerConfig;
  
  // Playback state
  private currentVerse: number = 1;
  private isPlaying: boolean = false;
  private speed: number = 1.0;
  private repeat: boolean = false;
  
  // Audio nodes
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGain: GainNode | null = null;
  private nextSource: AudioBufferSourceNode | null = null;
  private nextGain: GainNode | null = null;
  
  // Buffer management
  private bufferCache: Map<number, VerseBuffer> = new Map();
  private inflightLoads: Map<number, Promise<VerseBuffer | null>> = new Map();
  
  // Timing
  private verseStartTime: number = 0; // AudioContext time when current verse started
  private verseOffset: number = 0; // Offset within the verse (for seeking/resuming)
  private pauseTime: number = 0; // Time within verse when paused
  private crossfadeDuration: number = 0.12; // 120ms
  private updateInterval: number | null = null;
  private isHandlingVerseEnd: boolean = false; // Prevent concurrent onVerseEnded calls
  private userInitiatedStopCount: number = 0; // Counter for user-initiated stops to handle multiple sources
  
  constructor(config: WebAudioPlayerConfig) {
    this.config = config;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.context = new AudioContextClass();
  }
  
  /**
   * Load and decode audio buffer for a specific verse
   */
  private async loadBuffer(verseNumber: number): Promise<VerseBuffer | null> {
    // Check cache first
    if (this.bufferCache.has(verseNumber)) {
      return this.bufferCache.get(verseNumber)!;
    }
    
    // If already loading, return the shared Promise
    // This prevents duplicate fetches and ensures errors propagate to all awaiters
    if (this.inflightLoads.has(verseNumber)) {
      return this.inflightLoads.get(verseNumber)!;
    }
    
    // Create a new load Promise and store it
    const loadPromise = (async () => {
      try {
        const url = this.config.getAudioUrl(verseNumber);
        
        console.log(`🎵 Loading buffer for verse ${verseNumber}`);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
        
        const verseBuffer: VerseBuffer = {
          verseNumber,
          buffer: audioBuffer,
          duration: audioBuffer.duration
        };
        
        this.bufferCache.set(verseNumber, verseBuffer);
        
        console.log(`✓ Buffer loaded for verse ${verseNumber} (${audioBuffer.duration.toFixed(2)}s)`);
        
        // Cleanup old buffers to save memory (keep current +/- 3 verses)
        this.cleanupBufferCache(verseNumber);
        
        return verseBuffer;
      } catch (error) {
        console.error(`Failed to load verse ${verseNumber}:`, error);
        this.config.onError?.(`Failed to load verse ${verseNumber}`);
        return null;
      } finally {
        // Always remove from inflight map (success or failure)
        // This ensures no memory leaks and errors propagate to all awaiters
        this.inflightLoads.delete(verseNumber);
      }
    })();
    
    this.inflightLoads.set(verseNumber, loadPromise);
    return loadPromise;
  }
  
  /**
   * Remove old buffers from cache to manage memory
   */
  private cleanupBufferCache(currentVerse: number) {
    const keepRange = 3;
    const toDelete: number[] = [];
    
    this.bufferCache.forEach((_, verseNum) => {
      if (Math.abs(verseNum - currentVerse) > keepRange) {
        toDelete.push(verseNum);
      }
    });
    
    toDelete.forEach(verseNum => {
      this.bufferCache.delete(verseNum);
      console.log(`🗑️ Cleaned up buffer for verse ${verseNum}`);
    });
  }
  
  /**
   * Preload upcoming verses
   */
  private async preloadUpcoming(startVerse: number) {
    const preloadCount = 2;
    const promises: Promise<void>[] = [];
    
    for (let i = 1; i <= preloadCount; i++) {
      const verseNum = startVerse + i;
      if (verseNum <= this.config.totalVerses && !this.bufferCache.has(verseNum)) {
        promises.push(
          this.loadBuffer(verseNum).then(() => {
            console.log(`⏩ Preloaded verse ${verseNum}`);
          })
        );
      }
    }
    
    await Promise.all(promises);
  }
  
  /**
   * Create equal-power crossfade curve
   */
  private createCrossfadeCurve(length: number = 1000): Float32Array {
    const curve = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      // Equal-power: cos curve for more natural volume transition
      curve[i] = Math.cos((1.0 - i / length) * 0.5 * Math.PI);
    }
    return curve;
  }
  
  /**
   * Schedule a verse to play with crossfade
   */
  private async playVerse(verseNumber: number, requestedStartTime: number, offset: number = 0, crossfadeIn: boolean = false) {
    const verseBuffer = await this.loadBuffer(verseNumber);
    if (!verseBuffer) {
      return;
    }
    
    // Ensure start time is in the future (loading might have taken time)
    const now = this.context.currentTime;
    const startTime = Math.max(requestedStartTime, now + 0.05);
    
    if (startTime !== requestedStartTime) {
      console.log(`⏰ Adjusted start time from ${requestedStartTime.toFixed(2)}s to ${startTime.toFixed(2)}s (now=${now.toFixed(2)}s)`);
    }
    
    // Create source and gain nodes
    const source = this.context.createBufferSource();
    const gainNode = this.context.createGain();
    
    source.buffer = verseBuffer.buffer;
    source.playbackRate.value = this.speed;
    source.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    // Setup crossfade
    if (crossfadeIn) {
      // Fade in from 0 to 1
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(1, startTime + this.crossfadeDuration);
    } else {
      // Start at full volume
      gainNode.gain.setValueAtTime(1, startTime);
    }
    
    // Schedule fade out if not the last verse and not repeating
    if (verseNumber < this.config.totalVerses && !this.repeat) {
      const fadeOutStart = startTime + verseBuffer.duration - this.crossfadeDuration;
      gainNode.gain.setValueAtTime(1, fadeOutStart);
      gainNode.gain.linearRampToValueAtTime(0, startTime + verseBuffer.duration);
    }
    
    // Handle verse end using native Web Audio API event (sample-accurate!)
    source.onended = () => {
      // Ignore onended if this was a user-initiated stop (pause, seek, manual stop)
      if (this.userInitiatedStopCount > 0) {
        console.log(`⏸️ Ignoring onended for verse ${verseNumber} (user-initiated stop, ${this.userInitiatedStopCount} remaining)`);
        this.userInitiatedStopCount = Math.max(0, this.userInitiatedStopCount - 1);
        return;
      }
      console.log(`🎯 Native onended fired for verse ${verseNumber}`);
      this.onVerseEnded(verseNumber);
    };
    
    // Start playback (with offset if resuming mid-verse)
    if (offset > 0) {
      source.start(startTime, offset);
      const remainingDuration = verseBuffer.duration - offset;
      const endTime = startTime + remainingDuration;
      source.stop(endTime);
      console.log(`▶️ Playing verse ${verseNumber} at ${startTime.toFixed(2)}s from offset ${offset.toFixed(2)}s, will stop at ${endTime.toFixed(2)}s`);
    } else {
      source.start(startTime);
      const endTime = startTime + verseBuffer.duration;
      source.stop(endTime);
      console.log(`▶️ Playing verse ${verseNumber} at ${startTime.toFixed(2)}s, will stop at ${endTime.toFixed(2)}s`);
    }
    
    // Store references
    if (this.currentSource) {
      // Move current to next position
      this.nextSource = this.currentSource;
      this.nextGain = this.currentGain;
    }
    
    this.currentSource = source;
    this.currentGain = gainNode;
  }
  
  /**
   * Handle when a verse finishes playing
   */
  private async onVerseEnded(verseNumber: number) {
    console.log(`✓ Verse ${verseNumber} finished`);
    
    // Prevent concurrent verse-end handling
    if (this.isHandlingVerseEnd) {
      console.log(`⚠️ Already handling verse end, skipping callback for verse ${verseNumber}`);
      return;
    }
    
    // Only auto-advance if this verse is still the current verse
    // (prevents stale timeouts from advancing after a manual jump)
    if (verseNumber !== this.currentVerse) {
      console.log(`⚠️ Ignoring ended callback for verse ${verseNumber} (current is ${this.currentVerse})`);
      return;
    }
    
    this.isHandlingVerseEnd = true;
    
    // CRITICAL: Reset isPlaying before calling play() to allow auto-advance
    this.isPlaying = false;
    this.config.onPlayStateChange?.(false);
    
    try {
      if (this.repeat) {
        // Repeat current verse
        this.currentVerse = verseNumber;
        await this.play();
      } else if (verseNumber < this.config.totalVerses) {
        // Auto-advance to next verse internally
        const nextVerse = verseNumber + 1;
        this.currentVerse = nextVerse;
        
        // Notify about the verse change
        this.config.onVerseChange?.(nextVerse);
        
        // Automatically play the next verse
        await this.play();
      } else {
        // Chapter complete
        console.log('📖 Chapter complete');
        this.stop();
        this.config.onEnded?.();
      }
    } finally {
      this.isHandlingVerseEnd = false;
    }
  }
  
  /**
   * Start playback from current verse
   */
  async play() {
    if (this.isPlaying) return;
    
    // Resume AudioContext if suspended
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
    
    this.config.onLoadingChange?.(true);
    
    // Load current verse buffer
    const verseBuffer = await this.loadBuffer(this.currentVerse);
    if (!verseBuffer) {
      this.config.onLoadingChange?.(false);
      return;
    }
    
    this.config.onLoadingChange?.(false);
    
    // Calculate start time
    let actualStartTime = this.context.currentTime + 0.1; // Small buffer
    
    // If resuming from pause, use the pause time as offset
    let offset = 0;
    if (this.pauseTime > 0) {
      offset = this.pauseTime;
      this.verseOffset = offset;
      this.pauseTime = 0;
    } else {
      this.verseOffset = 0;
    }
    
    // Play current verse with offset
    await this.playVerse(this.currentVerse, actualStartTime, offset, false);
    
    // Record when this verse started playing
    this.verseStartTime = actualStartTime;
    this.isPlaying = true;
    this.config.onPlayStateChange?.(true);
    
    // Start time updates
    this.startTimeUpdates();
    
    // Preload upcoming verses
    this.preloadUpcoming(this.currentVerse);
  }
  
  /**
   * Pause playback
   */
  pause() {
    if (!this.isPlaying) return;
    
    // Calculate current position within the verse
    const elapsed = this.context.currentTime - this.verseStartTime + this.verseOffset;
    this.pauseTime = elapsed;
    
    // Count how many sources we'll stop (for counter-based guard)
    // Use += to accumulate in case of rapid consecutive user actions
    let sourcesToStop = 0;
    if (this.currentSource) sourcesToStop++;
    if (this.nextSource) sourcesToStop++;
    
    this.userInitiatedStopCount += sourcesToStop;
    
    // Stop current source
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Already stopped - decrement counter since onended won't fire
        if (this.userInitiatedStopCount > 0) this.userInitiatedStopCount--;
      }
    }
    
    if (this.nextSource) {
      try {
        this.nextSource.stop();
      } catch (e) {
        // Already stopped - decrement counter since onended won't fire
        if (this.userInitiatedStopCount > 0) this.userInitiatedStopCount--;
      }
    }
    
    this.isPlaying = false;
    this.config.onPlayStateChange?.(false);
    this.stopTimeUpdates();
    
    console.log(`⏸️ Paused at ${this.pauseTime.toFixed(2)}s`);
  }
  
  /**
   * Stop playback completely
   */
  stop() {
    this.pause();
    this.pauseTime = 0;
    this.verseStartTime = 0;
    this.verseOffset = 0;
  }
  
  /**
   * Seek to a specific verse
   */
  async seekToVerse(verseNumber: number) {
    if (verseNumber < 1 || verseNumber > this.config.totalVerses) {
      console.warn(`Verse ${verseNumber} out of range`);
      return;
    }
    
    const wasPlaying = this.isPlaying;
    
    // Stop current playback
    this.stop();
    
    // Update current verse
    this.currentVerse = verseNumber;
    this.config.onVerseChange?.(verseNumber);
    
    // Resume if was playing
    if (wasPlaying) {
      await this.play();
    }
  }
  
  /**
   * Set playback speed
   */
  setSpeed(speed: number) {
    this.speed = speed;
    
    // Update current source if playing
    if (this.currentSource) {
      this.currentSource.playbackRate.value = speed;
    }
    
    console.log(`⚡ Speed: ${speed}x`);
  }
  
  /**
   * Set repeat mode
   */
  setRepeat(repeat: boolean) {
    this.repeat = repeat;
  }
  
  /**
   * Get current playback time (within current verse)
   */
  getCurrentTime(): number {
    if (!this.isPlaying) {
      return this.pauseTime;
    }
    // Calculate time elapsed within the current verse
    const elapsed = this.context.currentTime - this.verseStartTime + this.verseOffset;
    return elapsed;
  }
  
  /**
   * Get current verse duration
   */
  async getDuration(): Promise<number> {
    const buffer = this.bufferCache.get(this.currentVerse);
    if (buffer) {
      return buffer.duration;
    }
    
    const verseBuffer = await this.loadBuffer(this.currentVerse);
    return verseBuffer?.duration || 0;
  }
  
  /**
   * Seek within current verse
   */
  async seek(time: number) {
    const verseBuffer = this.bufferCache.get(this.currentVerse);
    if (!verseBuffer) return;
    
    if (time < 0) time = 0;
    if (time > verseBuffer.duration) time = verseBuffer.duration;
    
    const wasPlaying = this.isPlaying;
    
    // Count how many sources we'll stop
    // Use += to accumulate in case of rapid consecutive user actions
    let sourcesToStop = 0;
    if (this.currentSource) sourcesToStop++;
    if (this.nextSource) sourcesToStop++;
    
    this.userInitiatedStopCount += sourcesToStop;
    
    // Stop current playback
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Already stopped - decrement counter
        if (this.userInitiatedStopCount > 0) this.userInitiatedStopCount--;
      }
    }
    
    if (this.nextSource) {
      try {
        this.nextSource.stop();
      } catch (e) {
        // Already stopped - decrement counter
        if (this.userInitiatedStopCount > 0) this.userInitiatedStopCount--;
      }
    }
    
    if (!wasPlaying) {
      this.pauseTime = time;
      return;
    }
    
    // Resume from new position
    this.pauseTime = time;
    await this.play();
  }
  
  /**
   * Start time update interval
   */
  private startTimeUpdates() {
    this.stopTimeUpdates();
    
    this.updateInterval = window.setInterval(async () => {
      if (this.isPlaying) {
        const currentTime = this.getCurrentTime();
        const duration = await this.getDuration();
        this.config.onTimeUpdate?.(currentTime, duration);
      }
    }, 100); // Update every 100ms
  }
  
  /**
   * Stop time update interval
   */
  private stopTimeUpdates() {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    this.stop();
    this.stopTimeUpdates();
    
    this.bufferCache.clear();
    this.inflightLoads.clear();
    
    if (this.context.state !== 'closed') {
      this.context.close();
    }
  }
  
  /**
   * Check if Web Audio API is supported
   */
  static isSupported(): boolean {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }
}
