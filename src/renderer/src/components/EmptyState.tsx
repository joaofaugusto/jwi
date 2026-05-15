import { FileText, FilePlus } from "lucide-react";

interface Props {
  onNewNote: () => void;
}

export default function EmptyState({ onNewNote }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 select-none">
      <div
        className="w-12 h-12 rounded-[14px] bg-[var(--color-bg-secondary)]
                   border border-[var(--color-border)]
                   flex items-center justify-center
                   shadow-[var(--shadow-sm)]"
      >
        <FileText
          size={22}
          strokeWidth={1.5}
          className="text-[var(--color-text-tertiary)]"
        />
      </div>
      <div className="text-center">
        <p className="text-[14px] font-medium text-[var(--color-text)]">
          No note selected
        </p>
        <p className="text-[12px] text-[var(--color-text-tertiary)] mt-1">
          Select a note from the sidebar or create a new one
        </p>
      </div>
      <button
        onClick={onNewNote}
        className="flex items-center gap-2 px-3.5 py-1.5
                   rounded-[var(--radius-sm)] bg-[var(--color-accent)] text-white
                   text-[13px] font-medium cursor-pointer
                   hover:brightness-110 active:scale-[0.97]
                   transition-all duration-100"
      >
        <FilePlus size={14} strokeWidth={2} />
        New Note
      </button>
    </div>
  );
}
