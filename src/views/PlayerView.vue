<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useLibraryStore } from "@/store/library";
import { usePlayerStore } from "@/store/player";
import { useUiStore } from "@/store/ui";
import { usePlayer } from "@/composables/usePlayer";
import type { MusicTrack, MusicCategory } from "@/types/music";
import TrackList from "@/components/player/TrackList.vue";
import PlaybackControls from "@/components/player/PlaybackControls.vue";
import SearchToolbar from "@/components/player/SearchToolbar.vue";
import LyricsPlaylistPanel from "@/components/player/LyricsPlaylistPanel.vue";
import ThemeToggle from "@/components/ui/ThemeToggle.vue";
import UserAvatarButton from "@/components/ui/UserAvatarButton.vue";

const libraryStore = useLibraryStore();
const playerStore = usePlayerStore();
const uiStore = useUiStore();
usePlayer(); // initialize audio engine once
const controls = usePlayer();

const { tracks, loading, error, params, total } = storeToRefs(libraryStore);
const { currentTrack } = storeToRefs(playerStore);
const listContainerRef = ref<HTMLElement | null>(null);
const isAppending = ref(false);
const typeOptions = [
  { label: "推荐", value: "RECOMMEND" as MusicCategory },
  { label: "综合", value: "ALL" as MusicCategory },
  { label: "歌曲", value: "SONG" as MusicCategory },
  { label: "歌手", value: "SINGER" as MusicCategory },
  { label: "专辑", value: "ALBUM" as MusicCategory },
  { label: "歌单", value: "PLAYLIST" as MusicCategory },
];

const fetchInitial = async () => {
  await libraryStore.loadFirstPage();
};

const loadMore = async () => {
  if (isAppending.value || libraryStore.loading || !libraryStore.hasMore) return;
  isAppending.value = true;
  const previousScroll = listContainerRef.value?.scrollTop ?? 0;
  await libraryStore.loadNextPage();
  await nextTick();
  const target = listContainerRef.value;
  if (target) target.scrollTop = previousScroll;
  isAppending.value = false;
};

const handleScroll = () => {
  const el = listContainerRef.value;
  if (!el || libraryStore.loading || !libraryStore.hasMore) return;
  const { scrollTop, scrollHeight, clientHeight } = el;
  if (scrollTop + clientHeight >= scrollHeight - 60) {
    void loadMore();
  }
};

onMounted(() => {
  void fetchInitial();
});

const handleSearch = async (payload: { keyword: string; category: typeof params.value.type }) => {
  libraryStore.setKeyword(payload.keyword);
  libraryStore.setType(payload.category);
  libraryStore.setSongListId(null);
  await libraryStore.loadFirstPage({
    keyword: payload.keyword,
    type: payload.category,
    pageNum: 1,
  });
  listContainerRef.value?.scrollTo({ top: 0, behavior: "smooth" });
  const first = libraryStore.tracks[0];
  if (first) {
    await playerStore.playTrack(first.id);
  }
};

const handleRandomize = async () => {
  libraryStore.setSongListId(null);
  await libraryStore.loadFirstPage();
  listContainerRef.value?.scrollTo({ top: 0, behavior: "smooth" });
  const first = libraryStore.tracks[0];
  if (first) {
    await playerStore.playTrack(first.id);
  }
};

const handleTypeChange = async (type: MusicCategory) => {
  if (params.value.type === type) return;
  libraryStore.setType(type);
  libraryStore.setSongListId(null);
  await libraryStore.loadFirstPage({ type });
  listContainerRef.value?.scrollTo({ top: 0, behavior: "smooth" });
  const first = libraryStore.tracks[0];
  if (first) {
    await playerStore.playTrack(first.id);
  }
};

const handleSelectTrack = async (track: MusicTrack) => {
  const exists = playerStore.queue.find((item) => item.id === track.id);
  if (!exists) {
    playerStore.setQueue([...playerStore.queue, track]);
  }
  await playerStore.playTrack(track.id);
  await controls.play();
  uiStore.setLyricsVisible(true);
};

const isSongListMode = computed(() => Boolean(params.value.songListId));

const handlePlayAll = async () => {
  if (!tracks.value.length) return;
  playerStore.setQueue(tracks.value);
  await playerStore.playTrack(tracks.value[0].id);
  await controls.play();
};

