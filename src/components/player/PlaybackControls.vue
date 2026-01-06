<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { usePlayerStore } from "@/store/player";
import { useUiStore } from "@/store/ui";
import { usePlayer } from "@/composables/usePlayer";
import { useLikeToggle } from "@/composables/useLikeToggle";

const playerStore = usePlayerStore();
const uiStore = useUiStore();
const { currentTrack, playbackMode, isPlaying } = storeToRefs(playerStore);
const controls = usePlayer();
const progress = controls.progress;
const { lyrics, activeLyricIndex } = storeToRefs(playerStore);
const { lyricsVisible } = storeToRefs(uiStore);
const { toggleLike, isPending } = useLikeToggle();
const activeLyric = computed(() => lyrics.value[activeLyricIndex.value]?.text ?? "");
const isCurrentLiked = computed(() => Number(currentTrack.value?.isLike) === 1);
const isTauriEnv = Boolean((import.meta as any).env?.TAURI_PLATFORM || (import.meta as any).env?.TAURI_ARCH || (import.meta as any).env?.TAURI_FAMILY);
const isNativeClient = ref(isTauriEnv);
const detectNativeClient = () => {
  if (isNativeClient.value) return true;
  if (typeof window === "undefined") return false;
  const w = window as typeof window & { __TAURI__?: unknown; __TAURI_IPC__?: unknown; __TAURI_METADATA__?: unknown };
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const hit = Boolean(w.__TAURI__ || w.__TAURI_IPC__ || w.__TAURI_METADATA__ || /tauri/i.test(ua));
  if (hit) {
    isNativeClient.value = true;
  }
  return hit;
};
const ensureTauriClass = () => {
  if (typeof document === "undefined") return;
  if (isNativeClient.value) {
    document.documentElement.classList.add("tauri-app");
  }
};
const volumeFill = computed(() => Math.min(100, Math.max(0, (playerStore.volume ?? 0) * 100)));
const progressFill = computed(() => {
  const duration = progress.value?.duration || 0;
  const current = progress.value?.current || 0;
  if (!duration) return 0;
  return Math.min(100, Math.max(0, (current / duration) * 100));
});
const volumeRangeStyle = computed<Record<string, string> | undefined>(() =>
  isNativeClient.value
    ? {
        "--range-fill": `${volumeFill.value}%`,
        "--range-fill-color": "#ec4141",
        "--range-track-color": "rgba(255, 255, 255, 0.28)",
      }
    : undefined
);
const progressRangeStyle = computed<Record<string, string> | undefined>(() =>
  isNativeClient.value
    ? {
        "--range-fill": `${progressFill.value}%`,
        "--range-fill-color": "#ec4141",
        "--range-track-color": "rgba(255, 255, 255, 0.28)",
      }
    : undefined
);

const formatTime = (value: number) => {
  if (!Number.isFinite(value)) return "00:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const modeLabel = computed(() => {
  switch (playbackMode.value) {
    case "single":
      return "单曲循环";
    case "shuffle":
      return "随机播放";
    default:
      return "列表循环";
  }
});

const showLyrics = () => {
  uiStore.openSidePanel("lyrics");
  if (typeof window !== "undefined" && window.innerWidth < 1024) {
    uiStore.setMobileLyricsOpen(true);
  }
};

const showMobileLyrics = () => {
  uiStore.openSidePanel(lyricsVisible.value ? "lyrics" : "playlist");
  uiStore.setMobileLyricsOpen(true);
};

const showPlaylist = () => {
  uiStore.openSidePanel("playlist");
  if (typeof window !== "undefined" && window.innerWidth < 1024) {
    uiStore.setMobileLyricsOpen(true);
  }
};

const toggleCurrentLike = () => {
  toggleLike(currentTrack.value ?? null);
};

onMounted(() => {
  detectNativeClient();
  ensureTauriClass();
  setTimeout(detectNativeClient, 0);
  setTimeout(detectNativeClient, 250);
  setTimeout(ensureTauriClass, 0);
  setTimeout(ensureTauriClass, 250);
  setTimeout(() => {
    if (typeof document !== "undefined" && document.documentElement.classList.contains("tauri-app")) {
      isNativeClient.value = true;
    }
  }, 150);
  const syncTimer = window.setInterval(() => {
    if (typeof document !== "undefined" && document.documentElement.classList.contains("tauri-app")) {
      isNativeClient.value = true;
    }
  }, 200);
  setTimeout(() => {
    window.clearInterval(syncTimer);
  }, 2000);
});
</script>

