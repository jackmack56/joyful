import { computed, ref, watch } from "vue";
import { usePlayerStore } from "@/store/player";
import { findActiveLyricIndex } from "@/utils/lrc";
import type { MusicTrack } from "@/types/music";

const audio = new Audio();
audio.preload = "metadata";

let listenersBound = false;
let playbackTicket = 0;
let pendingIndex: number | null = null;
let detailAbortController: AbortController | null = null;
let skipWatchTrackId: string | null = null;

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (typeof error !== "object" || error === null) return false;
  const target = error as { name?: string; code?: string };
  return target.name === "CanceledError" || target.code === "ERR_CANCELED";
}

function createPlayer() {
  const store = usePlayerStore();
  const isReady = ref(false);
  const error = ref<string | null>(null);
  const audioLevel = ref(0);
  let levelFrame: number | null = null;

  const cancelPendingDetailRequest = () => {
    if (!detailAbortController) return;
    detailAbortController.abort();
    detailAbortController = null;
  };

  const stopLevelTracking = () => {
    if (levelFrame !== null) {
      cancelAnimationFrame(levelFrame);
      levelFrame = null;
    }
    audioLevel.value = 0;
  };

  const startLevelTracking = () => {
    if (levelFrame !== null) {
      cancelAnimationFrame(levelFrame);
      levelFrame = null;
    }
    const tick = () => {
      if (!store.isPlaying) {
        stopLevelTracking();
        return;
      }
      const pulseA = Math.abs(Math.sin(audio.currentTime * 5.2));
      const pulseB = Math.abs(Math.sin(audio.currentTime * 2.4 + 0.9));
      const pulseC = Math.abs(Math.sin(audio.currentTime * 0.9 + 1.7));
      const composite = Math.min(1, pulseA * 0.58 + pulseB * 0.32 + pulseC * 0.28);
      const dynamic = Math.pow(composite, 1.15);
      const volumeFactor = 0.45 + store.volume * 0.75;
      audioLevel.value = Math.min(1, dynamic * volumeFactor);

      levelFrame = requestAnimationFrame(tick);
    };
    levelFrame = requestAnimationFrame(tick);
  };

  const loadAndPlay = async (track: MusicTrack | null | undefined, autoplay = true) => {
    if (!track?.url) {
      store.setIsPlaying(false);
      stopLevelTracking();
      return;
    }

    if (audio.src !== track.url) {
      audio.src = track.url;
    }

    if (autoplay) {
      try {
        await audio.play();
        store.setIsPlaying(true);
      } catch (err) {
        error.value = err instanceof Error ? err.message : "无法播放当前音频";
        store.setIsPlaying(false);
        stopLevelTracking();
      }
    } else {
      audio.pause();
      store.setIsPlaying(false);
      stopLevelTracking();
    }
  };

  const getRandomIndex = (baseIndex: number): number => {
    if (store.queue.length <= 1) return baseIndex;
    let next = baseIndex;
    while (next === baseIndex) {
      next = Math.floor(Math.random() * store.queue.length);
    }
    return next;
  };

  const getTargetIndex = (
    direction: "next" | "previous",
    forceMove = true
  ): number => {
    const total = store.queue.length;
    if (!total) return -1;
    const baseIndex = pendingIndex ?? store.currentIndex;

    if (store.playbackMode === "shuffle") {
      return getRandomIndex(baseIndex);
    }

    if (store.playbackMode === "single" && !forceMove) {
      return baseIndex;
    }

    if (direction === "next") {
      return (baseIndex + 1) % total;
    }

    return (baseIndex - 1 + total) % total;
  };

  const playByIndexWhenReady = async (targetIndex: number, autoplay = true) => {
    if (!store.queue.length || targetIndex < 0 || targetIndex >= store.queue.length) return;

    const targetTrack = store.queue[targetIndex];
    if (!targetTrack?.id) return;

    const ticket = ++playbackTicket;
    cancelPendingDetailRequest();
    const controller = new AbortController();
    detailAbortController = controller;
    pendingIndex = targetIndex;
    store.setSwitchingTrack(targetTrack.id);
    store.resetError();

    try {
      const detail = await store.ensureTrackDetail(
        targetTrack.id,
        false,
        false,
        controller.signal
      );

      if (ticket !== playbackTicket) return;
      if (!detail || !detail.url) {
        store.setIsPlaying(Boolean(!audio.paused && audio.src));
        return;
      }

      skipWatchTrackId = detail.id;
      if (store.currentIndex !== targetIndex) {
        store.setCurrentIndex(targetIndex);
      }
      store.setLyricsFromTrack(detail);
      await loadAndPlay(detail, autoplay);
    } catch (err) {
      if (isAbortError(err)) return;
      error.value = err instanceof Error ? err.message : "切换歌曲失败";
    } finally {
      if (ticket === playbackTicket) {
        pendingIndex = null;
        store.setSwitchingTrack(null);
        if (detailAbortController === controller) {
          detailAbortController = null;
        }
      }
    }
  };

  const playByDirection = async (
    direction: "next" | "previous",
    forceMove = true
  ) => {
    const targetIndex = getTargetIndex(direction, forceMove);
    if (targetIndex < 0) return;
    await playByIndexWhenReady(targetIndex, true);
  };

  const attachListeners = () => {
    if (listenersBound) return;

    audio.addEventListener("timeupdate", () => {
      if (Number.isFinite(audio.currentTime)) {
        store.setProgress({
          current: audio.currentTime,
          duration: audio.duration || store.progress.duration,
        });
        const index = findActiveLyricIndex(store.lyrics, audio.currentTime);
        store.setActiveLyricIndex(index);
      }
    });

    audio.addEventListener("ended", async () => {
      if (store.playbackMode === "single") {
        audio.currentTime = 0;
        try {
          await audio.play();
          store.setIsPlaying(true);
        } catch {
          store.setIsPlaying(false);
        }
        return;
      }
      await playByDirection("next", false);
    });

    audio.addEventListener("loadedmetadata", () => {
      store.setProgress({
        current: 0,
        duration: audio.duration || store.progress.duration,
      });
      isReady.value = true;
    });

    audio.addEventListener("play", () => {
      store.setIsPlaying(true);
      startLevelTracking();
    });
    audio.addEventListener("pause", () => {
      store.setIsPlaying(false);
      stopLevelTracking();
    });
    audio.addEventListener("error", () => {
      error.value = "音频加载失败，请稍后再试";
      store.setIsPlaying(false);
      stopLevelTracking();
    });

    listenersBound = true;
  };

  const play = async () => {
    if (!store.currentTrack) {
      if (!store.queue.length) return;
      await playByIndexWhenReady(store.currentIndex, true);
      return;
    }

    if (store.currentTrack.url) {
      await loadAndPlay(store.currentTrack, true);
      return;
    }

    await playByIndexWhenReady(store.currentIndex, true);
  };

  const pause = () => {
    audio.pause();
    store.setIsPlaying(false);
    stopLevelTracking();
  };

  const stop = () => {
    cancelPendingDetailRequest();
    store.setSwitchingTrack(null);
    pendingIndex = null;
    audio.pause();
    audio.currentTime = 0;
    store.setProgress({ current: 0, duration: audio.duration || 0 });
    store.setIsPlaying(false);
    stopLevelTracking();
  };

  const togglePlay = () => {
    if (!store.currentTrack) {
      if (!store.queue.length) return;
      void playByIndexWhenReady(store.currentIndex, true);
      return;
    }
    if (store.isPlaying) {
      pause();
      return;
    }
    void play();
  };

  const seek = (time: number) => {
    audio.currentTime = time;
    store.setProgress({
      current: time,
      duration: audio.duration || store.progress.duration,
    });
  };

  const setVolume = (volume: number) => {
    audio.volume = Math.min(Math.max(volume, 0), 1);
    store.setVolume(audio.volume);
  };

  const playNext = async (forceMove = true) => {
    await playByDirection("next", forceMove);
  };

  const playPrevious = async (forceMove = true) => {
    await playByDirection("previous", forceMove);
  };

  attachListeners();

  watch(
    () => store.currentTrack?.id,
    async (trackId) => {
      if (!trackId) {
        pause();
        return;
      }

      if (skipWatchTrackId === trackId) {
        skipWatchTrackId = null;
        return;
      }

      const nextIndex = store.queue.findIndex((track) => track.id === trackId);
      if (nextIndex === -1) return;
      await playByIndexWhenReady(nextIndex, true);
    },
    { immediate: true }
  );

  watch(
    () => store.volume,
    (volume) => {
      audio.volume = volume;
    },
    { immediate: true }
  );

  const progress = computed(() => ({
    current: store.progress.current,
    duration: store.progress.duration,
  }));

  return {
    audio,
    isReady,
    error,
    audioLevel,
    progress,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    playNext,
    playPrevious,
    stop,
  };
}

type PlayerControls = ReturnType<typeof createPlayer>;

let instance: PlayerControls | null = null;

export function usePlayer(): PlayerControls {
  if (!instance) {
    instance = createPlayer();
  }
  return instance;
}
