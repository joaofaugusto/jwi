import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { marked } from "marked";
import { Eye, Pencil, ChevronUp, ChevronDown, X, Bold, Italic, Strikethrough, Code, Highlighter, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Link as LinkIcon, Image as ImageIcon } from "lucide-react";

interface Props {
  path: string;
  content: string;
  initialScrollTop?: number;
  onChange: (content: string) => void;
  onScrollTop?: (pos: number) => void;
}

marked.use({ breaks: true });

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildHighlightHtml(
  content: string,
  matches: Array<{ start: number; end: number }>,
  currentIdx: number,
): string {
  let result = "";
  let last = 0;
  for (let i = 0; i < matches.length; i++) {
    const { start, end } = matches[i];
    result += escapeHtml(content.slice(last, start));
    const bg = i === currentIdx ? "rgba(255,149,0,0.6)" : "rgba(255,214,10,0.45)";
    result += `<mark style="background:${bg};border-radius:2px;color:transparent">${escapeHtml(content.slice(start, end))}</mark>`;
    last = end;
  }
  return result + escapeHtml(content.slice(last));
}

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

interface ToolbarState {
  clientX: number;
  clientY: number;
  start: number;
  end: number;
}

/** Returns true only if `text` is exactly wrapped with `open`/`close` markers,
 *  with special handling to distinguish `*` from `**`. */
function isWrappedWith(text: string, open: string, close: string): boolean {
  if (text.length <= open.length + close.length) return false;
  if (!text.startsWith(open) || !text.endsWith(close)) return false;
  // Prevent `*` from matching `**wrapped**`
  if (open === "*" && text[1] === "*") return false;
  if (close === "*" && text[text.length - 2] === "*") return false;
  return true;
}

