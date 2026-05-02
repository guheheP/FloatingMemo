import { useCallback, useEffect, useState } from "react";
import Editor from "./components/Editor";
import SettingsPanel from "./components/SettingsPanel";
import Sidebar from "./components/Sidebar";
import TitleBar from "./components/TitleBar";
import { listNotes, type Note } from "./api/notes";

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(false);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleContentChange = useCallback(() => {
    void refreshNotes();
  }, [refreshNotes]);

  return (
    <div className="app-shell">
      <TitleBar />
      <main className="app-main">
        <Sidebar
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
    </div>
  );
}
