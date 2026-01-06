import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { nanoid } from "nanoid";
import pkg from "../../package.json";

type DeviceHeaders = {
  "X-Device-ID": string;
  "X-Device-Model": string;
  "X-App-Version": string;
  "X-Platform": string;
  "X-Os-Version": string;
};

type NavigatorUAData = {
  platform?: string;
  model?: string;
};

type NavigatorWithUA = Navigator & {
  userAgentData?: NavigatorUAData;
};

type FingerprintAgent = Awaited<ReturnType<typeof FingerprintJS.load>>;

const DEVICE_ID_KEY = "JOYFUL_DEVICE_ID";
const APP_VERSION =
  (import.meta.env.VITE_APP_VERSION as string | undefined) ?? pkg.version ?? "0.1.0";

let cachedDeviceId: string | null = null;
let fingerprintAgentPromise: Promise<FingerprintAgent | null> | null = null;

const getNavigator = (): NavigatorWithUA | undefined => {
  if (typeof navigator === "undefined") return undefined;
  return navigator;
};

const readStoredId = (): string | null => {
  if (cachedDeviceId) return cachedDeviceId;
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(DEVICE_ID_KEY);
    if (stored) {
      cachedDeviceId = stored;
      return stored;
    }
  } catch (error) {
    console.warn("读取设备 ID 失败", error);
  }
  return null;
};

const persistDeviceId = (id: string): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  } catch (error) {
    console.warn("保存设备 ID 失败", error);
  }
};

const getFingerprintAgent = (): Promise<FingerprintAgent | null> | null => {
  if (typeof window === "undefined") return null;
  if (!fingerprintAgentPromise) {
    fingerprintAgentPromise = FingerprintJS.load()
      .then((agent) => agent)
      .catch((error: unknown) => {
        console.warn("FingerprintJS 初始化失败", error);
        return null;
      });
  }
  return fingerprintAgentPromise;
};

const fetchFingerprintId = async (): Promise<string | null> => {
  try {
    const agentPromise = getFingerprintAgent();
    if (!agentPromise) return null;
    const agent = await agentPromise;
    if (!agent) return null;
    const result = await agent.get();
    return result.visitorId;
  } catch (error) {
    console.warn("获取指纹信息失败", error);
    return null;
  }
};

const getDeviceId = async (): Promise<string> => {
  const existing = readStoredId();
  if (existing) return existing;
  const fingerprintId = await fetchFingerprintId();
  const fallback = fingerprintId ?? nanoid(21);
  cachedDeviceId = fallback;
  persistDeviceId(fallback);
  return fallback;
};

const detectPlatform = (ua: string, nav?: NavigatorWithUA): string => {
  const platform = nav?.userAgentData?.platform ?? nav?.platform ?? "";
  if (platform) return platform;
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Web";
};

const detectDeviceModel = (ua: string, nav?: NavigatorWithUA): string => {
  const model = nav?.userAgentData?.model ?? "";
  if (model) return model;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  const androidMatch = ua.match(/Android.*;\s*([^)]+)\)/i);
  if (androidMatch?.[1]) {
    return androidMatch[1].split(";").pop()?.trim() ?? "Android Device";
  }
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Linux/i.test(ua)) return "Linux Device";
  return "Unknown Device";
};

const detectOsVersion = (ua: string): string => {
  const windowsMatch = ua.match(/Windows NT ([\d._]+)/i);
  if (windowsMatch?.[1]) {
    const version = windowsMatch[1].replace(/_/g, ".");
    return `Windows ${version}`;
  }
  const macMatch = ua.match(/Mac OS X ([\d_]+)/i);
  if (macMatch?.[1]) {
    return `macOS ${macMatch[1].replace(/_/g, ".")}`;
  }
  const iosMatch = ua.match(/OS ([\d_]+) like Mac OS X/i);
  if (iosMatch?.[1]) {
    return `iOS ${iosMatch[1].replace(/_/g, ".")}`;
  }
  const androidMatch = ua.match(/Android ([\d.]+)/i);
  if (androidMatch?.[1]) {
    return `Android ${androidMatch[1]}`;
  }
  const linuxMatch = ua.match(/Linux\s+([^;]+)/i);
  if (linuxMatch?.[1]) {
    return `Linux ${linuxMatch[1]}`;
  }
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown";
};

export const getDeviceHeaders = async (): Promise<DeviceHeaders> => {
  const nav = getNavigator();
  const ua = nav?.userAgent ?? "";
  return {
    "X-Device-ID": await getDeviceId(),
    "X-Device-Model": detectDeviceModel(ua, nav),
    "X-App-Version": APP_VERSION,
    "X-Platform": detectPlatform(ua, nav),
    "X-Os-Version": detectOsVersion(ua),
  };
};
