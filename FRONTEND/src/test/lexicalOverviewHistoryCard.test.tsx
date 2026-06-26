import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LexicalOverviewHistoryCard from "@/features/ghost-writer/components/history/LexicalOverviewHistoryCard";
import type { AIResponse } from "@/features/ghost-writer/types";

const buildResponse = (): AIResponse => ({
  id: "overview-1",
  type: "app_lexical_overview",
  query: "Termo: cosmoetica | Total: 3 | Livros: 2 | Limite por livro: 2",
  content: "fallback",
  payload: {
    kind: "lexical_overview",
    term: "cosmoetica",
    limit: 2,
    miniTextWindow: 4,
    totalBooks: 2,
    totalFound: 3,
    groups: [
      {
        bookCode: "LO",
        bookLabel: "Lexico de Ortopensatas",
        fileStem: "LO",
        totalFound: 2,
        shownCount: 2,
        matches: [
          {
            book: "LO",
            row: 1,
            number: 1,
            title: "Cosmoetica",
            text: "Trecho com cosmoetica (p. 41)",
            pagina: "41",
            data: { area: "Mentalsomatologia" },
          },
        ],
      },
      {
        bookCode: "QUEST",
        bookLabel: "QUEST",
        fileStem: "QUEST",
        totalFound: 1,
        shownCount: 1,
        matches: [
          {
            book: "QUEST",
            row: 2,
            number: 2,
            title: "Questao",
            text: "Outro trecho",
            pagina: "",
            data: { author: "E.Q." },
          },
        ],
      },
    ],
  },
  timestamp: new Date("2026-04-08T10:00:00.000Z"),
});

describe("LexicalOverviewHistoryCard", () => {
  it("renders pills and keeps only one group expanded at a time", () => {
    render(
      <LexicalOverviewHistoryCard
        response={buildResponse()}
        historyFontStyle={{ fontSize: "0.75em" }}
        enableHistoryNumbering={true}
        enableHistoryReferences={true}
        enableHistoryMetadata={true}
        enableHistoryHighlight={true}
      />,
    );

    expect(screen.getByRole("button", { name: /lexico de ortopensatas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /quest/i })).toBeInTheDocument();
    expect(screen.getByText((_, node) => node?.textContent === "Trecho com cosmoetica (p. 41)")).toBeInTheDocument();
    expect(screen.getByText(/\(p\. 41\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /quest/i }));

    expect(screen.getByText(/outro trecho/i)).toBeInTheDocument();
    expect(screen.queryByText((_, node) => node?.textContent === "Trecho com cosmoetica (p. 41)")).not.toBeInTheDocument();
  });

});

