<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { LyricLine } from "@/types/player";

const props = withDefaults(defineProps<{
  lyrics: LyricLine[];
  activeIndex: number;
  loading: boolean;
  fullHeight?: boolean;
  size?: "normal" | "large";
  seekable?: boolean;
}>(), {
  fullHeight: false,
  size: "normal",
  seekable: false,
});

const emit = defineEmits<{
  (event: "seek", payload: { time: number; index: number }): void;
}>();

const activeLineClass = computed(() =>
  props.size === "large"
    ? "text-[30px] leading-[1.5] font-semibold text-emerald-600 drop-shadow dark:text-emerald-300"
    : "text-2xl font-semibold text-emerald-600 drop-shadow dark:text-emerald-300"
);

const idleLineClass = computed(() =>
  props.size === "large" ? "text-base leading-7 text-slate-500 dark:text-white/50" : "text-slate-500 dark:text-white/50"
);

const handleSeek = (line: LyricLine, index: number): void => {
  if (!props.seekable) return;
  emit("seek", { time: line.time, index });
};

const containerRef = ref<HTMLElement | null>(null);

watch(
  () => props.activeIndex,
  async (index) => {
    if (index < 0) return;
    await nextTick();
    const container = containerRef.value;
    const el = container?.querySelector<HTMLElement>(`[data-index='${index}']`);
    if (!container || !el) return;
    const relativeTop = el.offsetTop - container.offsetTop;
    const targetTop = relativeTop - container.clientHeight / 2 + el.clientHeight / 2;
    container.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
  }
);
</script>

<template>
  <div class="flex w-full flex-col text-slate-700 dark:text-white/70" :class="props.fullHeight ? 'h-full' : 'mt-6'">
    <div class="text-xs uppercase tracking-[0.4em] text-slate-400 dark:text-white/40">歌词</div>
    <div class="mt-3 flex-1 min-h-0 w-full text-center text-sm leading-relaxed">
      <div ref="containerRef" class="overflow-y-auto pr-1" :class="props.fullHeight ? 'h-full max-h-none' : 'lyric-scroll'">
        <div v-if="loading" class="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-white/60">
          <span class="h-3 w-3 animate-spin rounded-full border border-slate-400 border-t-transparent dark:border-white/60"></span>
          加载歌词…
        </div>
        <div v-else-if="!lyrics.length" class="py-6 text-xs text-slate-400 dark:text-white/50">暂无歌词，稍后再试。</div>
        <ul v-else class="space-y-3">
          <li
            v-for="(line, idx) in lyrics"
            :key="line.time + line.text"
            :data-index="idx"
            class="transition"
            :class="idx === activeIndex ? activeLineClass : idleLineClass"
            :style="props.seekable ? 'cursor: pointer;' : undefined"
            :tabindex="props.seekable ? 0 : -1"
            :role="props.seekable ? 'button' : undefined"
            @click="handleSeek(line, idx)"
            @keydown.enter.prevent="handleSeek(line, idx)"
            @keydown.space.prevent="handleSeek(line, idx)"
          >
            {{ line.text }}
          </li>
        </ul>
      </div>
    </div>
  </div>
  </template>
