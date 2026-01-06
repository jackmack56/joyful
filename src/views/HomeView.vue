<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import ThemeToggle from "@/components/ui/ThemeToggle.vue";
import UserAvatarButton from "@/components/ui/UserAvatarButton.vue";
import PlaybackControls from "@/components/player/PlaybackControls.vue";
import SearchToolbar from "@/components/player/SearchToolbar.vue";
import LyricsPlaylistPanel from "@/components/player/LyricsPlaylistPanel.vue";
import { useAuthStore } from "@/store/auth";
import { useHomeStore } from "@/store/home";
import { useLibraryStore } from "@/store/library";
import { usePlayerStore } from "@/store/player";
import { useUiStore } from "@/store/ui";
import { usePlayer } from "@/composables/usePlayer";
import { useLikeToggle } from "@/composables/useLikeToggle";
import type { HomeSongList, MusicTrack } from "@/types/music";

const router = useRouter();
const authStore = useAuthStore();
const homeStore = useHomeStore();
const libraryStore = useLibraryStore();
const playerStore = usePlayerStore();
const uiStore = useUiStore();
const playerControls = usePlayer();
const { toggleLike, isPending } = useLikeToggle();

const username = computed(() => authStore.user?.name ?? "Joyful 用户");

const goToPlayer = (): void => {
  void router.push({ name: "player" });
};

const handleSearch = async (payload: { keyword: string; category: string }) => {
  libraryStore.setSongListId(null);
  libraryStore.setKeyword(payload.keyword);
  libraryStore.setType(payload.category as any);
  void libraryStore.loadFirstPage({ keyword: payload.keyword, type: payload.category as any, pageNum: 1 });
  await goToPlayer();
};

const handleRandomize = async () => {
  libraryStore.setSongListId(null);
  void libraryStore.loadFirstPage();
  await goToPlayer();
};

onMounted(() => {
  void homeStore.fetchHome();
});

const isLoading = computed(() => homeStore.loading);
const homeError = computed(() => homeStore.error);
const todayList = computed(() => homeStore.data?.todaySongList ?? null);
const optionList = computed(() => homeStore.data?.optionSongList ?? null);
const historyList = computed(() => homeStore.data?.historySongList ?? null);
const downloadList = computed(() => homeStore.data?.downloadSongList ?? null);
const songLists = computed(() => homeStore.data?.songList ?? []);
const recommendSongs = computed(() => homeStore.data?.recommendSongs ?? []);

const handleOpenList = async (list?: HomeSongList | MusicTrack | null) => {
  if (!list?.id) return;
  libraryStore.setKeyword("");
  libraryStore.setType("RECOMMEND" as any);
  libraryStore.setSongListId(list.id);
  await goToPlayer();
};

const handlePlayRecommend = async (track: MusicTrack) => {
  if (!track?.id) return;
  // 将推荐歌曲设为当前播放队列并播放选中项
  playerStore.setQueue(recommendSongs.value);
  await playerStore.playTrack(track.id);
  await playerControls.play();
};

