import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RightPanel from "@/features/ghost-writer/components/shell/RightPanel";
import type { AIResponse } from "@/features/ghost-writer/types";
import { exportLexicalOverviewDocxFromPayloadApp, exportSemanticOverviewDocxFromPayloadApp } from "@/features/ghost-writer/api/backendApi";

vi.mock("@/features/ghost-writer/api/backendApi", () => ({
  exportLexicalOverviewDocxFromPayloadApp: vi.fn(),
  exportSemanticOverviewDocxFromPayloadApp: vi.fn(),
}));

const buildLexicalResponse = (): AIResponse => ({
  id: "lexical-overview",
  type: "app_lexical_overview",
  query: "Termo: cosmoetica | Total: 1",
  content: "fallback",
  payload: {
    kind: "lexical_overview",
    term: "cosmoetica",
    limit: 2,
    miniTextWindow: 4,
    totalBooks: 1,
    totalFound: 1,
    groups: [
      {
        bookCode: "LO",
        bookLabel: "Lexico de Ortopensatas",
        fileStem: "LO",
        totalFound: 1,
        shownCount: 1,
        matches: [
          {
            book: "LO",
            row: 1,
            number: 1,
            title: "Cosmoetica",
            text: "Trecho com cosmoetica",
            pagina: "41",
            data: {},
          },
        ],
      },
    ],
  },
  timestamp: new Date("2026-04-08T10:00:00.000Z"),
});

const buildSemanticResponse = (): AIResponse => ({
  id: "semantic-overview",
  type: "app_semantic_overview",
  query: "Termo: cosmoetica | Total semantic: 1",
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
    sourceIds: ["mini_arlindo"],
    ignoreBaseCalibration: true,
    recommendedMinScoreMin: 0.53,
    recommendedMinScoreMax: 0.6,
    usesCalibratedMinScores: false,
    totalIndexes: 1,
    totalFound: 1,
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
            text: "Trecho semanticamente afim",
            metadata: {},
            score: 0.9,
          },
        ],
      },
    ],
  },
  timestamp: new Date("2026-04-08T10:01:00.000Z"),
});

describe("RightPanel overview DOCX actions", () => {
  it("shows the Word export processing badge while the export is running", async () => {
    Object.defineProperty(URL, "createObjectURL", { writable: true, value: vi.fn(() => "blob:lexical-overview") });
    Object.defineProperty(URL, "revokeObjectURL", { writable: true, value: vi.fn() });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    let resolveExport: (value: { blob: Blob; filename: string }) => void = () => {};
    vi.mocked(exportLexicalOverviewDocxFromPayloadApp).mockReturnValue(
      new Promise((resolve) => {
        resolveExport = resolve;
      }),
    );

    render(
      <RightPanel
        responses={[buildLexicalResponse()]}
        maxResultsDocx={321}
        onClear={() => {}}
        onSendMessage={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /exportar lexical overview em word/i }));

    expect(await screen.findByText("Exportando arquivo Word")).toBeInTheDocument();

    resolveExport({
      blob: new Blob(["docx"]),
      filename: "lexical-overview.docx",
    });
    await waitFor(() => expect(screen.queryByText("Exportando arquivo Word")).not.toBeInTheDocument());
    anchorClick.mockRestore();
  });

  it("renders the Word export button in the copy action row and exports lexical overview", async () => {
    const createObjectUrl = vi.fn(() => "blob:lexical-overview");
    Object.defineProperty(URL, "createObjectURL", { writable: true, value: createObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { writable: true, value: vi.fn() });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.mocked(exportLexicalOverviewDocxFromPayloadApp).mockResolvedValue({
      blob: new Blob(["docx"]),
      filename: "lexical-overview.docx",
    });

    render(
      <RightPanel
        responses={[buildLexicalResponse()]}
        maxResultsDocx={321}
        onClear={() => {}}
        onSendMessage={() => {}}
      />,
    );

    expect(screen.getByTitle("Copiar resposta")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /exportar lexical overview em word/i }));

    await waitFor(() => expect(exportLexicalOverviewDocxFromPayloadApp).toHaveBeenCalledWith({
      ...(buildLexicalResponse().payload as object),
      maxResultsDocx: 321,
    }));
    expect(createObjectUrl).toHaveBeenCalled();
    anchorClick.mockRestore();
  });

  it("exports semantic overview with the original query parameters", async () => {
    Object.defineProperty(URL, "createObjectURL", { writable: true, value: vi.fn(() => "blob:semantic-overview") });
    Object.defineProperty(URL, "revokeObjectURL", { writable: true, value: vi.fn() });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.mocked(exportSemanticOverviewDocxFromPayloadApp).mockResolvedValue({
      blob: new Blob(["docx"]),
      filename: "semantic-overview.docx",
    });

    render(
      <RightPanel
        responses={[buildSemanticResponse()]}
        maxResultsDocx={222}
        onClear={() => {}}
        onSendMessage={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /exportar semantic overview em word/i }));

    await waitFor(() => expect(exportSemanticOverviewDocxFromPayloadApp).toHaveBeenCalledWith({
      ...(buildSemanticResponse().payload as object),
      maxResultsDocx: 222,
    }));
    anchorClick.mockRestore();
  });
});

