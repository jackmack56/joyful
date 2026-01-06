<script setup lang="ts">
import { storeToRefs } from "pinia";
import NowPlayingCard from "@/components/player/NowPlayingCard.vue";
import LyricsPanel from "@/components/player/LyricsPanel.vue";
import PlaylistPanel from "@/components/player/PlaylistPanel.vue";
import { useUiStore } from "@/store/ui";
import { usePlayerStore } from "@/store/player";

const uiStore = useUiStore();
const playerStore = usePlayerStore();
const { sidePanelTab } = storeToRefs(uiStore);
const { currentTrack, lyrics, activeLyricIndex, isPlaying, queue } = storeToRefs(playerStore);

const emit = defineEmits<{
  (event: "close"): void;
}>();

const showLyrics = () => uiStore.setSidePanelTab("lyrics");
const showPlaylist = () => uiStore.setSidePanelTab("playlist");
</script>

<template>
  <aside class="flex min-h-0 flex-col rounded-2xl border border-white/30 bg-white/40 p-4 backdrop-blur-lg shadow-lg lg:w-[360px] dark:border-white/10 dark:bg-white/5">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-slate-500 dark:text-white/60">
        <button
          class="rounded-full px-3 py-1 text-[11px] tracking-normal transition"
          :class="sidePanelTab === 'lyrics' ? 'bg-white/80 text-slate-800 shadow dark:bg-white/10 dark:text-white' : 'text-slate-500 hover:text-brand dark:text-white/60'"
          type="button"
          @click="showLyrics"
        >
          歌词
        </button>
        <button
          class="rounded-full px-3 py-1 text-[11px] tracking-normal transition"
          :class="sidePanelTab === 'playlist' ? 'bg-white/80 text-slate-800 shadow dark:bg-white/10 dark:text-white' : 'text-slate-500 hover:text-brand dark:text-white/60'"
          type="button"
          @click="showPlaylist"
        >
          播放列表
        </button>
      </div>
      <button
        class="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-white/50 text-slate-500 transition hover:border-brand hover:text-brand dark:border-white/20 dark:text-white/70 dark:hover:border-brand dark:hover:text-brand"
        type="button"
        aria-label="关闭侧栏"
        @click="emit('close')"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path d="M6 6l12 12M6 18 18 6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <template v-if="sidePanelTab === 'lyrics'">
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
          @remove="playerStore.removeFromQueue"
          @select="(track) => playerStore.playTrack(track.id)"
        />
      </template>
    </div>
  </aside>
</template>
