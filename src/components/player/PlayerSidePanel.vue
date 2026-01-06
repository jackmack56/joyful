<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import LyricsPanel from "@/components/player/LyricsPanel.vue";
import PlaylistPanel from "@/components/player/PlaylistPanel.vue";
import NowPlayingCard from "@/components/player/NowPlayingCard.vue";
import { usePlayerStore } from "@/store/player";
import { useUiStore } from "@/store/ui";
import { usePlayer } from "@/composables/usePlayer";
import type { MusicTrack } from "@/types/music";

const props = defineProps<{
  inline?: boolean; // 是否在桌面内联展示（无需遮罩）
}>();

const uiStore = useUiStore();
const playerStore = usePlayerStore();
const controls = usePlayer();
const { lyricsVisible, sidePanelOpen } = storeToRefs(uiStore);
const { lyrics, activeLyricIndex, currentTrack, queue, isPlaying } = storeToRefs(playerStore);

const isOpen = computed(() => sidePanelOpen.value);
const isDesktop = ref(false);

const updateViewport = () => {
  if (typeof window === "undefined") return;
  isDesktop.value = window.innerWidth >= 1024;
};

onMounted(() => {
  updateViewport();
  window.addEventListener("resize", updateViewport);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateViewport);
});

const switchView = (view: "lyrics" | "playlist"): void => {
  uiStore.openSidePanel(view);
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
  <transition name="fade">
    <div v-if="isOpen">
      <div v-if="isDesktop || props.inline" class="side-panel-desktop">
        <div class="panel-body">
          <header class="panel-header">
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
            </div>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 text-slate-500 transition hover:text-brand dark:border-white/20 dark:text-white/70"
              type="button"
              aria-label="关闭侧边面板"
              @click="handleClose"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24">
                <path d="M6 6l12 12M6 18 18 6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </header>
          <div class="panel-scroll">
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
        </div>
      </div>
      <div v-else class="side-panel-mobile">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="handleClose" />
        <aside class="panel-body">
          <header class="panel-header">
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
            </div>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 text-slate-500 transition hover:text-brand dark:border-white/20 dark:text-white/70"
              type="button"
              aria-label="关闭侧边面板"
              @click="handleClose"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24">
                <path d="M6 6l12 12M6 18 18 6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </header>
          <div class="panel-scroll">
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
                @remove="handleRemoveFromQueue"
                @select="handleSelectTrack"
              />
            </template>
          </div>
        </aside>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.side-panel-desktop {
  position: sticky;
  top: 0;
  height: calc(100vh - var(--playback-bar-height));
}

.side-panel-mobile {
  position: fixed;
  inset: 0;
  padding-bottom: var(--playback-bar-height);
  z-index: 40;
}

.panel-body {
  position: relative;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(10px);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.3em;
  color: #64748b;
}

.panel-scroll {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 8px 16px 12px;
}

@media (min-width: 768px) {
  .panel-body {
    border-left: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.9);
  }
}

.dark .panel-body {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.85);
}
</style>
