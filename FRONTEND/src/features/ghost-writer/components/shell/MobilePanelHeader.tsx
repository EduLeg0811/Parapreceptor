import { Braces, FileText, MessageSquare, PanelLeft, Settings } from "lucide-react";
import type { ComponentType } from "react";
import type { MobilePanelId } from "@/features/ghost-writer/types";

interface MobilePanelHeaderProps {
  activeMobilePanel: MobilePanelId;
  options: Array<{ id: MobilePanelId; label: string; disabled?: boolean }>;
  onSelectPanel: (id: MobilePanelId) => void;
}

const MOBILE_PANEL_ICONS = {
  left: PanelLeft,
  center: Settings,
  right: MessageSquare,
  editor: FileText,
  json: Braces,
} satisfies Record<MobilePanelId, ComponentType<{ className?: string }>>;

const MobilePanelHeader = ({
  activeMobilePanel,
  options,
  onSelectPanel,
}: MobilePanelHeaderProps) => {
  const activeLabel = options.find((option) => option.id === activeMobilePanel)?.label ?? "Painel";

  return (
    <div className="border-b border-border bg-card px-2.5 py-2">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Navegacao</p>
          <p className="truncate text-sm font-semibold text-foreground">{activeLabel}</p>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {options.map((option) => {
          const Icon = MOBILE_PANEL_ICONS[option.id];
          const isActive = option.id === activeMobilePanel;

          return (
            <button
              key={option.id}
              type="button"
              disabled={option.disabled}
              onClick={() => {
                if (option.disabled) return;
                onSelectPanel(option.id);
              }}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-1.5 text-center transition ${
                isActive
                  ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-border bg-white/80 text-muted-foreground"
              } disabled:cursor-not-allowed disabled:opacity-35`}
              aria-label={option.label}
              aria-pressed={isActive}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-[10px] font-medium leading-none">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobilePanelHeader;
