import { describe, expect, it } from "vitest";
import { historyHtmlToPlainText, renderHistoryResponseAppendBodyHtml, renderHistoryResponseCopyHtml, renderHistoryResponseEditorHtml } from "@/features/ghost-writer/utils/history/historyResponseHtml";
import type { AIResponse } from "@/features/ghost-writer/types";

const buildResponse = (type: AIResponse["type"], query: string, content: string, payload?: AIResponse["payload"]): AIResponse => ({
  id: `${type}-1`,
  type,
  query,
  content,
  payload,
  timestamp: new Date("2026-03-27T12:00:00.000Z"),
});

describe("historyResponseHtml", () => {
  it("highlights lexical search terms in rendered history cards", () => {
    const response = buildResponse(
      "app_book_search",
      "Livro: Lexico de Ortopensatas | Termo: recin | Total: 1",
      "Texto com recin destacado\n(**LO**; Autopensenidade)\nLO | Autopensenidade | #1",
    );

    const html = renderHistoryResponseEditorHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });

    expect(html).toContain("<mark");
    expect(html).toContain("recin");
  });

  it("highlights history search terms ignoring accents in the comparison", () => {
    const response = buildResponse(
      "app_book_search",
      "Livro: Lexico de Ortopensatas | Termo: acao | Total: 1",
      "Texto com ação destacada\n(**LO**; Autopensenidade)\nLO | Autopensenidade | #1",
    );

    const html = renderHistoryResponseEditorHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });

    expect(html).toContain("<mark");
    expect(html).toContain("<mark style=\"background-color:#fef08a;padding:0 .08em;\">ação</mark>");
  });

  it("hides highlight when the history highlight toggle is disabled", () => {
    const response = buildResponse(
      "app_book_search",
      "Livro: Lexico de Ortopensatas | Termo: recin | Total: 1",
      "Texto com recin destacado\n(**LO**; Autopensenidade)\nLO | Autopensenidade | #1",
    );

    const html = renderHistoryResponseEditorHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: false,
    });

    expect(html).not.toContain("<mark");
    expect(html).toContain("recin");
  });

  it("highlights semantic search terms from Consulta before Total semantic", () => {
    const response = buildResponse(
      "app_semantic_search",
      "Base: Minitertulia - Arlindo | Consulta: universalismo | Total semantic: 7 | Piso usado na busca: 0.65",
      [
        "**16/05/2012**: Antipodia leva ao racismo. Universalismo procura chegar ao consenso.",
        "(**MINI_ARLINDO**)",
        "MINI_ARLINDO | Minitertulia - Arlindo | date: 16/05/2012 | #1",
      ].join("\n"),
    );

    const html = renderHistoryResponseEditorHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });

    expect(html).toContain("<mark");
    expect(html).toContain("<mark style=\"background-color:#fef08a;padding:0 .08em;\">Universalismo</mark>");
    expect(html).not.toContain("<mark style=\"background-color:#fef08a;padding:0 .08em;\">semantic</mark>");
  });

  it("highlights only original semantic search query terms, not expanded result words", () => {
    const response = buildResponse(
      "app_semantic_search",
      "Base: LO | Consulta: cosmoetica | Total semantic: 1 | Piso usado na busca: 0.25",
      [
        "Trecho com cosmoetica expandida por contexto semantico.",
        "(**LO**; Cosmoetica)",
        "LO | Cosmoetica | #1",
      ].join("\n"),
    );

    const html = renderHistoryResponseEditorHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });

    expect(html).toContain("<mark style=\"background-color:#fef08a;padding:0 .08em;\">cosmoetica</mark>");
    expect(html).not.toContain("<mark style=\"background-color:#fef08a;padding:0 .08em;\">expandida</mark>");
    expect(html).not.toContain("<mark style=\"background-color:#fef08a;padding:0 .08em;\">contexto</mark>");
  });

  it("copies history search with numbering and optional source line based on references toggle", () => {
    const response = buildResponse(
      "app_book_search",
      "Livro: Lexico de Ortopensatas | Termo: recin | Total: 1",
      [
        "Texto com recin destacado",
        "(**LO**; Autopensenidade)",
        "LO | Autopensenidade | #1",
      ].join("\n"),
    );

    const withReferences = renderHistoryResponseCopyHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: false,
      applyHighlight: true,
    });
    const withoutReferences = renderHistoryResponseCopyHtml(response, {
      applyNumbering: true,
      applyReferences: false,
      applyMetadata: false,
      applyHighlight: true,
    });

    expect(withReferences).toContain("<strong>1.</strong>");
    expect(withReferences).toContain("Texto com <mark");
    expect(withReferences).toContain("<strong>LO</strong>; Autopensenidade");
    expect(withReferences).not.toContain("LO | Autopensenidade | #1");
    expect(historyHtmlToPlainText(withReferences)).toContain("1.  Texto com recin destacado");

    expect(withoutReferences).toContain("<strong>1.</strong>");
    expect(withoutReferences).not.toContain("<strong>LO</strong>; Autopensenidade");
    expect(withoutReferences).not.toContain("LO | Autopensenidade | #1");
  });

  it("renders verbete search with inline pdf download anchor in the history card", () => {
    const response = buildResponse(
      "app_verbete_search",
      "Title: Titulo",
      [
        "**Titulo Base** (*Area Teste*) - *Autor Teste* - # 7 - 2025-01-02",
        "**Definologia.** Texto do verbete.",
        "[PDF](https://example.com/verbete.pdf)",
      ].join("\n"),
    );

    const html = renderHistoryResponseEditorHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });

    expect(html).toContain("data-pdf-download-url=\"https://example.com/verbete.pdf\"");
    expect(html).toContain("display: flex");
    expect(html).toContain("padding-left: 28px");
    expect(html).toContain("Texto do verbete.");
    expect(html).not.toContain(">PDF<");
  });

  it("highlights verbete search terms only when the history highlight toggle is enabled", () => {
    const response = buildResponse(
      "app_verbete_search",
      "Author: Autor Teste | Title: Titulo Base | Area: Area Teste | Text: verbete | Total: 1",
      [
        "**Titulo Base** (*Area Teste*) - *Autor Teste* - # 7 - 2025-01-02",
        "**Definologia.** Texto do verbete.",
      ].join("\n"),
    );

    const highlightedHtml = renderHistoryResponseEditorHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });
    const plainHtml = renderHistoryResponseEditorHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: false,
    });

    expect(highlightedHtml).toContain("<mark");
    expect(plainHtml).not.toContain("<mark");
  });

  it("removes verbete pdf links from append and copy html while keeping text", () => {
    const response = buildResponse(
      "app_verbete_search",
      "Title: Titulo",
      [
        "**Titulo Base** (*Area Teste*) - *Autor Teste* - # 7 - 2025-01-02",
        "**Definologia.** Texto do verbete.",
        "[PDF](https://example.com/verbete.pdf)",
      ].join("\n"),
    );

    const appendHtml = renderHistoryResponseAppendBodyHtml(response);
    const copyHtml = renderHistoryResponseCopyHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });

    expect(appendHtml).toContain("Texto do verbete.");
    expect(appendHtml).not.toContain("data-pdf-download-url");
    expect(appendHtml).not.toContain("https://example.com/verbete.pdf");

    expect(copyHtml).toContain("Texto do verbete.");
    expect(copyHtml).not.toContain("data-pdf-download-url");
    expect(copyHtml).not.toContain("https://example.com/verbete.pdf");
    expect(historyHtmlToPlainText(copyHtml)).toContain("Texto do verbete.");
  });

  it("appends history search respecting numbering, references, and metadata toggle", () => {
    const response = buildResponse(
      "app_semantic_search",
      "Base: LO | Consulta: recin | Total: 1",
      [
        "Texto semantico",
        "(**LO**; Titulo semantico)",
        "LO | Titulo semantico | #4",
      ].join("\n"),
    );

    const withReferencesAndMetadata = renderHistoryResponseAppendBodyHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });
    const withoutReferencesAndMetadata = renderHistoryResponseAppendBodyHtml(response, {
      applyNumbering: false,
      applyReferences: false,
      applyMetadata: false,
      applyHighlight: true,
    });

    expect(withReferencesAndMetadata).toContain("<strong>1.</strong>");
    expect(withReferencesAndMetadata).toContain("<strong>LO</strong>; Titulo semantico");
    expect(withReferencesAndMetadata).toContain("LO | Titulo semantico | #4");

    expect(withoutReferencesAndMetadata).toContain("Texto semantico");
    expect(withoutReferencesAndMetadata).not.toContain("color:#1d4ed8");
    expect(withoutReferencesAndMetadata).not.toContain("<strong>LO</strong>; Titulo semantico");
    expect(withoutReferencesAndMetadata).not.toContain("LO | Titulo semantico | #4");
  });

  it("appends history search metadata only when metadata toggle is enabled", () => {
    const response = buildResponse(
      "app_book_search",
      "Livro: Lexico de Ortopensatas | Termo: recin | Total: 1",
      [
        "Texto com recin destacado",
        "(**LO**; Autopensenidade)",
        "LO | Autopensenidade | argumento: recin | #1",
      ].join("\n"),
    );

    const withMetadata = renderHistoryResponseAppendBodyHtml(response, {
      applyNumbering: false,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });
    const withoutMetadata = renderHistoryResponseAppendBodyHtml(response, {
      applyNumbering: false,
      applyReferences: true,
      applyMetadata: false,
      applyHighlight: true,
    });

    expect(withMetadata).toContain("<strong>LO</strong>; Autopensenidade");
    expect(withMetadata).toContain("LO | Autopensenidade");
    expect(withMetadata).toContain("argumento:");
    expect(withMetadata).toContain("#1");
    expect(withoutMetadata).toContain("<strong>LO</strong>; Autopensenidade");
    expect(withoutMetadata).not.toContain("argumento:");
    expect(withoutMetadata).not.toContain("#1");
  });

  it("renders markdown tables from consulta dict as html table", () => {
    const response = buildResponse(
      "dict_lookup",
      "Termo: casa | Fontes válidas: 1/2",
      [
        "**Consulta Dicionários**",
        "",
        "**Fontes consultadas**",
        "",
        "| Nome da Fonte | Score | Definições (resumo) |",
        "| --- | ---: | --- |",
        "| Aulete | 108.40 | Moradia habitual. |",
      ].join("\n"),
    );

    const html = renderHistoryResponseEditorHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });

    expect(html).toContain("<table");
    expect(html).toContain("<thead>");
    expect(html).toContain("<tbody>");
    expect(html).toContain("Aulete");
    expect(html).toContain("Moradia habitual.");
  });

  it("renders lexical citation lookup card as html table and preserves table in copy and append", () => {
    const response = buildResponse(
      "app_lexical_citation_lookup",
      "Localiza Trechos | Paragrafos: 1 | Localizados: 1",
      [
        "| Trecho Original | Trecho Achado | Fonte | Pagina | Similaridade | Metodo |",
        "| --- | --- | --- | --- | ---: | --- |",
        "| Trecho original | Trecho achado | LO | 41 | 97.32 | inicio |",
      ].join("\n"),
    );

    const editorHtml = renderHistoryResponseEditorHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });
    const appendHtml = renderHistoryResponseAppendBodyHtml(response, {
      applyNumbering: false,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });
    const copyHtml = renderHistoryResponseCopyHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });

    expect(editorHtml).toContain("<table");
    expect(editorHtml).toContain("Trecho original");
    expect(appendHtml).toContain("<table");
    expect(appendHtml).toContain("border:1px solid");
    expect(copyHtml).toContain("<table");
    expect(historyHtmlToPlainText(copyHtml)).toContain("Trecho original");
    expect(historyHtmlToPlainText(copyHtml)).toContain("97.32");
  });

  it("renders regular numbered history items with aligned flex layout", () => {
    const response = buildResponse(
      "summarize",
      "Teste",
      [
        "1. Primeiro item com uma linha",
        "continua na segunda linha",
        "",
        "2. Segundo item",
      ].join("\n"),
    );

    const html = renderHistoryResponseEditorHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });

    expect(html).toContain("display: flex");
    expect(html).toContain(">1.</strong>");
    expect(html).toContain("continua na segunda linha");
  });

  it("renders lexical overview export html with global toggles and highlights", () => {
    const response = buildResponse(
      "app_lexical_overview",
      "Termo: cosmoetica | Total: 3 | Livros: 2 | Limite por livro: 2",
      "fallback",
      {
        kind: "lexical_overview",
        term: "cosmoetica",
        limit: 2,
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
    );

    const editorHtml = renderHistoryResponseEditorHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });
    const appendHtml = renderHistoryResponseAppendBodyHtml(response, {
      applyNumbering: true,
      applyReferences: false,
      applyMetadata: false,
      applyHighlight: false,
    });
    const copyHtml = renderHistoryResponseCopyHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });

    expect(editorHtml).toContain("Lexico de Ortopensatas");
    expect(editorHtml).toContain("<mark");
    expect(editorHtml).toContain("p. 41");
    expect(copyHtml).toContain("<strong>1.</strong>");
    expect(copyHtml).not.toContain("display: flex");
    expect(copyHtml).toContain("QUEST");
    expect(appendHtml).toContain("<strong>1.</strong>&nbsp;&nbsp;Trecho com cosmoetica (p. 41)");
    expect(appendHtml).not.toContain("display: flex");
    expect(appendHtml).toContain("Outro trecho");
    expect(appendHtml).not.toContain("Mentalsomatologia");
    expect(historyHtmlToPlainText(copyHtml)).toContain("Trecho com cosmoetica");
  });

  it("highlights lexical overview from payload term instead of summary text", () => {
    const response = buildResponse(
      "app_lexical_overview",
      "Termo: cosmoetica expandida | Total: 1 | Livros: 1 | Limite por livro: 1",
      "fallback",
      {
        kind: "lexical_overview",
        term: "cosmoetica",
        limit: 1,
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
                text: "Trecho com cosmoetica expandida",
                pagina: "",
                data: {},
              },
            ],
          },
        ],
      },
    );

    const html = renderHistoryResponseEditorHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });

    expect(html).toContain("<mark style=\"background-color:#fef08a;padding:0 .08em;\">cosmoetica</mark>");
    expect(html).not.toContain("<mark style=\"background-color:#fef08a;padding:0 .08em;\">expandida</mark>");
  });

  it("renders semantic overview export html with grouping and highlight toggle", () => {
    const response = buildResponse(
      "app_semantic_overview",
      "Termo: cosmoetica | Total semantic: 2 | Bases analisadas: 2 | Piso usado na busca: 0.25 | Faixa calibrada conservadora: 0.53-0.60 | Limite global: 2",
      "fallback",
      {
        kind: "semantic_overview",
        term: "cosmoetica",
        limit: 2,
        minScore: 0.25,
        recommendedMinScoreMin: 0.53,
        recommendedMinScoreMax: 0.60,
        usesCalibratedMinScores: true,
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
    );

    const editorHtml = renderHistoryResponseEditorHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });
    const appendHtml = renderHistoryResponseAppendBodyHtml(response, {
      applyNumbering: true,
      applyReferences: false,
      applyMetadata: false,
      applyHighlight: false,
    });
    const copyHtml = renderHistoryResponseCopyHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });

    expect(editorHtml).toContain("LO Semantic");
    expect(editorHtml).toContain("QUEST Semantic");
    expect(editorHtml).toContain("<mark");
    expect(copyHtml).toContain("<strong>1.</strong>");
    expect(copyHtml).toContain("0.99");
    expect(appendHtml).toContain("Trecho com cosmoetica expandida");
    expect(appendHtml).not.toContain("score:");
    expect(historyHtmlToPlainText(copyHtml)).toContain("Outro trecho semanticamente afim");
  });

  it("highlights semantic overview from payload term instead of summary text", () => {
    const response = buildResponse(
      "app_semantic_overview",
      "Termo: cosmoetica expandida | Total semantic: 1 | Bases analisadas: 1 | Piso usado na busca: 0.25 | Faixa calibrada conservadora: 0.53-0.60 | Limite global: 1",
      "fallback",
      {
        kind: "semantic_overview",
        term: "cosmoetica",
        limit: 1,
        minScore: 0.25,
        recommendedMinScoreMin: 0.53,
        recommendedMinScoreMax: 0.60,
        usesCalibratedMinScores: true,
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
                text: "Trecho com cosmoetica expandida por contexto semantico",
                metadata: { title: "Cosmoetica expandida" },
                score: 0.98,
              },
            ],
          },
        ],
      },
    );

    const html = renderHistoryResponseEditorHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });

    expect(html).toContain("<mark style=\"background-color:#fef08a;padding:0 .08em;\">cosmoetica</mark>");
    expect(html).not.toContain("<mark style=\"background-color:#fef08a;padding:0 .08em;\">expandida</mark>");
    expect(html).not.toContain("<mark style=\"background-color:#fef08a;padding:0 .08em;\">contexto</mark>");
  });

  it("preserves QUEST special formatting in editor, append and copy flows", () => {
    const response = buildResponse(
      "app_book_search",
      "Livro: QUEST | Termo: abdicacoes | Total: 1",
      [
        "**\"Pergunta de teste\"**[[HISTORY_SEARCH_BR]]**W:** Resposta de teste",
        "(**QUEST**, 05/11/2014, E.Q., p. 39)",
        "QUEST | Abdicaciologia | date: 05/11/2014 | author: E.Q. | p. 39",
      ].join("\n"),
    );

    const editorHtml = renderHistoryResponseEditorHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });
    const appendHtml = renderHistoryResponseAppendBodyHtml(response, {
      applyNumbering: false,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });
    const copyHtml = renderHistoryResponseCopyHtml(response, {
      applyNumbering: true,
      applyReferences: true,
      applyMetadata: true,
      applyHighlight: true,
    });

    expect(editorHtml).toContain("<strong>\"Pergunta de teste\"</strong>");
    expect(editorHtml).toContain("<strong>W:</strong>");
    expect(editorHtml).toContain("05/11/2014, E.Q., p. 39");
    expect(appendHtml).toContain("<strong>\"Pergunta de teste\"</strong>");
    expect(appendHtml).toContain("<strong>W:</strong>");
    expect(copyHtml).toContain("<strong>\"Pergunta de teste\"</strong>");
    expect(copyHtml).toContain("<strong>W:</strong>");
    expect(copyHtml).toContain("05/11/2014, E.Q., p. 39");
  });
});

