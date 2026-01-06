<script setup lang="ts">
import type { MusicTrack } from "@/types/music";

defineProps<{
  tracks: MusicTrack[];
  currentTrackId: string | null;
}>();

const emit = defineEmits<{
  (event: "select", track: MusicTrack): void;
  (event: "remove", trackId: string): void;
}>();
</script>

<template>
  <div class="flex h-full flex-col gap-3">
    <div class="flex items-center justify-between text-xs text-slate-500 dark:text-white/60">
      <span>共 {{ tracks.length }} 首</span>
      <div class="flex items-center gap-2">
        <button class="rounded-full border border-white/30 px-3 py-1 text-[11px] text-slate-500 dark:text-white/60" type="button">
          ❤️
        </button>
        <button class="rounded-full border border-white/30 px-3 py-1 text-[11px] text-slate-500 dark:text-white/60" type="button">
          收藏
        </button>
      </div>
    </div>
    <div
      v-if="!tracks.length"
      class="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-white/30 p-6 text-sm text-slate-400 dark:text-white/50"
    >
      播放列表为空，选择歌曲开始播放
    </div>
    <ul
      v-else
      class="flex-1 divide-y divide-white/10 overflow-y-auto rounded-2xl border border-white/20 bg-white/5 backdrop-blur dark:bg-white/5"
    >
      <li
        v-for="(track, index) in tracks"
        :key="track.id"
        class="flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-white/10"
        :class="track.id === currentTrackId ? 'bg-white/10 text-white shadow-glow' : 'text-white/70'"
        @click="emit('select', track)"
      >
        <span class="text-[11px] text-white/40">#{{ track.order ?? index + 1 }}</span>
        <img
          :src="track.pic ?? 'https://placehold.co/48x48?text=♪'"
          alt=""
          class="h-12 w-12 flex-shrink-0 rounded-md object-cover"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold">
            {{ track.name }}
          </p>
          <p class="truncate text-xs text-white/50">{{ track.artist ?? "未知歌手" }}</p>
        </div>
        <div class="flex items-center gap-1">
          <button
            class="rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase tracking-widest text-white/50"
            type="button"
          >
            ❤
          </button>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
            type="button"
            @click.stop="emit('remove', track.id)"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24">
              <path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7" />
              <path d="M10 11v6M14 11v6" stroke-linecap="round" />
              <path d="M4 7h16M10 4h4l1 3H9l1-3z" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
