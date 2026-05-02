import { useEffect, useMemo, useRef, useState } from "react";
import { listNotes, searchNotes, type Note } from "../api/notes";

interface SearchPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}

function deriveDisplayTitle(note: Note): string {
  if (note.title.trim().length > 0) return note.title;
  const firstLine = note.content.split(/\r?\n/, 1)[0]?.trim() ?? "";
  if (firstLine.length > 0) return firstLine.slice(0, 60);
  return "新規メモ";
}

function snippet(content: string, query: string): string {
  if (!query.trim()) {
    return content.replace(/\s+/g, " ").slice(0, 80);
  }
  const idx = content.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return content.replace(/\s+/g, " ").slice(0, 80);
  const start = Math.max(0, idx - 20);
  const end = Math.min(content.length, idx + query.length + 40);
  const head = start > 0 ? "…" : "";
  const tail = end < content.length ? "…" : "";
  return head + content.slice(start, end).replace(/\s+/g, " ") + tail;
}

export default function SearchPalette({ open, onClose, onSelect }: SearchPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Note[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      listNotes()
        .then((list) => setResults(list.slice(0, 50)))
        .catch(() => setResults([]));
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      const fn = query.trim().length === 0 ? listNotes() : searchNotes(query, 50);
      fn
        .then((list) => {
          if (cancelled) return;
          setResults(list);
          setActiveIdx(0);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        });
    }, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, open]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-idx="${activeIdx}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, results.length]);

  const placeholder = useMemo(
    () => `検索 (${results.length}件)`,
    [results.length],
  );

  if (!open) return null;

  const choose = (n: Note) => {
    onSelect(n.id);
    onClose();
  };

  return (
    <div
      className="search-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="search-panel">
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx((i) => Math.min(results.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (results[activeIdx]) choose(results[activeIdx]);
            }
          }}
        />
        <div ref={listRef} className="search-results" role="listbox">
          {results.length === 0 && (
            <div className="search-empty">該当なし</div>
          )}
          {results.map((n, i) => (
            <div
              key={n.id}
              role="option"
              data-idx={i}
              aria-selected={i === activeIdx}
              className={`search-result ${i === activeIdx ? "is-active" : ""}`}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(n);
              }}
            >
              <div className="search-result-title">
                {n.pinned && <span className="search-pin" aria-hidden>◆</span>}
                {deriveDisplayTitle(n)}
              </div>
              {n.content && (
                <div className="search-result-snippet">{snippet(n.content, query)}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
