import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Play, Settings, X } from "lucide-react";
import { primaryActionButtonClass } from "@/styles/buttonStyles";
import { panelsTopMenuBarBgClass } from "@/styles/backgroundColors";

interface BiblioExternaPanelProps {
  title: string;
  description: string;
  author: string;
  titleField: string;
  year: string;
  journal: string;
  publisher: string;
  identifier: string;
  extra: string;
  freeText: string;
  onAuthorChange: (value: string) => void;
  onTitleFieldChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onJournalChange: (value: string) => void;
  onPublisherChange: (value: string) => void;
  onIdentifierChange: (value: string) => void;
  onExtraChange: (value: string) => void;
  onFreeTextChange: (value: string) => void;
  onRun: () => void;
  isRunning: boolean;
  onToggleConfig?: () => void;
  isConfigOpen?: boolean;
  configContent?: React.ReactNode;
  onClose?: () => void;
  showPanelChrome?: boolean;
}

const BiblioExternaPanel = ({
  title,
  description,
  author,
  titleField,
  year,
  journal,
  publisher,
  identifier,
  extra,
  freeText,
  onAuthorChange,
  onTitleFieldChange,
  onYearChange,
  onJournalChange,
  onPublisherChange,
  onIdentifierChange,
  onExtraChange,
  onFreeTextChange,
  onRun,
  isRunning,
  onToggleConfig,
  isConfigOpen = false,
  configContent,
  onClose,
  showPanelChrome = true,
}: BiblioExternaPanelProps) => {
  const canRun = (author.trim() || titleField.trim() || year.trim() || journal.trim() || publisher.trim() || identifier.trim() || extra.trim() || freeText.trim()) && !isRunning;

  const content = (
    <div className="flex h-full flex-col">
      <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void onToggleConfig?.()}
            title={isConfigOpen ? "Ocultar configuracoes LLM" : "Mostrar configuracoes LLM"}
            aria-label={isConfigOpen ? "Ocultar configuracoes LLM" : "Mostrar configuracoes LLM"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground shadow-sm transition hover:bg-zinc-50 hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        {showPanelChrome ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        ) : null}

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
          <Label className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Revista</Label>
          <Input value={journal} onChange={(e) => onJournalChange(e.target.value)} className="h-8 text-xs md:text-xs bg-white" />
        </div>

        <div className="flex items-center gap-2">
          <Label className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Editora</Label>
          <Input value={publisher} onChange={(e) => onPublisherChange(e.target.value)} className="h-8 text-xs md:text-xs bg-white" />
        </div>

        <div className="flex items-center gap-2">
          <Label className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">DOI/ISBN</Label>
          <Input value={identifier} onChange={(e) => onIdentifierChange(e.target.value)} className="h-8 text-xs md:text-xs bg-white" />
        </div>

        <div className="flex items-center gap-2">
          <Label className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Extra</Label>
          <Input value={extra} onChange={(e) => onExtraChange(e.target.value)} className="h-8 text-xs md:text-xs bg-white" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Texto Livre</Label>
          <Input value={freeText} onChange={(e) => onFreeTextChange(e.target.value)} className="h-8 text-xs md:text-xs bg-white" />
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
      {isConfigOpen ? (
        <div className="border-t border-border p-4">
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              {configContent}
            </div>
          </div>
        </div>
      ) : null}
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

export default BiblioExternaPanel;
