import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SemanticOverviewHistoryCard from "@/features/ghost-writer/components/history/SemanticOverviewHistoryCard";
import type { AIResponse } from "@/features/ghost-writer/types";

const buildResponse = (): AIResponse => ({
  id: "semantic-overview-1",
  type: "app_semantic_overview",
  query: "Termo: cosmoetica | Total semantic: 2 | Bases analisadas: 2 | Piso usado na busca: 0.25 | Faixa calibrada conservadora: 0.53-0.60 | Limite global: 2",
  content: "fallback",
  payload: {
    kind: "semantic_overview",
    term: "cosmoetica",
    limit: 2,
    minScore: 0.25,
    miniTextWindow: 5,
    useRagContext: true,
    excludeLexicalDuplicates: false,
    vectorStoreIds: ["vs_123"],
    ignoreBaseCalibration: true,
    recommendedMinScoreMin: 0.53,
    recommendedMinScoreMax: 0.60,
    usesCalibratedMinScores: false,
    totalIndexes: 2,
    totalFound: 2,
    lexicalFilteredCount: 0,
    groups: [
      {
        indexId: "lo",
        indexLabel: "LO Semantic",
        totalFound: 1,
        shownCount: 1,
        matches: [
          {
            book: "LO",
            index_id: "lo",
            index_label: "LO Semantic",
            row: 1,
            text: "Trecho com cosmoetica expandida",
            metadata: { title: "Cosmoetica" },
            score: 0.9876,
          },
        ],
      },
      {
        indexId: "quest",
        indexLabel: "QUEST Semantic",
        totalFound: 1,
        shownCount: 1,
        matches: [
          {
            book: "QUEST",
            index_id: "quest",
            index_label: "QUEST Semantic",
            row: 2,
            text: "Outro trecho semanticamente afim",
            metadata: { author: "E.Q." },
            score: 0.8765,
          },
        ],
      },
    ],
  },
  timestamp: new Date("2026-04-10T10:00:00.000Z"),
});

describe("SemanticOverviewHistoryCard", () => {
  it("renders pills and switches the expanded semantic group", () => {
    render(
      <SemanticOverviewHistoryCard
        response={buildResponse()}
        historyFontStyle={{ fontSize: "0.75em" }}
        enableHistoryNumbering={true}
        enableHistoryReferences={true}
        enableHistoryMetadata={true}
        enableHistoryHighlight={true}
      />,
    );

    expect(screen.getByRole("button", { name: /lo semantic/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /quest semantic/i })).toBeInTheDocument();
    expect(screen.getAllByText((_, node) => (node?.textContent || "").includes("Trecho com cosmoetica expandida")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /quest semantic/i }));

    expect(screen.getAllByText((_, node) => (node?.textContent || "").includes("Outro trecho semanticamente afim")).length).toBeGreaterThan(0);
    expect(screen.queryAllByText((_, node) => (node?.textContent || "").includes("Trecho com cosmoetica expandida")).length).toBe(0);
  });

  it("adds an ALL pill with the combined top results sorted by score", () => {
    render(
      <SemanticOverviewHistoryCard
        response={buildResponse()}
        historyFontStyle={{ fontSize: "0.75em" }}
        enableHistoryNumbering={true}
        enableHistoryReferences={true}
        enableHistoryMetadata={true}
        enableHistoryHighlight={true}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /all/i }));

    expect(screen.getByText(/exibindo os 2 melhores resultados de 2 achados/i)).toBeInTheDocument();

    const allSummary = screen.getByText(/exibindo os 2 melhores resultados de 2 achados/i);
    const content = allSummary.parentElement?.parentElement?.parentElement?.querySelector(".prose");

    expect(content).not.toBeNull();
    expect((content?.textContent || "").indexOf("Trecho com cosmoetica expandida")).toBeLessThan(
      (content?.textContent || "").indexOf("Outro trecho semanticamente afim"),
    );
  });

});

