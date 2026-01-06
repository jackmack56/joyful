<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";

const router = useRouter();
const authStore = useAuthStore();

const user = computed(() => authStore.user);
const isAuthenticated = computed(() => authStore.isAuthenticated);

const fallbackLetter = computed(() => {
  const source = user.value?.name?.trim() || user.value?.email?.trim() || "";
  if (!source) return "?";
  const segment = Array.from(source)[0];
  return segment.toUpperCase();
});

const avatarStyle = computed(() => {
  const source = user.value?.name || user.value?.email || "joyful";
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    background: `linear-gradient(135deg, hsl(${hue}, 70%, 55%), hsl(${(hue + 40) % 360}, 75%, 60%))`,
  };
});

const handleClick = (): void => {
  if (isAuthenticated.value) {
    void router.push({ name: "profile" });
  } else {
    void router.push({ name: "auth" });
  }
};
</script>

<template>
  <button
    class="group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/40 bg-white/80 text-sm font-semibold text-slate-900 shadow-lg ring-1 ring-white/30 transition hover:-translate-y-0.5 hover:border-white/70 dark:border-white/10 dark:bg-white/10 dark:text-white"
    type="button"
    :aria-label="isAuthenticated ? '查看个人资料' : '登录查看个人资料'"
    @click="handleClick"
  >
    <template v-if="isAuthenticated && user">
      <img
        v-if="user.avatarUrl"
        :src="user.avatarUrl"
        alt="用户头像"
        class="h-full w-full object-cover"
        referrerpolicy="no-referrer"
      />
      <span
        v-else
        class="inline-flex h-full w-full items-center justify-center text-base text-white"
        :style="avatarStyle"
      >
        {{ fallbackLetter }}
      </span>
      <span class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900"></span>
    </template>
    <template v-else>
      <span class="inline-flex h-full w-full items-center justify-center text-base text-white" :style="avatarStyle">
        ?
      </span>
    </template>
  </button>
</template>
