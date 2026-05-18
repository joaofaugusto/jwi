import { X } from "lucide-react";

interface TabItem {
  path: string;
  isDirty: boolean;
}

interface TabBarProps {
  tabs: TabItem[];
  activeIdx: number;
  onSwitch: (idx: number) => void;
  onClose: (idx: number) => void;
}

function tabLabel(path: string) {
  return path.split(/[/\\]/).pop()?.replace(/\.md$/, "") ?? "Untitled";
}

export default function TabBar({ tabs, activeIdx, onSwitch, onClose }: TabBarProps) {
  return (
    <div
      className="flex shrink-0 overflow-x-auto border-b border-[var(--color-border)]
                 bg-[var(--color-bg-secondary)] [-webkit-app-region:no-drag]"
      style={{ scrollbarWidth: "none" }}
    >
      {tabs.map((tab, i) => {
        const isActive = i === activeIdx;
        return (
          <div
            key={tab.path}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSwitch(i)}
            className={`group relative flex items-center gap-1 pl-3 pr-1 h-[34px]
                       text-[12px] shrink-0 cursor-pointer select-none
                       border-r border-[var(--color-border)] transition-colors duration-100
                       ${
                         isActive
                           ? "bg-[var(--color-bg)] text-[var(--color-text)] font-medium"
                           : "text-[var(--color-text-tertiary)] hover:bg-[rgba(0,0,0,0.04)] hover:text-[var(--color-text-secondary)]"
                       }`}
          >
            {/* Active underline */}
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[2px]
                           bg-[var(--color-accent)] rounded-t-[2px]"
              />
            )}

            <span className="max-w-[140px] truncate leading-none">
              {tabLabel(tab.path)}
            </span>

            {/* Dirty dot — visible unless tab is being hovered */}
            {tab.isDirty && (
              <span
                className="w-[6px] h-[6px] rounded-full bg-[var(--color-accent)]
                           shrink-0 group-hover:hidden"
              />
            )}

            {/* Close button — appears on row hover */}
            <button
              aria-label="Close tab"
              onClick={(e) => {
                e.stopPropagation();
                onClose(i);
              }}
              className="w-[20px] h-[20px] flex items-center justify-center ml-0.5
                         rounded-[4px] shrink-0 cursor-pointer border-none
                         text-[var(--color-text-tertiary)]
                         opacity-0 group-hover:opacity-100
                         hover:bg-[rgba(0,0,0,0.08)] hover:text-[var(--color-text)]
                         transition-all duration-100"
            >
              <X size={10} strokeWidth={2.5} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
