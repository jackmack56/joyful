import http from "./http";
import type { ApiResponse } from "@/types/music";

const LOGIN_ENDPOINT = "/api/v1/login";
const VERIFY_ENDPOINT = "/api/v1/getVerifyCode";
const REGISTER_ENDPOINT = "/api/v1/register";
const FORGET_ENDPOINT = "/api/v1/forget";
const LOGOUT_ENDPOINT = "/logout";

export interface LoginPayload {
  account: string;
  password: string;
  channel: number;
  type: number;
}

export interface VerifyCodePayload {
  account: string;
  channel: number;
  type: number;
}

export interface RegisterPayload {
  username: string;
  account: string;
  code: string;
  channel: number;
  password: string;
}

export interface ForgetPayload {
  account: string;
  channel: number;
  code: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<{ token?: string; sign?: string }> {
  const response = await http.post<ApiResponse<{ token?: string; sign?: string }> & { token?: string; sign?: string }>(
    LOGIN_ENDPOINT,
    payload
  );
  if (response.data.code !== 200) {
    throw new Error(response.data.msg ?? "登录失败");
  }
  const embeddedToken = response.data.data?.token;
  const rootToken = (response.data as unknown as { token?: string })?.token;
  const sign = response.data.data?.sign ?? (response.data as unknown as { sign?: string })?.sign;
  return { token: embeddedToken ?? rootToken, sign };
}

export async function requestVerifyCode(payload: VerifyCodePayload): Promise<void> {
  const response = await http.post<ApiResponse<unknown>>(VERIFY_ENDPOINT, payload);
  if (response.data.code !== 200) {
    throw new Error(response.data.msg ?? "验证码发送失败");
  }
}

export async function register(payload: RegisterPayload): Promise<void> {
  const response = await http.post<ApiResponse<unknown>>(REGISTER_ENDPOINT, payload);
  if (response.data.code !== 200) {
    throw new Error(response.data.msg ?? "注册失败");
  }
}

export async function resetPassword(payload: ForgetPayload): Promise<void> {
  const response = await http.post<ApiResponse<unknown>>(FORGET_ENDPOINT, payload);
  if (response.data.code !== 200) {
    throw new Error(response.data.msg ?? "重置密码失败");
  }
}

export async function logout(): Promise<void> {
  try {
    const response = await http.post<ApiResponse<unknown>>(LOGOUT_ENDPOINT);
    if (response.data.code && response.data.code !== 200) {
      throw new Error(response.data.msg ?? "退出失败");
    }
  } catch (error) {
    // 后端登出失败不阻塞本地清理
    console.warn("logout api failed", error);
  }
}
