import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { marked } from "marked";
import { Eye, Pencil } from "lucide-react";

interface Props {
  path: string;
  content: string;
  onChange: (content: string) => void;
}

marked.use({ breaks: true });

function renderMarkdown(md: string): string {
  // Pre-process ==highlight== → <mark> before passing to marked
  const pre = md.replace(/==(.*?)==/gs, (_, t) => `<mark>${t}</mark>`);
  return marked.parse(pre) as string;
}

const TEXT_STYLE: React.CSSProperties = {
  fontFamily: "var(--font)",
  fontSize: "15px",
  lineHeight: "1.75",
  caretColor: "var(--color-accent)",
  wordBreak: "break-word",
};

export default function Editor({ path, content, onChange }: Props) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fileName = path.split(/[/\\]/).pop()?.replace(/\.md$/, "") ?? "";

  const renderedHtml = useMemo(() => renderMarkdown(content), [content]);

  const wordCount = useMemo(() => {
    const stripped = content.replace(/==|\*\*|\*|~~|`+|#+\s|>\s/g, " ");
    return stripped.trim() ? stripped.trim().split(/\s+/).length : 0;
  }, [content]);

  const charCount = content.length;

  // Focus textarea when switching to edit mode
  useEffect(() => {
    if (mode === "edit") {
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [mode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd/Ctrl+S — force save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        window.electronAPI.writeFile(path, content);
        return;
      }

      // Tab — insert 2 spaces
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const next = content.substring(0, start) + "  " + content.substring(end);
        onChange(next);
        setTimeout(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        }, 0);
        return;
      }

      // Cmd/Ctrl+H — toggle ==highlight== on selection
      if ((e.ctrlKey || e.metaKey) && e.key === "h") {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        if (start === end) return;
        const selected = content.substring(start, end);
        const before = content.substring(0, start);
        const after = content.substring(end);
        if (selected.startsWith("==") && selected.endsWith("==") && selected.length > 4) {
          const unwrapped = selected.slice(2, -2);
          onChange(before + unwrapped + after);
          setTimeout(() => {
            ta.selectionStart = start;
            ta.selectionEnd = start + unwrapped.length;
          }, 0);
        } else {
          const wrapped = `==${selected}==`;
          onChange(before + wrapped + after);
          setTimeout(() => {
            ta.selectionStart = start + 2;
            ta.selectionEnd = end + 2;
          }, 0);
        }
      }
    },
    [path, content, onChange],
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto selectable">
        <div className="max-w-2xl mx-auto w-full px-12 py-10 flex flex-col flex-1">
        {/* Title + toggle */}
        <div className="flex items-start justify-between mb-6">
          <h1
            className="text-[26px] font-semibold text-[var(--color-text)]
                       leading-tight tracking-[-0.3px]"
          >
            {fileName || "Untitled"}
          </h1>
          <button
            onClick={() => setMode((m) => (m === "edit" ? "preview" : "edit"))}
            className="mt-1 flex items-center gap-1.5 px-2.5 py-1
                       rounded-[var(--radius-sm)] text-[11px] font-medium
                       text-[var(--color-text-tertiary)] cursor-pointer
                       hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)]
                       transition-colors select-none"
          >
            {mode === "edit" ? (
              <>
                <Eye size={12} strokeWidth={2} />
                Preview
              </>
            ) : (
              <>
                <Pencil size={12} strokeWidth={2} />
                Edit
              </>
            )}
          </button>
        </div>

        {/* Edit mode */}
        {mode === "edit" && (
          <div className="relative flex-1">
            {!content && (
              <span
                className="absolute top-0 left-0 pointer-events-none select-none
                           text-[var(--color-text-tertiary)]"
                style={TEXT_STYLE}
              >
                Start writing…
              </span>
            )}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="w-full outline-none resize-none bg-transparent border-none
                         text-[var(--color-text)] min-h-[calc(100vh-200px)]"
              style={TEXT_STYLE}
            />
          </div>
        )}

        {/* Preview mode */}
        {mode === "preview" && (
          <div
            className="markdown-body flex-1 cursor-text"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
            onClick={() => setMode("edit")}
          />
        )}
      </div>
      </div>

      {/* Status bar */}
      <div
        className="shrink-0 border-t border-[var(--color-border)]
                   px-4 py-1.5 flex items-center gap-3
                   text-[11px] text-[var(--color-text-tertiary)] select-none"
      >
        <span>{wordCount} {wordCount === 1 ? "word" : "words"}</span>
        <span className="opacity-40">·</span>
        <span>{charCount} {charCount === 1 ? "char" : "chars"}</span>
      </div>
    </div>
  );
}
