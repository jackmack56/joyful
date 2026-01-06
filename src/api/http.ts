import axios from "axios";
import type { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import { getDeviceHeaders } from "@/utils/device";
import { LOGOUT_REASON_STORAGE_KEY, SIGNATURE_STORAGE_KEY, TOKEN_STORAGE_KEY } from "@/constants/storage";
import type { ApiResponse } from "@/types/music";
import pinia from "@/store";
import { useNotificationStore } from "@/store/notifications";

const resolveBaseURL = (): string => {
  const envBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (!envBase) return "/prod";
  const trimmed = envBase.replace(/\/+$/, "");
  if (trimmed.startsWith("http")) return trimmed;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const API_BASE_URL = resolveBaseURL();
const DEFAULT_TIMEOUT = Number(import.meta.env.VITE_HTTP_TIMEOUT ?? 20000);
const RETRY_COUNT = Number(import.meta.env.VITE_HTTP_RETRY ?? 1);

const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  withCredentials: false,
});

const notificationStore = useNotificationStore(pinia);

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  withCredentials: false,
});

const SIGNATURE_EXCLUDE = [
  "/api/v1/login",
  "/api/v1/register",
  "/api/v1/getVerifyCode",
  "/api/v1/forget",
  "/api/v1/getNewToken",
];

type LogoutInfo = { code: number; reason: "invalid_credentials" | "account_conflict"; message: string };
type Payload = { code?: number | string; msg?: string };

const getStoredToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

const getSignatureKey = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SIGNATURE_STORAGE_KEY);
};

const setSignatureKey = (key: string | null): void => {
  if (typeof window === "undefined") return;
  if (key) {
    localStorage.setItem(SIGNATURE_STORAGE_KEY, key);
  } else {
    localStorage.removeItem(SIGNATURE_STORAGE_KEY);
  }
};

