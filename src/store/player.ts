import { defineStore } from "pinia";
import type { MusicTrack } from "@/types/music";
import type { LyricLine, PlaybackMode, PlayerPersistedState, PlayerProgress } from "@/types/player";
import { storage } from "@/utils/storage";
import { parseLrc } from "@/utils/lrc";
import { fetchMusicDetail } from "@/api/music";

interface PlayerState {
  queue: MusicTrack[];
  currentIndex: number;
  playbackMode: PlaybackMode;
  isPlaying: boolean;
  progress: PlayerProgress;
  volume: number;
  lyrics: LyricLine[];
  activeLyricIndex: number;
  loading: boolean;
  switchingTrackId: string | null;
  error: string | null;
}

const PLAYER_STORAGE_KEY = "joyful.player.state.v1";
const TRACK_DETAIL_CACHE_STORAGE_KEY = "joyful.player.track.detail.cache.v1";
const TRACK_DETAIL_CACHE_LIMIT = 30;
const TRACK_DETAIL_CACHE_TTL = 20 * 60 * 1000;
let detailLoadingCounter = 0;

type TrackDetailCacheEntry = {
  track: MusicTrack;
  cachedAt: number;
};

function normalizeTrackDetailCache(raw: unknown): TrackDetailCacheEntry[] {
  if (!Array.isArray(raw)) return [];

  const now = Date.now();
  const normalized: TrackDetailCacheEntry[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const typed = item as { track?: MusicTrack; cachedAt?: number };
    if (!typed.track?.id || typeof typed.cachedAt !== "number") continue;
    if (now - typed.cachedAt > TRACK_DETAIL_CACHE_TTL) continue;
    const exists = normalized.findIndex((entry) => entry.track.id === typed.track!.id);
    if (exists !== -1) {
      normalized.splice(exists, 1);
    }
    normalized.push({ track: typed.track, cachedAt: typed.cachedAt });
  }
  if (normalized.length > TRACK_DETAIL_CACHE_LIMIT) {
    return normalized.slice(normalized.length - TRACK_DETAIL_CACHE_LIMIT);
  }
  return normalized;
}

const trackDetailCache: TrackDetailCacheEntry[] = normalizeTrackDetailCache(
  storage.get<unknown[]>(TRACK_DETAIL_CACHE_STORAGE_KEY, [])
);

function persistTrackDetailCache(): void {
  if (!trackDetailCache.length) {
    storage.remove(TRACK_DETAIL_CACHE_STORAGE_KEY);
    return;
  }
  storage.set(TRACK_DETAIL_CACHE_STORAGE_KEY, trackDetailCache);
}

const defaultProgress: PlayerProgress = {
  current: 0,
  duration: 0,
  updatedAt: Date.now(),
};

function getInitialState(): PlayerPersistedState | null {
  return storage.get<PlayerPersistedState | null>(PLAYER_STORAGE_KEY, null);
}

function clampIndex(index: number, list: unknown[]): number {
  if (!list.length) return 0;
  if (index < 0) return 0;
  if (index >= list.length) return 0;
  return index;
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (typeof error !== "object" || error === null) return false;
  const target = error as { name?: string; code?: string };
  return target.name === "CanceledError" || target.code === "ERR_CANCELED";
}

function removeCacheByTrackId(trackId: string): void {
  const index = trackDetailCache.findIndex((item) => item.track.id === trackId);
  if (index !== -1) {
    trackDetailCache.splice(index, 1);
  }
}

function getValidTrackDetailFromCache(trackId: string): MusicTrack | null {
  const index = trackDetailCache.findIndex((item) => item.track.id === trackId);
  if (index === -1) return null;

  const cached = trackDetailCache[index];
  if (Date.now() - cached.cachedAt > TRACK_DETAIL_CACHE_TTL) {
    trackDetailCache.splice(index, 1);
    persistTrackDetailCache();
    return null;
  }

  return cached.track;
}

function upsertTrackDetailCache(track: MusicTrack): void {
  removeCacheByTrackId(track.id);
  trackDetailCache.push({
    track: { ...track },
    cachedAt: Date.now(),
  });
  while (trackDetailCache.length > TRACK_DETAIL_CACHE_LIMIT) {
    trackDetailCache.shift();
  }
  persistTrackDetailCache();
}

