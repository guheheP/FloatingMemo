import { invoke } from "@tauri-apps/api/core";

export interface Settings {
  always_on_top: boolean;
  autostart: boolean;
}

export type SettingKey = "always_on_top" | "autostart";

export function loadSettings(): Promise<Settings> {
  return invoke<Settings>("load_settings");
}

export function setSetting(key: SettingKey, value: boolean): Promise<Settings> {
  return invoke<Settings>("set_setting", { key, value });
}
