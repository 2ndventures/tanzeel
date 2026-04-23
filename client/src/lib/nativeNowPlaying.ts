import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface NowPlayingMetadata {
  title: string;
  artist: string;
  album?: string;
  duration?: number;
}

export interface NowPlayingState {
  isPlaying: boolean;
  speed?: number;
  position?: number;
  duration?: number;
}

export interface NowPlayingPositionUpdate {
  position: number;
  duration?: number;
  speed?: number;
  isPlaying?: boolean;
}

export interface NavEnabled {
  next: boolean;
  previous: boolean;
}

export interface SeekToEvent {
  time: number;
}

export interface TanzeelNowPlayingPlugin {
  setMetadata(opts: NowPlayingMetadata): Promise<void>;
  setPlaybackState(opts: NowPlayingState): Promise<void>;
  setPosition(opts: NowPlayingPositionUpdate): Promise<void>;
  setNavEnabled(opts: NavEnabled): Promise<void>;
  clear(): Promise<void>;
  addListener(eventName: 'play' | 'pause' | 'togglePlayPause' | 'nexttrack' | 'previoustrack', listenerFunc: () => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'seekto', listenerFunc: (e: SeekToEvent) => void): Promise<PluginListenerHandle>;
}

export const TanzeelNowPlaying = registerPlugin<TanzeelNowPlayingPlugin>('TanzeelNowPlaying');

export const isNativeNowPlayingAvailable = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