function clearTrackDetailCache(): void {
  trackDetailCache.length = 0;
  persistTrackDetailCache();
}

export const usePlayerStore = defineStore("player", {
  state: (): PlayerState => {
    const persisted = getInitialState();
    const queue = persisted?.queue ?? [];
    return {
      queue,
      currentIndex: clampIndex(persisted?.currentIndex ?? 0, queue),
      playbackMode: persisted?.playbackMode ?? "list",
      isPlaying: false,
      progress: persisted?.progress ?? { ...defaultProgress },
      volume: persisted?.volume ?? 0.8,
      lyrics: [],
      activeLyricIndex: -1,
      loading: false,
      switchingTrackId: null,
      error: null,
    };
  },
  getters: {
    currentTrack: (state): MusicTrack | null => state.queue[state.currentIndex] ?? null,
    hasQueue: (state): boolean => state.queue.length > 0,
  },
  actions: {
    persist(): void {
      const snapshot: PlayerPersistedState = {
        queue: this.queue,
        currentIndex: this.currentIndex,
        playbackMode: this.playbackMode,
        volume: this.volume,
        progress: this.progress,
        lastTrackId: this.currentTrack?.id,
      };
      storage.set(PLAYER_STORAGE_KEY, snapshot);
    },
    resetError(): void {
      this.error = null;
    },
    setQueue(tracks: MusicTrack[]): void {
      this.queue = tracks;
      if (!tracks.length) {
        this.currentIndex = 0;
        this.lyrics = [];
        this.activeLyricIndex = -1;
        clearTrackDetailCache();
      } else {
        this.currentIndex = clampIndex(this.currentIndex, tracks);
      }
      this.persist();
    },
    setCurrentIndex(index: number): void {
      if (!this.queue.length) return;
      this.currentIndex = clampIndex(index, this.queue);
      this.persist();
    },
    setPlaybackMode(mode: PlaybackMode): void {
      this.playbackMode = mode;
      this.persist();
    },
    cyclePlaybackMode(): void {
      const order: PlaybackMode[] = ["list", "single", "shuffle"];
      const currentIndex = order.indexOf(this.playbackMode);
      const nextIndex = (currentIndex + 1) % order.length;
      this.setPlaybackMode(order[nextIndex]);
    },
    setProgress(progress: Partial<PlayerProgress>): void {
      this.progress = {
        ...this.progress,
        ...progress,
        updatedAt: Date.now(),
      };
      this.persist();
    },
    setVolume(value: number): void {
      this.volume = Number(value.toFixed(2));
      this.persist();
    },
    setIsPlaying(status: boolean): void {
      this.isPlaying = status;
    },
    setSwitchingTrack(trackId: string | null): void {
      this.switchingTrackId = trackId;
    },
    setLyricsFromTrack(track?: MusicTrack | null): void {
      this.lyrics = parseLrc(track?.lrc ?? "");
      this.activeLyricIndex = -1;
    },
    setActiveLyricIndex(index: number): void {
      this.activeLyricIndex = index;
    },
    async ensureTrackDetail(
      trackId: string,
      forceRefresh = true,
      syncLyricsWithTrack = true,
      signal?: AbortSignal
    ): Promise<MusicTrack | null> {
      const existing = this.queue.find((track) => track.id === trackId);
      if (!existing) return null;

      if (!forceRefresh) {
        const cachedTrack = getValidTrackDetailFromCache(trackId);
        if (cachedTrack?.url) {
          const mergedCached = { ...existing, ...cachedTrack };
          this.queue = this.queue.map((track) =>
            track.id === trackId ? mergedCached : track
          );
          if (syncLyricsWithTrack) {
            this.setLyricsFromTrack(mergedCached);
          }
          this.persist();
          return mergedCached;
        }

      }

      detailLoadingCounter += 1;
      this.loading = true;
      this.resetError();
      try {
        const detail = await fetchMusicDetail(trackId, { signal });
        const merged = { ...existing, ...detail };
        this.queue = this.queue.map((track) => (track.id === trackId ? merged : track));
        upsertTrackDetailCache(merged);
        if (syncLyricsWithTrack) {
          this.setLyricsFromTrack(merged);
        }
        this.persist();
        return merged;
      } catch (error) {
        if (isAbortError(error)) {
          return null;
        }
        const message = error instanceof Error ? error.message : "加载歌曲详情失败";
        this.error = message;
        console.error(message);
        return null;
      } finally {
        detailLoadingCounter = Math.max(0, detailLoadingCounter - 1);
        this.loading = detailLoadingCounter > 0;
      }
    },
    async playTrack(
      trackId: string,
      options?: { forceRefresh?: boolean; signal?: AbortSignal }
    ): Promise<MusicTrack | null> {
      const index = this.queue.findIndex((track) => track.id === trackId);
      if (index === -1) return null;

      this.setSwitchingTrack(trackId);
      const track = await this.ensureTrackDetail(
        trackId,
        options?.forceRefresh ?? false,
        false,
        options?.signal
      );

      if (!track) {
        this.setSwitchingTrack(null);
        return null;
      }
      if (!track.url) {
        this.error = "无法播放，缺少音频地址";
        this.setSwitchingTrack(null);
        return null;
      }

      this.currentIndex = index;
      this.setLyricsFromTrack(track);
      this.persist();
      this.setSwitchingTrack(null);
      return track;
    },
    playNext(forceMove = true): MusicTrack | null {
      if (!this.queue.length) return null;
      if (this.playbackMode === "shuffle") {
        const next = this.getRandomIndex();
        this.currentIndex = next;
      } else if (this.playbackMode === "single" && !forceMove) {
        // stay on current index when not forcing move
      } else {
        this.currentIndex = (this.currentIndex + 1) % this.queue.length;
      }
      this.persist();
      return this.currentTrack;
    },
    playPrevious(forceMove = true): MusicTrack | null {
      if (!this.queue.length) return null;
      if (this.playbackMode === "shuffle") {
        const next = this.getRandomIndex();
        this.currentIndex = next;
      } else if (this.playbackMode === "single" && !forceMove) {
        // stay
      } else {
        this.currentIndex =
          (this.currentIndex - 1 + this.queue.length) % this.queue.length;
      }
      this.persist();
      return this.currentTrack;
    },
    getRandomIndex(): number {
      if (this.queue.length <= 1) return this.currentIndex;
      let next = this.currentIndex;
      while (next === this.currentIndex) {
        next = Math.floor(Math.random() * this.queue.length);
      }
      return next;
    },
    updateQueueWithDetail(track: MusicTrack): void {
      this.queue = this.queue.map((item) => (item.id === track.id ? { ...item, ...track } : item));
      this.persist();
    },
    setTrackLike(trackId: string, isLike: number): void {
      this.queue = this.queue.map((item) =>
        item.id === trackId ? { ...item, isLike, islike: isLike } : item
      );
      this.persist();
    },
    addToQueue(track: MusicTrack): void {
      if (!track?.id) return;
      const exists = this.queue.some((item) => item.id === track.id);
      if (exists) return;
      this.queue = [...this.queue, track];
      if (this.queue.length === 1) {
        this.currentIndex = 0;
      }
      this.persist();
    },
    removeFromQueue(trackId: string): void {
      const index = this.queue.findIndex((track) => track.id === trackId);
      if (index === -1) return;

      this.queue = this.queue.filter((track) => track.id !== trackId);

      if (!this.queue.length) {
        this.currentIndex = 0;
        this.lyrics = [];
        this.activeLyricIndex = -1;
        this.isPlaying = false;
        clearTrackDetailCache();
        this.persist();
        return;
      }

      if (index < this.currentIndex) {
        this.currentIndex -= 1;
      } else if (index === this.currentIndex) {
        this.currentIndex = Math.min(this.currentIndex, this.queue.length - 1);
      }

      const nextTrack = this.queue[this.currentIndex] ?? null;
      this.setLyricsFromTrack(nextTrack ?? undefined);
      this.persist();
    },
    resetPlayerState(): void {
      detailLoadingCounter = 0;
      clearTrackDetailCache();
      this.queue = [];
      this.currentIndex = 0;
      this.playbackMode = this.playbackMode ?? "list";
      this.progress = { ...defaultProgress };
      this.lyrics = [];
      this.activeLyricIndex = -1;
      this.isPlaying = false;
      this.loading = false;
      this.switchingTrackId = null;
      storage.remove(PLAYER_STORAGE_KEY);
    },
  },
});
