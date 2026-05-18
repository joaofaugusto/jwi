import { useState, useRef, useEffect } from "react";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  FilePlus,
  FolderPlus,
  Pencil,
  Trash2,
  AlertTriangle,
  Star,
  X,
} from "lucide-react";
import { FsEntry } from "../types";

interface SidebarProps {
  tree: FsEntry[];
  vault: string;
  selectedPath: string | null;
  onFileSelect: (path: string) => void;
  onRefresh: () => Promise<void>;
  onDelete: (path: string) => void;
  width?: number;
}

interface CreatingState {
  parentPath: string;
  type: "file" | "folder";
}

interface TreeItemProps {
  item: FsEntry;
  depth: number;
  expanded: Set<string>;
  selectedPath: string | null;
  renamingPath: string | null;
  renameName: string;
  creating: CreatingState | null;
  createName: string;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onRenameStart: (path: string, currentName: string) => void;
  onRenameChange: (v: string) => void;
  onRenameConfirm: () => void;
  onRenameCancel: () => void;
  onDelete: (path: string) => void;
  onCreateStart: (parentPath: string, type: "file" | "folder") => void;
  onCreateChange: (v: string) => void;
  onCreateConfirm: () => void;
  onCreateCancel: () => void;
  pinnedPaths: Set<string>;
  onTogglePin: (path: string) => void;
}

function InlineInput({
  value,
  onChange,
  onConfirm,
  onCancel,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  placeholder: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onConfirm();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={onCancel}
      placeholder={placeholder}
      className="flex-1 min-w-0 bg-white border border-[var(--color-accent)]
                 rounded-[4px] px-1.5 py-0.5 text-[12px] text-[var(--color-text)]
                 outline-none shadow-[0_0_0_2px_var(--color-accent-light)]
                 selectable"
    />
  );
}

