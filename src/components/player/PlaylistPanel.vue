<script setup lang="ts">
import { computed } from "vue";
import type { MusicTrack } from "@/types/music";
import { useLikeToggle } from "@/composables/useLikeToggle";

const props = defineProps<{
  tracks: MusicTrack[];
  currentTrackId: string | null;
}>();

const emit = defineEmits<{
  (event: "select", track: MusicTrack): void;
  (event: "remove", trackId: string): void;
  (event: "clear"): void;
}>();

const { toggleLike, isPending } = useLikeToggle();

const currentTrack = computed<MusicTrack | null>(() => {
  return props.tracks.find((track) => track.id === props.currentTrackId) ?? null;
});

const handleToggleLike = (track?: MusicTrack | null): void => {
  toggleLike(track ?? currentTrack.value);
};
</script>

<template>
  <div class="flex flex-1 min-h-0 flex-col gap-4 text-slate-700 dark:text-white/80">
    <div class="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-white/40">
      <span>播放列表 · {{ tracks.length }}</span>
      <div class="flex items-center gap-3 text-[11px] normal-case tracking-normal">
        <button
          class="flex items-center gap-1 text-slate-500 transition hover:text-brand disabled:cursor-not-allowed disabled:opacity-60 dark:text-white/60 dark:hover:text-brand"
          type="button"
          :class="Number(currentTrack?.isLike) === 1 ? 'text-rose-500 hover:text-rose-500' : 'text-slate-500 hover:text-brand dark:text-white/60 dark:hover:text-brand'"
          :disabled="!currentTrack || isPending(currentTrack.id)"
          @click="handleToggleLike()"
        >
          <span aria-hidden="true">❤</span>
          <span>喜欢</span>
        </button>
        <button class="flex items-center gap-1 text-slate-500 transition hover:text-brand dark:text-white/60 dark:hover:text-brand" type="button">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.3" viewBox="0 0 24 24">
            <path d="M4 4h16v14H4z" />
            <path d="M9 20h6" stroke-linecap="round" />
          </svg>
          <span>收藏</span>
        </button>
        <button
          class="flex items-center gap-1 text-slate-500 transition hover:text-rose-500 dark:text-white/60 dark:hover:text-rose-400"
          type="button"
          @click="emit('clear')"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24">
            <path d="M4 6h16" stroke-linecap="round" />
            <path d="M6 6v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
            <path d="M10 11v6M14 11v6" stroke-linecap="round" />
          </svg>
          <span>清空</span>
        </button>
      </div>
    </div>
    <div v-if="!tracks.length" class="flex flex-1 min-h-0 items-center justify-center text-sm text-slate-400 dark:text-white/50">
      播放列表为空，选择歌曲开始播放
    </div>
    <div
      v-else
      class="mt-2 flex-1 min-h-0 overflow-y-auto pr-1 mobile-scroll desktop-scroll"
    >
      <ul class="divide-y divide-white/15 dark:divide-white/10">
        <li
          v-for="(track, index) in tracks"
          :key="track.id"
          class="flex items-center gap-2 px-2 py-3 text-sm transition"
          :class="track.id === currentTrackId ? 'text-brand dark:text-brand/90' : 'text-slate-700 dark:text-white/70'"
        >
          <button class="flex flex-1 items-center gap-3 text-left min-w-0" type="button" @click="emit('select', track)">
            <span class="text-[11px] text-slate-400 dark:text-white/40">#{{ track.order ?? index + 1 }}</span>
            <img
              :src="track.pic ?? 'https://placehold.co/48x48?text=♪'"
              alt=""
              class="h-12 w-12 flex-shrink-0 rounded-xl object-cover"
            />
            <div class="min-w-0 flex-1 space-y-0.5 pr-4">
              <p class="truncate font-semibold">
                {{ track.name }}
              </p>
              <p class="truncate text-xs text-slate-500 dark:text-white/60">
                {{ track.artist ?? "未知歌手" }}
              </p>
            </div>
          </button>
        <div class="flex items-center gap-2 text-slate-500 dark:text-white/60">
          <button
            class="transition disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :class="Number(track.isLike) === 1 ? 'text-rose-500 hover:text-rose-500' : 'text-slate-500 hover:text-brand'"
            :disabled="isPending(track.id)"
            @click.stop="handleToggleLike(track)"
          >
            <span aria-hidden="true">❤</span>
          </button>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:text-rose-500 dark:text-white/60 dark:hover:text-rose-400"
            type="button"
            @click.stop="emit('remove', track.id)"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24">
                <path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7" />
                <path d="M10 11v6M14 11v6" stroke-linecap="round" />
                <path d="M4 7h16M10 4h4l1 3H9l1-3z" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
