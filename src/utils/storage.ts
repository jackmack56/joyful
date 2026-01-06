const isBrowser = typeof window !== "undefined";

export const storage = {
  get<T>(key: string, fallback: T): T {
    if (!isBrowser) return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch (error) {
      console.warn(`[storage:get] Failed to parse key ${key}`, error);
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    if (!isBrowser) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`[storage:set] Failed to persist key ${key}`, error);
    }
  },
  remove(key: string): void {
    if (!isBrowser) return;
    window.localStorage.removeItem(key);
  },
};
