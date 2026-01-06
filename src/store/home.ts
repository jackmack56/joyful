import { defineStore } from "pinia";
import { fetchHomeSong } from "@/api/music";
import type { HomeSongPayload } from "@/types/music";
import { useNotificationStore } from "@/store/notifications";

interface HomeState {
  data: HomeSongPayload | null;
  loading: boolean;
  error: string | null;
}

export const useHomeStore = defineStore("home", {
  state: (): HomeState => ({
    data: null,
    loading: false,
    error: null,
  }),
  actions: {
    async fetchHome(): Promise<void> {
      if (this.loading) return;
      this.loading = true;
      this.error = null;
      try {
        const payload = await fetchHomeSong();
        this.data = payload;
      } catch (error) {
        const message = error instanceof Error ? error.message : "获取首页数据失败";
        this.error = message;
        const notificationStore = useNotificationStore();
        notificationStore.push(message, { type: "error" });
      } finally {
        this.loading = false;
      }
    },
    setTrackLike(trackId: string, isLike: number): void {
      if (!this.data?.recommendSongs) return;
      this.data = {
        ...this.data,
        recommendSongs: this.data.recommendSongs.map((track) =>
          track.id === trackId ? { ...track, isLike, islike: isLike } : track
        ),
      };
    },
  },
});
