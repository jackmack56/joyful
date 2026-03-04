<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import ThemeToggle from "@/components/ui/ThemeToggle.vue";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/ui";
import { storage } from "@/utils/storage";

type SidebarIcon = "home" | "player" | "ai" | "playlist";

type SidebarNavItem = {
  label: string;
  icon: SidebarIcon;
  to: { name: "home" | "player" };
};

type SidebarPlaylistItem = {
  id: string;
  name: string;
  count: number;
};

const MOBILE_UA_REGEX =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;
const SIDEBAR_COLLAPSED_STORAGE_KEY = "joyful.sidebar.collapsed.v1";
const SIDEBAR_WIDTH_EXPANDED = "16rem";
const SIDEBAR_WIDTH_COLLAPSED = "5.5rem";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const uiStore = useUiStore();

const isLoggingOut = ref(false);
const sidebarCollapsed = ref(storage.get<boolean>(SIDEBAR_COLLAPSED_STORAGE_KEY, false));
const initialMobileViewport =
  typeof window !== "undefined"
    ? window.matchMedia("(max-width: 1023px)").matches ||
      (typeof navigator !== "undefined" && MOBILE_UA_REGEX.test(navigator.userAgent))
    : false;
const mobileSidebarOpen = ref(false);
const isMobileViewport = ref(initialMobileViewport);

let resizeListener: (() => void) | null = null;

const navItems: SidebarNavItem[] = [
  { label: "首页", icon: "home", to: { name: "home" } },
  { label: "播放器", icon: "player", to: { name: "player" } },
  { label: "AI 音乐", icon: "ai", to: { name: "player" } },
];

// 当前歌单先使用静态数据，后续可直接替换为接口返回值。
const playlistItems: SidebarPlaylistItem[] = [
  { id: "liked", name: "我喜欢的音乐", count: 356 },
  { id: "recent", name: "最近播放", count: 500 },
  { id: "daily", name: "日语 2", count: 31 },
  { id: "work", name: "久违的中文", count: 18 },
  { id: "focus", name: "轻音乐", count: 44 },
  { id: "story", name: "MY FIRST STORY", count: 12 },
];

const username = computed(() => authStore.user?.name ?? "Joyful 用户");
const avatarUrl = computed(() => authStore.user?.avatarUrl ?? "");

const fallbackLetter = computed(() => {
  const source = authStore.user?.name?.trim() || authStore.user?.email?.trim() || "J";
  return Array.from(source)[0]?.toUpperCase() ?? "J";
});

const avatarStyle = computed(() => {
  const source = authStore.user?.name || authStore.user?.email || "joyful";
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    background: `linear-gradient(135deg, hsl(${hue}, 70%, 55%), hsl(${(hue + 40) % 360}, 75%, 60%))`,
  };
});

const iconPathMap: Record<SidebarIcon, string> = {
  home: "M3 10.8 12 3l9 7.8v9.2a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.2z",
  player: "M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm4 4.5v7l6-3.5-6-3.5z",
  ai: "M12 3a3 3 0 0 1 3 3v1.1a5.5 5.5 0 0 1 2.9 2.9H19a3 3 0 1 1 0 6h-1.1a5.5 5.5 0 0 1-2.9 2.9V21a3 3 0 1 1-6 0v-1.1A5.5 5.5 0 0 1 6.1 17H5a3 3 0 1 1 0-6h1.1A5.5 5.5 0 0 1 9 8.1V7a3 3 0 0 1 3-3zm0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  playlist: "M4 6h12v2H4zm0 5h16v2H4zm0 5h10v2H4z",
};

const collapseIconPath = computed(() => {
  if (isMobileViewport.value) {
    return "m15 5-7 7 7 7";
  }
  return sidebarCollapsed.value ? "m9 5 7 7-7 7" : "m15 5-7 7 7 7";
});

const sidebarCollapsedInView = computed(() => !isMobileViewport.value && sidebarCollapsed.value);

const sidebarToggleLabel = computed(() => {
  if (isMobileViewport.value) return "关闭侧边栏";
  return sidebarCollapsed.value ? "展开侧边栏" : "收起侧边栏";
});

const themeIconPath = computed(() =>
  uiStore.resolvedTheme === "dark"
    ? "M12 4V2m0 20v-2m8-8h2M2 12h2m12.95 6.95 1.4 1.4M4.65 4.65l1.4 1.4m10.9-1.4-1.4 1.4M6.05 17.95l-1.4 1.4M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"
    : "M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"
);

const themeButtonTitle = computed(() =>
  uiStore.resolvedTheme === "dark" ? "切换到亮色" : "切换到暗色"
);

const isActive = (item: SidebarNavItem): boolean => route.name === item.to.name;

