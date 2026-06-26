import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, RefreshCw, Search, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchLexicalOverviewProgress,
  fetchSemanticOverviewProgress,
  fetchSemanticSearchProgress,
  type SemanticOverviewProgressEvent,
  type SemanticOverviewProgressSnapshot,
} from "@/features/ghost-writer/api/backendApi";
import { panelsTopMenuBarBgClass } from "@/styles/backgroundColors";

const statusStyles: Record<SemanticOverviewProgressSnapshot["status"], { chip: string; label: string }> = {
  idle: { chip: "bg-slate-100 text-slate-700 ring-slate-200", label: "Idle" },
  running: { chip: "bg-emerald-100 text-emerald-800 ring-emerald-200", label: "Running" },
  completed: { chip: "bg-blue-100 text-blue-800 ring-blue-200", label: "Completed" },
  error: { chip: "bg-rose-100 text-rose-800 ring-rose-200", label: "Error" },
};

const initialProgress: SemanticOverviewProgressSnapshot = {
  status: "idle",
  events: [],
};

const formatScore = (value?: number | null): string => (typeof value === "number" ? value.toFixed(2) : "-");

const formatStageLabel = (stage: string): string => {
  switch (stage) {
    case "index_completed":
      return "resultado";
    case "index_skipped":
      return "sem achados";
    case "index_started":
      return "em andamento";
    case "started":
      return "inicio";
    case "completed":
      return "concluido";
    case "error":
      return "erro";
    default:
      return stage.replace(/_/g, " ");
  }
};

const buildTimelineEntries = (events: SemanticOverviewProgressEvent[]) => {
  const relevantStages = new Set(["started", "index_completed", "index_skipped", "error", "completed"]);
  return events.filter((event) => relevantStages.has(event.stage));
};

interface SearchLogPanelProps {
  onClose?: () => void;
  shouldPoll?: boolean;
  activeSearchType?: "semantic_search" | "semantic_overview" | "lexical_overview" | null;
  embedded?: boolean;
}

const getSnapshotRank = (snapshot: SemanticOverviewProgressSnapshot | null | undefined): number => {
  if (!snapshot) return -1;
  if (snapshot.status === "running") return 3;
  if (snapshot.status === "error") return 2;
  if (snapshot.status === "completed") return 1;
  return 0;
};

const getSnapshotTime = (snapshot: SemanticOverviewProgressSnapshot | null | undefined): number => {
  const raw = snapshot?.updatedAt || snapshot?.finishedAt || snapshot?.startedAt || "";
  const parsed = raw ? Date.parse(raw) : NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
};

const chooseProgressSnapshot = (
  semanticSearch: SemanticOverviewProgressSnapshot,
  semanticOverview: SemanticOverviewProgressSnapshot,
  lexicalOverview: SemanticOverviewProgressSnapshot,
  activeSearchType: "semantic_search" | "semantic_overview" | "lexical_overview" | null,
): SemanticOverviewProgressSnapshot => {
  if (activeSearchType === "semantic_search" && semanticSearch.status !== "idle") return semanticSearch;
  if (activeSearchType === "semantic_overview" && semanticOverview.status !== "idle") return semanticOverview;
  if (activeSearchType === "lexical_overview" && lexicalOverview.status !== "idle") return lexicalOverview;
  const ranked = [semanticSearch, semanticOverview, lexicalOverview].sort((a, b) => {
    const rankDiff = getSnapshotRank(b) - getSnapshotRank(a);
    if (rankDiff !== 0) return rankDiff;
    return getSnapshotTime(b) - getSnapshotTime(a);
  });
  return ranked[0] || semanticSearch;
};

const fetchActiveProgress = async (
  activeSearchType: "semantic_search" | "semantic_overview" | "lexical_overview" | null,
): Promise<SemanticOverviewProgressSnapshot> => {
  if (activeSearchType === "semantic_search") {
    const data = await fetchSemanticSearchProgress();
    return data.result || { ...initialProgress, searchType: "semantic_search" };
  }
  if (activeSearchType === "semantic_overview") {
    const data = await fetchSemanticOverviewProgress();
    return data.result || { ...initialProgress, searchType: "semantic_overview" };
  }
  if (activeSearchType === "lexical_overview") {
    const data = await fetchLexicalOverviewProgress();
    return data.result || { ...initialProgress, searchType: "lexical_overview" };
  }

  const [semanticSearchData, semanticOverviewData, lexicalOverviewData] = await Promise.all([
    fetchSemanticSearchProgress(),
    fetchSemanticOverviewProgress(),
    fetchLexicalOverviewProgress(),
  ]);
  return chooseProgressSnapshot(
    semanticSearchData.result || { ...initialProgress, searchType: "semantic_search" },
    semanticOverviewData.result || { ...initialProgress, searchType: "semantic_overview" },
    lexicalOverviewData.result || { ...initialProgress, searchType: "lexical_overview" },
    activeSearchType,
  );
};

