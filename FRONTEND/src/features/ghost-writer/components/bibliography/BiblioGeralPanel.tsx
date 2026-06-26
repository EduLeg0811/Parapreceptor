import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Play, X } from "lucide-react";
import { primaryActionButtonClass } from "@/styles/buttonStyles";
import { panelsTopMenuBarBgClass } from "@/styles/backgroundColors";

interface BiblioGeralPanelProps {
  title: string;
  description: string;
  author: string;
  titleField: string;
  year: string;
  extra: string;
  onAuthorChange: (value: string) => void;
  onTitleFieldChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onExtraChange: (value: string) => void;
  onRun: () => void;
  isRunning: boolean;
  onClose?: () => void;
  showPanelChrome?: boolean;
}

const BiblioGeralPanel = ({
  title,
  description,
  author,
  titleField,
  year,
  extra,
  onAuthorChange,
  onTitleFieldChange,
  onYearChange,
  onExtraChange,
  onRun,
  isRunning,
  onClose,
  showPanelChrome = true,
}: BiblioGeralPanelProps) => {
  const canRun = (author.trim() || titleField.trim() || year.trim() || extra.trim()) && !isRunning;

  const content = (
    <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
      <div className="space-y-3">
        {showPanelChrome ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        ) : null}

        {showPanelChrome ? <Separator /> : null}

        <div className="flex items-center gap-2">
          <Label className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Autor</Label>
          <Input value={author} onChange={(e) => onAuthorChange(e.target.value)} className="h-8 text-xs md:text-xs bg-white" />
        </div>

        <div className="flex items-center gap-2">
          <Label className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Titulo</Label>
          <Input value={titleField} onChange={(e) => onTitleFieldChange(e.target.value)} className="h-8 text-xs md:text-xs bg-white" />
        </div>

        <div className="flex items-center gap-2">
          <Label className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ano</Label>
          <Input value={year} onChange={(e) => onYearChange(e.target.value)} className="h-8 text-xs md:text-xs bg-white" />
        </div>

        <div className="flex items-center gap-2">
          <Label className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Extra</Label>
          <Input value={extra} onChange={(e) => onExtraChange(e.target.value)} className="h-8 text-xs md:text-xs bg-white" />
        </div>

        <Button variant="secondary" size="sm" className={primaryActionButtonClass} onClick={onRun} disabled={!canRun}>
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-black relative z-10" />
              <span className="relative z-10 text-blue-500">Buscando</span>
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4 text-black relative z-10" />
              <span className="relative z-10 text-blue-500">Bibliografia</span>
            </>
          )}
        </Button>
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

export default BiblioGeralPanel;

