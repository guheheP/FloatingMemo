import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getNote, saveNoteContent } from "../api/notes";
import MarkdownPreview from "./MarkdownPreview";

const DEBOUNCE_MS = 500;

type SaveStatus = "idle" | "saving" | "saved" | "error";
type ViewMode = "edit" | "preview";

interface EditorProps {
  noteId: string;
  onContentChange?: (id: string, content: string) => void;
}

export default function Editor({ noteId, onContentChange }: EditorProps) {
  const [content, setContent] = useState<string>("");
  const [loaded, setLoaded] = useState<boolean>(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");

  const lastSavedRef = useRef<string>("");
  const timerRef = useRef<number | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const currentIdRef = useRef<string>(noteId);
  const lastContentRef = useRef<string>("");

  // Synchronous flush: cancel pending timer and persist to a known id.
  const flushFor = async (id: string, text: string): Promise<void> => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (text === lastSavedRef.current && id === currentIdRef.current) {
      setStatus((s) => (s === "saving" ? "saved" : s));
      return;
    }
    try {
      setStatus("saving");
      const note = await saveNoteContent(id, text);
      // Only update last-saved tracker if we're still on the same note
      if (id === currentIdRef.current) {
        lastSavedRef.current = note.content;
        setStatus("saved");
        setErrorMsg(null);
      }
      onContentChange?.(id, note.content);
    } catch (e) {
      setErrorMsg(String(e));
      setStatus("error");
    }
  };

  // Load on noteId change. Flush previous note's pending edits first.
  useEffect(() => {
    let cancelled = false;
    const previousId = currentIdRef.current;
    const previousContent = lastContentRef.current;
    const previousLastSaved = lastSavedRef.current;

    const switchTo = async () => {
      if (
        previousId &&
        previousId !== noteId &&
        previousContent !== previousLastSaved
      ) {
        await flushFor(previousId, previousContent);
      }
      try {
        const note = await getNote(noteId);
        if (cancelled) return;
        currentIdRef.current = noteId;
        setContent(note.content);
        lastContentRef.current = note.content;
        lastSavedRef.current = note.content;
        setLoaded(true);
        setStatus("saved");
        setErrorMsg(null);
        requestAnimationFrame(() => taRef.current?.focus());
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(String(e));
        setStatus("error");
      }
    };
    setLoaded(false);
    void switchTo();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  // Debounced auto-save while editing the current note.
  useEffect(() => {
    lastContentRef.current = content;
    if (!loaded) return;
    if (content === lastSavedRef.current) return;
    setStatus("saving");
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      void flushFor(currentIdRef.current, content);
      timerRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, loaded]);

  // Flush on visibility change / beforeunload — don't lose data when hidden.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        void flushFor(currentIdRef.current, lastContentRef.current);
      }
    };
    const onBeforeUnload = () => {
      void flushFor(currentIdRef.current, lastContentRef.current);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTaskToggle = (next: string) => {
    setContent(next);
    // Persist immediately — clicking a checkbox is an intentional action
    void flushFor(currentIdRef.current, next);
  };

  return (
    <div className="editor-root">
      {viewMode === "edit" ? (
        <textarea
          ref={taRef}
          className="editor-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={() => void flushFor(currentIdRef.current, content)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (e.key === "Escape") {
              e.preventDefault();
              void flushFor(currentIdRef.current, content);
              void invoke("hide_window");
            }
          }}
          placeholder="メモを入力..."
          spellCheck={false}
          disabled={!loaded}
          aria-label="memo content"
        />
      ) : (
        <MarkdownPreview content={content} onTaskToggle={handleTaskToggle} />
      )}
      <div className="editor-status" data-status={status} role="status">
        <div className="editor-status-msg">
          {status === "saving" && "保存中..."}
          {status === "saved" && "保存済み"}
          {status === "idle" && ""}
          {status === "error" && (errorMsg ?? "保存エラー")}
        </div>
        <div className="editor-mode-toggle" role="tablist" aria-label="表示モード">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "edit"}
            className={`editor-mode-btn ${viewMode === "edit" ? "is-active" : ""}`}
            onClick={() => setViewMode("edit")}
          >
            編集
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "preview"}
            className={`editor-mode-btn ${viewMode === "preview" ? "is-active" : ""}`}
            onClick={() => setViewMode("preview")}
          >
            プレビュー
          </button>
        </div>
      </div>
    </div>
  );
}