const applySidebarWidth = (collapsed: boolean): void => {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty(
    "--app-sidebar-width",
    isMobileViewport.value ? "0rem" : collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED
  );
};

applySidebarWidth(sidebarCollapsed.value);

watch(
  sidebarCollapsed,
  (collapsed) => {
    storage.set(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed);
    applySidebarWidth(collapsed);
  },
  { immediate: false }
);

watch(
  isMobileViewport,
  () => {
    applySidebarWidth(sidebarCollapsed.value);
  },
  { immediate: false }
);

const toggleSidebar = (): void => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

const isMobileDevice = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return MOBILE_UA_REGEX.test(navigator.userAgent);
};

const detectMobileViewport = (): boolean => {
  if (typeof window === "undefined") return isMobileViewport.value;
  return window.matchMedia("(max-width: 1023px)").matches || isMobileDevice();
};

const toggleMobileSidebar = (): void => {
  if (!isMobileViewport.value) return;
  mobileSidebarOpen.value = !mobileSidebarOpen.value;
};

const closeMobileSidebar = (): void => {
  mobileSidebarOpen.value = false;
};

const handleSidebarToggle = (): void => {
  if (isMobileViewport.value) {
    closeMobileSidebar();
    return;
  }
  toggleSidebar();
};

const syncMobileViewport = (): void => {
  const mobile = detectMobileViewport();
  isMobileViewport.value = mobile;
  if (!isMobileViewport.value) {
    mobileSidebarOpen.value = false;
  }
};

onMounted(() => {
  syncMobileViewport();
  if (isMobileViewport.value) {
    mobileSidebarOpen.value = false;
  }
  if (typeof window === "undefined") return;
  resizeListener = () => {
    syncMobileViewport();
  };
  window.addEventListener("resize", resizeListener);
});

onBeforeUnmount(() => {
  if (typeof window === "undefined" || !resizeListener) return;
  window.removeEventListener("resize", resizeListener);
});

watch(
  () => route.fullPath,
  () => {
    closeMobileSidebar();
  }
);

const toggleThemeQuick = (): void => {
  if (uiStore.themePreference === "light") {
    uiStore.setThemePreference("dark");
    return;
  }
  if (uiStore.themePreference === "dark") {
    uiStore.setThemePreference("light");
    return;
  }
  uiStore.setThemePreference(uiStore.resolvedTheme === "dark" ? "light" : "dark");
};

const handleLogout = async (): Promise<void> => {
  if (isLoggingOut.value) return;
  isLoggingOut.value = true;
  try {
    await authStore.logout();
  } finally {
    isLoggingOut.value = false;
  }
  await router.replace({ name: "auth" });
};
</script>

