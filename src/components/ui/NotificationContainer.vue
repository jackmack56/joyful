<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useNotificationStore, type NotificationType } from "@/store/notifications";

const notificationStore = useNotificationStore();
const { items } = storeToRefs(notificationStore);

const typeStyles: Record<NotificationType, { icon: string; classes: string; accent: string }> = {
  info: {
    icon: "M13 16h-1v-4h-1m1-4h.01",
    classes: "from-sky-50/90 to-white/90 dark:from-cyan-900/40 dark:to-slate-900/60 text-sky-900 dark:text-sky-100",
    accent: "bg-sky-400/30 text-sky-600 dark:text-sky-200",
  },
  success: {
    icon: "M5 13l4 4L19 7",
    classes: "from-emerald-50/90 to-white/90 dark:from-emerald-900/40 dark:to-slate-900/60 text-emerald-900 dark:text-emerald-100",
    accent: "bg-emerald-400/30 text-emerald-600 dark:text-emerald-200",
  },
  warning: {
    icon: "M12 9v2m0 4h.01M10.29 3.86L1.82 18a1 1 0 00.86 1.5h18.64a1 1 0 00.86-1.5L13.71 3.86a1 1 0 00-1.72 0z",
    classes: "from-amber-50/90 to-white/90 dark:from-amber-900/40 dark:to-slate-900/60 text-amber-900 dark:text-amber-100",
    accent: "bg-amber-400/30 text-amber-600 dark:text-amber-200",
  },
  error: {
    icon: "M6 18L18 6M6 6l12 12",
    classes: "from-rose-50/90 to-white/90 dark:from-rose-900/40 dark:to-slate-900/60 text-rose-900 dark:text-rose-100",
    accent: "bg-rose-400/30 text-rose-600 dark:text-rose-200",
  },
};

const handleClose = (id: string): void => {
  notificationStore.dismiss(id);
};
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-end px-4">
      <TransitionGroup
        appear
        name="notification"
        tag="div"
        class="flex max-w-sm flex-col gap-3"
      >
        <article
          v-for="item in items"
          :key="item.id"
          class="notification-card pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/40 bg-gradient-to-br p-4 shadow-[0_20px_50px_-25px_rgba(15,23,42,0.5)] backdrop-blur-xl"
          :class="typeStyles[item.type]?.classes ?? typeStyles.info.classes"
          :data-closing="item.closing"
          :style="{ '--duration': `${item.duration}ms` }"
        >
          <span
            class="flex h-10 w-10 items-center justify-center rounded-2xl text-lg"
            :class="typeStyles[item.type]?.accent ?? typeStyles.info.accent"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
              viewBox="0 0 24 24"
            >
              <path :d="typeStyles[item.type]?.icon ?? typeStyles.info.icon" />
            </svg>
          </span>
          <div class="flex flex-1 flex-col text-sm leading-relaxed">
            <p>{{ item.message }}</p>
            <span class="mt-1 text-xs text-slate-500 dark:text-slate-300/70">即将自动关闭</span>
            <span class="progress-track mt-3 block h-1 w-full overflow-hidden rounded-full bg-white/30 dark:bg-white/10">
              <span
                class="progress-line block h-full rounded-full"
                :class="typeStyles[item.type]?.accent ?? typeStyles.info.accent"
              ></span>
            </span>
          </div>
          <button
            class="ml-auto rounded-full p-1 text-slate-500 transition hover:bg-white/70 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/10"
            type="button"
            aria-label="关闭通知"
            @click="handleClose(item.id)"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </article>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.notification-card {
  transition: opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), filter 0.45s ease;
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
  filter: blur(0);
}

.notification-card[data-closing="true"] {
  opacity: 0;
  transform: translate3d(10px, -16px, 0) scale(0.94);
  filter: blur(1px);
}

.notification-enter-active {
  transition: opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}

.notification-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
  position: absolute;
}

.notification-enter-from {
  opacity: 0;
  transform: translate3d(20px, -10px, 0) scale(0.92);
}

.notification-leave-from,
.notification-leave-to {
  opacity: 0;
  transform: translate3d(10px, -16px, 0) scale(0.9);
}

.progress-line {
  animation: notification-progress linear var(--duration, 3000ms);
  transform-origin: left;
}

.notification-card[data-closing="true"] .progress-line {
  animation-play-state: paused;
  transform: scaleX(0);
  transition: transform 0.35s ease;
}

@keyframes notification-progress {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}
</style>
