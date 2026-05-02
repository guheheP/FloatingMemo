import { useEffect, useMemo, useState } from "react";
import {
  createNote,
  listNotesByKind,
  setNoteDone,
  setNoteDueAt,
  type Note,
} from "../api/notes";
import { dateStrFromDate, dateFromStr, todayStr, type DateStr } from "../lib/date";

interface TodoViewProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNotesChanged: () => Promise<void> | void;
}

type Filter = "all" | "pending" | "done";

function deriveDisplayTitle(note: Note): string {
  if (note.title.trim().length > 0) return note.title;
  const firstLine = note.content.split(/\r?\n/, 1)[0]?.trim() ?? "";
  if (firstLine.length > 0) return firstLine.slice(0, 32);
  return "新しいタスク";
}

function dueAtToInputValue(ms: number | null): string {
  if (ms === null) return "";
  const d = new Date(ms);
  return dateStrFromDate(d);
}

function inputValueToDueAt(s: string): number | null {
  if (!s) return null;
  return dateFromStr(s as DateStr).getTime();
}

function dueLabel(due_at: number | null, done: boolean): {
  text: string;
  tone: "future" | "today" | "overdue" | "done" | "none";
} {
  if (done) return { text: "", tone: "done" };
  if (due_at === null) return { text: "", tone: "none" };
  const dueDate = new Date(due_at);
  const due = dateStrFromDate(dueDate);
  const today = todayStr();
  if (due === today) return { text: "今日", tone: "today" };
  if (due < today) return { text: due, tone: "overdue" };
  return { text: due, tone: "future" };
}

export default function TodoView({
  selectedId,
  onSelect,
  onNotesChanged,
}: TodoViewProps) {
  const [todos, setTodos] = useState<Note[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [editingDueId, setEditingDueId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const list = await listNotesByKind("todo");
      setTodos(list);
    } catch {
      setTodos([]);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const visible = useMemo(() => {
    if (filter === "pending") return todos.filter((t) => t.done_at === null);
    if (filter === "done") return todos.filter((t) => t.done_at !== null);
    return todos;
  }, [todos, filter]);

  const handleToggleDone = async (n: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await setNoteDone(n.id, n.done_at === null);
      await refresh();
      await onNotesChanged();
    } catch (err) {
      alert(String(err));
    }
  };

  const handleNew = async () => {
    try {
      const note = await createNote("", "todo");
      await refresh();
      await onNotesChanged();
      onSelect(note.id);
    } catch (err) {
      alert(String(err));
    }
  };

  const handleDueChange = async (n: Note, value: string) => {
    const ms = inputValueToDueAt(value);
    try {
      await setNoteDueAt(n.id, ms);
      await refresh();
      await onNotesChanged();
    } catch (err) {
      alert(String(err));
    } finally {
      setEditingDueId(null);
    }
  };

  return (
    <div className="todo-view">
      <div className="todo-header">
        <button
          type="button"
          className="todo-new"
          aria-label="新規タスク"
          title="新規タスク"
          onClick={() => void handleNew()}
        >
          ＋
        </button>
        <div className="todo-filter" role="radiogroup" aria-label="フィルタ">
          {(["all", "pending", "done"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={filter === f}
              className={`todo-filter-btn ${filter === f ? "is-active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "全て" : f === "pending" ? "未完了" : "完了"}
            </button>
          ))}
        </div>
      </div>
      <div className="todo-list" role="list">
        {visible.length === 0 && (
          <div className="todo-empty">タスクがありません</div>
        )}
        {visible.map((t) => {
          const done = t.done_at !== null;
          const due = dueLabel(t.due_at, done);
          const editingDue = editingDueId === t.id;
          return (
            <div
              key={t.id}
              role="listitem"
              className={`todo-item ${t.id === selectedId ? "is-active" : ""} ${
                done ? "is-done" : ""
              }`}
              onClick={() => onSelect(t.id)}
            >
              <button
                type="button"
                className={`todo-check ${done ? "is-checked" : ""}`}
                aria-pressed={done}
                aria-label={done ? "未完了に戻す" : "完了にする"}
                onClick={(e) => void handleToggleDone(t, e)}
              >
                {done ? "✓" : ""}
              </button>
              <div className="todo-item-main">
                <div className="todo-item-title">{deriveDisplayTitle(t)}</div>
              </div>
              {editingDue ? (
                <input
                  autoFocus
                  type="date"
                  className="todo-due-input"
                  defaultValue={dueAtToInputValue(t.due_at)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => void handleDueChange(t, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setEditingDueId(null);
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  className={`todo-due todo-due-${due.tone}`}
                  title={due.text || "期限を設定"}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingDueId(t.id);
                  }}
                >
                  {due.text || "期限なし"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
