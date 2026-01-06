import { defineStore } from "pinia";
import type { ThemePreference } from "@/types/player";
import { storage } from "@/utils/storage";

const THEME_STORAGE_KEY = "joyful.theme.pref";
const PANEL_STORAGE_KEY = "joyful.panel.pref";

type SidePanelTab = "lyrics" | "playlist";

interface PanelPreference {
  open: boolean;
  tab: SidePanelTab;
  mobileOpen: boolean;
}

export interface UiState {
  themePreference: ThemePreference;
  resolvedTheme: "light" | "dark";
  lyricsVisible: boolean;
  mobileLyricsOpen: boolean;
  sidePanelOpen: boolean;
  sidePanelTab: SidePanelTab;
}

export const useUiStore = defineStore("ui", {
  state: (): UiState => {
    const panelPref = storage.get<PanelPreference>(PANEL_STORAGE_KEY, {
      open: false,
      tab: "lyrics",
      mobileOpen: false,
    });
    return {
      themePreference: storage.get<ThemePreference>(THEME_STORAGE_KEY, "system"),
      resolvedTheme: "light",
      lyricsVisible: panelPref.tab === "lyrics",
      mobileLyricsOpen: panelPref.mobileOpen,
      sidePanelOpen: panelPref.open,
      sidePanelTab: panelPref.tab,
    };
  },
  actions: {
    persistPanelState(): void {
      storage.set<PanelPreference>(PANEL_STORAGE_KEY, {
        open: this.sidePanelOpen,
        tab: this.sidePanelTab,
        mobileOpen: this.mobileLyricsOpen,
      });
    },
    setThemePreference(theme: ThemePreference): void {
      this.themePreference = theme;
      storage.set(THEME_STORAGE_KEY, theme);
    },
    setResolvedTheme(theme: "light" | "dark"): void {
      this.resolvedTheme = theme;
    },
    setLyricsVisible(visible: boolean): void {
      this.lyricsVisible = visible;
      this.sidePanelTab = visible ? "lyrics" : "playlist";
      this.persistPanelState();
    },
    setMobileLyricsOpen(open: boolean): void {
      this.mobileLyricsOpen = open;
      this.persistPanelState();
    },
    setSidePanelOpen(open: boolean): void {
      this.sidePanelOpen = open;
      this.persistPanelState();
    },
    setSidePanelTab(tab: SidePanelTab): void {
      this.sidePanelTab = tab;
      this.lyricsVisible = tab === "lyrics";
      this.persistPanelState();
    },
    openSidePanel(view: SidePanelTab = "lyrics"): void {
      this.sidePanelOpen = true;
      this.sidePanelTab = view;
      this.lyricsVisible = view === "lyrics";
      this.persistPanelState();
    },
    closeSidePanel(): void {
      this.sidePanelOpen = false;
      this.mobileLyricsOpen = false;
      this.persistPanelState();
    },
  },
});
