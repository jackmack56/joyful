export type MusicCategory = "RECOMMEND" | "ALL" | "SONG" | "SINGER" | "ALBUM" | "PLAYLIST";

export interface MusicTrack {
  id: string;
  name: string;
  artist?: string | null;
  duration?: number | null;
  url?: string | null;
  pic?: string | null;
  album?: string | null;
  isLike?: number | null;
  source?: string | null;
  lrc?: string | null;
  remark?: string | null;
  enable?: boolean | null;
  [key: string]: unknown;
}

export interface MusicListParams {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
  type?: MusicCategory | number;
  songListId?: string | null;
}

export interface ApiResponse<T> {
  code: number;
  msg: string | null;
  data: T;
}

export interface MusicListPayload {
  total?: number;
  pageList?: MusicTrack[];
  records?: MusicTrack[];
  list?: MusicTrack[];
  items?: MusicTrack[];
  data?: MusicTrack[];
  [key: string]: unknown;
}

export interface MusicListResult {
  total: number;
  tracks: MusicTrack[];
}

export interface HomeSongList {
  id: string;
  name: string;
  enable?: boolean | null;
  creator?: string | null;
  createTime?: number | null;
  updator?: string | null;
  updateTime?: number | null;
  remark?: string | null;
  sourceType?: number | null;
  sourceId?: string | null;
  image?: string | null;
  status?: number | null;
  popular?: number | null;
  desc?: string | null;
}

export interface HomeSongPayload {
  todaySongList: HomeSongList;
  optionSongList: HomeSongList;
  historySongList: HomeSongList;
  downloadSongList: HomeSongList;
  songList: HomeSongList[];
  recommendSongs: MusicTrack[];
}
