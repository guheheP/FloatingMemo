import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";

const md = new MarkdownIt({
  html: false, // do not allow raw HTML — security
  linkify: true,
  breaks: true,
  typographer: false,
}).use(taskLists, {
  enabled: true,
  label: true,
  labelAfter: false,
});

const defaultLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const aIndex = token.attrIndex("target");
  if (aIndex < 0) {
    token.attrPush(["target", "_blank"]);
  } else {
    token.attrs![aIndex][1] = "_blank";
  }
  const rIndex = token.attrIndex("rel");
  if (rIndex < 0) {
    token.attrPush(["rel", "noopener noreferrer"]);
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

export function renderMarkdown(source: string): string {
  return md.render(source);
}

/**
 * Toggle the n-th `- [ ]` / `- [x]` checkbox in the source text.
 * Returns the new source. nthIndex is 0-based among task list items in document order.
 */
export function toggleTaskAt(source: string, nthIndex: number): string {
  const lines = source.split(/\r?\n/);
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*[-*+]\s+\[)( |x|X)(\])/);
    if (m) {
      if (count === nthIndex) {
        const next = m[2] === " " ? "x" : " ";
        lines[i] = lines[i].replace(/^(\s*[-*+]\s+\[)( |x|X)(\])/, `$1${next}$3`);
        break;
      }
      count++;
    }
  }
  return lines.join("\n");
}
