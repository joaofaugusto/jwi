import { Minus, X, Search } from "lucide-react";

interface Props {
  subtitle?: string;
  isDirty?: boolean;
  onSearch?: () => void;
}

export default function TitleBar({ subtitle, isDirty, onSearch }: Props) {
  return (
    <div
      className="flex items-center shrink-0 h-[var(--titlebar-height)]
                 bg-white border-b border-[var(--color-border)]
                 [-webkit-app-region:drag] select-none"
    >
      <div className="w-[35px] shrink-0" />

      {/* macOS-style traffic lights */}
      <div className="flex items-center gap-[8px] [-webkit-app-region:no-drag]">
        <button
          className="group w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]
                     flex items-center justify-center cursor-pointer
                     opacity-80 hover:opacity-100 transition-opacity"
          onClick={() => window.electronAPI.windowClose()}
          tabIndex={-1}
        >
          <X
            size={7}
            strokeWidth={3}
            className="opacity-0 group-hover:opacity-100 text-[rgba(0,0,0,0.5)]"
          />
        </button>
        <button
          className="group w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]
                     flex items-center justify-center cursor-pointer
                     opacity-80 hover:opacity-100 transition-opacity"
          onClick={() => window.electronAPI.windowMinimize()}
          tabIndex={-1}
        >
          <Minus
            size={7}
            strokeWidth={3}
            className="opacity-0 group-hover:opacity-100 text-[rgba(0,0,0,0.5)]"
          />
        </button>
        <button
          className="group w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]
                     flex items-center justify-center cursor-pointer
                     opacity-80 hover:opacity-100 transition-opacity"
          onClick={() => window.electronAPI.windowMaximize()}
          tabIndex={-1}
        >
          <svg
            width="7"
            height="7"
            viewBox="0 0 7 7"
            fill="none"
            className="opacity-0 group-hover:opacity-100"
          >
            <rect
              x="0.5"
              y="0.5"
              width="6"
              height="6"
              stroke="rgba(0,0,0,0.5)"
              strokeWidth="1"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center gap-[6px] pointer-events-none">
        {isDirty && (
          <span className="w-[7px] h-[7px] rounded-full bg-[var(--color-text-tertiary)] shrink-0" />
        )}
        <span className="text-[12px] font-medium text-[var(--color-text-secondary)] tracking-[-0.1px]">
          {subtitle ?? "JWI"}
        </span>
      </div>

      <div className="w-[8px] shrink-0" />

      {/* Search button */}
      <div className="shrink-0 flex items-center pr-3 [-webkit-app-region:no-drag]">
        <button
          onClick={onSearch}
          className="flex items-center gap-1.5 h-[22px] px-2.5
                     rounded-[6px] bg-[var(--color-bg-secondary)]
                     border border-[var(--color-border)]
                     text-[11px] text-[var(--color-text-tertiary)]
                     hover:text-[var(--color-text)] hover:border-[var(--color-border-hover)]
                     transition-colors cursor-pointer select-none"
        >
          <Search size={11} strokeWidth={2.5} />
          <span>Search</span>
          <span
            className="ml-0.5 opacity-60 font-mono tracking-tight"
          >
            ⌘K
          </span>
        </button>
      </div>
    </div>
  );
}
