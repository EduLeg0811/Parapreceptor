import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import useGhostWriterLlmLogs from "@/features/ghost-writer/hooks/controllers/useGhostWriterLlmLogs";
import type { LlmLogEntry } from "@/features/ghost-writer/types";

describe("useGhostWriterLlmLogs", () => {
  it("summarizes tokens, rag references, and cost from session logs", () => {
    const latestLog: LlmLogEntry = {
      id: "1",
      at: "2026-03-27T09:00:00Z",
      request: { prompt: "test" },
      response: {
        meta: {
          model: "gpt-5.4-mini",
          status: "ok",
          rag_references: ["Ref A", "Ref B"],
          usage: {
            input_tokens: 1000,
            output_tokens: 500,
            total_tokens: 1500,
            input_token_details: { cached_tokens: 200 },
            output_token_details: { reasoning_tokens: 50 },
          },
        },
      },
    };

    const errorLog: LlmLogEntry = {
      id: "2",
      at: "2026-03-27T09:05:00Z",
      request: { prompt: "error" },
      error: "boom",
    };

    const { result } = renderHook(() => useGhostWriterLlmLogs({
      llmLogs: [latestLog],
      llmSessionLogs: [latestLog, errorLog],
      llmModel: "gpt-5.4-mini",
      llmLogFontScale: 1,
    }));

    expect(result.current.latestInputTokens).toBe(1000);
    expect(result.current.latestCachedInputTokens).toBe(200);
    expect(result.current.latestOutputTokens).toBe(500);
    expect(result.current.latestTotalTokens).toBe(1500);
    expect(result.current.latestReasoningTokens).toBe(50);
    expect(result.current.latestRagReferences).toEqual(["Ref A", "Ref B"]);
    expect(result.current.latestRagReferencesAllCalls).toEqual(["Ref A", "Ref B"]);
    expect(result.current.inputTokens).toBe(1000);
    expect(result.current.outputTokens).toBe(500);
    expect(result.current.successfulCallsCount).toBe(1);
    expect(result.current.errorCallsCount).toBe(1);
    expect(result.current.effectiveModel).toBe("gpt-5.4-mini");
    expect(result.current.estimatedUsd).toBeCloseTo(0.002865, 6);
    expect(result.current.estimatedBrl).toBeCloseTo(0.0157575, 6);
    expect(result.current.latestEstimatedUsd).toBeCloseTo(0.002865, 6);
    expect(result.current.latestEstimatedBrl).toBeCloseTo(0.0157575, 6);
  });
});

