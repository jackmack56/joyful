<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, watchEffect } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { useNotificationStore } from "@/store/notifications";
import { LOGOUT_REASON_STORAGE_KEY, REMEMBER_CREDENTIALS_KEY } from "@/constants/storage";
import ThemeToggle from "@/components/ui/ThemeToggle.vue";
import UserAvatarButton from "@/components/ui/UserAvatarButton.vue";
import { storage } from "@/utils/storage";

type AuthMode = "login" | "register" | "forgot";

const router = useRouter();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const mode = ref<AuthMode>("login");
const countdown = ref(0);
const inviteCode = ref("");
let timer: number | null = null;

const loginForm = reactive({
  account: "",
  password: "",
});
const rememberMe = ref(false);
const isNativeClient = ref(false);
const particlesCanvas = ref<HTMLCanvasElement | null>(null);
let stopParticles: (() => void) | null = null;

const registerForm = reactive({
  username: "",
  account: "",
  password: "",
  code: "",
});

const forgotForm = reactive({
  account: "",
  password: "",
  code: "",
});

const clientDownloads = [
  {
    label: "Windows",
    href: "#", // TODO: 替换为真实下载链接
    color: "#0078D7",
    icon: "windows",
  },
  {
    label: "macOS",
    href: "#", // TODO: 替换为真实下载链接
    color: "#FF3B30",
    icon: "mac",
  },
  {
    label: "Android",
    href: "#", // TODO: 替换为真实下载链接
    color: "#3DDC84",
    icon: "android",
  },
  {
    label: "iOS",
    href: "#", // TODO: 替换为真实下载链接
    color: "#0A84FF",
    icon: "ios",
  },
];

const baseInputClass =
  "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-white/70";

const isLoading = computed(() => authStore.loading);

const tabs: Array<{ label: string; value: AuthMode }> = [
  { label: "登录", value: "login" },
  { label: "注册", value: "register" },
  { label: "忘记密码", value: "forgot" },
];

const requestCodeType = computed(() => (mode.value === "register" ? 0 : 1));
const requestCodeAccount = computed(() => (mode.value === "register" ? registerForm.account : forgotForm.account));

const clearTimer = () => {
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
};

const showLogoutNotice = () => {
  if (typeof window === "undefined") return;
  const raw = window.sessionStorage.getItem(LOGOUT_REASON_STORAGE_KEY);
  if (!raw) return;
  window.sessionStorage.removeItem(LOGOUT_REASON_STORAGE_KEY);
  let message: string | null = null;
  try {
    const parsed = JSON.parse(raw) as Partial<{ message?: string; code?: number; reason?: string }>;
    message = parsed.message ?? null;
    if (!message && parsed.code === -108) {
      message = "账号已在其他设备登录，请重新登录";
    } else if (!message && parsed.code === -110) {
      message = "登录信息错误，请重新登录";
    }
  } catch {
    message = raw || null;
  }
  if (message) {
    notificationStore.push(message, { type: "warning" });
  }
};

const startCountdown = () => {
  countdown.value = 60;
  clearTimer();
  timer = window.setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) {
      clearTimer();
      countdown.value = 0;
    }
  }, 1000);
};

const initParticles = () => {
  const canvas = particlesCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let frameId = 0;
  let resizeId = 0;
  let width = 0;
  let height = 0;
  const particles: Array<{ x: number; y: number; vx: number; vy: number; r: number; o: number }> = [];
  const maxParticles = 70;

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    if (width === 0 || height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!particles.length) {
      for (let i = 0; i < maxParticles; i += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          r: Math.random() * 1.8 + 0.7,
          o: Math.random() * 0.35 + 0.1,
        });
      }
    } else {
      // 重新散布粒子以适配新尺寸，避免集中在角落
      particles.forEach((p) => {
        p.x = Math.random() * width;
        p.y = Math.random() * height;
      });
    }
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#00E7FF";
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;
      ctx.beginPath();
      ctx.globalAlpha = p.o;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    frameId = window.requestAnimationFrame(draw);
  };

  const handleResize = () => {
    if (resizeId) window.cancelAnimationFrame(resizeId);
    resizeId = window.requestAnimationFrame(resize);
  };

  resize();
  draw();
  window.addEventListener("resize", handleResize);

  stopParticles = () => {
    window.cancelAnimationFrame(frameId);
    window.cancelAnimationFrame(resizeId);
    window.removeEventListener("resize", handleResize);
  };
};

