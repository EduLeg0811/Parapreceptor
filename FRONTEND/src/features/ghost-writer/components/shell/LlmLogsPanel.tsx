import { RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { panelsTopMenuBarBgClass } from "@/styles/backgroundColors";
import type { LlmLogEntry } from "@/features/ghost-writer/types";

interface LlmLogsPanelProps {
  embedded?: boolean;
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
  onClose: () => void;
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

const LlmLogsPanel = ({
  embedded = false,
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
  onClose,
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
}: LlmLogsPanelProps) => (
  <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/40">
    <div className={`flex items-center justify-between border-b border-border ${embedded ? "bg-white/60" : panelsTopMenuBarBgClass} px-4 py-3`}>
      {!embedded ? <h2 className="text-sm font-semibold text-foreground">LLM Logs</h2> : <div />}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-[11px] font-semibold"
          onClick={onDecreaseFont}
          title="Diminuir fonte dos logs"
          disabled={llmLogFontScale <= llmLogFontMin}
        >
          A-
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-[11px] font-semibold"
          onClick={onIncreaseFont}
          title="Aumentar fonte dos logs"
          disabled={llmLogFontScale >= llmLogFontMax}
        >
          A+
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onResetFont}
          title="Resetar fonte dos logs"
          disabled={llmLogFontScale === llmLogFontDefault}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClearLogs}
          title="Limpar logs"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        {!embedded ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            title="Fechar logs"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
    <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
      <div className="space-y-3">
        {llmLogs.length === 0 ? (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            Sem logs ainda.
          </div>
        ) : (
          llmLogs.map((entry) => (
            <div key={entry.id} className="space-y-2 rounded-md border border-border bg-muted/30 p-3" style={llmLogFontStyle}>
              <p className="text-[11px] font-semibold text-muted-foreground" style={llmLogFontStyle}>{entry.at}</p>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" style={llmLogFontStyle}>Request</p>
                <pre className="whitespace-pre-wrap break-words rounded bg-white p-2 text-[11px] text-foreground" style={llmLogFontStyle}>{JSON.stringify(entry.request, null, 2)}</pre>
              </div>
              {entry.response ? (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" style={llmLogFontStyle}>Response</p>
                  <pre className="whitespace-pre-wrap break-words rounded bg-white p-2 text-[11px] text-foreground" style={llmLogFontStyle}>{JSON.stringify(entry.response, null, 2)}</pre>
                </div>
              ) : null}
              {entry.error ? (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-destructive" style={llmLogFontStyle}>Error</p>
                  <pre className="whitespace-pre-wrap break-words rounded bg-white p-2 text-[11px] text-destructive" style={llmLogFontStyle}>{entry.error}</pre>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
    <div className="border-t border-border bg-muted/70 p-2.5">
      <div className="grid gap-1.5 text-[11px] leading-tight md:grid-cols-2">
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ultima chamada</p>
          <div className="rounded border border-border bg-white px-1.5 py-0.5">
            <span className="text-[10px] font-semibold text-blue-600">Modelo (ultima):</span>{" "}
            <span className="text-[10px] font-medium text-foreground">{effectiveModel || "-"}</span>
          </div>
          <div className="rounded border border-border bg-white px-1.5 py-0.5">
            <span className="text-[10px] font-semibold text-blue-600">Status (ultima):</span>{" "}
            <span className="text-[10px] font-medium text-foreground">{String(latestLlmMeta.status ?? "-")}</span>
          </div>
          <div className="rounded border border-border bg-white px-1.5 py-0.5">
            <span className="text-[10px] font-semibold text-blue-600">Temperatura (ultima):</span>{" "}
            <span className="text-[10px] font-medium text-foreground">{String(latestLlmMeta.temperature_requested ?? "-")}</span>
          </div>
          <div className="rounded border border-border bg-white px-1.5 py-0.5">
            <span className="text-[10px] font-semibold text-blue-600">Max tokens (ultima):</span>{" "}
            <span className="text-[10px] font-medium text-foreground">{String(latestLlmMeta.max_output_tokens_requested ?? "-")}</span>
          </div>
          <div className="rounded border border-border bg-white px-1.5 py-0.5">
            <span className="text-[10px] font-semibold text-blue-600">Input tokens:</span>{" "}
            <span className="text-[10px] font-medium text-foreground">{latestInputTokens}</span>
          </div>
          <div className="rounded border border-border bg-white px-1.5 py-0.5">
            <span className="text-[10px] font-semibold text-blue-600">Cached input tokens:</span>{" "}
            <span className="text-[10px] font-medium text-foreground">{latestCachedInputTokens}</span>
          </div>
          <div className="rounded border border-border bg-white px-1.5 py-0.5">
            <span className="text-[10px] font-semibold text-blue-600">Output tokens:</span>{" "}
            <span className="text-[10px] font-medium text-foreground">{latestOutputTokens}</span>
          </div>
          <div className="rounded border border-border bg-white px-1.5 py-0.5">
            <span className="text-[10px] font-semibold text-blue-600">Total tokens:</span>{" "}
            <span className="text-[10px] font-medium text-foreground">{latestTotalTokens}</span>
          </div>
          <div className="rounded border border-border bg-white px-1.5 py-0.5">
            <span className="text-[10px] font-semibold text-blue-600">Reasoning tokens:</span>{" "}
            <span className="text-[10px] font-medium text-foreground">{latestReasoningTokens}</span>
          </div>
          <div className="rounded border border-border bg-white px-1.5 py-0.5">
            <span className="text-[10px] font-semibold text-blue-600">Referencias RAG:</span>{" "}
            {latestRagReferences.length > 0 ? (
              <span className="text-[10px] font-medium text-foreground">{latestRagReferences.join(" | ")}</span>
            ) : (
              <span className="text-[10px] font-medium text-muted-foreground">nao informado</span>
            )}
          </div>
          <div className="rounded border border-border bg-white px-1.5 py-0.5">
            <span className="text-[10px] font-semibold text-blue-600">Custo estimado:</span>{" "}
            <span className="text-[10px] font-medium text-foreground">
              {latestEstimatedBrl != null
                ? `R$ ${latestEstimatedBrl.toFixed(4)} (US$ ${latestEstimatedUsd?.toFixed(6)})`
                : "indisponivel (modelo sem tabela local de preco)"}
            </span>
          </div>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">Consolidado da sessao</p>
          <div className="rounded border border-border bg-white px-1.5 py-0.5">
            <span className="text-[10px] font-semibold text-blue-700">Chamadas:</span>{" "}
            <span className="text-[10px] font-medium text-foreground">{llmSessionLogs.length}</span>
          </div>
          <div className="rounded border border-border bg-white px-1.5 py-0.5">
            <span className="text-[10px] font-semibold text-blue-700">Sucesso/Erro:</span>{" "}
            <span className="text-[10px] font-medium text-foreground">{successfulCallsCount}/{errorCallsCount}</span>
          </div>
          <div className="rounded border border-border bg-white px-1.5 py-0.5">
            <span className="text-[10px] font-semibold text-blue-700">Input tokens (total):</span>{" "}
            <span className="text-[10px] font-medium text-foreground">{inputTokens}</span>
          </div>
          <div className="rounded border border-border bg-white px-1.5 py-0.5">
            <span className="text-[10px] font-semibold text-blue-700">Cached input tokens (total):</span>{" "}
            <span className="text-[10px] font-medium text-foreground">{cachedInputTokens}</span>
          </div>
          <div className="rounded border border-border bg-white px-1.5 py-0.5">
            <span className="text-[10px] font-semibold text-blue-700">Output tokens (total):</span>{" "}
            <span className="text-[10px] font-medium text-foreground">{outputTokens}</span>
          </div>
          <div className="rounded border border-border bg-white px-1.5 py-0.5">
            <span className="text-[10px] font-semibold text-blue-700">Total tokens (total):</span>{" "}
            <span className="text-[10px] font-medium text-foreground">{totalTokens}</span>
          </div>
          <div className="rounded border border-border bg-white px-1.5 py-0.5">
            <span className="text-[10px] font-semibold text-blue-700">Reasoning tokens (total):</span>{" "}
            <span className="text-[10px] font-medium text-foreground">{reasoningTokens}</span>
          </div>
          <div className="rounded border border-border bg-white px-1.5 py-0.5">
            <span className="text-[10px] font-semibold text-blue-700">Referencias RAG (todas):</span>{" "}
            {latestRagReferencesAllCalls.length > 0 ? (
              <span className="text-[10px] font-medium text-foreground">{latestRagReferencesAllCalls.join(" | ")}</span>
            ) : (
              <span className="text-[10px] font-medium text-muted-foreground">nao informado</span>
            )}
          </div>
          <div className="rounded border border-border bg-white px-1.5 py-0.5">
            <span className="text-[10px] font-semibold text-blue-700">Custo estimado (total):</span>{" "}
            <span className="text-[10px] font-medium text-foreground">
              {estimatedBrl != null
                ? `R$ ${estimatedBrl.toFixed(4)} (US$ ${estimatedUsd?.toFixed(6)})`
                : "indisponivel (modelo sem tabela local de preco)"}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default LlmLogsPanel;
