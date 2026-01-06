<script setup lang="ts">
import { RouterView } from "vue-router";
import { useTheme } from "@/composables/useTheme";
import NotificationContainer from "@/components/ui/NotificationContainer.vue";

useTheme();
</script>

<template>
  <div
    class="min-h-screen bg-surface text-slate-900 transition-colors duration-300 dark:bg-surface-dark dark:text-slate-100"
    data-tauri-drag-region
  >
    <RouterView />
    <NotificationContainer />
  </div>
</template>
