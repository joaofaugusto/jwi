import { useState, useEffect, useRef, useMemo } from "react";
import { Search, FileText } from "lucide-react";
import { FsEntry } from "../types";

interface Props {
  tree: FsEntry[];
  onSelect: (path: string) => void;
  onClose: () => void;
}

interface FlatFile {
  name: string;    // display name (no .md)
  path: string;    // full fs path
  folder: string;  // parent folder relative path
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

interface MatchResult {
  file: FlatFile;
  score: number;
  matchIndices: number[];
}

function search(query: string, files: FlatFile[]): MatchResult[] {
  if (!query.trim()) {
    return files
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((file) => ({ file, score: 0, matchIndices: [] }));
  }

  const q = query.toLowerCase();
  const results: MatchResult[] = [];

  for (const file of files) {
    const name = file.name.toLowerCase();

    // Substring match — highest priority
    const subIdx = name.indexOf(q);
    if (subIdx !== -1) {
      const indices = Array.from({ length: q.length }, (_, i) => subIdx + i);
      results.push({
        file,
        score: 1000 + (q.length / name.length) * 100 - subIdx,
        matchIndices: indices,
      });
      continue;
    }

    // Fuzzy match — all query chars appear in order
    const indices: number[] = [];
    let qi = 0;
    let score = 0;
    let lastIdx = -1;
    for (let i = 0; i < name.length && qi < q.length; i++) {
      if (name[i] === q[qi]) {
        indices.push(i);
        score += lastIdx === i - 1 ? 5 : 1;
        lastIdx = i;
        qi++;
      }
    }
    if (qi === q.length) {
      results.push({ file, score, matchIndices: indices });
    }
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
          <span key={i} className="text-[var(--color-accent)] font-semibold">
            {char}
          </span>
        ) : (
          <span key={i}>{char}</span>
        ),
      )}
    </>
  );
}

export default function SearchPalette({ tree, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allFiles = useMemo(() => flattenFiles(tree), [tree]);
  const results = useMemo(() => search(query, allFiles), [query, allFiles]);
  const visible = results.slice(0, 10);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setSelectedIndex(0); }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const item = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, visible.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const r = visible[selectedIndex];
      if (r) { onSelect(r.file.path); onClose(); }
    }
  };

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
        <div className="flex items-center gap-3 px-4 h-[52px] shrink-0">
          <Search
            size={16}
            strokeWidth={2}
            className="text-[var(--color-text-tertiary)] shrink-0"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search notes…"
            className="flex-1 bg-transparent outline-none text-[14px]
                       text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)]"
          />
          <span
            className="shrink-0 text-[11px] text-[var(--color-text-tertiary)]
                       bg-[var(--color-bg-secondary)] border border-[var(--color-border)]
                       px-1.5 py-0.5 rounded-[4px] leading-none"
          >
            esc
          </span>
        </div>

        {/* Divider + results */}
        {allFiles.length > 0 && (
          <>
            <div className="h-px bg-[var(--color-border)]" />
            <div ref={listRef} className="overflow-y-auto max-h-[320px]">
              {visible.length === 0 ? (
                <div className="px-4 py-8 text-center text-[13px] text-[var(--color-text-tertiary)]">
                  No notes found
                </div>
              ) : (
                visible.map((r, i) => (
                  <div
                    key={r.file.path}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer
                                transition-colors
                                ${
                                  i === selectedIndex
                                    ? "bg-[var(--color-accent)]"
                                    : "hover:bg-[var(--color-bg-secondary)]"
                                }`}
                    onMouseEnter={() => setSelectedIndex(i)}
                    onClick={() => { onSelect(r.file.path); onClose(); }}
                  >
                    <FileText
                      size={14}
                      strokeWidth={1.75}
                      className={
                        i === selectedIndex
                          ? "text-white/70 shrink-0"
                          : "text-[var(--color-text-tertiary)] shrink-0"
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-[13px] font-medium truncate
                                    ${i === selectedIndex ? "text-white" : "text-[var(--color-text)]"}`}
                      >
                        {i === selectedIndex ? (
                          r.file.name
                        ) : (
                          <HighlightedName name={r.file.name} indices={r.matchIndices} />
                        )}
                      </div>
                      {r.file.folder && (
                        <div
                          className={`text-[11px] truncate mt-0.5
                                      ${i === selectedIndex ? "text-white/55" : "text-[var(--color-text-tertiary)]"}`}
                        >
                          {r.file.folder}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div
              className="h-px bg-[var(--color-border)]"
            />
            <div className="flex items-center gap-4 px-4 py-2 text-[11px] text-[var(--color-text-tertiary)]">
              <span>↑↓ navigate</span>
              <span>↵ open</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
