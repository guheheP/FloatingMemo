import { useMemo } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { renderMarkdown, toggleTaskAt } from "../lib/markdown";

interface MarkdownPreviewProps {
  content: string;
  onTaskToggle?: (nextSource: string) => void;
}

export default function MarkdownPreview({ content, onTaskToggle }: MarkdownPreviewProps) {
  const html = useMemo(() => renderMarkdown(content), [content]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    const anchor = target.closest("a");
    if (anchor && anchor.href && /^https?:\/\//i.test(anchor.href)) {
      e.preventDefault();
      void openUrl(anchor.href).catch(() => undefined);
      return;
    }

    if (
      target instanceof HTMLInputElement &&
      target.type === "checkbox" &&
      target.classList.contains("task-list-item-checkbox")
    ) {
      e.preventDefault();
      const root = e.currentTarget;
      const all = Array.from(
        root.querySelectorAll<HTMLInputElement>("input.task-list-item-checkbox"),
      );
      const idx = all.indexOf(target);
      if (idx >= 0 && onTaskToggle) {
        const next = toggleTaskAt(content, idx);
        onTaskToggle(next);
      }
    }
  };

  return (
    <div
      className="markdown-preview"
      role="article"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