</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-white">
    <header class="flex flex-col gap-4 px-4 py-6 lg:px-12">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6 lg:justify-between">
        <div class="flex-1 min-w-0">
          <p class="text-xs uppercase tracking-[0.4em] text-slate-500 dark:text-white/60">Joyful Dawn</p>
          <h1 class="mt-2 text-3xl font-semibold">Hi {{ username }}，今日为你推荐</h1>
          <p class="mt-1 text-sm text-slate-500 dark:text-white/70">基于最近的播放历史与收藏，挑选更贴近心情的歌单。</p>
        </div>
        <div class="order-3 w-full lg:order-2 lg:max-w-[520px]">
          <SearchToolbar
            category="ALL"
            keyword=""
            :loading="false"
            @search="handleSearch"
            @randomize="handleRandomize"
          />
        </div>
        <div class="order-2 flex flex-none items-center justify-end gap-3 lg:order-3">
          <ThemeToggle />
          <UserAvatarButton />
        </div>
      </div>
    </header>

    <div class="flex flex-1 min-h-0 flex-col">
      <main class="flex flex-1 min-h-0 flex-col gap-8 overflow-hidden px-4  lg:flex-row lg:gap-10 lg:px-12">
        <section class="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div class="flex-1 min-h-0 overflow-y-auto">
            <div class="flex flex-wrap items-center gap-3 mb-4 text-sm text-slate-500 dark:text-white/70">
              <span v-if="isLoading">加载首页数据中…</span>
              <span v-else-if="homeError" class="text-rose-500">{{ homeError }}</span>
              <span v-else>已为你准备新鲜歌单与推荐</span>
            </div>
            <div class="flex flex-col gap-12">
              <section>
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <h2 class="text-xl font-semibold">今日主打</h2>
                  <button class="text-sm text-slate-500 underline-offset-4 hover:underline dark:text-white/70" type="button" @click="goToPlayer">查看播放页</button>
                </div>
                <div class="mt-5 grid auto-rows-auto grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 sm:gap-4">
                  <button
                    v-for="item in [todayList, optionList, historyList, downloadList]"
                    :key="item?.id ?? 'placeholder'"
                    class="flex w-full flex-col text-left transition hover:text-brand"
                    type="button"
                    :disabled="!item"
                    @click="handleOpenList(item)"
                  >
                  <div class="aspect-[16/9] w-full overflow-hidden rounded-lg bg-white/60 dark:bg-white/5">
                    <img
                      v-if="item?.image"
                      :src="item.image"
                      :alt="item?.name ?? '歌单'"
                      class="h-full w-full object-cover"
                    />
                      <div v-else class="flex h-full w-full items-center justify-center text-sm text-slate-400 dark:text-white/40">暂无封面</div>
                    </div>
                    <p class="mt-3 text-base font-semibold leading-tight">{{ item?.name ?? (isLoading ? '加载中…' : '暂无数据') }}</p>
                    <p class="text-sm text-slate-500 dark:text-white/70 line-clamp-2">{{ item?.desc ?? '官方推荐' }}</p>
                  </button>
                </div>
              </section>

              <section>
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <h2 class="text-xl font-semibold">歌单宝库</h2>
                  <span class="text-xs text-emerald-600 dark:text-emerald-300">后端实时推荐</span>
                </div>
                <div class="mt-5 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-6 gap-y-5 justify-items-start">
                  <button
                    v-for="item in songLists"
                    :key="item.id"
                    class="flex w-full max-w-[240px] flex-col text-left transition hover:text-brand"
                    type="button"
                    @click="handleOpenList(item)"
                  >
                    <img :src="item.image" :alt="item.name" class="aspect-square w-full rounded-xl object-cover" />
                    <p class="mt-3 text-base font-semibold leading-tight">{{ item.name }}</p>
                    <p class="text-sm text-slate-500 dark:text-white/70 line-clamp-2">{{ item.desc || '精选歌单' }}</p>
                  </button>
                  <p v-if="!isLoading && !songLists.length" class="text-sm text-slate-400 dark:text-white/50">暂无歌单数据</p>
                </div>
              </section>

              <section class="pb-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <h2 class="text-xl font-semibold">推荐歌曲</h2>
                  <span class="text-xs text-slate-500 dark:text-white/60">为你量身推荐</span>
                </div>
                <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div
                    v-for="item in recommendSongs"
                    :key="item.id"
                    class="flex w-full items-center gap-3 rounded-md px-2 py-2 transition hover:bg-white/50 dark:hover:bg-white/5"
                  >
                    <button
                      class="flex min-w-0 flex-1 items-center gap-3 text-left transition hover:text-brand"
                      type="button"
                      @click="handlePlayRecommend(item)"
                    >
                      <img :src="item.pic" :alt="item.name" class="h-14 w-14 flex-none rounded-md object-cover" />
                      <div class="min-w-0">
                        <p class="truncate text-base font-semibold">{{ item.name }}</p>
                        <p class="truncate text-sm text-slate-500 dark:text-white/70">{{ item.artist || '未知歌手' }}</p>
                        <p v-if="item.album" class="truncate text-xs text-slate-400 dark:text-white/50">{{ item.album }}</p>
                      </div>
                    </button>
                    <button
                      class="ml-auto flex h-9 w-9 flex-none items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      :class="Number(item.isLike) === 1 ? 'text-rose-500 hover:text-rose-500' : 'text-slate-500 hover:text-brand dark:text-white/70'"
                      :disabled="isPending(item.id)"
                      aria-label="收藏"
                      @click.stop="toggleLike(item)"
                    >
                      <span aria-hidden="true">❤</span>
                    </button>
                  </div>
                  <p v-if="!isLoading && !recommendSongs.length" class="text-sm text-slate-400 dark:text-white/50">暂无推荐歌曲</p>
                </div>
              </section>
            </div>
          </div>
        </section>

        <LyricsPlaylistPanel />
      </main>
    </div>

    <PlaybackControls />
  </div>
</template>
