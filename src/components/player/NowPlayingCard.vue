<script setup lang="ts">
import type { MusicTrack } from "@/types/music";

defineProps<{
  track: MusicTrack | null;
  isPlaying: boolean;
}>();
</script>

<template>
  <div class="text-slate-800 dark:text-white/80">
    <div class="text-xs uppercase tracking-[0.4em] text-slate-400 dark:text-white/50">当前歌曲</div>
    <div class="mt-4 flex flex-col items-center text-center text-sm leading-relaxed">
      <img
        :src="track?.pic ?? 'https://placehold.co/240x240?text=Cover'"
        alt="封面"
        class="h-48 w-48 rounded-[28px] object-cover shadow-xl"
      />
      <p class="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{{ track?.name ?? "静待播放" }}</p>
      <p class="text-slate-500 dark:text-white/60">歌手：{{ track?.artist ?? "--" }}</p>
      <p class="text-slate-500 dark:text-white/60">专辑：{{ track?.album ?? "--" }}</p>
    </div>
  </div>
</template>
