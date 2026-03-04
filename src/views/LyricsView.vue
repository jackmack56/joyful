<script setup lang="ts">
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { RouterLink, useRoute, useRouter } from "vue-router";
import AppSidebar from "@/components/layout/AppSidebar.vue";
import ThemeToggle from "@/components/ui/ThemeToggle.vue";
import UserAvatarButton from "@/components/ui/UserAvatarButton.vue";
import PlaybackControls from "@/components/player/PlaybackControls.vue";
import NowPlayingCard from "@/components/player/NowPlayingCard.vue";
import LyricsPanel from "@/components/player/LyricsPanel.vue";
import PlaylistPanel from "@/components/player/PlaylistPanel.vue";
import { usePlayerStore } from "@/store/player";
import { useUiStore } from "@/store/ui";
import { usePlayer } from "@/composables/usePlayer";
import type { MusicTrack } from "@/types/music";

const route = useRoute();
const router = useRouter();
const uiStore = useUiStore();
const playerStore = usePlayerStore();
const controls = usePlayer();

const { currentTrack, queue, lyrics, activeLyricIndex, isPlaying } = storeToRefs(playerStore);
const audioWaveLevel = computed(() => controls.audioLevel.value);
const audioWaveTime = computed(() => controls.progress.value.current || 0);

const activeTab = computed<"lyrics" | "playlist">(() => {
  const tab = route.query.tab;
  return tab === "playlist" ? "playlist" : "lyrics";
});

const switchTab = async (tab: "lyrics" | "playlist"): Promise<void> => {
  if (activeTab.value === tab) return;
  await router.replace({ name: "lyrics", query: { tab } });
};

const goBack = async (): Promise<void> => {
  if (window.history.length > 1) {
    await router.back();
    return;
  }
  await router.push({ name: "player" });
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

const handleSeekLyric = async (payload: { time: number; index: number }): Promise<void> => {
  if (!Number.isFinite(payload.time)) return;
  controls.seek(payload.time);
  playerStore.setActiveLyricIndex(payload.index);
  if (playerStore.isPlaying) return;
  try {
    await controls.audio.play();
    playerStore.setIsPlaying(true);
  } catch (error) {
    console.warn(error);
  }
};

onMounted(() => {
  uiStore.closeSidePanel();
});
</script>

<template>
  <div class="flex h-[100dvh] overflow-hidden bg-slate-50/90 text-slate-900 dark:bg-slate-900 dark:text-white">
    <AppSidebar />

    <div class="flex min-w-0 flex-1 flex-col lg:pl-[var(--app-sidebar-width)]">
      <header class="flex flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:gap-6 lg:px-10">
        <div class="w-full lg:w-72">
          <p class="text-xs uppercase tracking-[0.4em] text-slate-500 dark:text-white/60">Joyful Dawn</p>
          <h1 class="text-3xl font-semibold text-slate-900 dark:text-white">沉浸歌词</h1>
          <p class="mt-1 text-sm text-slate-500 dark:text-white/70">把歌词和播放列表独立成专属页面</p>
        </div>
        <nav class="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-white/60">
          <RouterLink class="hover:text-slate-900 dark:hover:text-white" :to="{ name: 'home' }">首页</RouterLink>
          <span>/</span>
          <RouterLink class="hover:text-slate-900 dark:hover:text-white" :to="{ name: 'player' }">播放器</RouterLink>
          <span>/</span>
          <span class="text-slate-900 dark:text-white">歌词页</span>
        </nav>
        <div class="flex flex-1 items-center justify-end gap-3">
          <button
            class="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-brand hover:text-brand dark:border-white/20 dark:text-white/70"
            type="button"
            @click="goBack"
          >
            返回
          </button>
          <div class="lg:hidden">
            <ThemeToggle />
          </div>
          <div class="lg:hidden">
            <UserAvatarButton />
          </div>
        </div>
      </header>

      <main class="flex min-h-0 flex-1 overflow-y-auto px-4 pb-4 lg:overflow-hidden lg:px-10">
        <section class="flex min-h-0 flex-1 flex-col items-center">
          <div class="flex min-h-0 w-full flex-1 flex-col">
            <div class="mb-5 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <button
                  class="rounded-full px-4 py-1.5 text-sm transition"
                  :class="activeTab === 'lyrics' ? 'bg-brand text-white shadow-glow' : 'text-slate-500 hover:text-brand dark:text-white/70'"
                  type="button"
                  @click="switchTab('lyrics')"
                >
                  歌词
                </button>
                <button
                  class="rounded-full px-4 py-1.5 text-sm transition"
                  :class="activeTab === 'playlist' ? 'bg-brand text-white shadow-glow' : 'text-slate-500 hover:text-brand dark:text-white/70'"
                  type="button"
                  @click="switchTab('playlist')"
                >
                  播放列表
                </button>
              </div>
            </div>

            <div v-if="activeTab === 'lyrics'" class="mx-auto grid min-h-0 w-full max-w-[920px] flex-1 gap-6 lg:grid-cols-[300px_minmax(0,560px)] lg:justify-center">
              <div class="flex min-h-0 h-full pr-1">
                <NowPlayingCard
                  :is-playing="isPlaying"
                  :track="currentTrack"
                  :wave-level="audioWaveLevel"
                  :wave-time="audioWaveTime"
                  cover-size="lg"
                  cover-shape="circle"
                  show-wave
                  spin-cover
                  vertical-align="center"
                />
              </div>
              <div class="flex min-h-0 h-full w-full overflow-hidden pr-1">
                <LyricsPanel
                  :active-index="activeLyricIndex"
                  full-height
                  seekable
                  size="large"
                  :loading="playerStore.loading"
                  :lyrics="lyrics"
                  @seek="handleSeekLyric"
                />
              </div>
            </div>

            <div v-else class="min-h-0 flex-1 overflow-hidden">
              <PlaylistPanel
                class="h-full"
                :current-track-id="currentTrack?.id ?? null"
                :tracks="queue"
                @clear="playerStore.setQueue([])"
                @remove="handleRemoveFromQueue"
                @select="handleSelectTrack"
              />
            </div>
          </div>
        </section>
      </main>

      <PlaybackControls />
    </div>
  </div>
</template>
