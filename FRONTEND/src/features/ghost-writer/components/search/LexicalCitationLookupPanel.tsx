import { useEffect, useRef } from "react";
import { ArrowLeft, Loader2, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { primaryActionButtonClass } from "@/styles/buttonStyles";
import { panelsTopMenuBarBgClass } from "@/styles/backgroundColors";

interface LexicalCitationLookupPanelProps {
  title: string;
  description: string;
  citationText: string;
  hasDocumentOpen: boolean;
  onCitationTextChange: (value: string) => void;
  onImportCitationText: () => void;
  onRunCitationLookup: () => void;
  isRunning: boolean;
  onClose?: () => void;
  showPanelChrome?: boolean;
}

const LexicalCitationLookupPanel = ({
  title,
  description,
  citationText,
  hasDocumentOpen,
  onCitationTextChange,
  onImportCitationText,
  onRunCitationLookup,
  isRunning,
  onClose,
  showPanelChrome = true,
}: LexicalCitationLookupPanelProps) => {
  const citationTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = citationTextareaRef.current;
    if (!el) return;
    el.style.height = "120px";
    el.style.height = `${el.scrollHeight}px`;
  }, [citationText]);

  const content = (
    <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
      <div className="space-y-5">
        {showPanelChrome ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs font-medium hover:bg-primary/5"
              onClick={onImportCitationText}
              disabled={isRunning || !hasDocumentOpen}
            >
              <span className="text-blue-500">Select & Import</span>
              <ArrowLeft className="ml-2 h-4 w-4 shrink-0 text-blue-500" />
            </Button>
          </div>
          <Textarea
            ref={citationTextareaRef}
            rows={6}
            value={citationText}
            onChange={(event) => onCitationTextChange(event.target.value)}
            placeholder="Cole aqui varios trechos separados por uma linha em branco."
            className="min-h-[120px] resize-none rounded-md border border-border bg-white px-3 py-2 text-xs outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-1 gap-2">
          <Button
            variant="secondary"
            size="sm"
            className={primaryActionButtonClass}
            onClick={onRunCitationLookup}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-black relative z-10" />
                <span className="relative z-10 text-blue-500">Buscando</span>
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4 text-black relative z-10" />
                <span className="relative z-10 text-blue-500">Localiza Trechos</span>
              </>
            )}
          </Button>
        </div>
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

export default LexicalCitationLookupPanel;
