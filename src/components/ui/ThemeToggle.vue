<script setup lang="ts">
import { computed } from "vue";
import { useUiStore } from "@/store/ui";

type Option = {
  label: string;
  value: "light" | "dark" | "system";
};

const options: Option[] = [
  { label: "亮", value: "light" },
  { label: "暗", value: "dark" },
  { label: "跟随", value: "system" },
];

const uiStore = useUiStore();
const active = computed(() => uiStore.themePreference);

const setTheme = (value: Option["value"]) => {
  uiStore.setThemePreference(value);
};
</script>

<template>
  <div class="flex items-center gap-1 rounded-full border border-white/60 bg-white/70 p-0.5 shadow-sm dark:border-white/20 dark:bg-white/10">
    <button
      v-for="option in options"
      :key="option.value"
      class="rounded-full px-3 py-1 text-xs font-medium transition-all"
      :class="
        active === option.value
          ? 'bg-brand text-white shadow'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
      "
      type="button"
      @click="setTheme(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
