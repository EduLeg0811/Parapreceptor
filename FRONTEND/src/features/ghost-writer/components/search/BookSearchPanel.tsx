import { useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2, Play, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { primaryActionButtonClass } from "@/styles/buttonStyles";
import { panelsTopMenuBarBgClass } from "@/styles/backgroundColors";
import SourceSelect from "@/features/ghost-writer/components/common/SourceSelect";
import type { LexicalBookOption } from "@/features/ghost-writer/types";

interface BookSearchPanelProps {
  title: string;
  description: string;
  bookOptions: LexicalBookOption[];
  selectedBook: string;
  term: string;
  maxResults: number;
  onSelectBook: (value: string) => void;
  onTermChange: (value: string) => void;
  onMaxResultsChange: (value: number) => void;
  onRunSearch: () => void;
  isRunning: boolean;
  onClose?: () => void;
  showPanelChrome?: boolean;
}

const BookSearchPanel = ({
  title,
  description,
  bookOptions,
  selectedBook,
  term,
  maxResults,
  onSelectBook,
  onTermChange,
  onMaxResultsChange,
  onRunSearch,
  isRunning,
  onClose,
  showPanelChrome = true,
}: BookSearchPanelProps) => {
  const termTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resizeTermTextarea = () => {
    const el = termTextareaRef.current;
    if (!el) return;
    el.style.height = "36px";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    resizeTermTextarea();
  }, [term]);

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
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Livro</Label>
          <SourceSelect
            items={bookOptions.map((option) => ({
              id: option.id,
              label: option.label,
            }))}
            selectedId={selectedBook}
            emptyLabel="Nenhum livro disponível."
            onChange={onSelectBook}
          />
        </div>

        <div className="flex items-center gap-2">
          <Label className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Termo</Label>
          <Textarea
            ref={termTextareaRef}
            className="h-8 min-h-8 flex-1 resize-none overflow-hidden rounded-md border border-input bg-white px-3 py-1 text-xs leading-relaxed text-foreground"
            rows={1}
            value={term}
            onChange={(e) => {
              onTermChange(e.target.value);
              resizeTermTextarea();
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <Label className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Limite</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={String(maxResults)}
            onChange={(e) => {
              const raw = Number.parseInt(e.target.value || "1", 10);
              const next = Number.isFinite(raw) ? Math.max(1, Math.min(100, raw)) : 1;
              onMaxResultsChange(next);
            }}
            className="h-8 bg-white !text-xs text-right"
          />
        </div>

        <div className="grid grid-cols-1 gap-2">
          <Button
            variant="secondary"
            size="sm"
            className={primaryActionButtonClass}
            onClick={onRunSearch}
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
                <span className="relative z-10 text-blue-500">Buscar</span>
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

export default BookSearchPanel;
