import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2, Play, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { primaryActionButtonClass } from "@/styles/buttonStyles";
import { panelsTopMenuBarBgClass } from "@/styles/backgroundColors";
import type { SemanticIndexOption } from "@/features/ghost-writer/types";
import SourceRadioList from "@/features/ghost-writer/components/common/SourceRadioList";

interface SemanticSearchPanelProps {
  title: string;
  description: string;
  selectedIndexId: string;
  availableIndexes: SemanticIndexOption[];
  isLoadingIndexes: boolean;
  onSelectedIndexChange: (value: string) => void;
  query: string;
  maxResults: number;
  minScore: number | null;
  effectiveMinScorePreview?: number;
  recommendedMinScore?: number;
  useRagContext: boolean;
  excludeLexicalDuplicates: boolean;
  selectedVectorStoreLabel: string;
  onQueryChange: (value: string) => void;
  onMaxResultsChange: (value: number) => void;
  onMinScoreChange: (value: number | null) => void;
  onUseRagContextChange: (value: boolean) => void;
  onExcludeLexicalDuplicatesChange: (value: boolean) => void;
  onRunSearch: () => void;
  isRunning: boolean;
  onClose?: () => void;
  showPanelChrome?: boolean;
}

const SemanticSearchPanel = ({
  title,
  description,
  selectedIndexId,
  availableIndexes,
  isLoadingIndexes,
  onSelectedIndexChange,
  query,
  maxResults,
  minScore,
  effectiveMinScorePreview,
  recommendedMinScore,
  useRagContext,
  excludeLexicalDuplicates,
  selectedVectorStoreLabel,
  onQueryChange,
  onMaxResultsChange,
  onMinScoreChange,
  onUseRagContextChange,
  onExcludeLexicalDuplicatesChange,
  onRunSearch,
  isRunning,
  onClose,
  showPanelChrome = true,
}: SemanticSearchPanelProps) => {
  const queryTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectedIndex = availableIndexes.find((item) => item.id === selectedIndexId) ?? null;
  const [minScoreDraft, setMinScoreDraft] = useState("");

  const resizeQueryTextarea = () => {
    const el = queryTextareaRef.current;
    if (!el) return;
    el.style.height = "72px";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    resizeQueryTextarea();
  }, [query]);

  useEffect(() => {
    setMinScoreDraft(typeof minScore === "number" && Number.isFinite(minScore) ? minScore.toFixed(2) : "");
  }, [minScore]);

  const commitMinScoreDraft = () => {
    const normalized = minScoreDraft.replace(",", ".").trim();
    if (!normalized) {
      onMinScoreChange(null);
      return;
    }
    const raw = Number.parseFloat(normalized);
    if (!Number.isFinite(raw)) return;
    onMinScoreChange(Math.max(0, Math.min(1, raw)));
  };

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
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Base Vetorial</Label>
          <SourceRadioList
            name="semantic-search-index"
            items={availableIndexes.map((item) => ({
              id: item.id,
              label: item.label,
            }))}
            selectedId={selectedIndexId}
            isLoading={isLoadingIndexes}
            loadingLabel="Carregando indices semanticos disponiveis."
            emptyLabel="Nenhum indice semantico disponivel."
            onChange={onSelectedIndexChange}
          />
          {selectedIndex ? (
            <div className="space-y-1">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {selectedIndex.sourceRows} itens | {selectedIndex.model} | {selectedIndex.dimensions} dims | {selectedIndex.embeddingDtype}
              </p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Piso calibrado conservador desta base: {selectedIndex.suggestedMinScore.toFixed(2)}
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Query</Label>
          <Textarea
            ref={queryTextareaRef}
            className="min-h-[72px] resize-none rounded-md border border-input bg-white px-3 py-2 text-xs leading-relaxed text-foreground"
            rows={3}
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
              resizeQueryTextarea();
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <Label className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Limite</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={String(maxResults)}
            onChange={(e) => {
              const raw = Number.parseInt(e.target.value || "10", 10);
              const next = Number.isFinite(raw) ? Math.max(1, Math.min(50, raw)) : 10;
              onMaxResultsChange(next);
            }}
            className="h-8 bg-white !text-xs text-right"
          />
        </div>


        <div className="flex items-center gap-2">
          <Label className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score Min</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={1}
                  step="0.01"
                  value={minScoreDraft}
                  onChange={(event) => {
                    setMinScoreDraft(event.target.value);
                  }}
                  onBlur={commitMinScoreDraft}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      commitMinScoreDraft();
                      event.currentTarget.blur();
                    }
                  }}
                  placeholder="0.50"
                  className="h-8 bg-white !text-xs text-right"
                />
              </div>


        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Piso usado na busca: {typeof effectiveMinScorePreview === "number" ? effectiveMinScorePreview.toFixed(2) : "-"}
          {typeof recommendedMinScore === "number" ? ` | Piso calibrado conservador: ${recommendedMinScore.toFixed(2)}` : ""}
        </p>

        <div className="space-y-2 rounded-lg border border-border/60 bg-slate-50/80 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">RAG Conscienciologico</Label>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Contextualizar a query.
              </p>
             
              
            </div>
            

            <Switch checked={useRagContext} onCheckedChange={onUseRagContextChange} />
          </div>
           <p className="text-[11px] leading-relaxed text-muted-foreground">
                Vector store atual: {selectedVectorStoreLabel || "nenhum selecionado"}
              </p>

          <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duplicados lexicos</Label>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Descartar resultados lexicos.
              </p>
            </div>
            <Switch checked={excludeLexicalDuplicates} onCheckedChange={onExcludeLexicalDuplicatesChange} />
          </div>
          
          {useRagContext ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {/* Contexto exibido em Logs &gt; Search. */}
            </p>
          ) : (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {/* Etapa desabilitada. */}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2">
          <Button
            variant="secondary"
            size="sm"
            className={primaryActionButtonClass}
            onClick={onRunSearch}
            disabled={isRunning || !selectedIndexId}
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-black relative z-10" />
                <span className="relative z-10 text-blue-500">Buscando</span>
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4 text-black relative z-10" />
                <span className="relative z-10 text-blue-500">Search</span>
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

export default SemanticSearchPanel;