const handleAddSelected = async (selected: MusicTrack[]) => {
  if (!selected.length) return;
  const queueIds = new Set(playerStore.queue.map((t) => t.id));
  const additions = selected.filter((item) => !queueIds.has(item.id));
  if (additions.length) {
    playerStore.setQueue([...playerStore.queue, ...additions]);
  }
};
</script>

<template>
  <div class="flex min-h-screen flex-col bg-transparent text-slate-800 dark:text-white">
    <header class="flex w-full flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:gap-6 lg:px-4">
      <div class="w-full lg:w-56">
        <RouterLink class="block" :to="{ name: 'home' }">
          <div class="flex items-end justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-xs uppercase tracking-[0.4em] text-slate-500 transition-colors hover:text-slate-900 dark:text-white/60 dark:hover:text-white">Joyful Dawn</p>
              <h1 class="truncate text-2xl font-semibold leading-tight text-slate-900 transition-colors hover:text-brand sm:text-[26px] lg:truncate lg:text-3xl dark:text-white dark:hover:text-brand">
                聆听 · 云雾氛围
              </h1>
            </div>
            <div class="flex flex-none shrink-0 items-center gap-3 lg:hidden">
              <ThemeToggle />
              <UserAvatarButton />
            </div>
          </div>
        </RouterLink>
        <nav class="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-white/60">
          <RouterLink class="hover:text-slate-900 dark:hover:text-white" :to="{ name: 'home' }">歌单推荐</RouterLink>
          <span>/</span>
          <span class="text-slate-900 dark:text-white">播放器</span>
        </nav>
      </div>
      <div class="w-full lg:flex-1">
        <SearchToolbar
          :category="params.type"
          :keyword="params.keyword"
          :loading="loading"
          @search="handleSearch"
          @randomize="handleRandomize"
        />
      </div>
      <div class="hidden flex-none items-center justify-end gap-3 lg:flex lg:self-center">
        <ThemeToggle />
        <UserAvatarButton />
      </div>
    </header>

    <main class="flex flex-1 min-h-0 flex-col gap-8 px-4 pb-24 overflow-hidden lg:flex-row lg:gap-10 lg:px-20 lg:pb-16">
      <section class="flex min-h-0 flex-1 flex-col">
        <div v-if="!isSongListMode" class="mb-3 flex flex-col gap-2 text-sm text-slate-600 dark:text-white/80">
          <div class="flex flex-wrap gap-2 text-xs">
            <button
              v-for="option in typeOptions"
              :key="option.value"
              class="rounded-full px-3 py-1"
              :class="
                params.type === option.value
                  ? 'bg-white text-slate-800 shadow'
                  : 'bg-white/40 text-slate-500 hover:bg-white/60 dark:bg-white/10 dark:text-white/70'
              "
              type="button"
              @click="handleTypeChange(option.value)"
            >
              {{ option.label }}
            </button>
            <button
              class="rounded-full border border-dashed border-white/60 px-3 py-1 text-slate-500 dark:text-white/70"
              type="button"
              :disabled="loading"
              @click="handleRandomize"
            >
              随机推荐
            </button>
          </div>
        </div>
        <div
          ref="listContainerRef"
          class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-2 lg:pr-4 desktop-scroll mobile-scroll"
          style="-webkit-overflow-scrolling: touch; touch-action: pan-y"
          @scroll.passive="handleScroll"
        >
          <TrackList
            :current-track-id="currentTrack?.id ?? null"
            :error="error"
            :loading="loading"
          :total="total"
          :tracks="tracks"
          @retry="fetchInitial"
          @add-selected="handleAddSelected"
          @play-all="handlePlayAll"
          @select="handleSelectTrack"
        />
          <div
            v-if="libraryStore.loading && tracks.length"
            class="py-3 text-center text-xs text-white/60"
          >
            加载更多中…
          </div>
          <div
            v-else-if="!libraryStore.hasMore && tracks.length"
            class="py-3 text-center text-[10px] uppercase tracking-[0.3em] text-white/40"
          >
            已到底部
          </div>
        </div>
        <p v-if="playerStore.error" class="mt-2 text-xs text-rose-500 dark:text-rose-200">
          {{ playerStore.error }}
        </p>
      </section>

      <LyricsPlaylistPanel />
    </main>

    <PlaybackControls />
  </div>
</template>