const handleRequestCode = async () => {
  if (!requestCodeAccount.value) {
    authStore.setMessage("请填写邮箱账号");
    return;
  }
  if (countdown.value > 0) return;
  try {
    await authStore.sendVerifyCode({
      account: requestCodeAccount.value,
      channel: 0,
      type: requestCodeType.value,
    });
    startCountdown();
  } catch (error) {
    console.warn(error);
  }
};

const handleSubmit = async () => {
  try {
    if (mode.value === "login") {
      await authStore.login({
        account: loginForm.account,
        password: loginForm.password,
        channel: 0,
        type: 0,
      });
      if (rememberMe.value) {
        storage.set(REMEMBER_CREDENTIALS_KEY, {
          account: loginForm.account,
          password: loginForm.password,
          remember: true,
        });
      } else {
        storage.remove(REMEMBER_CREDENTIALS_KEY);
      }
      if (!authStore.requiresInvite) {
        await router.push({ name: "home" });
      }
      return;
    }

    if (mode.value === "register") {
      await authStore.register({
        username: registerForm.username,
        account: registerForm.account,
        password: registerForm.password,
        code: registerForm.code,
        channel: 0,
      });
      mode.value = "login";
      return;
    }

    await authStore.resetPassword({
      account: forgotForm.account,
      password: forgotForm.password,
      code: forgotForm.code,
      channel: 0,
    });
    mode.value = "login";
  } catch (error) {
    console.warn(error);
  }
};

const handleInviteSubmit = async () => {
  if (!inviteCode.value) {
    authStore.setMessage("邀请码不能为空");
    return;
  }
  try {
    await authStore.submitInvite(inviteCode.value);
    if (!authStore.requiresInvite) {
      inviteCode.value = "";
      await router.push({ name: "home" });
    }
  } catch (error) {
    console.warn(error);
  }
};

const handleLogout = () => {
  authStore.logout();
  inviteCode.value = "";
  loginForm.account = "";
  loginForm.password = "";
  registerForm.username = "";
  registerForm.account = "";
  registerForm.password = "";
  registerForm.code = "";
  forgotForm.account = "";
  forgotForm.password = "";
  forgotForm.code = "";
};

const switchMode = (next: AuthMode) => {
  mode.value = next;
  authStore.setMessage(null);
  authStore.resetError();
};

watchEffect(() => {
  if (authStore.isAuthenticated && !authStore.user && !authStore.requiresInvite) {
    void authStore.fetchProfile();
  }
});

const restoreRememberedLogin = () => {
  const saved = storage.get<{ account?: string; password?: string; remember?: boolean } | null>(
    REMEMBER_CREDENTIALS_KEY,
    null
  );
  if (saved?.remember) {
    rememberMe.value = true;
    loginForm.account = saved.account ?? "";
    loginForm.password = saved.password ?? "";
  }
};

watch(
  () => authStore.requiresInvite,
  (needsInvite) => {
    if (!needsInvite && authStore.isAuthenticated) {
      void router.replace({ name: "home" });
    }
  }
);

onMounted(() => {
  if (typeof window !== "undefined") {
    const globalWindow = window as typeof window & { __TAURI__?: unknown };
    isNativeClient.value = Boolean(globalWindow.__TAURI__);
  }
  showLogoutNotice();
  restoreRememberedLogin();
  initParticles();
});

onBeforeUnmount(() => {
  clearTimer();
  if (stopParticles) stopParticles();
});
</script>

