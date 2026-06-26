import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Play, X } from "lucide-react";
import { primaryActionButtonClass } from "@/styles/buttonStyles";
import { panelsTopMenuBarBgClass } from "@/styles/backgroundColors";
import { Switch } from "@/components/ui/switch";
import { OVERVIEW_SOURCE_GROUPS } from "@/features/ghost-writer/config/overviewSources";
import SourceBlockCheckboxList from "@/features/ghost-writer/components/common/SourceBlockCheckboxList";

interface SemanticOverviewConfig {
  minScore: number | null;
  effectiveMinScorePreview?: number;
  recommendedMinScoreMin?: number;
  recommendedMinScoreMax?: number;
  useRagContext: boolean;
  excludeLexicalDuplicates: boolean;
  selectedVectorStoreLabel?: string;
  onMinScoreChange: (value: number | null) => void;
  onUseRagContextChange: (value: boolean) => void;
  onExcludeLexicalDuplicatesChange: (value: boolean) => void;
}

interface OverviewSearchPanelProps {
  title: string;
  description: string;
  term: string;
  maxResults: number;
  selectedSourceIds: string[];
  queryLabel?: string;
  semanticConfig?: SemanticOverviewConfig;
  onToggleSource: (id: string, checked: boolean) => void;
  onTermChange: (value: string) => void;
  onMaxResultsChange: (value: number) => void;
  onRunSearch: () => void;
  isRunning: boolean;
  onClose?: () => void;
  showPanelChrome?: boolean;
}

const OverviewSearchPanel = ({
  title,
  description,
  term,
  maxResults,
  selectedSourceIds,
  queryLabel = "Termo",
  semanticConfig,
  onToggleSource,
  onTermChange,
  onMaxResultsChange,
  onRunSearch,
  isRunning,
  onClose,
  showPanelChrome = true,
}: OverviewSearchPanelProps) => {
  const termTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [minScoreDraft, setMinScoreDraft] = useState("");

  const resizeTermTextarea = () => {
    const el = termTextareaRef.current;
    if (!el) return;
    el.style.height = "72px";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    resizeTermTextarea();
  }, [term]);

  useEffect(() => {
    if (!semanticConfig) {
      setMinScoreDraft("");
      return;
    }
    setMinScoreDraft(typeof semanticConfig.minScore === "number" && Number.isFinite(semanticConfig.minScore) ? semanticConfig.minScore.toFixed(2) : "");
  }, [semanticConfig?.minScore]);

  const commitMinScoreDraft = () => {
    if (!semanticConfig) return;
    const normalized = minScoreDraft.replace(",", ".").trim();
    if (!normalized) {
      semanticConfig.onMinScoreChange(null);
      return;
    }
    const raw = Number.parseFloat(normalized);
    if (!Number.isFinite(raw)) return;
    semanticConfig.onMinScoreChange(Math.max(0, Math.min(1, raw)));
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

        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bases</Label>
          <SourceBlockCheckboxList
            groups={OVERVIEW_SOURCE_GROUPS}
            selectedIds={selectedSourceIds}
            onToggleItem={onToggleSource}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{queryLabel}</Label>
          <Textarea
            ref={termTextareaRef}
            className="min-h-[72px] resize-none rounded-md border border-input bg-white px-3 py-2 text-xs leading-relaxed text-foreground"
            rows={3}
            value={term}
            onChange={(event) => {
              onTermChange(event.target.value);
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
            onChange={(event) => {
              const raw = Number.parseInt(event.target.value || "1", 10);
              const next = Number.isFinite(raw) ? Math.max(1, Math.min(100, raw)) : 1;
              onMaxResultsChange(next);
            }}
            className="h-8 bg-white !text-xs text-right"
          />
        </div>

        {semanticConfig ? (
          <>
            {/*<div className="space-y-1">*/}
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
                Piso usado na busca: {typeof semanticConfig.effectiveMinScorePreview === "number" ? semanticConfig.effectiveMinScorePreview.toFixed(2) : "-"}
                {typeof semanticConfig.recommendedMinScoreMin === "number" && typeof semanticConfig.recommendedMinScoreMax === "number"
                  ? ` | Faixa calibrada conservadora: ${semanticConfig.recommendedMinScoreMin.toFixed(2)}-${semanticConfig.recommendedMinScoreMax.toFixed(2)}`
                  : ""}
              </p>
            {/*</div>*/}

            <div className="space-y-2 rounded-lg border border-border/60 bg-slate-50/80 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">RAG Conscienciologico</Label>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Contextualizar a query.
                  </p>
                </div>
                <Switch checked={semanticConfig.useRagContext} onCheckedChange={semanticConfig.onUseRagContextChange} />
              </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
                Vector store atual: {semanticConfig.selectedVectorStoreLabel || "nenhum selecionado"}
              </p>
              {semanticConfig.useRagContext ? (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {/* Contexto exibido em Logs &gt; Search. */}
                </p>
              ) : (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                {/* Etapa desabilitada. */}
                </p>
              )}


              <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duplicados lexicos</Label>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Descartar resultados lexicos.
                  </p>
                </div>
                <Switch checked={semanticConfig.excludeLexicalDuplicates} onCheckedChange={semanticConfig.onExcludeLexicalDuplicatesChange} />
              </div>
              
            </div>
          </>
        ) : null}

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
                <span className="relative z-10 text-blue-500">Overview</span>
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

export type { OverviewSearchPanelProps, SemanticOverviewConfig };
export default OverviewSearchPanel;
