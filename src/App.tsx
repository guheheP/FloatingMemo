import { useCallback, useEffect, useRef, useState } from "react";
import Editor from "./components/Editor";
import LeftPane, { type LeftPaneMode } from "./components/LeftPane";
import SearchPalette from "./components/SearchPalette";
import SettingsPanel from "./components/SettingsPanel";
import TitleBar from "./components/TitleBar";
import { createNote, listNotes, type Note } from "./api/notes";

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [leftMode, setLeftMode] = useState<LeftPaneMode>("memo");

  const notesRef = useRef<Note[]>([]);
  notesRef.current = notes;

  const refreshNotes = useCallback(async () => {
    const list = await listNotes();
    setNotes(list);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listNotes();
        if (cancelled) return;
        setNotes(list);
        if (list.length > 0) {
          setSelectedId((curr) => curr ?? list[0].id);
        } else {
          setSelectedId("default");
        }
      } catch {
        // ignore — Editor will surface the error if it can't load
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleNewNote = useCallback(async () => {
    try {
      const note = await createNote("", "memo");
      await refreshNotes();
      setSelectedId(note.id);
    } catch (err) {
      // Surface only as console — UI has no toast yet
      console.error("create_note failed", err);
    }
  }, [refreshNotes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === "b") {
        e.preventDefault();
        setCollapsed((v) => !v);
      } else if (k === "n") {
        e.preventDefault();
        void handleNewNote();
      } else if (k === "f") {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key >= "1" && e.key <= "9") {
        const idx = parseInt(e.key, 10) - 1;
        const list = notesRef.current;
        if (list[idx]) {
          e.preventDefault();
          setSelectedId(list[idx].id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleNewNote]);

  const handleContentChange = useCallback(() => {
    void refreshNotes();
  }, [refreshNotes]);

  return (
    <div className="app-shell">
      <TitleBar />
      <main className="app-main">
        <LeftPane
          mode={leftMode}
          onModeChange={setLeftMode}
          notes={notes}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          onNotesChanged={refreshNotes}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
        />
        <section className="app-editor-pane">
          {selectedId && (
            <Editor noteId={selectedId} onContentChange={handleContentChange} />
          )}
        </section>
      </main>
      <SettingsPanel />
      <SearchPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(id) => setSelectedId(id)}
      />
    </div>
  );
}
