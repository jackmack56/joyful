import type { MusicTrack } from "./music";

export type PlaybackMode = "list" | "single" | "shuffle";
export type ThemePreference = "light" | "dark" | "system";

export interface LyricLine {
  time: number;
  text: string;
}

export interface PlayerProgress {
  current: number;
  duration: number;
  updatedAt: number;
}

export interface PlayerPersistedState {
  queue: MusicTrack[];
  currentIndex: number;
  playbackMode: PlaybackMode;
  volume: number;
  progress: PlayerProgress;
  lastTrackId?: string;
}
