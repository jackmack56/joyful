<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { MusicTrack } from "@/types/music";
import { usePlayerStore } from "@/store/player";
import { useLikeToggle } from "@/composables/useLikeToggle";

const props = defineProps<{
  tracks: MusicTrack[];
  currentTrackId: string | null;
  loading: boolean;
  total?: number;
  error?: string | null;
}>();

const emit = defineEmits<{
  (event: "select", track: MusicTrack): void;
  (event: "retry"): void;
  (event: "add-selected", tracks: MusicTrack[]): void;
  (event: "play-all"): void;
}>();

const playTrack = (track: MusicTrack) => emit("select", track);
const playerStore = usePlayerStore();
const { toggleLike, isPending } = useLikeToggle();
const selectedIds = ref<string[]>([]);

const toggleSelection = (id: string, checked: boolean) => {
  if (checked) {
    if (!selectedIds.value.includes(id)) {
      selectedIds.value = [...selectedIds.value, id];
    }
  } else {
    selectedIds.value = selectedIds.value.filter((item) => item !== id);
  }
};

const isSelected = (id: string): boolean => selectedIds.value.includes(id);

const handleAddToQueue = (track: MusicTrack) => {
  playerStore.addToQueue(track);
};

const allSelected = computed(() => props.tracks.length > 0 && selectedIds.value.length === props.tracks.length);
const isIndeterminate = computed(() => selectedIds.value.length > 0 && selectedIds.value.length < props.tracks.length);

const toggleSelectAll = (checked: boolean) => {
  if (checked) {
    selectedIds.value = props.tracks.map((track) => track.id);
  } else {
    selectedIds.value = [];
  }
};

watch(
  () => props.tracks,
  (list) => {
    const ids = new Set(list.map((item) => item.id));
    selectedIds.value = selectedIds.value.filter((id) => ids.has(id));
  }
);

