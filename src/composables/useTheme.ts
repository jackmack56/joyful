import { onMounted, onUnmounted, watch } from "vue";
import { useUiStore } from "@/store/ui";

const prefersDark = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;

export function useTheme() {
  const uiStore = useUiStore();

  const applyTheme = () => {
    if (typeof document === "undefined") return;
    const resolved =
      uiStore.themePreference === "system"
        ? prefersDark?.matches
          ? "dark"
          : "light"
        : uiStore.themePreference;

    uiStore.setResolvedTheme(resolved);

    const html = document.documentElement;
    html.classList.toggle("dark", resolved === "dark");
    document.body.classList.toggle("bg-slate-900", resolved === "dark");
    document.body.classList.toggle("bg-slate-100", resolved !== "dark");
    html.style.setProperty("--app-surface", resolved === "dark" ? "#0f172a" : "#f3f4f6");
  };

  watch(
    () => uiStore.themePreference,
    () => applyTheme(),
    { immediate: true }
  );

  const mediaListener = () => {
    if (uiStore.themePreference === "system") {
      applyTheme();
    }
  };

  onMounted(() => {
    prefersDark?.addEventListener("change", mediaListener);
    applyTheme();
  });

  onUnmounted(() => {
    prefersDark?.removeEventListener("change", mediaListener);
  });

  return {
    resolvedTheme: () => uiStore.resolvedTheme,
    themePreference: () => uiStore.themePreference,
    setThemePreference: uiStore.setThemePreference,
  };
}
