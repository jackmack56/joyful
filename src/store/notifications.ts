import { defineStore } from "pinia";
import { nanoid } from "nanoid";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  duration: number;
  closing: boolean;
  closingDuration: number;
}

interface NotificationOptions {
  type?: NotificationType;
  duration?: number;
}

const DEFAULT_DURATION = 3000;
const MIN_DURATION = 800;
const EXIT_DURATION = 400;

interface TimerEntry {
  closing?: number;
  remove?: number;
}

export const useNotificationStore = defineStore("notifications", {
  state: () => ({
    items: [] as NotificationItem[],
    timers: {} as Record<string, TimerEntry>,
  }),
  actions: {
    push(message: string, options?: NotificationOptions): string {
      const duration = Math.max(options?.duration ?? DEFAULT_DURATION, MIN_DURATION);
      const closingDuration = Math.min(EXIT_DURATION, duration);
      const item: NotificationItem = {
        id: nanoid(),
        message,
        type: options?.type ?? "info",
        duration,
        closing: false,
        closingDuration,
      };
      this.items.push(item);
      if (typeof window !== "undefined") {
        const closingTimer = window.setTimeout(() => {
          this.startClosing(item.id);
        }, Math.max(duration - closingDuration, 0));
        const removeTimer = window.setTimeout(() => {
          this.remove(item.id);
        }, duration);
        this.timers[item.id] = { closing: closingTimer, remove: removeTimer };
      }
      return item.id;
    },
    startClosing(id: string): void {
      const target = this.items.find((entry) => entry.id === id);
      if (target && !target.closing) {
        target.closing = true;
      }
    },
    dismiss(id: string): void {
      const target = this.items.find((entry) => entry.id === id);
      if (!target) return;
      this.startClosing(id);
      const timers = this.timers[id] ?? {};
      if (typeof window !== "undefined") {
        if (timers.remove) {
          window.clearTimeout(timers.remove);
        }
        timers.remove = window.setTimeout(() => {
          this.remove(id);
        }, target.closingDuration);
        this.timers[id] = timers;
      }
    },
    remove(id: string): void {
      this.clearTimers(id);
      this.items = this.items.filter((item) => item.id !== id);
    },
    clear(): void {
      Object.keys(this.timers).forEach((id) => this.clearTimers(id));
      this.items = [];
    },
    clearTimers(id: string): void {
      const timers = this.timers[id];
      if (!timers || typeof window === "undefined") return;
      if (timers.closing) window.clearTimeout(timers.closing);
      if (timers.remove) window.clearTimeout(timers.remove);
      delete this.timers[id];
    },
  },
});
