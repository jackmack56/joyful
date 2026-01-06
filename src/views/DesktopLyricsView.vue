<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive } from "vue";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

type LyricsEvent = {
  track: { title: string; artist: string };
  progress: { current: number; duration: number };
  isPlaying: boolean;
  lyrics: Array<{ text: string }>;
  activeIndex: number;
};

const state = reactive({
  trackTitle: "",
  trackArtist: "",
  current: 0,
  duration: 0,
  isPlaying: false,
  lyrics: [] as Array<{ text: string }>,
  activeIndex: -1,
  locked: false,
  fontSize: 20,
});

const displayLyrics = computed(() => {
  const currentLine = state.lyrics[state.activeIndex]?.text ?? "";
  const nextLine = state.lyrics[state.activeIndex + 1]?.text ?? "";
  return { currentLine, nextLine };
});

const formatTime = (value: number) => {
  if (!Number.isFinite(value)) return "00:00";
  const m = Math.floor(value / 60);
  const s = Math.floor(value % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const togglePlay = () => {
  emit("lyrics:control", { action: "toggle" });
};
const playNext = () => {
  emit("lyrics:control", { action: "next" });
};
const playPrev = () => {
  emit("lyrics:control", { action: "prev" });
};
const closeWindow = () => window.close();

const toggleLock = () => {
  state.locked = !state.locked;
  appWindow.setIgnoreCursorEvents(state.locked).catch(() => {});
};

const increaseFont = () => {
  state.fontSize = Math.min(36, state.fontSize + 2);
};
const decreaseFont = () => {
  state.fontSize = Math.max(14, state.fontSize - 2);
};

let unlisten: (() => void) | null = null;
const appWindow = getCurrentWindow();

onMounted(async () => {
  unlisten = await listen<LyricsEvent>("lyrics:update", (event) => {
    const payload = event.payload;
    state.trackTitle = payload.track.title;
    state.trackArtist = payload.track.artist;
    state.current = payload.progress.current;
    state.duration = payload.progress.duration;
    state.isPlaying = payload.isPlaying;
    state.lyrics = payload.lyrics ?? [];
    state.activeIndex = payload.activeIndex ?? -1;
  });
});

onBeforeUnmount(() => {
  if (unlisten) unlisten();
});
</script>

<template>
  <div
    class="relative w-full h-full text-slate-800 select-none"
    :class="state.locked ? 'bg-transparent text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.35)]' : 'bg-white/92 backdrop-blur rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.16)] border border-white/40'"
    :style="{ padding: state.locked ? '6px 10px' : '12px 16px' }"
    @mousedown="!state.locked && appWindow.startDragging().catch(() => {})"
  >
    <div
      v-if="!state.locked"
      class="flex items-center justify-between gap-2 pb-2"
      data-tauri-drag-region
    >
      <div class="flex items-center gap-2 text-xs text-slate-500">
        <span class="font-semibold text-slate-800">{{ state.trackTitle || "未播放" }}</span>
        <span v-if="state.trackArtist" class="text-slate-400">- {{ state.trackArtist }}</span>
      </div>
      <div class="flex items-center gap-2 text-slate-600">
        <button class="icon-btn" @click="playPrev" title="上一曲">⏮</button>
        <button class="icon-btn" @click="togglePlay" title="播放/暂停">
          {{ state.isPlaying ? "⏸" : "▶" }}
        </button>
        <button class="icon-btn" @click="playNext" title="下一曲">⏭</button>
        <div class="h-4 w-px bg-slate-200 mx-1" />
        <button class="icon-btn" @click="decreaseFont" title="减小字体">A-</button>
        <button class="icon-btn" @click="increaseFont" title="增大字体">A+</button>
        <div class="h-4 w-px bg-slate-200 mx-1" />
        <button class="icon-btn" @click="toggleLock" title="锁定">🔒</button>
        <button class="icon-btn" @click="closeWindow" title="关闭">✕</button>
      </div>
    </div>

    <div class="space-y-1 select-none">
      <p
        class="font-semibold"
        :class="state.locked ? 'text-white drop-shadow-[0_0_6px_rgba(0,0,0,0.45)]' : 'text-rose-500'"
        :style="{ fontSize: `${state.fontSize}px` }"
      >
        {{ displayLyrics.currentLine || "♪♪♪" }}
      </p>
      <p
        class="text-sm"
        :class="state.locked ? 'text-white/90 drop-shadow-[0_0_4px_rgba(0,0,0,0.35)]' : 'text-rose-500/80'"
        :style="{ fontSize: `${state.fontSize - 2}px` }"
      >
        {{ displayLyrics.nextLine }}
      </p>
    </div>

    <div class="mt-2 flex items-center gap-2 text-[11px]" :class="state.locked ? 'text-white/80' : 'text-slate-500'">
      <span>{{ formatTime(state.current) }}</span>
      <div class="h-px flex-1 bg-slate-200/70 dark:bg-white/30 relative overflow-hidden">
        <div
          class="absolute inset-y-0 left-0 bg-rose-500"
          :style="{ width: state.duration ? `${(state.current / state.duration) * 100}%` : '0%' }"
        />
      </div>
      <span>{{ formatTime(state.duration) }}</span>
    </div>

    <button
      v-if="state.locked"
      class="absolute right-2 bottom-1 text-xs text-white/80 px-2 py-1 rounded-full bg-black/30"
      @click="toggleLock"
    >
      解锁拖拽
    </button>
  </div>
</template>

<style scoped>
.icon-btn {
  @apply text-xs px-2 py-1 rounded hover:bg-slate-100 transition;
}

:global(body),
:global(#app) {
  background: transparent !important;
}
</style>
