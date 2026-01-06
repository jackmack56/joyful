<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import NowPlayingCard from "@/components/player/NowPlayingCard.vue";
import LyricsPanel from "@/components/player/LyricsPanel.vue";
import PlaylistPanel from "@/components/player/PlaylistPanel.vue";
import { useUiStore } from "@/store/ui";
import { usePlayerStore } from "@/store/player";
import { usePlayer } from "@/composables/usePlayer";
import type { MusicTrack } from "@/types/music";

const uiStore = useUiStore();
const playerStore = usePlayerStore();
const controls = usePlayer();

const { lyricsVisible, mobileLyricsOpen, sidePanelOpen } = storeToRefs(uiStore);
const { currentTrack, lyrics, activeLyricIndex, queue, isPlaying } = storeToRefs(playerStore);

const isDesktop = ref(false);

const updateViewport = () => {
  if (typeof window === "undefined") return;
  isDesktop.value = window.innerWidth >= 1024;
  if (isDesktop.value) {
    uiStore.setMobileLyricsOpen(false);
  }
};

onMounted(() => {
  updateViewport();
  window.addEventListener("resize", updateViewport);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateViewport);
});

const switchView = (view: "lyrics" | "playlist"): void => {
  uiStore.setLyricsVisible(view === "lyrics");
  uiStore.setSidePanelOpen(true);
};

const handleClose = (): void => {
  uiStore.closeSidePanel();
};

const handleSelectTrack = async (track: MusicTrack): Promise<void> => {
  const exists = playerStore.queue.find((item) => item.id === track.id);
  if (!exists) {
    playerStore.setQueue([...playerStore.queue, track]);
  }
  await playerStore.playTrack(track.id);
  await controls.play();
};

const handleRemoveFromQueue = (trackId: string): void => {
  playerStore.removeFromQueue(trackId);
};
</script>

<template>
  <aside
    v-if="sidePanelOpen && isDesktop"
    class="flex h-full min-h-0 flex-shrink-0 flex-col self-stretch border-t border-white/40 pt-6 lg:w-[360px] lg:border-l lg:border-t-0 lg:pl-6 dark:border-white/10"
  >
    <div class="mb-2 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-white/60">
      <div class="flex items-center gap-2">
        <button
          class="rounded-full px-3 py-1 text-[11px] transition"
          :class="lyricsVisible ? 'bg-white text-slate-800 shadow dark:bg-white/10 dark:text-white' : 'text-slate-500 hover:text-brand dark:text-white/70 dark:hover:text-brand'"
          type="button"
          @click="switchView('lyrics')"
        >
          歌词
        </button>
        <button
          class="rounded-full px-3 py-1 text-[11px] transition"
          :class="!lyricsVisible ? 'bg-white text-slate-800 shadow dark:bg-white/10 dark:text-white' : 'text-slate-500 hover:text-brand dark:text-white/70 dark:hover:text-brand'"
          type="button"
          @click="switchView('playlist')"
        >
          播放列表
        </button>
      </div>
      <button
        class="flex h-8 w-8 items-center justify-center rounded-full border border-white/50 text-slate-500 transition hover:border-brand hover:text-brand dark:border-white/20 dark:text-white/70 dark:hover:border-brand dark:hover:text-brand"
        type="button"
        aria-label="关闭侧栏"
        @click="handleClose"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path d="M6 6l12 12M6 18 18 6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <template v-if="lyricsVisible">
        <NowPlayingCard :is-playing="isPlaying" :track="currentTrack" />
        <LyricsPanel
          :active-index="activeLyricIndex"
          :loading="playerStore.loading"
          :lyrics="lyrics"
        />
      </template>
      <template v-else>
<PlaylistPanel
  class="flex-1 min-h-0"
  :current-track-id="currentTrack?.id ?? null"
  :tracks="queue"
  @clear="playerStore.setQueue([])"
  @remove="handleRemoveFromQueue"
  @select="handleSelectTrack"
/>
      </template>
    </div>
  </aside>

  <transition name="fade">
    <div
      v-if="mobileLyricsOpen && !isDesktop"
      class="fixed inset-x-0 top-[72px] bottom-[88px] z-30 overflow-y-auto bg-white/95 px-4 py-4 text-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.2)] backdrop-blur dark:bg-black/85 dark:text-white"
      style="-webkit-overflow-scrolling: touch; touch-action: pan-y"
    >
      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img
            :src="currentTrack?.pic ?? 'https://placehold.co/60?text=♪'"
            alt="封面"
            class="h-14 w-14 rounded-xl object-cover shadow"
          />
          <div class="min-w-0">
            <p class="truncate text-base font-semibold">{{ currentTrack?.name ?? "暂无播放" }}</p>
            <p class="truncate text-xs text-slate-500 dark:text-white/70">{{ currentTrack?.artist ?? "未知歌手" }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="rounded-full border border-slate-200 px-3 py-1 text-[11px] transition hover:border-brand hover:text-brand dark:border-white/20 dark:text-white/70 dark:hover:border-brand dark:hover:text-brand"
            :class="lyricsVisible ? 'bg-brand/10 text-brand dark:bg-brand/20' : ''"
            type="button"
            @click="switchView('lyrics')"
          >
            歌词
          </button>
          <button
            class="rounded-full border border-slate-200 px-3 py-1 text-[11px] transition hover:border-brand hover:text-brand dark:border-white/20 dark:text-white/70 dark:hover:border-brand dark:hover:text-brand"
            :class="!lyricsVisible ? 'bg-brand/10 text-brand dark:bg-brand/20' : ''"
            type="button"
            @click="switchView('playlist')"
          >
            播放列表
          </button>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full border border-white/50 text-slate-500 transition hover:text-brand dark:border-white/20 dark:text-white/70"
            type="button"
            aria-label="关闭歌词"
            @click="handleClose"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24">
              <path d="M6 6l12 12M6 18 18 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <div class="flex-1 min-h-0">
        <template v-if="lyricsVisible">
          <LyricsPanel
            :active-index="activeLyricIndex"
            :loading="playerStore.loading"
            :lyrics="lyrics"
          />
        </template>
        <template v-else>
          <PlaylistPanel
            class="flex-1 min-h-0"
            :current-track-id="currentTrack?.id ?? null"
            :tracks="queue"
            @remove="handleRemoveFromQueue"
            @select="handleSelectTrack"
          />
        </template>
      </div>
    </div>
  </transition>
</template>
