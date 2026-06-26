import { describe, expect, it } from "vitest";
import { buildHistorySearchCardsMarkdown, renderHistorySearchCardsHtml } from "@/features/ghost-writer/utils/history/historySearchCards";

describe("historySearchCards", () => {
  it("builds canonical markdown with all non-empty metadata", () => {
    const markdown = buildHistorySearchCardsMarkdown([
      {
        textParagraphs: ["Primeiro paragrafo", "Segundo paragrafo"],
        metadata: {
          sourcebook: "LO",
          title: "Autopensenidade",
          argumento: "recin",
          area: "Mentalsomatologia",
          date: "2024-01-10",
          author: "Fulano",
          number: "12",
          pagina: "33",
          text: "nao deve aparecer",
          folha: "33",
          source: "arquivo-x",
        },
      },
    ]);

    expect(markdown).toContain("Primeiro paragrafo[[HISTORY_SEARCH_BR]]Segundo paragrafo");
    expect(markdown).toContain("(**LO**, p. 33)");
    expect(markdown).toContain("LO | Autopensenidade | argumento: recin | area: Mentalsomatologia | 2024-01-10 | Fulano | #12 | p. 33 | folha: 33 | source: arquivo-x");
    expect(markdown).not.toContain("text: nao deve aparecer");
  });

  it("deduplicates alias metadata when canonical field has the same value", () => {
    const markdown = buildHistorySearchCardsMarkdown([
      {
        textParagraphs: ["Texto"],
        metadata: {
          sourcebook: "DAC",
          title: "Titulo base",
          titulo: "Titulo base",
          number: "9",
          numero: "9",
          author: "Beltrano",
          autor: "Beltrano",
        },
      },
    ]);

    expect(markdown).toContain("DAC | Titulo base | Beltrano | #9");
    expect(markdown).not.toContain("titulo: Titulo base");
    expect(markdown).not.toContain("numero: 9");
    expect(markdown).not.toContain("autor: Beltrano");
  });

  it("renders numbered cards with blue bold prefix and visible source line", () => {
    const markdown = buildHistorySearchCardsMarkdown([
      {
        textParagraphs: ["Texto **principal**", "continua"],
        metadata: {
          sourcebook: "LO",
          title: "Autopensenidade",
          number: "1",
          pagina: "44",
          folha: "33",
        },
      },
    ]);

    const html = renderHistorySearchCardsHtml(markdown, { applyNumbering: true, showMetadata: true });

    expect(html).toContain("color:#1d4ed8");
    expect(html).toContain("display: flex");
    expect(html).toContain("<strong>LO</strong>, p. 44");
    expect(html).toContain("LO | Autopensenidade | #1 | p. 44 | folha: 33");
    expect(html).toContain("<br>continua");
  });

  it("hides only metadata line when references toggle is disabled", () => {
    const markdown = buildHistorySearchCardsMarkdown([
      {
        textParagraphs: ["Texto"],
        metadata: {
          sourcebook: "EC",
          title: "Verbete",
          area: "Paradireitologia",
          number: "22",
        },
      },
    ]);

    const html = renderHistorySearchCardsHtml(markdown, { applyNumbering: false, showMetadata: false });

    expect(html).toContain("<strong>EC</strong>");
    expect(html).not.toContain("area: Paradireitologia");
    expect(html).not.toContain("#22");
  });

  it("hides technical semantic metadata keys from the metadata line", () => {
    const markdown = buildHistorySearchCardsMarkdown([
      {
        textParagraphs: ["Texto semantico"],
        metadata: {
          sourcebook: "TNP",
          title: "Tenepes",
          book: "TNP",
          index_id: "tnp",
          index_label: "TNP",
          score: "0.92",
        },
      },
    ]);

    expect(markdown).toContain("TNP | Tenepes | score: 0.92");
    expect(markdown).not.toContain("book: TNP");
    expect(markdown).not.toContain("index_id: tnp");
    expect(markdown).not.toContain("index_label: TNP");
  });

  it("formats EC source line using verbete title instead of page", () => {
    const markdown = buildHistorySearchCardsMarkdown([
      {
        textParagraphs: ["Texto"],
        metadata: {
          book: "EC",
          sourcebook: "EC",
          title: "Paradireito",
          pagina: "123",
          number: "22",
        },
      },
    ]);

    expect(markdown).toContain("(**EC**, verbete *Paradireito*)");
    expect(markdown).not.toContain("(**EC**, p. 123)");
  });

  it("hides source line when source toggle is disabled and keeps metadata when enabled", () => {
    const markdown = buildHistorySearchCardsMarkdown([
      {
        textParagraphs: ["Texto"],
        metadata: {
          sourcebook: "EC",
          title: "Verbete",
          area: "Paradireitologia",
          number: "22",
        },
      },
    ]);

    const html = renderHistorySearchCardsHtml(markdown, { applyNumbering: false, showSourceLine: false, showMetadata: true });

    expect(html).not.toContain("<strong>EC</strong>");
    expect(html).toContain("area: Paradireitologia");
    expect(html).toContain("#22");
  });

  it("omits dangling comma in source line when pagina is empty", () => {
    const markdown = buildHistorySearchCardsMarkdown([
      {
        textParagraphs: ["Texto"],
        metadata: {
          sourcebook: "EC",
        },
      },
    ]);

    expect(markdown).toContain("(**EC**)");
    expect(markdown).not.toContain("(**EC**, )");
  });

  it("pads numbering with leading zero when there are ten or more items", () => {
    const markdown = buildHistorySearchCardsMarkdown(
      Array.from({ length: 10 }, (_, index) => ({
        textParagraphs: [`Item ${index + 1}`],
        metadata: {
          sourcebook: "LO",
          title: `Titulo ${index + 1}`,
        },
      })),
    );

    const html = renderHistorySearchCardsHtml(markdown, { applyNumbering: true, showMetadata: true });

    expect(html).toContain(">01.</strong>");
    expect(html).toContain(">09.</strong>");
    expect(html).toContain(">10.</strong>");
  });
});

