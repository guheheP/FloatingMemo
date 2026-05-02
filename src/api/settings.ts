import { invoke } from "@tauri-apps/api/core";

export type Theme = "auto" | "light" | "dark";

export interface Settings {
  always_on_top: boolean;
  autostart: boolean;
  theme: Theme;
}

export type SettingKey = "always_on_top" | "autostart";

export function loadSettings(): Promise<Settings> {
  return invoke<Settings>("load_settings");
}

export function setSetting(key: SettingKey, value: boolean): Promise<Settings> {
  return invoke<Settings>("set_setting", { key, value });
}

export function setTheme(theme: Theme): Promise<Settings> {
  return invoke<Settings>("set_string_setting", { key: "theme", value: theme });
}

export function applyThemeToDom(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}