const setStoredToken = (token: string | null): void => {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

const setLogoutInfo = (info: LogoutInfo | null): void => {
  if (typeof window === "undefined") return;
  if (!info) {
    window.sessionStorage.removeItem(LOGOUT_REASON_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(LOGOUT_REASON_STORAGE_KEY, JSON.stringify(info));
};

const clearLogoutInfo = (): void => setLogoutInfo(null);

type ForceLogoutOptions = { keepLogoutInfo?: boolean };

const forceLogout = (message?: string, options?: ForceLogoutOptions): void => {
  setStoredToken(null);
  setSignatureKey(null);
  if (!options?.keepLogoutInfo) {
    clearLogoutInfo();
  }
  if (typeof window !== "undefined") {
    console.warn(message ?? "登录状态失效，返回登录页");
    window.location.hash = "#/auth";
    window.location.reload();
  }
};

let refreshPromise: Promise<string | null> | null = null;

const requestNewToken = async (): Promise<string | null> => {
  const currentToken = getStoredToken();
  if (!currentToken) return null;
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .get<ApiResponse<{ token?: string; sign?: string }> & { token?: string; sign?: string }>("/api/v1/getNewToken", {
        headers: { Authorization: `Bearer ${currentToken}` },
      })
      .then((response) => {
        const payload = response.data as Payload;
        const code = normalizeCode(payload?.code);
        const authError = code !== null ? handleAuthFailure(payload) : null;
        if (authError) {
          throw authError;
        }
        if (code !== 200) {
          throw new Error(payload.msg ?? "刷新凭证失败");
        }
        const nextToken = payload.data?.token ?? (payload as unknown as { token?: string }).token;
        if (!nextToken) {
          throw new Error("未返回新的登录凭证");
        }
        setStoredToken(nextToken);
        const newSignature = (payload as unknown as { sign?: string })?.sign ?? payload.data?.sign;
        if (newSignature) {
          setSignatureKey(newSignature);
        }
        return nextToken;
      })
      .catch((error) => {
        const payload = (error.response?.data ?? {}) as Payload;
        const code = normalizeCode(payload?.code);
        const authError = code !== null ? handleAuthFailure(payload) : null;
        if (authError) {
          return null;
        }
        console.error("刷新凭证失败", error);
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const isAbsoluteURL = (url: string): boolean => /^https?:\/\//i.test(url);

const resolveURLPath = (config: AxiosRequestConfig): string => {
  const targetUrl = config.url ?? "";
  const base = config.baseURL ?? API_BASE_URL;
  if (isAbsoluteURL(targetUrl)) {
    const parsed = new URL(targetUrl);
    return parsed.pathname;
  }
  try {
    const parsed = new URL(targetUrl, base);
    return parsed.pathname;
  } catch {
    return targetUrl;
  }
};

const shouldAttachSignature = (config: AxiosRequestConfig): boolean => {
  if (!config.url) return false;
  const path = resolveURLPath(config);
  return !SIGNATURE_EXCLUDE.some((pattern) => path.includes(pattern));
};

const buildSortedQueryString = (config: AxiosRequestConfig): string => {
  const params = new URLSearchParams();
  if (config.params && typeof config.params === "object") {
    Object.entries(config.params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        value.forEach((item) => params.append(key, String(item)));
      } else if (typeof value === "object") {
        params.append(key, JSON.stringify(value));
      } else {
        params.append(key, String(value));
      }
    });
  }
  if (config.url) {
    const index = config.url.indexOf("?");
    if (index !== -1) {
      const existing = new URLSearchParams(config.url.slice(index + 1));
      existing.forEach((value, key) => params.append(key, value));
    }
  }
  const entries = Array.from(params.entries()).filter(([key]) => key !== "signature");
  entries.sort(([aKey], [bKey]) => aKey.localeCompare(bKey));
  return entries.map(([key, value]) => `${key}=${value}`).join("&");
};

const buildBodyString = (config: AxiosRequestConfig): string => {
  if (!config.data) return "";
  if (typeof config.data === "string") {
    return config.data;
  }
  if (typeof URLSearchParams !== "undefined" && config.data instanceof URLSearchParams) {
    return config.data.toString();
  }
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    const pairs: string[] = [];
    config.data.forEach((value, key) => {
      pairs.push(`${key}=${typeof value === "string" ? value : JSON.stringify(value)}`);
    });
    return pairs.join("&");
  }
  try {
    return JSON.stringify(config.data);
  } catch {
    return "";
  }
};

const bufferToHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const createSignature = async (payload: string, secret: string): Promise<string> => {
  const subtle = globalThis.crypto?.subtle ?? (globalThis.crypto as typeof crypto | undefined)?.subtle;
  if (!subtle) throw new Error("当前环境不支持签名计算");
  const encoder = new TextEncoder();
  const key = await subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await subtle.sign("HMAC", key, encoder.encode(payload));
  return bufferToHex(signature);
};

const generateNonce = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

const attachSignature = async (config: AxiosRequestConfig, secretKey: string): Promise<void> => {
  const method = (config.method ?? "GET").toUpperCase();
  const paramsString = method === "GET" ? buildSortedQueryString(config) : buildBodyString(config);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();
  const payload = `${timestamp}${nonce}${paramsString}`;
  const signature = await createSignature(payload, secretKey);
  config.headers = config.headers ?? {};
  config.headers["X-Nonce"] = nonce;
  config.headers["X-Timestamp"] = timestamp;
  config.headers["X-Signature"] = signature;
};

http.interceptors.request.use(async (config) => {
  const token = getStoredToken();
  const signatureKey = getSignatureKey();
  config.headers = config.headers ?? {};
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const deviceHeaders = await getDeviceHeaders();
  Object.assign(config.headers, deviceHeaders);
  if (signatureKey && shouldAttachSignature(config)) {
    await attachSignature(config, signatureKey);
  }
  return config;
});

const normalizeCode = (code?: number | string): number | null => {
  if (typeof code === "number") return code;
  if (typeof code === "string") {
    const parsed = Number(code);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const handleAuthFailure = (payload: Payload): Error | null => {
  const normalizedCode = normalizeCode(payload.code);
  if (normalizedCode === -110 || normalizedCode === -108) {
    const logoutMessage =
      payload.msg ?? (normalizedCode === -108 ? "账号已在其他设备登录，请重新登录" : "登录信息错误，请重新登录");
    const reason = normalizedCode === -108 ? "account_conflict" : "invalid_credentials";
    setLogoutInfo({ code: normalizedCode, reason, message: logoutMessage });
    forceLogout(logoutMessage, { keepLogoutInfo: true });
    return new Error(logoutMessage);
  }
  return null;
};

http.interceptors.response.use(
  async (response) => {
    const payload = response.data as Payload;
    const code = normalizeCode(payload?.code);
    if (payload && code !== null) {
      if (code !== 200 && code !== -109 && code !== -110 && code !== -108) {
        notificationStore.push(payload.msg ?? "请求失败", { type: "error" });
      }
      const config = response.config as AxiosRequestConfig & { __isRetryRequest?: boolean };
      if (code === -109 && !config.__isRetryRequest) {
        const newToken = await requestNewToken();
        if (newToken) {
          config.__isRetryRequest = true;
          config.headers = config.headers ?? {};
          config.headers.Authorization = `Bearer ${newToken}`;
          return http(config);
        }
      }
      const authError = handleAuthFailure(payload);
      if (authError) {
        return Promise.reject(authError);
      }
    }
    return response;
  },
  async (error: AxiosError) => {
    const payload = (error.response?.data ?? {}) as Payload;
    const authError = handleAuthFailure(payload);
    if (authError) {
      return Promise.reject(authError);
    }

    const config = error.config as AxiosRequestConfig & { retryCount?: number };
    const shouldRetry = (config.retryCount ?? 0) < RETRY_COUNT;

    if (shouldRetry) {
      config.retryCount = (config.retryCount ?? 0) + 1;
      return http(config);
    }

    return Promise.reject(error);
  }
);

export default http;