function TreeItem({
  item,
  depth,
  expanded,
  selectedPath,
  renamingPath,
  renameName,
  creating,
  createName,
  onToggle,
  onSelect,
  onRenameStart,
  onRenameChange,
  onRenameConfirm,
  onRenameCancel,
  onDelete,
  onCreateStart,
  onCreateChange,
  onCreateConfirm,
  onCreateCancel,
  pinnedPaths,
  onTogglePin,
}: TreeItemProps) {
  const [hovered, setHovered] = useState(false);
  const isExpanded = expanded.has(item.path);
  const isSelected = selectedPath === item.path;
  const isRenaming = renamingPath === item.path;
  const indent = depth * 14 + 8;
  const displayName = item.isFolder
    ? item.name
    : item.name.replace(/\.md$/, "");

  const sharedProps = {
    expanded,
    selectedPath,
    renamingPath,
    renameName,
    creating,
    createName,
    onToggle,
    onSelect,
    onRenameStart,
    onRenameChange,
    onRenameConfirm,
    onRenameCancel,
    onDelete,
    onCreateStart,
    onCreateChange,
    onCreateConfirm,
    onCreateCancel,
  };

  return (
    <div>
      {/* Row */}
      <div
        className={`group flex items-center gap-1 py-[3px] pr-1.5 mx-1
                    rounded-[var(--radius-sm)] cursor-pointer
                    transition-colors duration-100
                    ${
                      isSelected
                        ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                        : "text-[var(--color-text-secondary)] hover:bg-[rgba(0,0,0,0.04)] hover:text-[var(--color-text)]"
                    }`}
        style={{ paddingLeft: `${indent}px` }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => {
          if (item.isFolder) onToggle(item.path);
          else onSelect(item.path);
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          onRenameStart(item.path, displayName);
        }}
      >
        {/* Chevron spacer / chevron */}
        {item.isFolder ? (
          <ChevronRight
            size={12}
            strokeWidth={2.5}
            className={`shrink-0 text-[var(--color-text-tertiary)]
                        transition-transform duration-150
                        ${isExpanded ? "rotate-90" : ""}`}
          />
        ) : (
          <span className="w-3 shrink-0" />
        )}

        {/* Icon */}
        {item.isFolder ? (
          isExpanded ? (
            <FolderOpen
              size={14}
              strokeWidth={1.8}
              className="shrink-0 text-[var(--color-text-secondary)]"
            />
          ) : (
            <Folder
              size={14}
              strokeWidth={1.8}
              className="shrink-0 text-[var(--color-text-secondary)]"
            />
          )
        ) : (
          <FileText
            size={13}
            strokeWidth={1.8}
            className="shrink-0 text-[var(--color-text-tertiary)]"
          />
        )}

        {/* Name or rename input */}
        {isRenaming ? (
          <InlineInput
            value={renameName}
            onChange={onRenameChange}
            onConfirm={onRenameConfirm}
            onCancel={onRenameCancel}
            placeholder={displayName}
          />
        ) : (
          <span className="flex-1 truncate text-[13px] leading-none">
            {displayName}
          </span>
        )}

        {/* Hover actions */}
        {!isRenaming && hovered && (
          <div
            className="flex items-center gap-0.5 ml-auto shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {item.isFolder && (
              <button
                className="w-[18px] h-[18px] flex items-center justify-center
                           rounded-[4px] cursor-pointer
                           text-[var(--color-text-tertiary)]
                           hover:bg-[rgba(0,0,0,0.07)] hover:text-[var(--color-text)]
                           transition-colors duration-100"
                onClick={() => onCreateStart(item.path, "file")}
                title="New note inside"
              >
                <FilePlus size={11} strokeWidth={2} />
              </button>
            )}
            {!item.isFolder && (
              <button
                className="w-[18px] h-[18px] flex items-center justify-center
                           rounded-[4px] cursor-pointer transition-colors duration-100"
                style={
                  pinnedPaths.has(item.path)
                    ? { color: "var(--color-accent)" }
                    : { color: "var(--color-text-tertiary)" }
                }
                onClick={() => onTogglePin(item.path)}
                title={pinnedPaths.has(item.path) ? "Unpin" : "Pin"}
              >
                <Star size={11} strokeWidth={2} fill={pinnedPaths.has(item.path) ? "currentColor" : "none"} />
              </button>
            )}
            <button
              className="w-[18px] h-[18px] flex items-center justify-center
                         rounded-[4px] cursor-pointer
                         text-[var(--color-text-tertiary)]
                         hover:bg-[rgba(0,0,0,0.07)] hover:text-[var(--color-text)]
                         transition-colors duration-100"
              onClick={() => onRenameStart(item.path, displayName)}
              title="Rename"
            >
              <Pencil size={11} strokeWidth={2} />
            </button>
            <button
              className="w-[18px] h-[18px] flex items-center justify-center
                         rounded-[4px] cursor-pointer
                         text-[var(--color-text-tertiary)]
                         hover:bg-[rgba(255,59,48,0.1)] hover:text-[var(--color-error)]
                         transition-colors duration-100"
              onClick={() => onDelete(item.path)}
              title="Delete"
            >
              <Trash2 size={11} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {item.isFolder && isExpanded && (
        <div>
          {/* Inline create input inside this folder */}
          {creating?.parentPath === item.path && (
            <div
              className="flex items-center gap-1 py-[3px] pr-1.5 mx-1"
              style={{ paddingLeft: `${indent + 14 + 8}px` }}
            >
              {creating.type === "folder" ? (
                <Folder
                  size={14}
                  strokeWidth={1.8}
                  className="shrink-0 text-[var(--color-text-tertiary)]"
                />
              ) : (
                <FileText
                  size={13}
                  strokeWidth={1.8}
                  className="shrink-0 text-[var(--color-text-tertiary)]"
                />
              )}
              <InlineInput
                value={createName}
                onChange={onCreateChange}
                onConfirm={onCreateConfirm}
                onCancel={onCreateCancel}
                placeholder={
                  creating.type === "folder" ? "Folder name" : "Note name"
                }
              />
            </div>
          )}
          {item.children?.map((child) => (
            <TreeItem key={child.path} item={child} depth={depth + 1} {...sharedProps} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  tree,
  vault,
  selectedPath,
  onFileSelect,
  onRefresh,
  onDelete: onDeleteProp,
  width,
}: SidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState<CreatingState | null>(null);
  const [createName, setCreateName] = useState("");
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [pinnedPaths, setPinnedPaths] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("jwi-pinned");
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  });

  // Persist pinned paths
  useEffect(() => {
    localStorage.setItem("jwi-pinned", JSON.stringify([...pinnedPaths]));
  }, [pinnedPaths]);

  const togglePin = (path: string) => {
    setPinnedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleFolder = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleCreateStart = (parentPath: string, type: "file" | "folder") => {
    setCreating({ parentPath, type });
    setCreateName("");
    if (type === "file" || type === "folder") {
      setExpanded((prev) => new Set([...prev, parentPath]));
    }
  };

  const handleCreateConfirm = async () => {
    if (!createName.trim() || !creating) return;
    if (creating.type === "folder") {
      await window.electronAPI.createFolder(creating.parentPath, createName.trim());
      await onRefresh();
    } else {
      const newPath = await window.electronAPI.createFile(
        creating.parentPath,
        createName.trim(),
      );
      await onRefresh();
      onFileSelect(newPath);
    }
    setCreating(null);
    setCreateName("");
  };

  const handleCreateCancel = () => {
    setCreating(null);
    setCreateName("");
  };

  const handleRenameStart = (path: string, currentName: string) => {
    setRenamingPath(path);
    setRenameName(currentName);
  };

  const handleRenameConfirm = async () => {
    if (!renameName.trim() || !renamingPath) return;
    // For files, preserve the .md extension
    const isFile = !tree
      .flatMap((n) => flattenTree(n))
      .find((n) => n.path === renamingPath)?.isFolder;
    const newName = isFile
      ? renameName.trim().endsWith(".md")
        ? renameName.trim()
        : `${renameName.trim()}.md`
      : renameName.trim();
    const newPath = await window.electronAPI.rename(renamingPath, newName);
    if (selectedPath === renamingPath) onFileSelect(newPath);
    setRenamingPath(null);
    setRenameName("");
    await onRefresh();
  };

  const handleRenameCancel = () => {
    setRenamingPath(null);
    setRenameName("");
  };

  const handleDelete = (path: string) => {
    setConfirmingDelete(path);
  };

  const confirmDelete = async () => {
    if (!confirmingDelete) return;
    onDeleteProp(confirmingDelete);
    await window.electronAPI.delete(confirmingDelete);
    setConfirmingDelete(null);
    await onRefresh();
  };

  const sharedProps = {
    expanded,
    selectedPath,
    renamingPath,
    renameName,
    creating,
    createName,
    onToggle: toggleFolder,
    onSelect: onFileSelect,
    onRenameStart: handleRenameStart,
    onRenameChange: setRenameName,
    onRenameConfirm: handleRenameConfirm,
    onRenameCancel: handleRenameCancel,
    onDelete: handleDelete,
    onCreateStart: handleCreateStart,
    onCreateChange: setCreateName,
    onCreateConfirm: handleCreateConfirm,
    onCreateCancel: handleCreateCancel,
    pinnedPaths,
    onTogglePin: togglePin,
  };

  return (
    <aside
      style={width !== undefined ? { width } : undefined}
      className="w-[var(--sidebar-width)] bg-[var(--color-bg-secondary)]
                 border-r border-[var(--color-border)]
                 flex flex-col overflow-hidden shrink-0 select-none relative"
    >
      {/* Delete confirmation overlay */}
      {confirmingDelete && (() => {
        const name = confirmingDelete
          .replace(/\\/g, "/")
          .split("/")
          .pop()
          ?.replace(/\.md$/, "") ?? confirmingDelete;
        return (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center
                       bg-[rgba(0,0,0,0.3)] backdrop-blur-[3px]"
            onClick={() => setConfirmingDelete(null)}
          >
            <div
              className="mx-3 w-full bg-[var(--color-bg)] rounded-[12px]
                         shadow-[0_16px_48px_rgba(0,0,0,0.22)]
                         border border-[var(--color-border)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Red header strip with icon */}
              <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
                <div className="w-8 h-8 rounded-full bg-[rgba(255,59,48,0.12)]
                                flex items-center justify-center shrink-0">
                  <AlertTriangle size={15} strokeWidth={2.5}
                    className="text-[var(--color-error)]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--color-text)] leading-tight">
                    Delete &ldquo;{name}&rdquo;?
                  </p>
                  <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5 leading-tight">
                    This cannot be undone.
                  </p>
                </div>
              </div>
              {/* Divider */}
              <div className="h-px bg-[var(--color-border)] mx-0" />
              {/* Actions */}
              <div className="flex px-3 py-2.5 gap-2">
                <button
                  className="flex-1 py-1.5 text-[12px] font-medium rounded-[7px]
                             cursor-pointer bg-transparent
                             border border-[var(--color-border)]
                             text-[var(--color-text-secondary)]
                             hover:bg-[rgba(0,0,0,0.04)] transition-colors duration-100"
                  onClick={() => setConfirmingDelete(null)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 py-1.5 text-[12px] font-medium rounded-[7px]
                             cursor-pointer border-none
                             bg-[var(--color-error)] text-white
                             hover:opacity-85 active:opacity-75
                             transition-opacity duration-100"
                  onClick={confirmDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Drag area for title bar alignment */}
      <div className="h-[var(--titlebar-height)] shrink-0 [-webkit-app-region:drag]" />

      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2
                   border-t border-[var(--color-border)] shrink-0"
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.5px]
                     text-[var(--color-text-tertiary)]"
        >
          Notes
        </span>
        <div className="flex items-center gap-1">
          <button
            className="w-6 h-6 flex items-center justify-center
                       rounded-[4px] cursor-pointer bg-transparent border-none
                       text-[var(--color-text-tertiary)]
                       hover:bg-[rgba(0,0,0,0.05)] hover:text-[var(--color-text)]
                       transition-colors duration-100"
            onClick={() => handleCreateStart(vault, "folder")}
            title="New folder"
          >
            <FolderPlus size={13} strokeWidth={2} />
          </button>
          <button
            className="w-6 h-6 flex items-center justify-center
                       rounded-[4px] cursor-pointer bg-transparent border-none
                       text-[var(--color-text-tertiary)]
                       hover:bg-[rgba(0,0,0,0.05)] hover:text-[var(--color-text)]
                       transition-colors duration-100"
            onClick={() => handleCreateStart(vault, "file")}
            title="New note"
          >
            <FilePlus size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {/* ── Pinned section ── */}
        {(() => {
          const allEntries = tree.flatMap(flattenTree);
          const pinned = allEntries.filter((e) => !e.isFolder && pinnedPaths.has(e.path));
          if (pinned.length === 0) return null;
          return (
            <>
              <div
                className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase
                           tracking-[0.5px] text-[var(--color-text-tertiary)]"
              >
                Pinned
              </div>
              {pinned.map((entry) => {
                const isSelected = selectedPath === entry.path;
                const name = entry.name.replace(/\.md$/, "");
                return (
                  <div
                    key={entry.path}
                    className={`group flex items-center gap-1 py-[3px] pr-1.5 mx-1 pl-[8px]
                                rounded-[var(--radius-sm)] cursor-pointer transition-colors duration-100
                                ${isSelected
                                  ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                                  : "text-[var(--color-text-secondary)] hover:bg-[rgba(0,0,0,0.04)] hover:text-[var(--color-text)]"
                                }`}
                    onClick={() => onFileSelect(entry.path)}
                  >
                    <span className="w-3 shrink-0" />
                    <Star
                      size={12}
                      strokeWidth={2}
                      fill="currentColor"
                      className={isSelected ? "shrink-0" : "shrink-0 text-[var(--color-accent)]"}
                    />
                    <span className="flex-1 truncate text-[13px] leading-none">{name}</span>
                    <button
                      className="w-[18px] h-[18px] items-center justify-center
                                 rounded-[4px] cursor-pointer shrink-0 hidden group-hover:flex
                                 text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)]
                                 transition-colors duration-100"
                      onClick={(e) => { e.stopPropagation(); togglePin(entry.path); }}
                      title="Unpin"
                    >
                      <X size={10} strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })}
              <div className="h-px bg-[var(--color-border)] mx-2 mt-1 mb-2" />
            </>
          );
        })()}

        {/* Root-level create input */}
        {creating?.parentPath === vault && (
          <div className="flex items-center gap-1 py-[3px] pr-1.5 mx-1 pl-[8px]">
            {creating.type === "folder" ? (
              <Folder
                size={14}
                strokeWidth={1.8}
                className="shrink-0 text-[var(--color-text-tertiary)]"
              />
            ) : (
              <FileText
                size={13}
                strokeWidth={1.8}
                className="shrink-0 text-[var(--color-text-tertiary)]"
              />
            )}
            <InlineInput
              value={createName}
              onChange={setCreateName}
              onConfirm={handleCreateConfirm}
              onCancel={handleCreateCancel}
              placeholder={creating.type === "folder" ? "Folder name" : "Note name"}
            />
          </div>
        )}

        {tree.length === 0 && !creating && (
          <p
            className="px-4 py-3 text-[12px] text-[var(--color-text-tertiary)]
                       italic"
          >
            No notes yet
          </p>
        )}

        {tree.map((item) => (
          <TreeItem key={item.path} item={item} depth={0} {...sharedProps} />
        ))}
      </div>
    </aside>
  );
}

function flattenTree(entry: FsEntry): FsEntry[] {
  if (!entry.isFolder) return [entry];
  return [entry, ...(entry.children ?? []).flatMap(flattenTree)];
}
