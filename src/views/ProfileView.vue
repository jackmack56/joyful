<script setup lang="ts">
import { computed, onMounted, reactive, watch } from "vue";
import ThemeToggle from "@/components/ui/ThemeToggle.vue";
import UserAvatarButton from "@/components/ui/UserAvatarButton.vue";
import PlaybackControls from "@/components/player/PlaybackControls.vue";
import LyricsPlaylistPanel from "@/components/player/LyricsPlaylistPanel.vue";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/ui";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const uiStore = useUiStore();
const router = useRouter();

type BindingKey = "googleId" | "wechatId" | "qqId" | "phone" | "linuxDo";

const form = reactive({
  name: "",
  motto: "",
  language: "",
  avatarUrl: "",
});

const user = computed(() => authStore.user);
const isSaving = computed(() => authStore.loading);
const missingPassword = computed(() => !user.value?.password);

const avatarLetter = computed(() => {
  const source = user.value?.name?.trim() || user.value?.email?.trim() || "";
  if (!source) return "?";
  return Array.from(source)[0]?.toUpperCase() ?? "?";
});

const avatarPreviewStyle = computed(() => {
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

const bindingItems = computed((): Array<{ label: string; key: BindingKey }> => [
  { label: "Google", key: "googleId" },
  { label: "WeChat", key: "wechatId" },
  { label: "QQ", key: "qqId" },
  { label: "手机", key: "phone" },
  { label: "LinuxDo", key: "linuxDo" },
]);

const syncForm = (): void => {
  if (!user.value) return;
  form.name = user.value.name ?? "";
  form.motto = user.value.motto ?? "";
  form.language = user.value.language ?? "";
  form.avatarUrl = user.value.avatarUrl ?? "";
};

watch(user, () => {
  syncForm();
});

onMounted(() => {
  if (!user.value && authStore.isAuthenticated) {
    void authStore.fetchProfile().then(() => {
      syncForm();
    });
  } else {
    syncForm();
  }
});

const handleSubmit = async (): Promise<void> => {
  const payload = {
    name: form.name.trim(),
    motto: form.motto.trim() || null,
    language: form.language.trim() || null,
    avatarUrl: form.avatarUrl.trim() || null,
  };
  await authStore.updateProfile(payload);
};

const handleLogout = async (): Promise<void> => {
  await authStore.logout();
  await router.replace({ name: "auth" });
};
</script>

<template>
<div class="flex h-screen min-h-0 flex-col overflow-hidden bg-slate-50/90 text-slate-900 dark:bg-slate-900 dark:text-white">
  <header class="flex flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:gap-6 lg:px-10">
      <RouterLink class="block w-full lg:w-72" :to="{ name: 'home' }">
        <p class="text-xs uppercase tracking-[0.4em] text-slate-500 transition-colors hover:text-slate-900 dark:text-white/60 dark:hover:text-white">Joyful Dawn</p>
        <h1 class="text-3xl font-semibold text-slate-900 transition-colors hover:text-brand dark:text-white dark:hover:text-brand">账户资料</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-white/70">管理公开昵称、签名与多端登录绑定</p>
      </RouterLink>
      <nav class="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-white/60">
        <RouterLink class="hover:text-slate-900 dark:hover:text-white" :to="{ name: 'player' }">播放器</RouterLink>
        <span>/</span>
        <span class="text-slate-900 dark:text-white">账号资料</span>
      </nav>
      <div class="flex flex-1 items-center justify-end gap-3">
        <ThemeToggle />
        <UserAvatarButton />
      </div>
    </header>

  <main class="flex min-h-0 flex-1 flex-col gap-10 overflow-hidden px-4 lg:flex-row lg:items-stretch lg:gap-16 lg:px-16">
      <section class="flex-1 min-h-0 overflow-y-auto lg:pr-4">
        <div class="mb-8 flex items-center gap-5">
          <div class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xl text-white dark:border-white/20 dark:bg-white/5">
            <img
              v-if="user?.avatarUrl"
              :src="user.avatarUrl"
              alt="当前头像"
              class="h-full w-full object-cover"
              referrerpolicy="no-referrer"
            />
            <span v-else class="h-full w-full text-center leading-[5rem]" :style="avatarPreviewStyle">
              {{ avatarLetter }}
            </span>
          </div>
          <div>
            <p class="text-sm text-slate-500 dark:text-white/70">当前头像</p>
            <p class="text-base font-semibold text-slate-900 dark:text-white">{{ user?.name ?? "未命名" }}</p>
          </div>
        </div>

        <h2 class="text-xl font-semibold">基础信息</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-white/70">这些信息会展示在你的个人资料中</p>

        <div v-if="missingPassword" class="mt-5 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:text-amber-100">
          当前账号尚未设置密码，请尽快前往登录页设置，避免只能依赖第三方账号登录。
        </div>

        <form class="mt-6 space-y-6" @submit.prevent="handleSubmit">
          <div>
            <label class="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-white/60">昵称</label>
            <input
              v-model="form.name"
              class="mt-2 w-full border-b border-slate-300 bg-transparent px-1 pb-2 text-base text-slate-800 outline-none focus:border-slate-900 dark:border-white/30 dark:text-white"
              type="text"
              placeholder="请输入昵称"
              required
            />
          </div>

          <div>
            <label class="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-white/60">个性签名</label>
            <input
              v-model="form.motto"
              class="mt-2 w-full border-b border-slate-300 bg-transparent px-1 pb-2 text-base text-slate-800 outline-none focus:border-slate-900 dark:border-white/30 dark:text-white"
              type="text"
              placeholder="分享一些关于你的描述"
            />
          </div>

          <div>
            <label class="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-white/60">语言偏好</label>
            <input
              v-model="form.language"
              class="mt-2 w-full border-b border-slate-300 bg-transparent px-1 pb-2 text-base text-slate-800 outline-none focus:border-slate-900 dark:border-white/30 dark:text-white"
              type="text"
              placeholder="例如 zh-CN、en-US"
            />
          </div>

          <div class="flex flex-wrap gap-3 pt-2">
            <button
              class="rounded-full border border-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-900 transition hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-slate-900"
              type="submit"
              :disabled="isSaving"
            >
              {{ isSaving ? "保存中..." : "保存修改" }}
            </button>
          </div>
        </form>
      </section>

      <aside class="flex w-full flex-shrink-0 flex-col gap-10 lg:w-96">
        <div>
          <h3 class="text-lg font-semibold">账号信息</h3>
          <ul class="mt-4 space-y-3 text-sm text-slate-600 dark:text-white/70">
            <li class="flex justify-between border-b border-slate-200 pb-2 dark:border-white/10">
              <span>ID</span>
              <span class="font-mono text-slate-900 dark:text-white">{{ user?.id ?? "--" }}</span>
            </li>
            <li class="flex justify-between border-b border-slate-200 pb-2 dark:border-white/10">
              <span>邮箱</span>
              <span>{{ user?.email ?? "--" }}</span>
            </li>
            <li class="flex justify-between border-b border-slate-200 pb-2 dark:border-white/10">
              <span>会员等级</span>
              <span>{{ user?.vipLevel ?? "Free" }}</span>
            </li>
            <li class="flex justify-between border-b border-transparent pb-2">
              <span>最近登录</span>
              <span>{{ user?.lastTime ? new Date(user.lastTime * 1000).toLocaleString() : "--" }}</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 class="text-lg font-semibold">第三方绑定</h3>
          <ul class="mt-4 space-y-3 text-sm">
            <li
              v-for="item in bindingItems"
              :key="item.key"
              class="flex items-center justify-between border-b border-slate-200 pb-2 text-slate-600 dark:border-white/10 dark:text-white/70"
            >
              <span>{{ item.label }}</span>
              <button
                class="text-xs font-semibold underline-offset-4 hover:underline"
                :class="user?.[item.key] ? 'text-emerald-600 dark:text-emerald-200' : 'text-slate-400 dark:text-white/40'"
                type="button"
              >
                {{ user?.[item.key] ? "管理绑定" : "去绑定" }}
              </button>
            </li>
          </ul>
        </div>

        <div class="border-t border-slate-200 pt-6 dark:border-white/10">
          <button
            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:border-rose-500 hover:bg-rose-50 dark:border-rose-300/40 dark:text-rose-200 dark:hover:bg-rose-300/10"
            type="button"
            @click="handleLogout"
          >
            退出登录
          </button>
        </div>
      </aside>
      <LyricsPlaylistPanel />
    </main>

    <PlaybackControls />
  </div>
</template>
