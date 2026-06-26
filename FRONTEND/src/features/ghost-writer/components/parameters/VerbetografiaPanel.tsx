import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Settings, X } from "lucide-react";
import { panelsTopMenuBarBgClass } from "@/styles/backgroundColors";
import { primaryActionButtonClass } from "@/styles/buttonStyles";

const verbetografiaFieldLabelClass = "w-16 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";
const verbetografiaFieldInputClass = "ml-auto h-7 w-[26ch] !text-[11px] bg-white";

interface VerbetografiaPanelProps {
  title: string;
  description: string;
  verbeteTitle: string;
  specialty: string;
  extraContent?: ReactNode;
  actionLabel?: string;
  onRun?: () => void;
  isRunning?: boolean;
  showActionButton?: boolean;
  showActionSectionTitle?: boolean;
  secondaryActionTitle?: string;
  secondaryActionLabel?: string;
  onSecondaryRun?: () => void;
  isSecondaryRunning?: boolean;
  showSecondaryActionButton?: boolean;
  onVerbeteTitleChange: (value: string) => void;
  onSpecialtyChange: (value: string) => void;
  showConfigButton?: boolean;
  onToggleConfig?: () => void;
  isConfigOpen?: boolean;
  onClose?: () => void;
  showPanelChrome?: boolean;
}

const VerbetografiaPanel = ({
  title,
  description,
  verbeteTitle,
  specialty,
  extraContent,
  actionLabel = title,
  onRun,
  isRunning = false,
  showActionButton = false,
  showActionSectionTitle = true,
  secondaryActionTitle,
  secondaryActionLabel,
  onSecondaryRun,
  isSecondaryRunning = false,
  showSecondaryActionButton = false,
  onVerbeteTitleChange,
  onSpecialtyChange,
  showConfigButton = false,
  onToggleConfig,
  isConfigOpen = false,
  onClose,
  showPanelChrome = true,
}: VerbetografiaPanelProps) => {
  const hasVerbeteTitle = Boolean(verbeteTitle.trim());
  const canRun = Boolean(hasVerbeteTitle && onRun);
  const canRunSecondary = Boolean(hasVerbeteTitle && onSecondaryRun);

  const content = (
    <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
      <div className="space-y-4">
        {showConfigButton ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void onToggleConfig?.()}
              title={isConfigOpen ? "Ocultar configurações IA" : "Configurações IA"}
              aria-label={isConfigOpen ? "Ocultar configurações IA" : "Configurações IA"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground shadow-sm transition hover:bg-zinc-50 hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {showPanelChrome ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        ) : null}

        {extraContent}

        <div className="flex items-center gap-2">
          <Label className={verbetografiaFieldLabelClass}>Titulo</Label>
          <Input
            value={verbeteTitle}
            onChange={(e) => onVerbeteTitleChange(e.target.value)}
            className={verbetografiaFieldInputClass}
            placeholder="Digite o titulo"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label className={verbetografiaFieldLabelClass}>Especialidade</Label>
          <Input
            value={specialty}
            onChange={(e) => onSpecialtyChange(e.target.value)}
            className={verbetografiaFieldInputClass}
            placeholder="Digite a especialidade"
          />
        </div>

        {showActionButton ? (
          <div className="space-y-2">
            {showActionSectionTitle ? (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
            ) : null}
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="secondary"
                size="sm"
                className={primaryActionButtonClass}
                onClick={onRun}
                disabled={!canRun || isRunning}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-black relative z-10" />
                    <span className="relative z-10 text-blue-500">{actionLabel}</span>
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4 text-black relative z-10" />
                    <span className="relative z-10 text-blue-500">{actionLabel}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null}

        {showSecondaryActionButton ? (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{secondaryActionTitle}</p>
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="secondary"
                size="sm"
                className={primaryActionButtonClass}
                onClick={onSecondaryRun}
                disabled={!canRunSecondary || isSecondaryRunning}
              >
                {isSecondaryRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-black relative z-10" />
                    <span className="relative z-10 text-blue-500">{secondaryActionLabel || secondaryActionTitle}</span>
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4 text-black relative z-10" />
                    <span className="relative z-10 text-blue-500">{secondaryActionLabel || secondaryActionTitle}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (!showPanelChrome) return content;

  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center justify-between border-b border-border ${panelsTopMenuBarBgClass} px-4 py-3`}>
        <h2 className="text-sm font-semibold text-foreground">Parameters</h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title="Fechar Parameters">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {content}
    </div>
  );
};

export default VerbetografiaPanel;
