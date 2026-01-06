import http from "./http";
import type { ApiResponse } from "@/types/music";
import type { UserProfile } from "@/types/user";

const USER_INFO_ENDPOINT = "/api/v1/user/getUserInfo";
const INVITE_ENDPOINT = "/api/v1/coupon/use";
const UPDATE_USER_ENDPOINT = "/api/v1/user/updateUserInfo";

export interface UserBasicDetailDTO {
  name: string;
  motto?: string | null;
  language?: string | null;
  avatarUrl?: string | null;
}

export async function getUserInfo(): Promise<UserProfile> {
  const response = await http.get<ApiResponse<UserProfile>>(USER_INFO_ENDPOINT);
  if (response.data.code !== 200 || !response.data.data) {
    throw new Error(response.data.msg ?? "获取用户信息失败");
  }
  return response.data.data;
}

export async function submitInviteCode(code: string): Promise<void> {
  const response = await http.post<ApiResponse<unknown>>(
    INVITE_ENDPOINT + `?code=${encodeURIComponent(code)}`
  );
  if (response.data.code !== 200) {
    throw new Error(response.data.msg ?? "邀请码验证失败");
  }
}

export async function updateUserInfo(payload: UserBasicDetailDTO): Promise<void> {
  const response = await http.post<ApiResponse<unknown>>(UPDATE_USER_ENDPOINT, payload);
  if (response.data.code !== 200) {
    throw new Error(response.data.msg ?? "更新用户信息失败");
  }
}
