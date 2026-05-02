import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { loadSettings } from "../api/settings";

export default function TitleBar() {
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    loadSettings()
      .then((s) => setPinned(s.always_on_top))
      .catch(() => undefined);
  }, []);

  const togglePin = async () => {
    try {
      const next = await invoke<boolean>("toggle_always_on_top");
      setPinned(next);
    } catch {
      // intentionally swallow — pin is non-critical
    }
  };

  const minimize = () => {
    void invoke("minimize_window");
  };

  const close = () => {
    void invoke("hide_window");
  };

  const stopDrag = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="titlebar"
      data-tauri-drag-region
      onDoubleClick={(e) => e.preventDefault()}
    >
      <div className="titlebar-leading" data-tauri-drag-region>
        <span className="titlebar-app" data-tauri-drag-region>
          FloatingMemo
        </span>
      </div>
      <div className="titlebar-trailing">
        <button
          type="button"
          className={`titlebar-btn ${pinned ? "is-active" : ""}`}
          title={pinned ? "最前面を解除" : "常に最前面"}
          aria-label="常に最前面"
          aria-pressed={pinned}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            stopDrag(e);
            void togglePin();
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
            <path
              d="M9.5 1.5l5 5-2 2-1.5-.5-3.5 3.5v3l-1 1-3-3-3 3-1-1 3-3-3-3 1-1h3l3.5-3.5L7.5 3.5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          className="titlebar-btn"
          title="最小化"
          aria-label="最小化"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            stopDrag(e);
            minimize();
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.1" />
          </svg>
        </button>
        <button
          type="button"
          className="titlebar-btn titlebar-close"
          title="閉じる (トレイに格納)"
          aria-label="閉じる"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            stopDrag(e);
            close();
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <path
              d="M2 2 L10 10 M10 2 L2 10"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
