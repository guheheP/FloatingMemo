import CalendarView from "./CalendarView";
import Sidebar from "./Sidebar";
import TodoView from "./TodoView";
import type { Note } from "../api/notes";

export type LeftPaneMode = "memo" | "calendar" | "todo";

interface LeftPaneProps {
  mode: LeftPaneMode;
  onModeChange: (mode: LeftPaneMode) => void;
  notes: Note[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNotesChanged: () => Promise<void> | void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function LeftPane({
  mode,
  onModeChange,
  notes,
  selectedId,
  onSelect,
  onNotesChanged,
  collapsed,
  onToggleCollapsed,
}: LeftPaneProps) {
  if (collapsed) {
    return (
      <Sidebar
        notes={notes}
        selectedId={selectedId}
        onSelect={onSelect}
        onNotesChanged={onNotesChanged}
        collapsed
        onToggleCollapsed={onToggleCollapsed}
      />
    );
  }

  return (
    <aside className={`left-pane left-pane-${mode}`}>
      <div className="left-pane-content">
        {mode === "memo" && (
          <Sidebar
            notes={notes.filter((n) => n.kind === "memo")}
            selectedId={selectedId}
            onSelect={onSelect}
            onNotesChanged={onNotesChanged}
            collapsed={false}
            onToggleCollapsed={onToggleCollapsed}
          />
        )}
        {mode === "calendar" && (
          <CalendarView
            selectedId={selectedId}
            onSelect={onSelect}
            onNotesChanged={onNotesChanged}
          />
        )}
        {mode === "todo" && (
          <TodoView
            selectedId={selectedId}
            onSelect={onSelect}
            onNotesChanged={onNotesChanged}
          />
        )}
      </div>
      <nav className="bottom-tabs" aria-label="表示切替">
        <button
          type="button"
          className={`bottom-tab ${mode === "memo" ? "is-active" : ""}`}
          aria-pressed={mode === "memo"}
          onClick={() => onModeChange("memo")}
        >
          メモ
        </button>
        <button
          type="button"
          className={`bottom-tab ${mode === "calendar" ? "is-active" : ""}`}
          aria-pressed={mode === "calendar"}
          onClick={() => onModeChange("calendar")}
        >
          カレンダー
        </button>
        <button
          type="button"
          className={`bottom-tab ${mode === "todo" ? "is-active" : ""}`}
          aria-pressed={mode === "todo"}
          onClick={() => onModeChange("todo")}
        >
          TODO
        </button>
      </nav>
    </aside>
  );
}
