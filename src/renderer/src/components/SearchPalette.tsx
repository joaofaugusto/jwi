import { useState, useEffect, useRef, useMemo } from "react";
import { Search, FileText, Loader } from "lucide-react";
import { FsEntry } from "../types";

interface Props {
  tree: FsEntry[];
  onSelect: (path: string) => void;
  onClose: () => void;
}

interface FlatFile {
  name: string;
  path: string;
  folder: string;
}

function flattenFiles(entries: FsEntry[], folder = ""): FlatFile[] {
  const result: FlatFile[] = [];
  for (const e of entries) {
    if (e.isFolder) {
      const sub = folder ? `${folder}/${e.name}` : e.name;
      result.push(...flattenFiles(e.children ?? [], sub));
    } else {
      result.push({ name: e.name.replace(/\.md$/, ""), path: e.path, folder });
    }
  }
  return result;
}

// ── File-name search ──────────────────────────────────────────

interface FileResult {
  file: FlatFile;
  score: number;
  matchIndices: number[];
}

function searchFiles(query: string, files: FlatFile[]): FileResult[] {
  if (!query.trim()) {
    return files
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((file) => ({ file, score: 0, matchIndices: [] }));
  }

  const q = query.toLowerCase();
  const results: FileResult[] = [];

  for (const file of files) {
    const name = file.name.toLowerCase();
    const subIdx = name.indexOf(q);
    if (subIdx !== -1) {
      results.push({
        file,
        score: 1000 + (q.length / name.length) * 100 - subIdx,
        matchIndices: Array.from({ length: q.length }, (_, i) => subIdx + i),
      });
      continue;
    }
    const indices: number[] = [];
    let qi = 0, score = 0, lastIdx = -1;
    for (let i = 0; i < name.length && qi < q.length; i++) {
      if (name[i] === q[qi]) {
        indices.push(i);
        score += lastIdx === i - 1 ? 5 : 1;
        lastIdx = i;
        qi++;
      }
    }
    if (qi === q.length) results.push({ file, score, matchIndices: indices });
  }
  return results.sort((a, b) => b.score - a.score);
}

function HighlightedName({ name, indices }: { name: string; indices: number[] }) {
  if (!indices.length) return <>{name}</>;
  const set = new Set(indices);
  return (
    <>
      {name.split("").map((char, i) =>
        set.has(i) ? (
          <span key={i} className="text-[var(--color-accent)] font-semibold">{char}</span>
        ) : (
          <span key={i}>{char}</span>
        ),
      )}
    </>
  );
}

// ── Body-content search ───────────────────────────────────────

interface ContentResult {
  file: FlatFile;
  snippet: string;
  hlStart: number;
  hlEnd: number;
}

function extractSnippet(body: string, idx: number, len: number) {
  const RADIUS = 55;
  const start = Math.max(0, idx - RADIUS);
  const end = Math.min(body.length, idx + len + RADIUS);
  const hasPre = start > 0;
  const hasSuf = end < body.length;
  const text =
    (hasPre ? "…" : "") +
    body.slice(start, end).replace(/\n+/g, " ") +
    (hasSuf ? "…" : "");
  const hlStart = (hasPre ? 1 : 0) + (idx - start);
  return { text, hlStart, hlEnd: hlStart + len };
}

