import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2, Play, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { primaryActionButtonClass } from "@/styles/buttonStyles";
import { panelsTopMenuBarBgClass } from "@/styles/backgroundColors";

interface VerbeteSearchPanelProps {
  title: string;
  description: string;
  author: string;
  titleField: string;
  area: string;
  text: string;
  maxResults: number;
  onAuthorChange: (value: string) => void;
  onTitleFieldChange: (value: string) => void;
  onAreaChange: (value: string) => void;
  onTextChange: (value: string) => void;
  onMaxResultsChange: (value: number) => void;
  onRunSearch: () => void;
  isRunning: boolean;
  onClose?: () => void;
  showPanelChrome?: boolean;
}

const VerbeteSearchPanel = ({
  title,
  description,
  author,
  titleField,
  area,
  text,
  maxResults,
  onAuthorChange,
  onTitleFieldChange,
  onAreaChange,
  onTextChange,
  onMaxResultsChange,
  onRunSearch,
  isRunning,
  onClose,
  showPanelChrome = true,
}: VerbeteSearchPanelProps) => {
  const canRun = (author.trim() || titleField.trim() || area.trim() || text.trim()) && !isRunning;

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
          <Label className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Definologia</Label>
          <Input value={text} onChange={(e) => onTextChange(e.target.value)} className="ml-auto h-8 w-[30ch] text-xs md:text-xs bg-white" />
        </div>

        <div className="flex items-center gap-2">
          <Label className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Autor</Label>
          <Input value={author} onChange={(e) => onAuthorChange(e.target.value)} className="ml-auto h-8 w-[30ch] text-xs md:text-xs bg-white" />
        </div>

        <div className="flex items-center gap-2">
          <Label className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Titulo</Label>
          <Input value={titleField} onChange={(e) => onTitleFieldChange(e.target.value)} className="ml-auto h-8 w-[30ch] text-xs md:text-xs bg-white" />
        </div>

        <div className="flex items-center gap-2">
          <Label className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Especialidade</Label>
          <Input value={area} onChange={(e) => onAreaChange(e.target.value)} className="ml-auto h-8 w-[30ch] text-xs md:text-xs bg-white" />
        </div>

       

        <div className="flex items-center gap-2">
          <Label className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Limite</Label>
          <Input
            type="number"
            min={1}
            max={200}
            value={String(maxResults)}
            onChange={(e) => {
              const raw = Number.parseInt(e.target.value || "1", 10);
              const next = Number.isFinite(raw) ? Math.max(1, Math.min(200, raw)) : 1;
              onMaxResultsChange(next);
            }}
            className="ml-auto h-8 w-[30ch] bg-white !text-xs text-right"
          />
        </div>

        <Button variant="secondary" size="sm" className={primaryActionButtonClass} onClick={onRunSearch} disabled={!canRun}>
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-black relative z-10" />
              <span className="relative z-10 text-blue-500">Buscando</span>
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4 text-black relative z-10" />
              <span className="relative z-10 text-blue-500">Buscar</span>
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

export default VerbeteSearchPanel;

