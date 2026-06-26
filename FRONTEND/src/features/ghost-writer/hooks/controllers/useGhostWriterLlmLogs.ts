import { useMemo } from "react";
import { DEFAULT_DOLLAR_TOKEN, DEFAULT_LOG_LINE_HEIGHT_RATIO, MODEL_PRICING_BRL_PER_1M } from "@/features/ghost-writer/config/constants";
import type { LlmLogEntry } from "@/features/ghost-writer/types";

interface UseGhostWriterLlmLogsParams {
  llmLogs: LlmLogEntry[];
  llmSessionLogs: LlmLogEntry[];
  llmModel: string;
  llmLogFontScale: number;
}

const usageFromMeta = (meta: Record<string, unknown>) => (
  meta.usage && typeof meta.usage === "object"
    ? (meta.usage as Record<string, unknown>)
    : {}
);

const inputTokensFromUsage = (usage: Record<string, unknown>) => Number(usage.input_tokens ?? usage.prompt_tokens ?? 0) || 0;
const cachedInputTokensFromUsage = (usage: Record<string, unknown>) => Number((usage.input_token_details as { cached_tokens?: number } | undefined)?.cached_tokens ?? 0) || 0;
const outputTokensFromUsage = (usage: Record<string, unknown>) => Number(usage.output_tokens ?? usage.completion_tokens ?? 0) || 0;
const totalTokensFromUsage = (usage: Record<string, unknown>) => {
  const input = inputTokensFromUsage(usage);
  const output = outputTokensFromUsage(usage);
  return Number(usage.total_tokens ?? input + output) || 0;
};
const reasoningTokensFromUsage = (usage: Record<string, unknown>) => Number((usage.output_token_details as { reasoning_tokens?: number } | undefined)?.reasoning_tokens ?? 0) || 0;

const pricingForModelAndInput = (model: string, modelInputTokens: number) => {
  const normalizedModel = model.toLowerCase();
  const matchedPricingKey = normalizedModel.startsWith("gpt-5.4-mini")
    ? "gpt-5.4-mini"
    : normalizedModel.startsWith("gpt-5.4-nano")
      ? "gpt-5.4-nano"
      : normalizedModel === "gpt-5.4"
        ? (modelInputTokens > 272_000 ? "gpt-5.4-over-272k" : "gpt-5.4-under-272k")
        : (Object.keys(MODEL_PRICING_BRL_PER_1M).find((key) => normalizedModel.startsWith(key)) ?? "");
  return matchedPricingKey ? MODEL_PRICING_BRL_PER_1M[matchedPricingKey] : null;
};

const estimateBrlFromMeta = (meta: Record<string, unknown>) => {
  const usage = usageFromMeta(meta);
  const model = String(meta.model ?? "").trim();
  if (!model) return null;
  const localInput = inputTokensFromUsage(usage);
  const localCachedInput = cachedInputTokensFromUsage(usage);
  const localOutput = outputTokensFromUsage(usage);
  const localNonCachedInput = Math.max(0, localInput - localCachedInput);
  const pricing = pricingForModelAndInput(model, localInput);
  if (!pricing) return null;
  return (
    (localNonCachedInput * pricing.input) +
    (localCachedInput * pricing.cached_input) +
    (localOutput * pricing.output)
  ) / 1_000_000;
};

const useGhostWriterLlmLogs = ({
  llmLogs,
  llmSessionLogs,
  llmModel,
  llmLogFontScale,
}: UseGhostWriterLlmLogsParams) => useMemo(() => {
  const llmLogFontStyle = { fontSize: `${llmLogFontScale}em`, lineHeight: DEFAULT_LOG_LINE_HEIGHT_RATIO };
  const latestLlmLog = llmLogs[0];
  const latestLlmMeta = (latestLlmLog?.response && typeof latestLlmLog.response === "object" && "meta" in (latestLlmLog.response as Record<string, unknown>))
    ? ((latestLlmLog.response as { meta?: Record<string, unknown> }).meta ?? {})
    : {};
  const latestUsage = usageFromMeta(latestLlmMeta);
  const latestInputTokens = inputTokensFromUsage(latestUsage);
  const latestCachedInputTokens = cachedInputTokensFromUsage(latestUsage);
  const latestOutputTokens = outputTokensFromUsage(latestUsage);
  const latestTotalTokens = totalTokensFromUsage(latestUsage);
  const latestReasoningTokens = reasoningTokensFromUsage(latestUsage);
  const latestRagReferences = Array.isArray(latestLlmMeta.rag_references)
    ? (latestLlmMeta.rag_references as unknown[]).map((ref) => String(ref || "").trim()).filter(Boolean)
    : [];

  let inputTokens = 0;
  let cachedInputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  let reasoningTokens = 0;
  let successfulCallsCount = 0;
  let errorCallsCount = 0;
  const ragReferenceSet = new Set<string>();

  for (const log of llmSessionLogs) {
    if (log.error) errorCallsCount += 1;
    if (!log.response || typeof log.response !== "object" || !("meta" in (log.response as Record<string, unknown>))) continue;
    successfulCallsCount += 1;
    const meta = ((log.response as { meta?: Record<string, unknown> }).meta ?? {});
    const usage = usageFromMeta(meta);
    inputTokens += inputTokensFromUsage(usage);
    cachedInputTokens += cachedInputTokensFromUsage(usage);
    outputTokens += outputTokensFromUsage(usage);
    totalTokens += totalTokensFromUsage(usage);
    reasoningTokens += reasoningTokensFromUsage(usage);
    if (Array.isArray(meta.rag_references)) {
      for (const ref of meta.rag_references) {
        const normalized = String(ref || "").trim();
        if (normalized) ragReferenceSet.add(normalized);
      }
    }
  }

  let estimatedBrlAccumulator = 0;
  let estimatedBrlAvailableCount = 0;
  for (const log of llmSessionLogs) {
    if (!log.response || typeof log.response !== "object" || !("meta" in (log.response as Record<string, unknown>))) continue;
    const meta = ((log.response as { meta?: Record<string, unknown> }).meta ?? {});
    const estimated = estimateBrlFromMeta(meta);
    if (estimated == null) continue;
    estimatedBrlAccumulator += estimated;
    estimatedBrlAvailableCount += 1;
  }

  const estimatedBrl = estimatedBrlAvailableCount > 0 ? estimatedBrlAccumulator : null;
  const latestEstimatedBrl = estimateBrlFromMeta(latestLlmMeta);
  const estimatedUsd = estimatedBrl != null ? estimatedBrl / DEFAULT_DOLLAR_TOKEN : null;
  const latestEstimatedUsd = latestEstimatedBrl != null ? latestEstimatedBrl / DEFAULT_DOLLAR_TOKEN : null;

  return {
    llmLogFontStyle,
    latestLlmMeta,
    latestInputTokens,
    latestCachedInputTokens,
    latestOutputTokens,
    latestTotalTokens,
    latestReasoningTokens,
    latestRagReferences,
    latestRagReferencesAllCalls: Array.from(ragReferenceSet),
    inputTokens,
    cachedInputTokens,
    outputTokens,
    totalTokens,
    reasoningTokens,
    successfulCallsCount,
    errorCallsCount,
    effectiveModel: String(latestLlmMeta.model ?? llmModel ?? ""),
    estimatedUsd,
    estimatedBrl,
    latestEstimatedUsd,
    latestEstimatedBrl,
  };
}, [llmLogFontScale, llmLogs, llmModel, llmSessionLogs]);

export default useGhostWriterLlmLogs;