<template>
  <button
    v-if="isMobileViewport"
    class="fixed left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 inline-flex h-9 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white/92 px-3 text-slate-600 shadow-sm backdrop-blur transition hover:border-brand hover:text-brand dark:border-white/20 dark:bg-slate-950/88 dark:text-white/75"
    :aria-label="mobileSidebarOpen ? '收起侧边栏' : '展开侧边栏'"
    type="button"
    @click="toggleMobileSidebar"
  >
    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
      <path
        :d="mobileSidebarOpen ? 'M6 6l12 12M18 6 6 18' : 'M4 7h16M4 12h16M4 17h16'"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <span v-if="!mobileSidebarOpen" class="text-xs font-medium">展开</span>
  </button>
  <button
    v-if="isMobileViewport && mobileSidebarOpen"
    class="fixed inset-0 z-30 bg-slate-900/35"
    aria-label="关闭侧边栏遮罩"
    type="button"
    @click="closeMobileSidebar"
  />
  <aside
    class="fixed left-0 top-0 z-40 flex h-[100dvh] w-64 flex-col bg-white/88 text-slate-800 shadow-[8px_0_28px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-transform duration-200 dark:bg-slate-950/88 dark:text-slate-100 dark:shadow-[8px_0_28px_rgba(0,0,0,0.35)] lg:w-[var(--app-sidebar-width)]"
    :class="
      isMobileViewport
        ? mobileSidebarOpen
          ? 'translate-x-0 pointer-events-auto'
          : '-translate-x-full pointer-events-none'
        : 'translate-x-0 pointer-events-auto'
    "
  >
    <div class="flex h-full min-h-0 flex-col justify-between">
      <div class="flex min-h-0 flex-1 flex-col py-4" :class="sidebarCollapsedInView ? 'px-2' : 'px-4'">
        <RouterLink
          :to="{ name: 'profile' }"
          class="flex items-center rounded-xl transition hover:bg-slate-100/80 dark:hover:bg-white/5"
          :class="sidebarCollapsedInView ? 'justify-center p-2' : 'gap-3 p-3'"
        >
          <div class="h-11 w-11 overflow-hidden rounded-full ring-1 ring-slate-200 dark:ring-white/20">
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              alt="用户头像"
              class="h-full w-full object-cover"
              referrerpolicy="no-referrer"
            />
            <span
              v-else
              class="inline-flex h-full w-full items-center justify-center text-sm font-semibold text-white"
              :style="avatarStyle"
            >
              {{ fallbackLetter }}
            </span>
          </div>
          <div v-if="!sidebarCollapsedInView" class="min-w-0">
            <p class="truncate text-sm font-semibold">{{ username }}</p>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-white/60">查看个人资料</p>
          </div>
        </RouterLink>

        <nav class="mt-4 space-y-2 border-b border-slate-200 pb-4 dark:border-white/10">
          <RouterLink
            v-for="item in navItems"
            :key="item.label"
            :to="item.to"
            class="flex items-center rounded-lg py-2 text-sm transition"
            :class="[
              sidebarCollapsedInView ? 'justify-center px-2' : 'justify-between px-3',
              isActive(item)
                ? 'bg-brand text-white shadow-glow'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white',
            ]"
            :title="sidebarCollapsedInView ? item.label : undefined"
          >
            <span class="flex items-center" :class="sidebarCollapsedInView ? '' : 'gap-2.5'">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path :d="iconPathMap[item.icon]" />
              </svg>
              <span v-if="!sidebarCollapsedInView">{{ item.label }}</span>
            </span>
          </RouterLink>
        </nav>

        <div class="mt-4 flex min-h-0 flex-1 flex-col">
          <p
            v-if="!sidebarCollapsedInView"
            class="px-1 text-xs uppercase tracking-[0.25em] text-slate-400 dark:text-white/45"
          >
            我的歌单
          </p>
          <div class="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto" :class="sidebarCollapsedInView ? '' : 'pr-1'">
            <button
              v-for="item in playlistItems"
              :key="item.id"
              type="button"
              class="flex w-full items-center rounded-lg py-2 text-left text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-white"
              :class="sidebarCollapsedInView ? 'justify-center px-2' : 'justify-between px-3'"
              :title="sidebarCollapsedInView ? item.name : undefined"
            >
              <span class="flex items-center" :class="sidebarCollapsedInView ? '' : 'min-w-0 gap-2'">
                <svg class="h-4 w-4 flex-none text-slate-400 dark:text-white/45" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path :d="iconPathMap.playlist" />
                </svg>
                <span v-if="!sidebarCollapsedInView" class="truncate">{{ item.name }}</span>
              </span>
              <span v-if="!sidebarCollapsedInView" class="ml-2 text-xs text-slate-400 dark:text-white/50">{{ item.count }}</span>
            </button>
          </div>
        </div>
      </div>

      <div
        class="mt-auto flex h-[var(--playback-bar-height)] shrink-0 flex-col justify-center gap-2"
        :class="sidebarCollapsedInView ? 'items-center px-2' : 'items-stretch px-4'"
      >
        <template v-if="sidebarCollapsedInView">
          <div class="flex items-center justify-center gap-1.5">
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-brand hover:text-brand dark:border-white/20 dark:text-white/70"
              :title="themeButtonTitle"
              type="button"
              @click="toggleThemeQuick"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24">
                <path :d="themeIconPath" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-brand hover:text-brand dark:border-white/20 dark:text-white/70"
              :aria-label="sidebarToggleLabel"
              type="button"
              @click="handleSidebarToggle"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path :d="collapseIconPath" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
        </template>
        <template v-else>
          <div class="flex items-center justify-center gap-2">
            <ThemeToggle />
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-brand hover:text-brand dark:border-white/20 dark:text-white/70"
              :aria-label="sidebarToggleLabel"
              type="button"
              @click="handleSidebarToggle"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path :d="collapseIconPath" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
        </template>

        <button
          class="rounded-full border border-slate-300 text-slate-600 transition hover:border-rose-400 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:text-white/70 dark:hover:border-rose-400 dark:hover:text-rose-300"
          :class="
            sidebarCollapsedInView
              ? 'flex h-9 w-9 items-center justify-center'
              : 'flex w-full items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold'
          "
          :aria-label="isLoggingOut ? '退出中' : '退出登录'"
          :disabled="isLoggingOut"
          type="button"
          @click="handleLogout"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M10 17l5-5-5-5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M15 12H4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span v-if="!sidebarCollapsedInView">{{ isLoggingOut ? "退出中..." : "退出登录" }}</span>
        </button>
      </div>
    </div>
  </aside>
</template>