const SearchLogPanel = ({ onClose, shouldPoll = false, activeSearchType = null, embedded = false }: SearchLogPanelProps) => {
  const [progress, setProgress] = useState<SemanticOverviewProgressSnapshot>(initialProgress);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    const refresh = async () => {
      try {
        setIsRefreshing(true);
        const snapshot = await fetchActiveProgress(activeSearchType);
        if (cancelled) return;
        setProgress(snapshot);
        setLoadError(null);
      } catch (error: unknown) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "Falha ao carregar Search Log.");
      } finally {
        if (!cancelled) setIsRefreshing(false);
      }
    };

    void refresh();
    if (shouldPoll) {
      intervalId = window.setInterval(() => {
        void refresh();
      }, 1500);
    }

    return () => {
      cancelled = true;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [activeSearchType, shouldPoll]);

  const statusMeta = statusStyles[progress.status];
  const processedIndexes = Number(progress.processedIndexes || 0);
  const totalIndexes = Number(progress.totalIndexes || 0);
  const isLexical = progress.searchType === "lexical_overview";
  const isSemanticSearch = progress.searchType === "semantic_search";
  const overviewTitle = isLexical
    ? "Lexical Overview Monitor"
    : isSemanticSearch
      ? "Semantic Search Monitor"
      : "Semantic Overview Monitor";
  const overviewSubtitle = isLexical
    ? "Varredura lexica"
    : isSemanticSearch
      ? "Busca semantica"
      : "Varredura semantica";
  const processedLabel = isLexical ? "Fontes" : isSemanticSearch ? "Base" : "Bases";
  const queryLabel = isSemanticSearch ? "Query" : "Termo";
  const timelineEntries = buildTimelineEntries(progress.events);
  const statusMessage = loadError || progress.error || progress.message || "Sem atividade recente.";
  const showsSemanticCalibration = !isLexical;
  const semanticCalibrationLabel = progress.ignoreBaseCalibration
    ? "Calibracao ignorada"
    : progress.usesCalibratedMinScores === false
      ? "Sem calibracao"
      : "Calibracao ativa";
  const semanticRagContext = !isLexical ? (progress.ragContext || null) : null;
  const hasSemanticRagDetails = Boolean(
    semanticRagContext
    && (
      semanticRagContext.usedRagContext
      || semanticRagContext.error
      || semanticRagContext.keyTerms.length > 0
      || semanticRagContext.definitions.length > 0
      || semanticRagContext.relatedTerms.length > 0
      || semanticRagContext.disambiguatedQuery
      || semanticRagContext.references.length > 0
    ),
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/40">
      {!embedded ? (
        <div className={`flex items-center justify-between border-b border-border ${panelsTopMenuBarBgClass} px-3 py-2`}>
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold leading-none text-foreground">Search Log</h2>
            <p className="mt-1 text-[11px] leading-tight text-muted-foreground">Monitor em tempo real</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${statusMeta.chip}`}>
              {statusMeta.label}
            </span>
            {onClose ? (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Fechar Search Log">
                <X className="h-3 w-3" />
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="border-b border-border bg-white/60 px-3 py-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${statusMeta.chip}`}>
            {statusMeta.label}
          </span>
        </div>
      )}

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto bg-slate-50/50 p-3">
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_16px_40px_-36px_rgba(15,23,42,0.45)]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80">
                    <Search className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">{overviewTitle}</p>
                    <p className="truncate text-[11px] text-slate-500">{overviewSubtitle}</p>
                  </div>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 ring-1 ring-slate-200">
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                {shouldPoll ? (isRefreshing ? "Atualizando" : "Polling") : "Parado"}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-2 py-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{queryLabel}</p>
                <p className="max-w-[18rem] truncate text-[11px] font-medium text-slate-900">{progress.term || "-"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-2 py-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{processedLabel}</p>
                <p className="text-[11px] font-medium text-slate-900">
                  {isSemanticSearch ? (progress.currentIndexLabel || progress.currentIndexId || "-") : `${processedIndexes}/${totalIndexes || "-"}`}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-2 py-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Achados</p>
                <p className="text-[11px] font-medium text-slate-900">{Number(progress.totalMatchesAccumulated || progress.totalFound || 0)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-2 py-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Top</p>
                <p className="text-[11px] font-medium text-slate-900">{formatScore(progress.topScore)}</p>
              </div>
              {showsSemanticCalibration ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-2 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Calibracao</p>
                  <p className="text-[11px] font-medium text-slate-900">{semanticCalibrationLabel}</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</p>
              <p className="mt-0.5 text-[11px] leading-5 text-slate-700">{statusMessage}</p>
            </div>
            {!isLexical ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Contexto aplicado na ultima busca</p>
                {hasSemanticRagDetails && semanticRagContext ? (
                  <div className="mt-1 space-y-1 text-[11px] leading-5 text-slate-700">
                    {semanticRagContext.error ? (
                      <p className="text-amber-700">
                        A pre-busca conscienciologica falhou e a busca seguiu apenas com a query normal: {semanticRagContext.error}
                      </p>
                    ) : null}
                    {semanticRagContext.keyTerms.length > 0 ? (
                      <p><span className="font-semibold text-slate-900">Termos-chave:</span> {semanticRagContext.keyTerms.join(", ")}</p>
                    ) : null}
                    {semanticRagContext.definitions.length > 0 ? (
                      <div>
                        <p className="font-semibold text-slate-900">Definicoes:</p>
                        {semanticRagContext.definitions.map((item) => (
                          <p key={`${item.term}:${item.meaning}`}>
                            <span className="font-semibold text-slate-900">{item.term}:</span> {item.meaning}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    {semanticRagContext.relatedTerms.length > 0 ? (
                      <p><span className="font-semibold text-slate-900">Termos adicionais:</span> {semanticRagContext.relatedTerms.join(", ")}</p>
                    ) : null}
                    {semanticRagContext.disambiguatedQuery ? (
                      <p><span className="font-semibold text-slate-900">Query expandida:</span> {semanticRagContext.disambiguatedQuery}</p>
                    ) : null}
                    {semanticRagContext.references.length > 0 ? (
                      <p><span className="font-semibold text-slate-900">Referencias RAG:</span> {semanticRagContext.references.join(", ")}</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-0.5 text-[11px] leading-5 text-slate-700">
                    Nenhum contexto adicional aplicado na ultima busca.
                  </p>
                )}
              </div>
            ) : null}
            <div className="rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_16px_40px_-36px_rgba(15,23,42,0.45)]">
              <div className="flex items-center gap-1.5">
                {progress.status === "error" ? (
                  <TriangleAlert className="h-3.5 w-3.5 text-rose-700" />
                ) : progress.status === "completed" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-700" />
                ) : (
                  <Clock3 className="h-3.5 w-3.5 text-emerald-700" />
                )}
                <p className="text-xs font-semibold text-slate-900">Timeline</p>
              </div>

              <div className="mt-3 space-y-1.5">
                {timelineEntries.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-2.5 py-3 text-[11px] text-slate-500">
                    Nenhum resultado registrado ainda.
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                    <ul className="space-y-1 text-[11px] text-slate-700">
                      {timelineEntries.map((event, index) => (
                        <li
                          key={`${event.at}-${event.stage}-${event.indexId || index}`}
                          className="border-b border-slate-200/70 pb-1 last:border-b-0 last:pb-0"
                        >
                          <span className="font-medium text-slate-900">
                            {(event.indexId || event.indexLabel || "overview").toUpperCase()}
                          </span>
                          <span>: </span>
                          <span>{typeof event.matchesFound === "number" ? `${event.matchesFound} achados` : formatStageLabel(event.stage)}</span>
                          {typeof event.totalMatchesAccumulated === "number" ? <span>{` | acumulado ${event.totalMatchesAccumulated}`}</span> : null}
                          {typeof event.topScore === "number" ? <span>{` | top ${event.topScore.toFixed(2)}`}</span> : null}
                          {event.note ? <span>{` | ${event.note}`}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchLogPanel;

