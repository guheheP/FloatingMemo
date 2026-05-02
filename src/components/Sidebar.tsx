import { useState } from "react";
import {
  createNote,
  deleteNote,
  setNotePinned,
  updateNoteTitle,
  type Note,
} from "../api/notes";

interface SidebarProps {
  notes: Note[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNotesChanged: () => Promise<void> | void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

function deriveDisplayTitle(note: Note): string {
  if (note.title.trim().length > 0) return note.title;
  const firstLine = note.content.split(/\r?\n/, 1)[0]?.trim() ?? "";
  if (firstLine.length > 0) return firstLine.slice(0, 40);
  return "新規メモ";
}

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < min) return "たった今";
  if (diff < hour) return `${Math.floor(diff / min)}分前`;
  if (diff < day) return `${Math.floor(diff / hour)}時間前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}日前`;
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function Sidebar({
  notes,
  selectedId,
  onSelect,
  onNotesChanged,
  collapsed,
  onToggleCollapsed,
}: SidebarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");

  const handleNew = async () => {
    const note = await createNote("", "memo");
    await onNotesChanged();
    onSelect(note.id);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("このノートを削除しますか?")) return;
    try {
      await deleteNote(id);
      await onNotesChanged();
      if (selectedId === id) {
        const remaining = notes.filter((n) => n.id !== id);
        if (remaining.length > 0) onSelect(remaining[0].id);
      }
    } catch (err) {
      alert(String(err));
    }
  };

  const handlePin = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await setNotePinned(note.id, !note.pinned);
      await onNotesChanged();
    } catch (err) {
      alert(String(err));
    }
  };

  const startRename = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(note.id);
    setRenameValue(note.title);
  };

  const commitRename = async (id: string) => {
    const title = renameValue.trim();
    setRenamingId(null);
    try {
      await updateNoteTitle(id, title);
      await onNotesChanged();
    } catch (err) {
      alert(String(err));
    }
  };

  if (collapsed) {
    return (
      <aside className="sidebar is-collapsed">
        <button
          type="button"
          className="sidebar-toggle"
          title="サイドバーを開く"
          aria-label="サイドバーを開く"
          onClick={onToggleCollapsed}
        >
          ›
        </button>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button
          type="button"
          className="sidebar-new"
          title="新規ノート"
          aria-label="新規ノート"
          onClick={() => void handleNew()}
        >
          ＋
        </button>
        <span className="sidebar-title">ノート</span>
        <button
          type="button"
          className="sidebar-toggle"
          title="サイドバーを閉じる"
          aria-label="サイドバーを閉じる"
          onClick={onToggleCollapsed}
        >
          ‹
        </button>
      </div>
      <div className="sidebar-list" role="list">
        {notes.length === 0 && <div className="sidebar-empty">ノートがありません</div>}
        {notes.map((note) => {
          const active = note.id === selectedId;
          const renaming = renamingId === note.id;
          return (
            <div
              key={note.id}
              role="listitem"
              className={`sidebar-item ${active ? "is-active" : ""} ${
                note.pinned ? "is-pinned" : ""
              }`}
              onClick={() => onSelect(note.id)}
              onDoubleClick={(e) => startRename(note, e)}
              tabIndex={0}
            >
              <div className="sidebar-item-main">
                {renaming ? (
                  <input
                    autoFocus
                    className="sidebar-rename"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void commitRename(note.id);
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        setRenamingId(null);
                      }
                    }}
                    onBlur={() => void commitRename(note.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="sidebar-item-title">
                    {note.pinned && (
                      <span className="sidebar-pin-mark" aria-hidden>
                        ◆
                      </span>
                    )}
                    {deriveDisplayTitle(note)}
                  </div>
                )}
                <div className="sidebar-item-meta">{formatRelative(note.updated_at)}</div>
              </div>
              <div className="sidebar-item-actions">
                <button
                  type="button"
                  className={`sidebar-action ${note.pinned ? "is-active" : ""}`}
                  title={note.pinned ? "ピン解除" : "ピン留め"}
                  aria-label="ピン留め"
                  onClick={(e) => void handlePin(note, e)}
                >
                  ◆
                </button>
                {note.id !== "default" && (
                  <button
                    type="button"
                    className="sidebar-action sidebar-delete"
                    title="削除"
                    aria-label="削除"
                    onClick={(e) => void handleDelete(note.id, e)}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
