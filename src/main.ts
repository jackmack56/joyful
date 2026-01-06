import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import pinia from "./store";
import "./assets/main.css";

const detectTauriRuntime = (): boolean => {
  if (typeof window === "undefined") return false;
  const w = window as typeof window & {
    __TAURI__?: unknown;
    __TAURI_IPC__?: unknown;
    __TAURI_METADATA__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  };
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const envHit =
    Boolean((import.meta as any).env?.TAURI_PLATFORM) ||
    Boolean((import.meta as any).env?.TAURI_ARCH) ||
    Boolean((import.meta as any).env?.TAURI_FAMILY);
  const runtimeHit = Boolean(
    w.__TAURI__ ||
      w.__TAURI_IPC__ ||
      w.__TAURI_METADATA__ ||
      w.__TAURI_INTERNALS__ ||
      /tauri/i.test(ua)
  );
  return envHit || runtimeHit;
};

const tagTauri = () => {
  if (typeof document === "undefined") return;
  if (detectTauriRuntime()) {
    document.documentElement.classList.add("tauri-app");
  } else {
    document.documentElement.classList.remove("tauri-app");
  }
};

tagTauri();
let tagTries = 0;
const tagTimer = setInterval(() => {
  tagTauri();
  tagTries += 1;
  if (tagTries >= 50 || document.documentElement.classList.contains("tauri-app")) {
    clearInterval(tagTimer);
  }
}, 120);

const app = createApp(App);

app.use(pinia);
app.use(router);

app.mount("#app");
