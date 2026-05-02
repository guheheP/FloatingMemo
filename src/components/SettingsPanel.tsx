import { useEffect, useRef, useState } from "react";
import {
  loadSettings,
  setSetting,
  type Settings,
  type SettingKey,
} from "../api/settings";

const DEFAULT_SETTINGS: Settings = {
  always_on_top: false,
  autostart: false,
};

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadSettings()
      .then(setSettings)
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggle = (key: SettingKey) => async () => {
    const next = !settings[key];
    const previous = settings;
    setSettings({ ...settings, [key]: next });
    try {
      const updated = await setSetting(key, next);
      setSettings(updated);
      setError(null);
    } catch (e) {
      setSettings(previous);
      setError(String(e));
    }
  };

  return (
    <>
      <button
        type="button"
        className="settings-trigger"
        title="設定"
        aria-label="設定"
        onClick={() => setOpen((v) => !v)}
      >
        ⚙
      </button>
      {open && (
        <div ref={popoverRef} className="settings-popover" role="dialog">
          <div className="settings-row">
            <label>
              <input
                type="checkbox"
                checked={settings.always_on_top}
                onChange={toggle("always_on_top")}
              />
              <span>常に最前面</span>
            </label>
          </div>
          <div className="settings-row">
            <label>
              <input
                type="checkbox"
                checked={settings.autostart}
                onChange={toggle("autostart")}
              />
              <span>OS 起動時に自動起動</span>
            </label>
          </div>
          <div className="settings-hotkey-hint">
            ホットキー: <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Space</kbd>
          </div>
          {error && <div className="settings-error">{error}</div>}
        </div>
      )}
    </>
  );
}
