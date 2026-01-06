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
  error: string | null;
}

const PLAYER_STORAGE_KEY = "joyful.player.state.v1";

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
    setLyricsFromTrack(track?: MusicTrack | null): void {
      this.lyrics = parseLrc(track?.lrc ?? "");
      this.activeLyricIndex = -1;
    },
    setActiveLyricIndex(index: number): void {
      this.activeLyricIndex = index;
    },
    async ensureTrackDetail(trackId: string, forceRefresh = true): Promise<MusicTrack | null> {
      const existing = this.queue.find((track) => track.id === trackId);
      if (!existing) return null;

      if (!forceRefresh && existing.url && existing.pic) {
        this.setLyricsFromTrack(existing);
        return existing;
      }

      this.loading = true;
      this.resetError();
      try {
        const detail = await fetchMusicDetail(trackId);
        const merged = { ...existing, ...detail };
        this.queue = this.queue.map((track) => (track.id === trackId ? merged : track));
        this.setLyricsFromTrack(merged);
        this.persist();
        return merged;
      } catch (error) {
        const message = error instanceof Error ? error.message : "加载歌曲详情失败";
        this.error = message;
        console.error(message);
        return null;
      } finally {
        this.loading = false;
      }
    },
    async playTrack(trackId: string): Promise<void> {
      const index = this.queue.findIndex((track) => track.id === trackId);
      if (index === -1) return;
      this.setIsPlaying(true);
      this.currentIndex = index;
      const track = await this.ensureTrackDetail(trackId);
      if (!track) {
        if (!this.error) this.error = "无法播放，加载歌曲详情失败";
        this.isPlaying = false;
        return;
      }
      if (!track.url) {
        this.error = "无法播放，缺少音频地址";
        this.isPlaying = false;
        return;
      }
      this.persist();
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
      this.queue = [];
      this.currentIndex = 0;
      this.playbackMode = this.playbackMode ?? "list";
      this.progress = { ...defaultProgress };
      this.lyrics = [];
      this.activeLyricIndex = -1;
      this.isPlaying = false;
      storage.remove(PLAYER_STORAGE_KEY);
    },
  },
});
