import http from "./http";
import type {
  ApiResponse,
  HomeSongPayload,
  MusicCategory,
  MusicListParams,
  MusicListPayload,
  MusicListResult,
  MusicTrack,
} from "@/types/music";

const LIST_ENDPOINT = "/api/v1/music/getMusicList";
const DETAIL_ENDPOINT = "/api/v1/music/getMusicDetail";
const HOME_ENDPOINT = "/api/v1/music/homeSong";
const LIKE_ENDPOINT = "/api/v1/music/addMusicSong";

const CATEGORY_VALUE: Record<MusicCategory, number> = {
  RECOMMEND: 0,
  ALL: 1,
  SONG: 2,
  SINGER: 3,
  ALBUM: 4,
  PLAYLIST: 5,
};

function serializeParams(params: MusicListParams): Record<string, unknown> {
  const { type, songListId, ...rest } = params;
  let typeValue: number | undefined;
  if (typeof type === "number") {
    typeValue = type;
  } else if (type) {
    typeValue = CATEGORY_VALUE[type];
  }

  return {
    ...rest,
    type: typeValue,
    songListId,
  };
}

function normalizeTracks(payload: unknown): MusicListResult {
  const fallback: MusicListResult = { total: 0, tracks: [] };
  if (!payload) return fallback;

  if (Array.isArray(payload)) {
    return { total: payload.length, tracks: payload as MusicTrack[] };
  }

  const typed = payload as MusicListPayload;
  const possibleLists = [
    typed.pageList,
    typed.records,
    typed.list,
    typed.items,
    typed.data,
  ];

  for (const list of possibleLists) {
    if (Array.isArray(list)) {
      return {
        total: Number(typed.total ?? list.length),
        tracks: list as MusicTrack[],
      };
    }
  }

  if ((typed as MusicTrack)?.id) {
    return {
      total: 1,
      tracks: [typed as MusicTrack],
    };
  }

  return fallback;
}

export async function fetchMusicList(params: MusicListParams): Promise<MusicListResult> {
  const response = await http.get<ApiResponse<unknown>>(LIST_ENDPOINT, {
    params: serializeParams(params),
  });

  if (response.data.code !== 200) {
    throw new Error(response.data.msg ?? "音乐列表获取失败");
  }

  return normalizeTracks(response.data.data);
}

export async function fetchMusicDetail(musicId: string): Promise<MusicTrack> {
  const response = await http.get<ApiResponse<unknown>>(DETAIL_ENDPOINT, {
    params: { musicId },
  });

  if (response.data.code !== 200) {
    throw new Error(response.data.msg ?? "音乐详情获取失败");
  }

  const payload = response.data.data;
  if (!payload) {
    throw new Error("未找到歌曲详情");
  }

  if ((payload as MusicListPayload).pageList) {
    const normalized = normalizeTracks(payload);
    return normalized.tracks[0];
  }

  return payload as MusicTrack;
}

export async function fetchHomeSong(): Promise<HomeSongPayload> {
  const response = await http.get<ApiResponse<HomeSongPayload>>(HOME_ENDPOINT);
  if (response.data.code !== 200 || !response.data.data) {
    throw new Error(response.data.msg ?? "首页数据获取失败");
  }
  return response.data.data;
}

export async function toggleMusicLike(songId: string, add: boolean, songListId = "2"): Promise<void> {
  const response = await http.post<ApiResponse<unknown>>(LIKE_ENDPOINT, {
    songId: [songId],
    songListId,
    add,
  });
  if (response.data.code !== 200) {
    throw new Error(response.data.msg ?? (add ? "添加喜欢失败" : "取消喜欢失败"));
  }
}