function searchContent(
  query: string,
  index: Map<string, string>,
  files: FlatFile[],
): ContentResult[] {
  if (!query.trim() || index.size === 0) return [];
  const q = query.toLowerCase();
  const results: ContentResult[] = [];
  for (const file of files) {
    const raw = index.get(file.path) ?? "";
    const body = raw.replace(/==|#+\s|[*~`>]/g, "");
    const idx = body.toLowerCase().indexOf(q);
    if (idx === -1) continue;
    const { text, hlStart, hlEnd } = extractSnippet(body, idx, q.length);
    results.push({ file, snippet: text, hlStart, hlEnd });
  }
  return results;
}

function SnippetView({
  text, hlStart, hlEnd, active,
}: {
  text: string; hlStart: number; hlEnd: number; active: boolean;
}) {
  return (
    <span className={`text-[11px] ${active ? "text-white/60" : "text-[var(--color-text-tertiary)]"}`}>
      {text.slice(0, hlStart)}
      <mark className={`rounded-[2px] font-medium not-italic ${
        active ? "bg-white/25 text-white" : "bg-[rgba(255,214,10,0.5)] text-[var(--color-text)]"
      }`}>
        {text.slice(hlStart, hlEnd)}
      </mark>
      {text.slice(hlEnd)}
    </span>
  );
}

export default function SearchPalette({ tree, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<"files" | "content">("files");
  const [contentIndex, setContentIndex] = useState<Map<string, string>>(new Map());
  const [isIndexing, setIsIndexing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allFiles = useMemo(() => flattenFiles(tree), [tree]);
  const fileResults = useMemo(() => searchFiles(query, allFiles), [query, allFiles]);
  const contentResults = useMemo(
    () => (mode === "content" && !isIndexing ? searchContent(query, contentIndex, allFiles) : []),
    [mode, query, contentIndex, allFiles, isIndexing],
  );

  const visibleFiles = mode === "files" ? fileResults.slice(0, 10) : [];
  const visibleContent = mode === "content" ? contentResults.slice(0, 10) : [];
  const visibleLen = mode === "files" ? visibleFiles.length : visibleContent.length;

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setSelectedIndex(0); }, [query, mode]);

  // Build content index on first switch to content mode
  useEffect(() => {
    if (mode !== "content" || contentIndex.size > 0 || isIndexing) return;
    setIsIndexing(true);
    Promise.all(
      allFiles.map((f) =>
        window.electronAPI
          .readFile(f.path)
          .then((body) => [f.path, body] as const)
          .catch(() => [f.path, ""] as const),
      ),
    ).then((entries) => {
      setContentIndex(new Map(entries));
      setIsIndexing(false);
    });
  }, [mode, allFiles, contentIndex.size, isIndexing]);

  // Scroll selected item into view
  useEffect(() => {
    const item = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const openSelected = (index: number) => {
    const path =
      mode === "files" ? visibleFiles[index]?.file.path : visibleContent[index]?.file.path;
    if (path) { onSelect(path); onClose(); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, visibleLen - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      openSelected(selectedIndex);
    } else if ((e.ctrlKey || e.metaKey) && e.key === "p") {
      e.preventDefault();
      setMode((m) => (m === "files" ? "content" : "files"));
    }
  };

  const ITEM_CLS = (active: boolean) =>
    `flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
      active ? "bg-[var(--color-accent)]" : "hover:bg-[var(--color-bg-secondary)]"
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]
                 bg-black/25 backdrop-blur-[3px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-[560px] flex flex-col
                   bg-[var(--color-bg-primary)] rounded-[var(--radius-lg)]
                   shadow-[var(--shadow-lg)] border border-[var(--color-border)]
                   overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-2 px-4 h-[52px] shrink-0">
          <Search size={16} strokeWidth={2} className="text-[var(--color-text-tertiary)] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === "files" ? "Search file names…" : "Search note content…"}
            className="flex-1 bg-transparent outline-none text-[14px]
                       text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)]"
          />
          {/* Mode toggle */}
          <div className="flex items-center shrink-0 rounded-[6px] border border-[var(--color-border)] overflow-hidden">
            {(["files", "content"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`h-[24px] px-2.5 text-[11px] font-medium cursor-pointer border-none
                           transition-colors duration-100 capitalize
                           ${mode === m
                             ? "bg-[var(--color-accent)] text-white"
                             : "bg-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]"
                           }`}
              >
                {m}
              </button>
            ))}
          </div>
          <span className="shrink-0 text-[11px] text-[var(--color-text-tertiary)]
                           bg-[var(--color-bg-secondary)] border border-[var(--color-border)]
                           px-1.5 py-0.5 rounded-[4px] leading-none">
            esc
          </span>
        </div>

        {allFiles.length > 0 && (
          <>
            <div className="h-px bg-[var(--color-border)]" />

            {isIndexing ? (
              <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-[var(--color-text-tertiary)]">
                <Loader size={14} strokeWidth={2} className="animate-spin" />
                Indexing notes…
              </div>
            ) : (
              <div ref={listRef} className="overflow-y-auto max-h-[340px]">
                {visibleLen === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-[var(--color-text-tertiary)]">
                    No {mode === "files" ? "notes" : "matches"} found
                  </div>
                ) : mode === "files" ? (
                  visibleFiles.map((r, i) => (
                    <div key={r.file.path} className={ITEM_CLS(i === selectedIndex)}
                      onMouseEnter={() => setSelectedIndex(i)} onClick={() => openSelected(i)}>
                      <FileText size={14} strokeWidth={1.75}
                        className={i === selectedIndex ? "text-white/70 shrink-0 mt-0.5" : "text-[var(--color-text-tertiary)] shrink-0 mt-0.5"} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-[13px] font-medium truncate ${i === selectedIndex ? "text-white" : "text-[var(--color-text)]"}`}>
                          {i === selectedIndex ? r.file.name : <HighlightedName name={r.file.name} indices={r.matchIndices} />}
                        </div>
                        {r.file.folder && (
                          <div className={`text-[11px] truncate mt-0.5 ${i === selectedIndex ? "text-white/55" : "text-[var(--color-text-tertiary)]"}`}>
                            {r.file.folder}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  visibleContent.map((r, i) => (
                    <div key={r.file.path} className={ITEM_CLS(i === selectedIndex)}
                      onMouseEnter={() => setSelectedIndex(i)} onClick={() => openSelected(i)}>
                      <FileText size={14} strokeWidth={1.75}
                        className={i === selectedIndex ? "text-white/70 shrink-0 mt-0.5" : "text-[var(--color-text-tertiary)] shrink-0 mt-0.5"} />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className={`text-[13px] font-medium truncate ${i === selectedIndex ? "text-white" : "text-[var(--color-text)]"}`}>
                          {r.file.name}
                          {r.file.folder && (
                            <span className={`ml-1.5 font-normal text-[11px] ${i === selectedIndex ? "text-white/55" : "text-[var(--color-text-tertiary)]"}`}>
                              {r.file.folder}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 truncate">
                          <SnippetView text={r.snippet} hlStart={r.hlStart} hlEnd={r.hlEnd} active={i === selectedIndex} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="h-px bg-[var(--color-border)]" />
            <div className="flex items-center gap-4 px-4 py-2 text-[11px] text-[var(--color-text-tertiary)]">
              <span>↑↓ navigate</span>
              <span>↵ open</span>
              <span className="ml-auto opacity-60">Ctrl+P switch mode</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
