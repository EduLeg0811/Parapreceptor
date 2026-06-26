import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eraser, Highlighter, Loader2, X } from "lucide-react";
import { primaryActionButtonClass } from "@/styles/buttonStyles";
import { panelsTopMenuBarBgClass } from "@/styles/backgroundColors";

export interface HighlightColorOption {
  id: string;
  label: string;
  swatch: string;
}

interface Macro1HighlightPanelProps {
  title: string;
  description: string;
  term: string;
  onTermChange: (value: string) => void;
  colorOptions: HighlightColorOption[];
  selectedColorId: string;
  onSelectColor: (colorId: string) => void;
  onRunHighlight: () => void;
  onRunClear: () => void;
  isRunning: boolean;
  predictedMatches: number | null;
  isCountingMatches?: boolean;
  hasDocumentOpen?: boolean;
  onClose?: () => void;
  showPanelChrome?: boolean;
}

const Macro1HighlightPanel = ({
  title,
  description,
  term,
  onTermChange,
  colorOptions,
  selectedColorId,
  onSelectColor,
  onRunHighlight,
  onRunClear,
  isRunning,
  predictedMatches,
  isCountingMatches = false,
  hasDocumentOpen = false,
  onClose,
  showPanelChrome = true,
}: Macro1HighlightPanelProps) => {
  const canRun = term.trim().length > 0 && !isRunning;
  const selectedHighlightColor =
    colorOptions.find((option) => option.id === selectedColorId)?.swatch || "#fef08a";

  const content = (
    <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
      <div className="space-y-5">
        {showPanelChrome ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        ) : null}

        {/*<Separator />*/}

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Label className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Termo
            </Label>

            <Input
              value={term}
              onChange={(e) => onTermChange(e.target.value)}
              placeholder="Digite o termo para destacar"
              className="h-8 text-xs md:text-xs bg-white"
            />
          </div>
          

          <p className="mt-4 text-xs text-muted-foreground">
            {!term.trim()
              ? ""
              : !hasDocumentOpen
                ? ""
                : isCountingMatches
                  ? "Calculando ocorrências..."
                  : `Ocorrências encontradas: ${predictedMatches ?? 0}`}
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cor do Highlight</Label>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((option) => {
              const selected = selectedColorId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  title={option.label}
                  aria-label={option.label}
                  aria-pressed={selected}
                  onClick={() => onSelectColor(option.id)}
                  className={`h-7 w-7 rounded-md border transition-colors ${selected ? "border-foreground ring-2 ring-offset-1 ring-ring" : "border-border hover:border-foreground/60"}`}
                  style={{ backgroundColor: option.swatch }}
                />
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="h-8 w-full rounded-lg border px-3 text-sm font-medium text-black shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: selectedHighlightColor, borderColor: selectedHighlightColor }}
            onClick={onRunHighlight}
            disabled={!canRun}
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-black relative z-10" />
                <span className="relative z-10 text-blue-500">Aplicando</span>
              </>
            ) : (
              <>
                <Highlighter className="mr-2 h-4 w-4 text-black relative z-10" />
                <span className="relative z-10 text-blue-500">Highlight</span>
              </>
            )}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onRunClear}
            disabled={!canRun}
            className={`${primaryActionButtonClass} bg-gray-100`}
          >
            <Eraser className="mr-2 h-4 w-4 text-black relative z-10" />
            <span className="relative z-10 text-blue-500">Limpar Marcação</span>
          </Button>
        </div>
      </div>
      <br />

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

export default Macro1HighlightPanel;

