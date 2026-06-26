import { Search, Braces, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { panelsTopMenuBarBgClass } from "@/styles/backgroundColors";
import SearchLogPanel from "@/features/ghost-writer/components/search/SearchLogPanel";
import LlmLogsPanel from "@/features/ghost-writer/components/shell/LlmLogsPanel";
import type { LogPanelTabId, LlmLogEntry } from "@/features/ghost-writer/types";

interface LogsPanelProps {
  activeTab: LogPanelTabId;
  onTabChange: (tab: LogPanelTabId) => void;
  onClose: () => void;
  shouldPollSearch: boolean;
  activeSearchType: "semantic_search" | "semantic_overview" | "lexical_overview" | null;
  llmLogs: LlmLogEntry[];
  llmSessionLogs: LlmLogEntry[];
  llmLogFontScale: number;
  llmLogFontStyle: React.CSSProperties;
  llmLogFontDefault: number;
  llmLogFontMin: number;
  llmLogFontMax: number;
  onDecreaseFont: () => void;
  onIncreaseFont: () => void;
  onResetFont: () => void;
  onClearLogs: () => void;
  effectiveModel: string;
  latestLlmMeta: Record<string, unknown>;
  latestInputTokens: number;
  latestCachedInputTokens: number;
  latestOutputTokens: number;
  latestTotalTokens: number;
  latestReasoningTokens: number;
  latestRagReferences: string[];
  latestEstimatedBrl: number | null;
  latestEstimatedUsd: number | null;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  reasoningTokens: number;
  latestRagReferencesAllCalls: string[];
  estimatedBrl: number | null;
  estimatedUsd: number | null;
  successfulCallsCount: number;
  errorCallsCount: number;
}

const tabButtonClass = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
    active
      ? "bg-white text-foreground shadow-sm ring-1 ring-border"
      : "text-muted-foreground hover:bg-white/70 hover:text-foreground"
  }`;

const LogsPanel = ({
  activeTab,
  onTabChange,
  onClose,
  shouldPollSearch,
  activeSearchType,
  llmLogs,
  llmSessionLogs,
  llmLogFontScale,
  llmLogFontStyle,
  llmLogFontDefault,
  llmLogFontMin,
  llmLogFontMax,
  onDecreaseFont,
  onIncreaseFont,
  onResetFont,
  onClearLogs,
  effectiveModel,
  latestLlmMeta,
  latestInputTokens,
  latestCachedInputTokens,
  latestOutputTokens,
  latestTotalTokens,
  latestReasoningTokens,
  latestRagReferences,
  latestEstimatedBrl,
  latestEstimatedUsd,
  inputTokens,
  cachedInputTokens,
  outputTokens,
  totalTokens,
  reasoningTokens,
  latestRagReferencesAllCalls,
  estimatedBrl,
  estimatedUsd,
  successfulCallsCount,
  errorCallsCount,
}: LogsPanelProps) => (
  <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/40">
    <div className={`flex items-center justify-between gap-3 border-b border-border ${panelsTopMenuBarBgClass} px-3 py-2.5`}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">Logs</h2>
        <p className="text-[11px] text-muted-foreground">Monitor</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className={tabButtonClass(activeTab === "search")} onClick={() => onTabChange("search")}>
          <Search className="h-3.5 w-3.5" />
          <span>Search</span>
        </button>
        <button type="button" className={tabButtonClass(activeTab === "llm")} onClick={() => onTabChange("llm")}>
          <Braces className="h-3.5 w-3.5" />
          <span>LLM</span>
        </button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title="Fechar logs">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>

    <div className="flex min-h-0 flex-1 flex-col">
      {activeTab === "search" ? (
        <SearchLogPanel
          embedded
          shouldPoll={shouldPollSearch}
          activeSearchType={activeSearchType}
        />
      ) : (
        <LlmLogsPanel
          embedded
          llmLogs={llmLogs}
          llmSessionLogs={llmSessionLogs}
          llmLogFontScale={llmLogFontScale}
          llmLogFontStyle={llmLogFontStyle}
          llmLogFontDefault={llmLogFontDefault}
          llmLogFontMin={llmLogFontMin}
          llmLogFontMax={llmLogFontMax}
          onDecreaseFont={onDecreaseFont}
          onIncreaseFont={onIncreaseFont}
          onResetFont={onResetFont}
          onClearLogs={onClearLogs}
          onClose={onClose}
          effectiveModel={effectiveModel}
          latestLlmMeta={latestLlmMeta}
          latestInputTokens={latestInputTokens}
          latestCachedInputTokens={latestCachedInputTokens}
          latestOutputTokens={latestOutputTokens}
          latestTotalTokens={latestTotalTokens}
          latestReasoningTokens={latestReasoningTokens}
          latestRagReferences={latestRagReferences}
          latestEstimatedBrl={latestEstimatedBrl}
          latestEstimatedUsd={latestEstimatedUsd}
          inputTokens={inputTokens}
          cachedInputTokens={cachedInputTokens}
          outputTokens={outputTokens}
          totalTokens={totalTokens}
          reasoningTokens={reasoningTokens}
          latestRagReferencesAllCalls={latestRagReferencesAllCalls}
          estimatedBrl={estimatedBrl}
          estimatedUsd={estimatedUsd}
          successfulCallsCount={successfulCallsCount}
          errorCallsCount={errorCallsCount}
        />
      )}
    </div>
  </div>
);

export default LogsPanel;


