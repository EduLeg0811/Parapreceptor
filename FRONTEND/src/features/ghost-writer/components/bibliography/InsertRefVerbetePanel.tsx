import { useLayoutEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Play, X } from "lucide-react";
import { primaryActionButtonClass } from "@/styles/buttonStyles";
import { panelsTopMenuBarBgClass } from "@/styles/backgroundColors";

interface InsertRefVerbetePanelProps {
  title: string;
  description: string;
  verbeteInput: string;
  onVerbeteInputChange: (value: string) => void;
  onRun: () => void;
  isRunning: boolean;
  onClose?: () => void;
  showPanelChrome?: boolean;
}

const InsertRefVerbetePanel = ({
  title,
  description,
  verbeteInput,
  onVerbeteInputChange,
  onRun,
  isRunning,
  onClose,
  showPanelChrome = true,
}: InsertRefVerbetePanelProps) => {
  const canRun = verbeteInput.trim().length > 0 && !isRunning;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useLayoutEffect(() => {
    resizeTextarea();
  }, [verbeteInput]);

  const content = (
    <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
      <div className="space-y-5">
        {showPanelChrome ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        ) : null}

        {showPanelChrome ? <Separator /> : null}

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Verbetes</Label>
          <p className="text-xs text-muted-foreground">Nomes dos verbetes separados por virgula, ponto-e-virgula ou quebra de linha.</p>
          <Textarea
            ref={textareaRef}
            className="min-h-40 resize-none overflow-hidden rounded-md border border-input bg-white px-3 py-2 !text-xs leading-relaxed text-foreground"
            rows={4}
            value={verbeteInput}
            onChange={(e) => {
              onVerbeteInputChange(e.target.value);
              resizeTextarea();
            }}
          />
        </div>

        <Button
          variant="secondary"
          size="sm"
          className={primaryActionButtonClass}
          onClick={onRun}
          disabled={!canRun}
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-black relative z-10" />
              <span className="relative z-10 text-blue-500">Inserindo</span>
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

export default InsertRefVerbetePanel;

