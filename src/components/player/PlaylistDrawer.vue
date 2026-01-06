<script setup lang="ts">
import type { MusicTrack } from "@/types/music";

defineProps<{
  open: boolean;
  tracks: MusicTrack[];
  currentTrackId: string | null;
}>();

const emit = defineEmits<{
  (event: "close"): void;
  (event: "select", track: MusicTrack): void;
}>();
</script>

<template>
  <teleport to="body">
    <div v-if="open" class="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-2xl" @click.self="emit('close')">
      <div class="absolute bottom-0 left-0 right-0 rounded-t-[40px] border border-white/10 bg-slate-900/95 p-6 text-white shadow-soft">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.4em] text-white/40">Queue</p>
            <h3 class="text-2xl font-semibold">播放列表 · {{ tracks.length }}</h3>
          </div>
          <button class="rounded-full border border-white/20 px-3 py-1 text-xs text-white/70" type="button" @click="emit('close')">
            关闭
          </button>
        </div>
        <ul class="max-h-80 space-y-2 overflow-y-auto pr-2">
          <li
            v-for="track in tracks"
            :key="track.id"
            class="rounded-2xl border border-transparent px-4 py-3 text-sm transition hover:border-white/20 hover:bg-white/5"
            :class="track.id === currentTrackId ? 'border-brand bg-brand/30 text-white shadow-glow' : 'text-white/70'"
            @click="emit('select', track)"
          >
            <p class="font-semibold">{{ track.name }}</p>
            <p class="text-xs text-white/60">{{ track.artist ?? '未知歌手' }}</p>
          </li>
        </ul>
      </div>
    </div>
  </teleport>
</template>
