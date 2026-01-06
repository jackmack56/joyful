<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import type { LyricLine } from "@/types/player";

const props = defineProps<{
  lyrics: LyricLine[];
  activeIndex: number;
  loading: boolean;
}>();

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
  <div class="mt-6 flex flex-col text-slate-700 dark:text-white/70">
    <div class="text-xs uppercase tracking-[0.4em] text-slate-400 dark:text-white/40">歌词</div>
    <div class="mt-3 text-center text-sm leading-relaxed">
      <div ref="containerRef" class="lyric-scroll overflow-y-auto pr-1">
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
            :class="
              idx === activeIndex
                ? 'text-2xl font-semibold text-emerald-600 drop-shadow dark:text-emerald-300'
                : 'text-slate-500 dark:text-white/50'
            "
          >
            {{ line.text }}
          </li>
        </ul>
      </div>
    </div>
  </div>
  </template>