<template>
  <div class="relative z-10 flex min-h-screen items-start justify-end bg-slate-50 px-4 py-12 lg:items-center lg:px-12 lg:py-20 dark:bg-slate-900 overflow-hidden">
    <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div class="absolute inset-[-20%] animate-gradient-slow blur-3xl opacity-70 mix-blend-screen dark:opacity-60" />
      <canvas ref="particlesCanvas" class="absolute inset-0" />
    </div>
    <div class="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800 lg:right-10 lg:top-8">
      <ThemeToggle />
      <UserAvatarButton v-if="authStore.isAuthenticated" />
    </div>
    <div class="hidden lg:block lg:absolute lg:left-10 lg:top-1/2 lg:-translate-y-1/2 lg:-translate-x-8">
      <div class="w-[24rem] px-4 py-6 text-slate-600 dark:text-white/80">
        <p class="text-base uppercase tracking-[0.4em] text-transparent joy-gradient-text">Joyful Dawn</p>
        <h1 class="mt-4 text-5xl font-semibold text-transparent joy-gradient-text">聆听 · 云雾氛围 </h1>
        <p class="mt-4 text-lg text-transparent joy-gradient-subtle">登入以同步你的播放列表、收藏与个性化推荐。</p>
        <div class="mt-10 space-y-2 text-base text-slate-800 dark:text-emerald-200">
          <p>- 简洁的播放体验</p>
          <p>- 设备间自动同步</p>
          <p>- 安全的账号保护</p>
        </div>
      </div>
    </div>

    <div class="w-full max-w-5xl px-4 lg:ml-[18rem] lg:pl-32 lg:pr-16 lg:py-14">
      <div class="mx-auto flex w-full max-w-xl flex-col justify-center lg:ml-auto lg:mr-0 lg:min-h-[560px]">
        <div v-if="authStore.banned" class="p-10 text-center text-slate-700 dark:text-white/70">
          <p class="text-xs uppercase tracking-[0.4em] text-slate-400 dark:text-white/50">账号状态</p>
          <h2 class="mt-4 text-2xl font-semibold text-rose-600">账号已被封禁</h2>
          <p class="mt-2 text-sm text-slate-500 dark:text-white/60">
            如需申诉或协助，请联系管理员。当前账号无法继续使用本系统。
          </p>
          <button class="mt-6 w-full text-sm text-slate-500 underline-offset-2 hover:underline dark:text-white/60" type="button" @click="handleLogout">
            返回登录
          </button>
        </div>

        <div v-else-if="authStore.requiresInvite" class="p-10 text-slate-700 dark:text-white/70">
          <p class="text-xs uppercase tracking-[0.4em] text-slate-400 dark:text-white/50">邀请码验证</p>
          <h2 class="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">欢迎回来，{{ authStore.user?.name ?? "Joyful 用户" }}</h2>
          <p class="mt-2 text-sm text-slate-500 dark:text-white/60">请输入邀请码激活账号后即可进入系统。</p>
          <div class="mt-6 space-y-1">
            <label class="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-white/50">邀请码</label>
            <input
              v-model="inviteCode"
              :class="baseInputClass"
              placeholder="输入邀请码"
              type="text"
            />
          </div>
          <p v-if="authStore.error" class="mt-3 text-xs text-rose-500 dark:text-rose-300">
            {{ authStore.error }}
          </p>
          <p v-else-if="authStore.message" class="mt-3 text-xs text-emerald-500 dark:text-emerald-300">
            {{ authStore.message }}
          </p>
          <button
            class="mt-6 w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
            type="button"
            :disabled="authStore.inviteLoading || !inviteCode"
            @click="handleInviteSubmit"
          >
            {{ authStore.inviteLoading ? "验证中..." : "提交邀请码" }}
          </button>
          <button class="mt-4 block w-full text-center text-xs text-slate-500 underline-offset-2 hover:underline dark:text-white/60" type="button" @click="authStore.logout">
            退出当前账号
          </button>
        </div>

        <div v-else class="p-10 text-slate-700 dark:text-white flex flex-col">
          <div class="flex gap-3 border-b border-slate-200 pb-2 dark:border-slate-700">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              class="flex-1 border-b-2 px-4 py-2 text-sm font-medium transition-colors"
              :class="
                mode === tab.value
                  ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                  : 'border-transparent text-slate-500 dark:text-white/60'
              "
              type="button"
              @click="switchMode(tab.value)"
            >
              {{ tab.label }}
            </button>
          </div>

          <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
            <div v-if="mode !== 'login' && mode !== 'forgot'" class="space-y-1">
              <label class="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-white/50">昵称</label>
              <input
                v-model="registerForm.username"
                :class="baseInputClass"
                placeholder="请输入昵称"
                type="text"
              />
            </div>

            <div class="space-y-1">
              <label class="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-white/50">邮箱账号</label>
              <input
                v-if="mode === 'login'"
                v-model="loginForm.account"
                :class="baseInputClass"
                placeholder="请输入邮箱"
                type="email"
              />
              <input
                v-else-if="mode === 'register'"
                v-model="registerForm.account"
                :class="baseInputClass"
                placeholder="请输入邮箱"
                type="email"
              />
              <input
                v-else
                v-model="forgotForm.account"
                :class="baseInputClass"
                placeholder="请输入邮箱"
                type="email"
              />
            </div>

            <div class="space-y-1" v-if="mode !== 'forgot'">
              <label class="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-white/50">密码</label>
              <input
                v-if="mode === 'login'"
                v-model="loginForm.password"
                :class="baseInputClass"
                placeholder="请输入密码"
                type="password"
                autocomplete="current-password"
              />
              <input
                v-else
                v-model="registerForm.password"
                :class="baseInputClass"
                placeholder="设置登录密码"
                type="password"
                autocomplete="new-password"
              />
            </div>

            <div class="space-y-1" v-else>
              <label class="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-white/50">新密码</label>
              <input
                v-model="forgotForm.password"
                :class="baseInputClass"
                placeholder="设置新密码"
              type="password"
            />
            </div>

            <label
              v-if="mode === 'login'"
              class="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-white/70"
            >
              <input v-model="rememberMe" type="checkbox" class="h-4 w-4 accent-brand" />
              <span>记住账号与密码</span>
            </label>

            <div v-if="mode !== 'login'" class="space-y-1">
              <label class="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-white/50">验证码</label>
              <div class="flex gap-3">
                <input
                  v-if="mode === 'register'"
                  v-model="registerForm.code"
                  :class="[baseInputClass, 'flex-1']"
                  placeholder="请输入验证码"
                  type="text"
                />
                <input
                  v-else
                  v-model="forgotForm.code"
                  :class="[baseInputClass, 'flex-1']"
                  placeholder="请输入验证码"
                  type="text"
                />
                <button
                  class="rounded-2xl border border-slate-300 px-4 py-3 text-xs font-semibold tracking-widest text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-white dark:hover:bg-slate-800"
                  type="button"
                  :disabled="countdown > 0 || !requestCodeAccount"
                  @click="handleRequestCode"
                >
                  {{ countdown > 0 ? `重新发送(${countdown}s)` : "获取验证码" }}
                </button>
              </div>
            </div>

            <p v-if="authStore.error" class="text-xs text-rose-500 dark:text-rose-300">
              {{ authStore.error }}
            </p>
            <p v-else-if="authStore.message" class="text-xs text-emerald-500 dark:text-emerald-300">
              {{ authStore.message }}
            </p>

            <button
              class="mt-4 w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
              type="submit"
              :disabled="isLoading"
            >
              {{ mode === "login" ? "登录" : mode === "register" ? "注册" : "重置密码" }}
            </button>
          </form>

          <div class="mt-6 text-center text-xs text-slate-500 dark:text-white/60">
            <button
              v-if="mode !== 'login'"
              class="underline-offset-2 hover:underline"
              type="button"
              @click="switchMode('login')"
            >
              返回登录
            </button>
          </div>

          <div v-if="!isNativeClient" class="mt-8 flex flex-col items-center gap-3">
            <p class="text-xs uppercase tracking-[0.35em] text-slate-400 dark:text-white/60">客户端下载</p>
            <div class="flex flex-wrap items-center justify-center gap-3">
              <a
                v-for="item in clientDownloads"
                :key="item.icon"
                :href="item.href"
                target="_blank"
                rel="noopener noreferrer"
                class="group inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition hover:-translate-y-[1px] hover:border-slate-400 hover:bg-white/70 dark:border-slate-700 dark:text-white dark:hover:border-slate-500 dark:hover:bg-white/5"
              >
                <span class="inline-flex h-5 w-5 items-center justify-center">
                  <svg v-if="item.icon === 'windows'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5">
                    <path :fill="item.color" d="M3 8.5 21.2 6v16.4H3V8.5Zm18.2 16.7V41L3 38.6V25.2h18.2Zm3.6-19.7L45 3v19.4H24.8V5.5Zm21.2 22.1V45l-21.2-3V27.6H45Z" />
                  </svg>
                  <svg v-else-if="item.icon === 'mac'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5">
                    <path :fill="item.color" d="M31.9 6.2c-1.6.2-3.5 1.2-4.5 2.5-.9 1.1-1.6 2.7-1.4 4.2 1.7.1 3.5-.9 4.6-2.2 1.1-1.3 1.8-2.9 1.3-4.5Zm-2.2 7.7c-2.6-.2-4.8 1.5-6 1.5-1.2 0-3.1-1.4-5.1-1.4-2.7 0-5.2 1.6-6.6 4.2-2.8 4.9-.7 12.2 2 16.2 1.3 1.9 2.9 3.9 5 3.8 2-.1 2.8-1.2 5.2-1.2 2.4 0 3.1 1.2 5.2 1.2 2.2-.1 3.6-1.9 4.9-3.8 1.5-2.1 2-4.1 2.1-4.2-.1 0-4-1.5-4.1-6 0-3.8 3.1-5.7 3.3-5.8-1.8-2.6-4.6-2.9-5.9-2.9Z" />
                  </svg>
                  <svg v-else-if="item.icon === 'android'" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5">
                    <path :fill="item.color" d="M32.5 10.8 34.9 7a.6.6 0 0 0-.2-.8.6.6 0 0 0-.8.2l-2.4 3.8a9.7 9.7 0 0 0-7-.3L22 6.4a.6.6 0 0 0-.8-.2.6.6 0 0 0-.2.8l2.4 3.8A9 9 0 0 0 18 17.5h12c0-3.1-1.8-5.8-4.4-6.7Zm-9.8 3.9a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Zm7.4 0a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Zm5.7 5.3h2.7v9.5c0 1.2-1 2.2-2.3 2.2s-2.2-1-2.2-2.2V20Zm-19.2 0v12c0 1.3 1 2.3 2.3 2.3h1.9v6.6c0 1.2 1 2.2 2.2 2.2s2.2-1 2.2-2.2V32.3h2.7v6.7c0 1.2 1 2.2 2.2 2.2s2.3-1 2.3-2.2V20h2.7v9.5c0 1.2-1 2.2-2.3 2.2s-2.2-1-2.2-2.2V18c0-1.2-1-2.2-2.2-2.2H18.6c-1.3 0-2.3 1-2.3 2.2v11.5c0 1.2-1 2.2-2.2 2.2S12 30.7 12 29.5V20h2.6Z" />
                  </svg>
                  <svg v-else viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5">
                    <path :fill="item.color" d="M36.5 25.2c-2.6-1.6-6-2.7-10.4-3.3 0-.5-.1-1-.1-1.5 0-1.3.3-2.9.8-4.8 0-.2 0-.3-.2-.4l-2.3-.7h-.1c-.1 0-.2.1-.2.2-.6 1.8-1.1 3.6-1.4 5.3-4 .2-7.2 1.2-9.4 3-.1.1-.1.2-.1.3l.6 2.4c0 .1.1.2.2.2h.1c.8-.5 1.8-.9 2.9-1.3.3 3 1 5.7 1.9 7.8-1.6.5-2.6 1.2-2.6 1.2-.1.1-.2.2-.1.3.3.9.7 1.6 1.2 2.2.1.1.2.1.3.1 0 0 1-.6 2.4-1.1.4.7.8 1.3 1.3 1.8.1.1.2.1.3 0 .4-.3.8-.7 1.1-1.1.4.4.9.7 1.4 1.1.1.1.2.1.3 0 .5-.4 1-.8 1.4-1.2.2.2.5.4.7.6 2.7 2 5.1 2.6 6.6 2.6.1 0 .2 0 .2-.1.2-.3.5-.8.8-1.5.1-.1 0-.3-.1-.3-.7-.3-1.8-1-3.2-2 1.3-.6 2.4-1.3 3.4-2.2 1.1-1.1 1.9-2.5 2.3-4.1.9-3.2.3-7-1.9-8.3Z" />
                  </svg>
                </span>
                <span class="whitespace-nowrap">{{ item.label }}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-gradient-slow {
  background: conic-gradient(
      from 90deg at 50% 50%,
      rgba(14, 165, 233, 0.25),
      rgba(224, 36, 94, 0.22),
      rgba(99, 102, 241, 0.25),
      rgba(34, 197, 94, 0.2),
      rgba(14, 165, 233, 0.25)
    ),
    radial-gradient(120% 120% at 20% 20%, rgba(56, 189, 248, 0.35), transparent 45%),
    radial-gradient(120% 120% at 80% 30%, rgba(244, 114, 182, 0.25), transparent 45%),
    radial-gradient(140% 120% at 50% 80%, rgba(94, 234, 212, 0.28), transparent 55%);
  animation: gradientSpin 24s linear infinite;
  transform-origin: 50% 50%;
}

@keyframes gradientSpin {
  from {
    transform: rotate(0deg) scale(1.05);
  }
  to {
    transform: rotate(360deg) scale(1.05);
  }
}
</style>
