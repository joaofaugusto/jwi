import { useState, useEffect, useCallback, useRef } from "react";
import TitleBar from "./components/TitleBar";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import EmptyState from "./components/EmptyState";
import SearchPalette from "./components/SearchPalette";
import TabBar from "./components/TabBar";
import { FsEntry } from "./types";

interface Tab {
  path: string;
  content: string;
  isDirty: boolean;
  scrollTop: number;
}

export default function App() {
  const [vault, setVault] = useState<string | null>(null);
  const [tree, setTree] = useState<FsEntry[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const isResizing = useRef(false);

  const activeTab = tabs[activeTabIdx] ?? null;

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      setSidebarWidth(Math.max(160, Math.min(480, ev.clientX)));
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  // Load vault on mount
  useEffect(() => {
    window.electronAPI.getVault().then(async (v) => {
      setVault(v);
      setTree(await window.electronAPI.readTree(v));
    });
  }, []);

  // Auto-save with debounce
  useEffect(() => {
    if (!activeTab?.isDirty) return;
    const { path, content } = activeTab;
    const timer = setTimeout(async () => {
      await window.electronAPI.writeFile(path, content);
      setTabs((prev) =>
        prev.map((t, i) => (i === activeTabIdx ? { ...t, isDirty: false } : t)),
      );
    }, 800);
    return () => clearTimeout(timer);
  }, [activeTab?.content, activeTab?.isDirty, activeTab?.path, activeTabIdx]);

  const refreshTree = useCallback(async () => {
    if (!vault) return;
    setTree(await window.electronAPI.readTree(vault));
  }, [vault]);

  const openFile = useCallback(
    async (path: string) => {
      const existingIdx = tabs.findIndex((t) => t.path === path);
      if (existingIdx !== -1) {
        setActiveTabIdx(existingIdx);
        return;
      }
      if (activeTab?.isDirty) {
        await window.electronAPI.writeFile(activeTab.path, activeTab.content);
      }
      const c = await window.electronAPI.readFile(path);
      const newIdx = tabs.length;
      setTabs((prev) => [...prev, { path, content: c, isDirty: false, scrollTop: 0 }]);
      setActiveTabIdx(newIdx);
    },
    [tabs, activeTab],
  );

  const handleTabClose = useCallback(
    async (idx: number) => {
      const tab = tabs[idx];
      if (!tab) return;
      if (tab.isDirty) {
        await window.electronAPI.writeFile(tab.path, tab.content);
      }
      const newTabs = tabs.filter((_, i) => i !== idx);
      setTabs(newTabs);
      setActiveTabIdx((prev) => {
        if (newTabs.length === 0) return 0;
        if (prev === idx) return Math.max(0, idx - 1);
        return prev > idx ? prev - 1 : prev;
      });
    },
    [tabs],
  );

  const handleDelete = useCallback(
    (deletedPath: string) => {
      const isAffected = (p: string) =>
        p === deletedPath ||
        p.startsWith(deletedPath + "/") ||
        p.startsWith(deletedPath + "\\");
      const newTabs = tabs.filter((t) => !isAffected(t.path));
      setTabs(newTabs);
      setActiveTabIdx((prev) => Math.max(0, Math.min(prev, newTabs.length - 1)));
    },
    [tabs],
  );

  const handleContentChange = useCallback(
    (c: string) => {
      setTabs((prev) =>
        prev.map((t, i) => (i === activeTabIdx ? { ...t, content: c, isDirty: true } : t)),
      );
    },
    [activeTabIdx],
  );

  const handleScrollTop = useCallback(
    (scrollTop: number) => {
      setTabs((prev) =>
        prev.map((t, i) => (i === activeTabIdx ? { ...t, scrollTop } : t)),
      );
    },
    [activeTabIdx],
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

  // Ctrl/Cmd+W — close active tab
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "w") {
        e.preventDefault();
        if (tabs.length > 0) handleTabClose(activeTabIdx);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tabs, activeTabIdx, handleTabClose]);

  const handleNewNote = useCallback(async () => {
    if (!vault) return;
    const path = await window.electronAPI.createFile(vault, "Untitled");
    await refreshTree();
    await openFile(path);
  }, [vault, refreshTree, openFile]);

  const fileName = activeTab?.path.split(/[/\\]/).pop()?.replace(/\.md$/, "");

  return (
    <div className="flex flex-col h-full">
      <TitleBar subtitle={fileName} isDirty={activeTab?.isDirty} onSearch={() => setIsSearchOpen(true)} />
      {isSearchOpen && (
        <SearchPalette
          tree={tree}
          onSelect={openFile}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
      <div className="flex flex-1 min-h-0">
        {vault && (
          <>
            <Sidebar
              tree={tree}
              vault={vault}
              selectedPath={activeTab?.path ?? null}
              onFileSelect={openFile}
              onRefresh={refreshTree}
              onDelete={handleDelete}
              width={sidebarWidth}
            />
            {/* Drag handle */}
            <div
              onMouseDown={handleResizeMouseDown}
              className="w-[4px] shrink-0 cursor-col-resize
                         hover:bg-[var(--color-accent)] transition-colors
                         [-webkit-app-region:no-drag]"
            />
          </>
        )}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {tabs.length > 0 && (
            <TabBar
              tabs={tabs}
              activeIdx={activeTabIdx}
              onSwitch={setActiveTabIdx}
              onClose={handleTabClose}
            />
          )}
          {activeTab ? (
            <Editor
              key={activeTab.path}
              path={activeTab.path}
              content={activeTab.content}
              initialScrollTop={activeTab.scrollTop}
              onChange={handleContentChange}
              onScrollTop={handleScrollTop}
            />
          ) : (
            <EmptyState onNewNote={handleNewNote} />
          )}
        </div>
      </div>
    </div>
  );
}
