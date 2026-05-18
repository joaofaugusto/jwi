import { useState, useEffect, useCallback } from "react";
import TitleBar from "./components/TitleBar";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import EmptyState from "./components/EmptyState";
import SearchPalette from "./components/SearchPalette";
import { FsEntry } from "./types";

export default function App() {
  const [vault, setVault] = useState<string | null>(null);
  const [tree, setTree] = useState<FsEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Load vault on mount
  useEffect(() => {
    window.electronAPI.getVault().then(async (v) => {
      setVault(v);
      setTree(await window.electronAPI.readTree(v));
    });
  }, []);

  // Auto-save with debounce
  useEffect(() => {
    if (!selectedPath || !isDirty) return;
    const timer = setTimeout(async () => {
      await window.electronAPI.writeFile(selectedPath, content);
      setIsDirty(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [content, isDirty, selectedPath]);

  const refreshTree = useCallback(async () => {
    if (!vault) return;
    setTree(await window.electronAPI.readTree(vault));
  }, [vault]);

  const openFile = useCallback(
    async (path: string) => {
      if (isDirty && selectedPath) {
        await window.electronAPI.writeFile(selectedPath, content);
        setIsDirty(false);
      }
      const c = await window.electronAPI.readFile(path);
      setSelectedPath(path);
      setContent(c);
    },
    [isDirty, selectedPath, content],
  );

  const handleDelete = useCallback(
    (path: string) => {
      if (
        selectedPath === path ||
        selectedPath?.startsWith(path + "/") ||
        selectedPath?.startsWith(path + "\\")
      ) {
        setSelectedPath(null);
        setContent("");
        setIsDirty(false);
      }
    },
    [selectedPath],
  );

  // Global Ctrl/Cmd+K — open search palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleNewNote = useCallback(async () => {
    if (!vault) return;
    const path = await window.electronAPI.createFile(vault, "Untitled");
    await refreshTree();
    await openFile(path);
  }, [vault, refreshTree, openFile]);

  const fileName = selectedPath
    ? selectedPath.split(/[/\\]/).pop()?.replace(/\.md$/, "")
    : undefined;

  return (
    <div className="flex flex-col h-full">
      <TitleBar subtitle={fileName} isDirty={isDirty} onSearch={() => setIsSearchOpen(true)} />
      {isSearchOpen && (
        <SearchPalette
          tree={tree}
          onSelect={openFile}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
      <div className="flex flex-1 min-h-0">
        {vault && (
          <Sidebar
            tree={tree}
            vault={vault}
            selectedPath={selectedPath}
            onFileSelect={openFile}
            onRefresh={refreshTree}
            onDelete={handleDelete}
          />
        )}
        <div className="flex-1 min-w-0 flex">
          {selectedPath ? (
            <Editor
              key={selectedPath}
              path={selectedPath}
              content={content}
              onChange={(c) => {
                setContent(c);
                setIsDirty(true);
              }}
            />
          ) : (
            <EmptyState onNewNote={handleNewNote} />
          )}
        </div>
      </div>
    </div>
  );
}
