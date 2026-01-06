import { defineStore } from "pinia";
import type { MusicCategory, MusicListParams, MusicTrack } from "@/types/music";
import { fetchMusicList } from "@/api/music";

interface LibraryState {
  tracks: MusicTrack[];
  total: number;
  loading: boolean;
  error: string | null;
  params: Required<Pick<MusicListParams, "pageNum" | "pageSize">> & {
    keyword: string;
    type: MusicCategory;
    songListId: string | null;
  };
  hasMore: boolean;
}

export const useLibraryStore = defineStore("library", {
  state: (): LibraryState => ({
    tracks: [],
    total: 0,
    loading: false,
    error: null,
    params: {
      pageNum: 1,
      pageSize: 20,
      keyword: "",
      type: "RECOMMEND",
      songListId: null,
    },
    hasMore: true,
  }),
  actions: {
    setKeyword(keyword: string): void {
      this.params.keyword = keyword;
    },
    setType(type: MusicCategory): void {
      this.params.type = type;
    },
    setSongListId(songListId: string | null): void {
      this.params.songListId = songListId;
    },
    setTrackLike(trackId: string, isLike: number): void {
      this.tracks = this.tracks.map((track) =>
        track.id === trackId ? { ...track, isLike, islike: isLike } : track
      );
    },
    resetList(): void {
      this.tracks = [];
      this.total = 0;
      this.params.pageNum = 1;
      this.hasMore = true;
    },
    async fetchTracks(overrides?: Partial<MusicListParams>, append = false): Promise<void> {
      if (this.loading) return;
      this.loading = true;
      this.error = null;
      try {
        const query: MusicListParams = {
          ...this.params,
          ...overrides,
        };
        const payload = await fetchMusicList(query);
        this.total = payload.total;
        this.tracks = append ? [...this.tracks, ...payload.tracks] : payload.tracks;

        this.params = {
          ...this.params,
          keyword: typeof query.keyword === "string" ? query.keyword : this.params.keyword,
          type: (query.type as MusicCategory) ?? this.params.type,
          pageNum: query.pageNum ?? this.params.pageNum,
          pageSize: query.pageSize ?? this.params.pageSize,
          songListId: query.songListId ?? this.params.songListId,
        };
        this.hasMore = this.tracks.length < payload.total;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "获取音乐列表失败";
        console.error(this.error);
      } finally {
        this.loading = false;
      }
    },
    async loadFirstPage(overrides?: Partial<MusicListParams>): Promise<void> {
      this.resetList();
      await this.fetchTracks({ pageNum: 1, ...overrides }, false);
    },
    async loadNextPage(): Promise<void> {
      if (!this.hasMore || this.loading) return;
      const nextPage = (this.params.pageNum ?? 1) + 1;
      await this.fetchTracks({ pageNum: nextPage }, true);
    },
  },
});