const formatDuration = (seconds?: number | null, fallback = "--:--") => {
  if (typeof seconds !== "number" || Number.isNaN(seconds) || seconds <= 0) {
    return fallback;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
};

const emitSelected = () => {
  const selectedTracks = props.tracks.filter((track) => selectedIds.value.includes(track.id));
  emit("add-selected", selectedTracks);
};

const handlePlayAll = () => {
  emit("play-all");
};
</script>

<template>
  <div class="w-full text-slate-700 dark:text-white/80">
    <div class="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.4em] text-slate-400 dark:text-white/50">
      <div class="flex items-center gap-4">
        <span>音乐列表</span>
        <label class="flex items-center gap-2 text-[11px] tracking-normal text-slate-500 dark:text-white/70">
          <input
            class="h-4 w-4 rounded border-slate-400 text-brand focus:ring-brand"
            type="checkbox"
            :checked="allSelected"
            :indeterminate.prop="isIndeterminate"
            @click.stop
            @change="toggleSelectAll(($event.target as HTMLInputElement).checked)"
          />
          <span>全选</span>
        </label>
      </div>
      <button v-if="error" class="text-rose-500 dark:text-rose-200" type="button" @click="emit('retry')">重新加载</button>
    </div>

    <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <button
        class="rounded-full border border-white/50 px-3 py-1 text-slate-600 transition hover:border-brand hover:text-brand disabled:opacity-60 dark:border-white/20 dark:text-white/70"
        type="button"
        :disabled="!tracks.length"
        @click="handlePlayAll"
      >
        播放全部
      </button>
      <button
        class="rounded-full border border-white/50 px-3 py-1 text-slate-600 transition hover:border-brand hover:text-brand disabled:opacity-60 dark:border-white/20 dark:text-white/70"
        type="button"
        :disabled="!selectedIds.length"
        @click="emitSelected"
      >
        添加选中到播放列表
      </button>
    </div>

    <div v-if="loading && !tracks.length" class="flex items-center justify-center py-10">
      <div class="h-6 w-6 animate-spin rounded-full border border-slate-500 border-t-transparent dark:border-white/60"></div>
    </div>
    <div v-else-if="!tracks.length" class="py-8 text-center text-sm text-slate-400 dark:text-white/60">
      暂无数据，换个关键字试试吧。
    </div>
    <ul class="mt-2 text-sm">
      <li
        v-for="(track, index) in tracks"
        :key="track.id"
        class="flex cursor-pointer items-center gap-3 border-b border-white/40 py-3 text-left transition hover:text-slate-900 dark:border-white/10 dark:hover:text-white lg:grid lg:grid-cols-[80px_minmax(220px,1fr)_160px_160px_100px] lg:items-center"
        :class="track.id === currentTrackId ? 'text-slate-900 dark:text-white' : ''"
        @dblclick="playTrack(track)"
        @click="playTrack(track)"
      >
        <div class="flex flex-none items-center gap-2 lg:gap-3 text-xs text-slate-400 dark:text-white/60">
          <input
            class="h-4 w-4 rounded border-slate-400 text-brand focus:ring-brand"
            type="checkbox"
            :checked="isSelected(track.id)"
            @click.stop
            @change="toggleSelection(track.id, ($event.target as HTMLInputElement).checked)"
          />
          <span class="lg:text-center">{{ String(index + 1).padStart(2, "0") }}</span>
          <img
            :src="track.pic ?? 'https://placehold.co/40x40?text=♪'"
            alt=""
            class="h-12 w-12 flex-shrink-0 rounded-md object-cover lg:hidden"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium lg:text-base">{{ track.name }}</p>
          <p class="truncate text-xs text-slate-400 dark:text-white/60">{{ track.artist ?? "未知歌手" }}</p>
          <p class="hidden lg:block truncate text-xs text-slate-400 dark:text-white/60">{{ track.album ?? "单曲" }}</p>
        </div>
        <span class="hidden lg:block truncate text-sm text-slate-500 dark:text-white/70">{{ track.artist ?? "未知歌手" }}</span>
        <div class="hidden lg:flex items-center gap-3 text-slate-500 dark:text-white/70 lg:justify-end">
          <button
            class="text-lg transition disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            title="喜欢"
            :class="Number(track.isLike) === 1 ? 'text-rose-500 hover:text-rose-500' : 'text-slate-500 hover:text-rose-500'"
            :disabled="isPending(track.id)"
            @click.stop="toggleLike(track)"
          >
            <span aria-hidden="true">❤</span>
          </button>
          <button
            class="flex items-center gap-1 rounded-md border border-white/40 px-2 py-1 text-xs transition hover:border-brand hover:text-brand dark:border-white/20 dark:hover:border-brand"
            type="button"
            title="添加到播放列表"
            @click.stop="handleAddToQueue(track)"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M10 4v12" stroke-linecap="round" />
              <path d="M4 10h12" stroke-linecap="round" />
            </svg>
          </button>
        </div>
        <div class="flex flex-none items-center gap-2 text-lg text-slate-500 dark:text-white/70 lg:hidden">
          <button
            class="transition disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            title="喜欢"
            :class="Number(track.isLike) === 1 ? 'text-rose-500 hover:text-rose-500' : 'text-slate-500 hover:text-rose-500'"
            :disabled="isPending(track.id)"
            @click.stop="toggleLike(track)"
          >
            <span aria-hidden="true">❤</span>
          </button>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-md border border-white/30 text-xs transition hover:border-brand hover:text-brand dark:border-white/20 dark:hover:border-brand"
            type="button"
            title="添加到播放列表"
            @click.stop="handleAddToQueue(track)"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M10 4v12" stroke-linecap="round" />
              <path d="M4 10h12" stroke-linecap="round" />
            </svg>
          </button>
        </div>
        <span class="hidden lg:block text-xs text-slate-400 dark:text-white/60 lg:text-right">
          {{ formatDuration(track.duration, track.remark ?? "--:--") }}
        </span>
      </li>
    </ul>
  </div>
</template>
