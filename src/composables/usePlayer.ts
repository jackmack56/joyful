import { computed, ref, watch } from "vue";
import { usePlayerStore } from "@/store/player";
import { findActiveLyricIndex } from "@/utils/lrc";
import type { MusicTrack } from "@/types/music";

const audio = new Audio();
audio.preload = "metadata";

let listenersBound = false;

function createPlayer() {
  const store = usePlayerStore();
  const isReady = ref(false);
  const error = ref<string | null>(null);

  const loadAndPlay = async (track: MusicTrack | null | undefined, autoplay = true) => {
    if (!track?.url) {
      store.setIsPlaying(false);
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
      }
    } else {
      audio.pause();
    }
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
        await audio.play();
        return;
      }
      const nextTrack = store.playNext(false);
      if (nextTrack) {
        store.setIsPlaying(true);
        await loadAndPlay(await store.ensureTrackDetail(nextTrack.id), true);
      }
    });

    audio.addEventListener("loadedmetadata", () => {
      store.setProgress({
        current: 0,
        duration: audio.duration || store.progress.duration,
      });
      isReady.value = true;
    });

    audio.addEventListener("play", () => store.setIsPlaying(true));
    audio.addEventListener("pause", () => store.setIsPlaying(false));
    audio.addEventListener("error", () => {
      error.value = "音频加载失败，请稍后再试";
      store.setIsPlaying(false);
    });

    listenersBound = true;
  };

  const play = async () => {
    if (!store.currentTrack) return;
    const track = await store.ensureTrackDetail(store.currentTrack.id);
    if (!track) {
      store.setIsPlaying(false);
      return;
    }
    await loadAndPlay(track, true);
  };

  const pause = () => {
    audio.pause();
    store.setIsPlaying(false);
  };

  const stop = () => {
    audio.pause();
    audio.currentTime = 0;
    store.setProgress({ current: 0, duration: audio.duration || 0 });
    store.setIsPlaying(false);
  };

  const togglePlay = () => {
    if (!store.currentTrack?.url) {
      store.playNext();
      return;
    }
    if (store.isPlaying) {
      pause();
    } else {
      void play();
    }
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

  const playNext = async () => {
    const nextTrack = store.playNext();
    if (nextTrack) {
      const detail = await store.ensureTrackDetail(nextTrack.id);
      if (!detail) {
        store.setIsPlaying(false);
        return;
      }
      await loadAndPlay(detail, true);
    }
  };

  const playPrevious = async () => {
    const track = store.playPrevious();
    if (track) {
      const detail = await store.ensureTrackDetail(track.id);
      if (!detail) {
        store.setIsPlaying(false);
        return;
      }
      await loadAndPlay(detail, true);
    }
  };

  attachListeners();

  watch(
    () => store.currentTrack?.id,
    async (trackId) => {
      if (!trackId) {
        pause();
        return;
      }
      const detail = await store.ensureTrackDetail(trackId);
      if (!detail) {
        pause();
        return;
      }
      await loadAndPlay(detail, true);
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