export default function Editor({ path, content, initialScrollTop, onChange, onScrollTop }: Props) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollSaveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Find & Replace
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [findIndex, setFindIndex] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);
  const prevFindQuery = useRef("");

  const fileName = path.split(/[/\\]/).pop()?.replace(/\.md$/, "") ?? "";

  const renderedHtml = useMemo(() => renderMarkdown(content), [content]);

  const matches = useMemo(() => {
    if (!findQuery) return [];
    const results: Array<{ start: number; end: number }> = [];
    const q = findQuery.toLowerCase();
    const c = content.toLowerCase();
    let pos = 0;
    while (pos < c.length) {
      const idx = c.indexOf(q, pos);
      if (idx === -1) break;
      results.push({ start: idx, end: idx + findQuery.length });
      pos = idx + 1;
    }
    return results;
  }, [content, findQuery]);

  const wordCount = useMemo(() => {
    const stripped = content.replace(/==|\*\*|\*|~~|`+|#+\s|>\s/g, " ");
    return stripped.trim() ? stripped.trim().split(/\s+/).length : 0;
  }, [content]);

  const charCount = content.length;

  const [toolbar, setToolbar] = useState<ToolbarState | null>(null);

  const applyFormatToRange = useCallback(
    (marker: string, start: number, end: number, closeMarker?: string) => {
      const ta = textareaRef.current;
      if (!ta || start === end) return;
      const close = closeMarker ?? marker;
      const selected = content.substring(start, end);
      const before = content.substring(0, start);
      const after = content.substring(end);
      if (isWrappedWith(selected, marker, close)) {
        const unwrapped = selected.slice(marker.length, selected.length - close.length);
        onChange(before + unwrapped + after);
        setTimeout(() => { ta.selectionStart = start; ta.selectionEnd = start + unwrapped.length; }, 0);
      } else {
        onChange(before + `${marker}${selected}${close}` + after);
        setTimeout(() => { ta.selectionStart = start + marker.length; ta.selectionEnd = end + marker.length; }, 0);
      }
    },
    [content, onChange],
  );

  const applyLineFormat = useCallback(
    (prefix: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const cursor = ta.selectionStart;
      const lineStart = content.lastIndexOf("\n", cursor - 1) + 1;
      const lineEnd = content.indexOf("\n", cursor);
      const end = lineEnd === -1 ? content.length : lineEnd;
      const line = content.slice(lineStart, end);
      // Detect any existing heading/list/blockquote prefix to strip
      const existing = line.match(/^(#{1,3} |[-*] |> |\d+\. )/);
      let newLine: string;
      if (existing && existing[0] === prefix) {
        newLine = line.slice(existing[0].length);
      } else if (existing) {
        newLine = prefix + line.slice(existing[0].length);
      } else {
        newLine = prefix + line;
      }
      const newContent = content.slice(0, lineStart) + newLine + content.slice(end);
      onChange(newContent);
      setTimeout(() => {
        ta.selectionStart = lineStart + prefix.length;
        ta.selectionEnd = lineStart + prefix.length;
        ta.focus();
      }, 0);
    },
    [content, onChange],
  );

  const insertLink = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end) || "text";
    const inserted = `[${selected}](url)`;
    const newContent = content.slice(0, start) + inserted + content.slice(end);
    onChange(newContent);
    const urlStart = start + selected.length + 3;
    setTimeout(() => { ta.selectionStart = urlStart; ta.selectionEnd = urlStart + 3; ta.focus(); }, 0);
  }, [content, onChange]);

  const insertImage = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const inserted = `![alt](url)`;
    const newContent = content.slice(0, start) + inserted + content.slice(start);
    onChange(newContent);
    setTimeout(() => { ta.selectionStart = start + 2; ta.selectionEnd = start + 5; ta.focus(); }, 0);
  }, [content, onChange]);

  const handleTextareaMouseUp = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;
      const { selectionStart: start, selectionEnd: end } = ta;
      if (start === end) { setToolbar(null); return; }
      setToolbar({ clientX: e.clientX, clientY: e.clientY, start, end });
    },
    [],
  );
  useEffect(() => {
    if (mode === "edit") {
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [mode]);

  // Restore scroll position on mount
  useEffect(() => {
    if (initialScrollTop && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = initialScrollTop;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global Ctrl+F — open find bar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setFindOpen(true);
        if (mode === "preview") setMode("edit");
        setTimeout(() => findInputRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode]);

  // Reset to first match when query changes
  useEffect(() => {
    if (findQuery === prevFindQuery.current) return;
    prevFindQuery.current = findQuery;
    setFindIndex(0);
  }, [findQuery]);

  const navigateTo = useCallback(
    (index: number) => {
      if (!matches[index]) return;
      setFindIndex(index);
    },
    [matches],
  );

  const goNext = useCallback(() => {
    if (!matches.length) return;
    navigateTo((findIndex + 1) % matches.length);
  }, [findIndex, matches, navigateTo]);

  const goPrev = useCallback(() => {
    if (!matches.length) return;
    navigateTo((findIndex - 1 + matches.length) % matches.length);
  }, [findIndex, matches, navigateTo]);

  const handleReplace = useCallback(() => {
    const m = matches[findIndex];
    if (!m) return;
    const next = content.substring(0, m.start) + replaceQuery + content.substring(m.end);
    onChange(next);
    const nextIdx = findIndex < matches.length - 1 ? findIndex : Math.max(0, findIndex - 1);
    setTimeout(() => setFindIndex(nextIdx), 0);
  }, [matches, findIndex, replaceQuery, content, onChange]);

  const handleReplaceAll = useCallback(() => {
    if (!findQuery) return;
    const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    onChange(content.replace(new RegExp(escaped, "gi"), replaceQuery));
    setFindIndex(0);
  }, [findQuery, replaceQuery, content, onChange]);

  const closeFindBar = useCallback(() => {
    setFindOpen(false);
    setFindQuery("");
    setReplaceQuery("");
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;

      // Cmd/Ctrl+S — force save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        window.electronAPI.writeFile(path, content);
        return;
      }

      // Escape — close find bar if open
      if (e.key === "Escape" && findOpen) {
        e.preventDefault();
        closeFindBar();
        return;
      }

      // Tab — insert 2 spaces
      if (e.key === "Tab") {
        e.preventDefault();
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const next = content.substring(0, start) + "  " + content.substring(end);
        onChange(next);
        setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2; }, 0);
        return;
      }

      // Formatting shortcuts — all require a selection
      const start = ta.selectionStart;
      const end = ta.selectionEnd;

      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        applyFormatToRange("**", start, end);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "i") {
        e.preventDefault();
        applyFormatToRange("*", start, end);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        applyFormatToRange("~~", start, end);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault();
        applyFormatToRange("`", start, end);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "h") {
        e.preventDefault();
        applyFormatToRange("==", start, end);
        return;
      }
    },
    [path, content, onChange, findOpen, closeFindBar, applyFormatToRange],
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Find & Replace bar */}
      {findOpen && (
        <div
          className="shrink-0 border-b border-[var(--color-border)]
                     bg-[var(--color-bg-secondary)] px-4 py-2.5 flex flex-col gap-2"
        >
          {/* Find row */}
          <div className="flex items-center gap-2">
            <input
              ref={findInputRef}
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.shiftKey ? goPrev() : goNext(); }
                if (e.key === "Escape") closeFindBar();
              }}
              placeholder="Find…"
              spellCheck={false}
              className="flex-1 h-[26px] px-2 rounded-[var(--radius-sm)]
                         bg-[var(--color-bg-primary)] border border-[var(--color-border)]
                         text-[12px] text-[var(--color-text)] outline-none
                         focus:border-[var(--color-accent)]
                         placeholder:text-[var(--color-text-tertiary)]"
            />
            <span className="text-[11px] text-[var(--color-text-tertiary)] w-[46px] text-center shrink-0">
              {matches.length > 0 ? `${findIndex + 1} / ${matches.length}` : findQuery ? "0 / 0" : ""}
            </span>
            <button onClick={goPrev} disabled={!matches.length}
              className="w-[22px] h-[22px] flex items-center justify-center rounded-[4px]
                         text-[var(--color-text-secondary)] disabled:opacity-30
                         hover:bg-[var(--color-bg-tertiary)] cursor-pointer transition-colors">
              <ChevronUp size={13} strokeWidth={2.5} />
            </button>
            <button onClick={goNext} disabled={!matches.length}
              className="w-[22px] h-[22px] flex items-center justify-center rounded-[4px]
                         text-[var(--color-text-secondary)] disabled:opacity-30
                         hover:bg-[var(--color-bg-tertiary)] cursor-pointer transition-colors">
              <ChevronDown size={13} strokeWidth={2.5} />
            </button>
            <button onClick={closeFindBar}
              className="w-[22px] h-[22px] flex items-center justify-center rounded-[4px]
                         text-[var(--color-text-tertiary)]
                         hover:bg-[var(--color-bg-tertiary)] cursor-pointer transition-colors">
              <X size={13} strokeWidth={2.5} />
            </button>
          </div>
          {/* Replace row */}
          <div className="flex items-center gap-2">
            <input
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleReplace();
                if (e.key === "Escape") closeFindBar();
              }}
              placeholder="Replace…"
              spellCheck={false}
              className="flex-1 h-[26px] px-2 rounded-[var(--radius-sm)]
                         bg-[var(--color-bg-primary)] border border-[var(--color-border)]
                         text-[12px] text-[var(--color-text)] outline-none
                         focus:border-[var(--color-accent)]
                         placeholder:text-[var(--color-text-tertiary)]"
            />
            <button onClick={handleReplace} disabled={!matches.length}
              className="h-[22px] px-2.5 rounded-[4px] text-[11px] font-medium
                         text-[var(--color-text-secondary)] disabled:opacity-30
                         border border-[var(--color-border)]
                         hover:bg-[var(--color-bg-tertiary)] cursor-pointer transition-colors">
              Replace
            </button>
            <button onClick={handleReplaceAll} disabled={!findQuery}
              className="h-[22px] px-2.5 rounded-[4px] text-[11px] font-medium
                         text-[var(--color-text-secondary)] disabled:opacity-30
                         border border-[var(--color-border)]
                         hover:bg-[var(--color-bg-tertiary)] cursor-pointer transition-colors">
              All
            </button>
          </div>
        </div>
      )}
      {mode === "edit" && (
        <div
          className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]
                     px-2 py-1 flex items-center gap-0.5 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Headings */}
          {([
            { icon: Heading1, prefix: "# " },
            { icon: Heading2, prefix: "## " },
            { icon: Heading3, prefix: "### " },
          ] as const).map(({ icon: Icon, prefix }) => (
            <button key={prefix} onClick={() => applyLineFormat(prefix)}
              title={`Heading ${prefix.trim().length}`}
              className="h-[24px] w-[28px] flex items-center justify-center rounded-[4px]
                         text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]
                         hover:text-[var(--color-text)] cursor-pointer transition-colors border-none bg-transparent">
              <Icon size={13} strokeWidth={2} />
            </button>
          ))}
          <div className="w-px h-[14px] bg-[var(--color-border)] mx-0.5 shrink-0" />
          {/* Inline */}
          {([
            { icon: Bold, marker: "**" },
            { icon: Italic, marker: "*" },
            { icon: Strikethrough, marker: "~~" },
            { icon: Code, marker: "`" },
            { icon: Highlighter, marker: "==" },
          ] as const).map(({ icon: Icon, marker }) => (
            <button key={marker} onClick={() => {
              const ta = textareaRef.current;
              if (!ta) return;
              applyFormatToRange(marker, ta.selectionStart, ta.selectionEnd);
            }}
              title={marker}
              className="h-[24px] w-[28px] flex items-center justify-center rounded-[4px]
                         text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]
                         hover:text-[var(--color-text)] cursor-pointer transition-colors border-none bg-transparent">
              <Icon size={13} strokeWidth={2} />
            </button>
          ))}
          <div className="w-px h-[14px] bg-[var(--color-border)] mx-0.5 shrink-0" />
          {/* Block */}
          {([
            { icon: List, prefix: "- " },
            { icon: ListOrdered, prefix: "1. " },
            { icon: Quote, prefix: "> " },
          ] as const).map(({ icon: Icon, prefix }) => (
            <button key={prefix} onClick={() => applyLineFormat(prefix)}
              title={prefix.trim()}
              className="h-[24px] w-[28px] flex items-center justify-center rounded-[4px]
                         text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]
                         hover:text-[var(--color-text)] cursor-pointer transition-colors border-none bg-transparent">
              <Icon size={13} strokeWidth={2} />
            </button>
          ))}
          <div className="w-px h-[14px] bg-[var(--color-border)] mx-0.5 shrink-0" />
          {/* Link / Image */}
          <button onClick={insertLink} title="Insert link"
            className="h-[24px] w-[28px] flex items-center justify-center rounded-[4px]
                       text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]
                       hover:text-[var(--color-text)] cursor-pointer transition-colors border-none bg-transparent">
            <LinkIcon size={13} strokeWidth={2} />
          </button>
          <button onClick={insertImage} title="Insert image"
            className="h-[24px] w-[28px] flex items-center justify-center rounded-[4px]
                       text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]
                       hover:text-[var(--color-text)] cursor-pointer transition-colors border-none bg-transparent">
            <ImageIcon size={13} strokeWidth={2} />
          </button>
        </div>
      )}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto selectable"
        onScroll={() => {
          setToolbar(null);
          if (!onScrollTop || !scrollContainerRef.current) return;
          clearTimeout(scrollSaveTimer.current);
          scrollSaveTimer.current = setTimeout(() => {
            onScrollTop(scrollContainerRef.current?.scrollTop ?? 0);
          }, 150);
        }}
      >
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
            {/* Match highlight overlay */}
            {findOpen && matches.length > 0 && (
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={{
                  fontFamily: "var(--font)",
                  fontSize: "15px",
                  lineHeight: "1.75",
                  wordBreak: "break-word",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "break-word",
                  color: "transparent",
                  padding: 0,
                  minHeight: "calc(100vh - 200px)",
                }}
                dangerouslySetInnerHTML={{
                  __html: buildHighlightHtml(content, matches, findIndex),
                }}
              />
            )}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onMouseUp={handleTextareaMouseUp}
              onSelect={(e) => {
                if (e.currentTarget.selectionStart === e.currentTarget.selectionEnd)
                  setToolbar(null);
              }}
              onBlur={() => setToolbar(null)}
              spellCheck={false}
              className="w-full outline-none resize-none border-none
                         text-[var(--color-text)] min-h-[calc(100vh-200px)]"
              style={{ ...TEXT_STYLE, padding: 0, background: "transparent" }}
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

      {/* Floating format toolbar */}
      {toolbar && mode === "edit" && (
        <div
          style={{
            position: "fixed",
            left: toolbar.clientX,
            top: Math.max(8, toolbar.clientY - 52),
            transform: "translateX(-50%)",
            zIndex: 200,
          }}
          onMouseDown={(e) => e.preventDefault()}
          className="flex items-center gap-px px-1 py-1
                     bg-[var(--color-bg)] rounded-[9px]
                     shadow-[0_4px_24px_rgba(0,0,0,0.14),0_0_0_1px_var(--color-border)]"
        >
          {(
            [
              { marker: "**",  icon: <Bold         size={13} strokeWidth={2.5} />, tip: "Bold (Ctrl+B)"            },
              { marker: "*",   icon: <Italic        size={13} strokeWidth={2.5} />, tip: "Italic (Ctrl+I)"          },
              { marker: "~~",  icon: <Strikethrough size={13} strokeWidth={2.5} />, tip: "Strikethrough (Ctrl+Shift+S)" },
              { marker: "`",   icon: <Code          size={13} strokeWidth={2.5} />, tip: "Code (Ctrl+`)"            },
              { marker: "==",  icon: <Highlighter   size={13} strokeWidth={2.5} />, tip: "Highlight (Ctrl+H)"       },
            ] as const
          ).map(({ marker, icon, tip }) => (
            <button
              key={marker}
              title={tip}
              onClick={() => {
                applyFormatToRange(marker, toolbar.start, toolbar.end);
                setToolbar(null);
              }}
              className="w-[28px] h-[28px] flex items-center justify-center
                         rounded-[6px] cursor-pointer border-none
                         text-[var(--color-text-secondary)]
                         hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text)]
                         transition-colors duration-100"
            >
              {icon}
            </button>
          ))}
        </div>
      )}

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