<template>
  <div class="sticky bottom-0 z-20 mt-auto w-full border-t border-white/40 bg-white/90 py-2.5 text-slate-800 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] backdrop-blur dark:border-white/10 dark:bg-black/40 dark:text-white">
    <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(260px,420px)_max-content] lg:grid-cols-[minmax(0,1fr)_minmax(320px,520px)_minmax(0,1fr)] sm:px-6 lg:px-12 max-w-screen-xl mx-auto">
      <button
        class="flex min-w-0 items-center gap-3 order-1 sm:order-none text-left"
        type="button"
        @click="showMobileLyrics"
      >
        <img
          :src="currentTrack?.pic ?? 'https://placehold.co/48?text=♪'"
          alt="封面"
          class="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-xl object-cover shadow"
        />
        <div class="min-w-0 max-w-[55vw] sm:max-w-[320px]">
          <p class="truncate font-semibold">{{ currentTrack?.name ?? "暂无播放" }}</p>
          <p class="truncate text-xs text-slate-500 dark:text-white/60">{{ currentTrack?.artist ?? "选择歌曲开始播放" }}</p>
          <p v-if="activeLyric" class="mt-1 hidden truncate text-xs text-emerald-600 dark:text-emerald-300 sm:block">
            {{ activeLyric }}
          </p>
        </div>
      </button>
      <div class="flex w-full max-w-[520px] flex-col items-center justify-center gap-2 order-3 col-span-2 sm:order-none sm:col-span-1 lg:col-span-1">
          <div class="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5">
          <button
            class="flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] text-slate-600 transition hover:border-brand hover:text-brand dark:border-white/20 dark:text-white/70 dark:hover:border-brand dark:hover:text-brand"
            type="button"
            @click="playerStore.cyclePlaybackMode()"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path d="M4 6h11a3 3 0 0 1 0 6H7" stroke-linecap="round" stroke-linejoin="round" />
              <path d="m6 4-2 2 2 2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M20 18H9a3 3 0 0 1 0-6h8" stroke-linecap="round" stroke-linejoin="round" />
              <path d="m18 20 2-2-2-2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>{{ modeLabel }}</span>
          </button>
          <button
            class="group flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-brand hover:text-brand dark:border-white/20 dark:text-white/70 dark:hover:border-brand dark:hover:text-brand"
            type="button"
            aria-label="上一曲"
            @click="controls.playPrevious()"
          >
            <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M6 5v14M18 6l-8 6 8 6V6z" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <button
            class="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-glow transition hover:bg-brand-dark"
            type="button"
            aria-label="播放 / 暂停"
            @click="controls.togglePlay()"
          >
            <svg v-if="isPlaying" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6.5" y="5" width="3.2" height="14" rx="1" />
              <rect x="14.3" y="5" width="3.2" height="14" rx="1" />
            </svg>
            <svg
              v-else
              class="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5.14a1 1 0 0 1 1.52-.85l9.12 6.33a1 1 0 0 1 0 1.66l-9.12 6.33A1 1 0 0 1 8 17.8V5.14Z" />
            </svg>
          </button>
          <button
            class="group flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-brand hover:text-brand dark:border-white/20 dark:text-white/70 dark:hover:border-brand dark:hover:text-brand"
            type="button"
            aria-label="下一曲"
            @click="controls.playNext()"
          >
            <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M18 19V5M6 18l8-6-8-6v12z" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-white/70">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path d="M5 9v6M9 7v10M13 5v14M17 9v6M21 11v2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <input
              :class="['h-1 w-24 cursor-pointer accent-brand sm:h-0.5', isNativeClient ? 'tauri-range tauri-tight' : '']"
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="playerStore.volume"
              :style="volumeRangeStyle"
              @input="(e) => controls.setVolume(Number((e.target as HTMLInputElement).value))"
            />
          </div>
        </div>
        <div class="flex w-full flex-col items-center gap-1">
          <input
            :class="['h-1 w-full max-w-[480px] cursor-pointer rounded-full accent-brand sm:h-0.5', isNativeClient ? 'tauri-range tauri-tight' : '']"
            type="range"
            :max="progress.duration || 0"
            :value="progress.current || 0"
            step="0.1"
            :style="progressRangeStyle"
            @input="(e) => controls.seek(Number((e.target as HTMLInputElement).value))"
          />
          <div class="flex w-full max-w-[480px] items-center justify-between text-[10px] text-slate-400 dark:text-white/60">
            <span>{{ formatTime(progress.current || 0) }}</span>
            <span>{{ formatTime(progress.duration || 0) }}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 sm:gap-3 order-2 sm:order-none shrink-0">
        <button
          class="flex flex-none items-center gap-1 rounded-full px-2 sm:px-3 py-1 text-lg transition disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          :class="isCurrentLiked ? 'text-rose-500 hover:text-rose-500' : 'text-slate-600 hover:text-brand dark:text-white/70 dark:hover:text-brand'"
          :disabled="!currentTrack || isPending(currentTrack.id)"
          aria-label="收藏"
          @click="toggleCurrentLike"
        >
          <span aria-hidden="true" class="leading-none">❤</span>
        </button>
        <button
          class="hidden sm:flex flex-none whitespace-nowrap items-center gap-1 rounded-full border border-slate-200 px-2 sm:px-3 py-1 text-xs transition hover:border-brand hover:text-brand dark:border-white/20 dark:text-white/70 dark:hover:border-brand dark:hover:text-brand"
          :class="lyricsVisible ? 'bg-brand/10 text-brand dark:bg-brand/20' : ''"
          type="button"
          @click="showLyrics"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path d="M5 6h14M5 12h14M5 18h6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>歌词</span>
        </button>
        <button
          class="flex flex-none whitespace-nowrap items-center gap-1 rounded-full border border-slate-200 px-2 sm:px-3 py-1 text-xs transition hover:border-brand hover:text-brand dark:border-white/20 dark:text-white/70 dark:hover:border-brand dark:hover:text-brand"
          :class="!lyricsVisible ? 'bg-brand/10 text-brand dark:bg-brand/20' : ''"
          type="button"
          @click="showPlaylist"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h10" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>播放列表</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(input[type="range"]) {
  cursor: pointer;
}
:deep(input[type="range"]::-webkit-slider-thumb) {
  cursor: pointer;
}
:deep(input[type="range"]::-moz-range-thumb) {
  cursor: pointer;
}
:deep(html.tauri-app .tauri-range) {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  outline: none;
  transform: scaleY(0.6);
  transform-origin: center;
}
:deep(html.tauri-app .tauri-range.tauri-tight) {
  height: 6px;
}
:deep(html.tauri-app .tauri-range::-webkit-slider-runnable-track) {
  height: 2px;
  border-radius: 9999px;
  background: linear-gradient(
    to right,
    var(--range-fill-color, #ec4141) 0%,
    var(--range-fill-color, #ec4141) var(--range-fill, 0%),
    var(--range-track-color, rgba(255, 255, 255, 0.28)) var(--range-fill, 0%),
    var(--range-track-color, rgba(255, 255, 255, 0.28)) 100%
  );
}
:deep(html.tauri-app .tauri-range::-webkit-slider-thumb) {
  height: 10px;
  width: 10px;
  margin-top: -4px;
  background: var(--range-fill-color, #ec4141);
  border: 2px solid rgba(255, 255, 255, 0.9);
  border-radius: 9999px;
}
:deep(html.tauri-app .tauri-range::-moz-range-track) {
  height: 2px;
  border-radius: 9999px;
  background: linear-gradient(
    to right,
    var(--range-fill-color, #ec4141) 0%,
    var(--range-fill-color, #ec4141) var(--range-fill, 0%),
    var(--range-track-color, rgba(255, 255, 255, 0.28)) var(--range-fill, 0%),
    var(--range-track-color, rgba(255, 255, 255, 0.28)) 100%
  );
}
:deep(html.tauri-app .tauri-range::-moz-range-thumb) {
  height: 10px;
  width: 10px;
  background: var(--range-fill-color, #ec4141);
  border: 2px solid rgba(255, 255, 255, 0.9);
  border-radius: 9999px;
}
</style>
