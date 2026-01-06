import { ref } from "vue";
import { toggleMusicLike } from "@/api/music";
import { useNotificationStore } from "@/store/notifications";
import { usePlayerStore } from "@/store/player";
import { useLibraryStore } from "@/store/library";
import { useHomeStore } from "@/store/home";
import type { MusicTrack } from "@/types/music";

export function useLikeToggle() {
  const pendingIds = ref<Set<string>>(new Set());
  const notificationStore = useNotificationStore();
  const playerStore = usePlayerStore();
  const libraryStore = useLibraryStore();
  const homeStore = useHomeStore();

  const isPending = (id?: string | null): boolean => {
    if (!id) return false;
    return pendingIds.value.has(id);
  };

  const toggleLike = async (track?: MusicTrack | null): Promise<void> => {
    if (!track?.id) return;
    const trackId = track.id;
    if (pendingIds.value.has(trackId)) return;

    const isLiked = Number(track.isLike) === 1;
    const add = !isLiked;
    const nextPending = new Set(pendingIds.value);
    nextPending.add(trackId);
    pendingIds.value = nextPending;
    try {
      await toggleMusicLike(trackId, add);
      const nextIsLike = add ? 1 : 0;
      // 更新本地状态，保持各列表同步
      track.isLike = nextIsLike;
      (track as any).islike = nextIsLike;
      playerStore.setTrackLike(trackId, nextIsLike);
      libraryStore.setTrackLike(trackId, nextIsLike);
      homeStore.setTrackLike(trackId, nextIsLike);
      notificationStore.push(
        add ? `已将「${track.name}」加入喜欢` : `已从喜欢移除「${track.name}」`,
        { type: "success" }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "操作失败";
      notificationStore.push(message, { type: "error" });
    } finally {
      const cleared = new Set(pendingIds.value);
      cleared.delete(trackId);
      pendingIds.value = cleared;
    }
  };

  return {
    toggleLike,
    isPending,
  };
}
