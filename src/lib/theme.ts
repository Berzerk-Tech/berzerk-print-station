import { getCurrentWindow } from "@tauri-apps/api/window";

export type Theme = "dark" | "light";

const STORAGE_KEY = "berzerk_theme";
const DEFAULT_THEME: Theme = "dark";

export function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "dark" || v === "light") return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}

export function setTheme(t: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, t);
  } catch {
    /* ignore */
  }
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", t);
  }
  // Tauri Window setTheme propaga pro chrome do SO (title bar, scrollbars).
  // Em ambiente não-Tauri (testes, etc), falha silenciosamente.
  try {
    void getCurrentWindow()
      .setTheme(t)
      .catch(() => {});
  } catch {
    /* ignore */
  }
}

/** Aplica o tema persistido no <html data-theme=…>. Chamar antes do React montar. */
export function applyStoredTheme(): void {
  setTheme(getStoredTheme());
}
