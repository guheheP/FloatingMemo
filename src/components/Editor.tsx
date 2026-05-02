import { useEffect, useRef, useState } from "react";
import { loadDefaultNote, saveNote } from "../api/notes";

const DEBOUNCE_MS = 500;

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function Editor() {
  const [content, setContent] = useState<string>("");
  const [loaded, setLoaded] = useState<boolean>(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const lastSavedRef = useRef<string>("");
  const timerRef = useRef<number | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDefaultNote()
      .then((note) => {
        if (cancelled) return;
        setContent(note.content);
        lastSavedRef.current = note.content;
        setLoaded(true);
        requestAnimationFrame(() => taRef.current?.focus());
      })
      .catch((e) => {
        if (cancelled) return;
        setErrorMsg(String(e));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const flush = (next: string) => {
    if (next === lastSavedRef.current) {
      setStatus((s) => (s === "saving" ? "saved" : s));
      return;
    }
    setStatus("saving");
    saveNote(next)
      .then((note) => {
        lastSavedRef.current = note.content;
        setStatus("saved");
        setErrorMsg(null);
      })
      .catch((e) => {
        setErrorMsg(String(e));
        setStatus("error");
      });
  };

  useEffect(() => {
    if (!loaded) return;
    if (content === lastSavedRef.current) return;
    setStatus("saving");
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      flush(content);
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

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush(content);
    };
    const onBeforeUnload = () => flush(content);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  return (
    <div className="editor-root">
      <textarea
        ref={taRef}
        className="editor-textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={() => flush(content)}
        placeholder="メモを入力..."
        spellCheck={false}
        disabled={!loaded}
        aria-label="memo content"
      />
      <div className="editor-status" data-status={status} role="status">
        {status === "saving" && "保存中..."}
        {status === "saved" && "保存済み"}
        {status === "idle" && ""}
        {status === "error" && (errorMsg ?? "保存エラー")}
      </div>
    </div>
  );
}
