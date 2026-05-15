import { useRef, useEffect, useCallback } from "react";

interface Props {
  path: string;
  content: string;
  onChange: (content: string) => void;
}

// Markdown ↔ HTML conversion
// Storage format: ==text== for highlights, \n for line breaks
// DOM format:    <mark>text</mark>, <br> for line breaks

function markdownToHtml(md: string): string {
  if (!md) return "";
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/==([\s\S]*?)==/g, "<mark>$1</mark>")
    .replace(/\n/g, "<br>");
}

function htmlToMarkdown(html: string): string {
  if (!html) return "";
  return html
    .replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, "==$1==")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<div[^>]*>\s*<br\s*\/?>\s*<\/div>/gi, "\n")
    .replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, "\n$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/^\n/, "");
}

const TEXT_STYLE: React.CSSProperties = {
  fontFamily: "var(--font)",
  fontSize: "15px",
  lineHeight: "1.75",
  caretColor: "var(--color-accent)",
  wordBreak: "break-word",
};

export default function Editor({ path, content, onChange }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  // Track the last markdown value we rendered, to skip re-renders from our own onChange
  const renderedContent = useRef<string | null>(null);

  const fileName = path.split(/[/\\]/).pop()?.replace(/\.md$/, "") ?? "";

  // Sync DOM when content changes from outside (initial load / file switch)
  useEffect(() => {
    const div = divRef.current;
    if (!div) return;
    if (content === renderedContent.current) return; // our own keystroke came back, skip
    renderedContent.current = content;
    div.innerHTML = markdownToHtml(content);
  }, [content]);

  const getMarkdown = useCallback(
    () => htmlToMarkdown(divRef.current?.innerHTML ?? ""),
    [],
  );

  const handleInput = useCallback(() => {
    const md = getMarkdown();
    renderedContent.current = md;
    onChange(md);
  }, [onChange, getMarkdown]);

  // Paste as plain text only
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Cmd/Ctrl+S — force save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        window.electronAPI.writeFile(path, getMarkdown());
        return;
      }

      // Cmd/Ctrl+H — toggle highlight on selection
      if ((e.ctrlKey || e.metaKey) && e.key === "h") {
        e.preventDefault();
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount || sel.isCollapsed) return;

        const range = sel.getRangeAt(0);
        const node = range.commonAncestorContainer;
        const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
        const existingMark = el?.closest("mark");

        if (existingMark) {
          // Unwrap: move children before the mark, then remove it
          const parent = existingMark.parentNode!;
          while (existingMark.firstChild) {
            parent.insertBefore(existingMark.firstChild, existingMark);
          }
          parent.removeChild(existingMark);
          parent.normalize();
        } else {
          // Wrap selection in <mark>
          const mark = document.createElement("mark");
          mark.appendChild(range.extractContents());
          range.insertNode(mark);
          sel.removeAllRanges();
          const newRange = document.createRange();
          newRange.selectNodeContents(mark);
          sel.addRange(newRange);
        }

        const md = getMarkdown();
        renderedContent.current = md;
        onChange(md);
      }
    },
    [path, onChange, getMarkdown],
  );

  return (
    <div className="flex-1 overflow-y-auto selectable">
      <div className="max-w-2xl mx-auto px-12 py-10">
        <h1
          className="text-[26px] font-semibold text-[var(--color-text)]
                     mb-6 leading-tight tracking-[-0.3px]"
        >
          {fileName || "Untitled"}
        </h1>

        <div className="relative">
          {!content && (
            <span
              className="absolute top-0 left-0 pointer-events-none select-none
                         text-[var(--color-text-tertiary)]"
              style={TEXT_STYLE}
            >
              Start writing…
            </span>
          )}
          <div
            ref={divRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className="w-full outline-none min-h-[calc(100vh-200px)]
                       text-[var(--color-text)]"
            style={TEXT_STYLE}
          />
        </div>
      </div>
    </div>
  );
}
