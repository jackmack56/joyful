<script setup lang="ts">
import { ref, watch } from "vue";
import type { MusicCategory } from "@/types/music";

const props = defineProps<{
  keyword: string;
  category: MusicCategory;
  loading: boolean;
}>();

const emit = defineEmits<{
  (event: "search", payload: { keyword: string; category: MusicCategory }): void;
  (event: "randomize"): void;
}>();

const keyword = ref(props.keyword);

watch(
  () => props.keyword,
  (value) => {
    keyword.value = value;
  }
);

const onSubmit = () => {
  emit("search", {
    keyword: keyword.value.trim(),
    category: props.category,
  });
};
</script>

<template>
  <div class="flex w-full max-w-xl items-center rounded-full border border-white/40 bg-white/80 px-4 py-2 shadow-inner dark:border-white/20 dark:bg-white/10">
    <input
      v-model="keyword"
      type="text"
      class="flex-1 border-none bg-transparent text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-white"
      placeholder="搜索歌曲 / 歌手"
      @keyup.enter="onSubmit"
    />
    <button class="text-xs uppercase tracking-[0.4em] text-slate-500 dark:text-white/60" type="button" :disabled="loading" @click="onSubmit">
      搜索
    </button>
  </div>
</template>
