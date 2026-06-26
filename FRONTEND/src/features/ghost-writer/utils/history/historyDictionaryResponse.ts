type OnlineDictionaryResult = {
  term: string;
  sources_total: number;
  sources_ok: number;
  sources_failed: number;
  elapsed_ms: number;
  summary: {
    definitions: string[];
    synonyms: string[];
    examples: string[];
    etymology: string | null;
  };
  results: Array<{
    source: string;
    ok: boolean;
    url: string | null;
    elapsed_ms: number;
    quality_score: number;
    definitions: string[];
    synonyms: string[];
    examples: string[];
    etymology: string | null;
    query_term: string | null;
    retry_without_accents: boolean;
    error: string | null;
  }>;
};

type HistoryDictionaryResponsePayload = {
  querySummary: string;
  markdown: string;
};

const asBulletList = (items: string[], limit: number): string[] =>
  items.slice(0, limit).map((item) => `- ${item}`);

const escapeMarkdownTableCell = (value: string): string =>
  value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();

const summarizeDefinitions = (definitions: string[], limit: number): string => {
  const summary = definitions
    .slice(0, limit)
    .map((definition) => escapeMarkdownTableCell(definition))
    .filter(Boolean)
    .join(" ; ");

  return summary || "Nenhuma definição aproveitável.";
};

export const buildOnlineDictionaryHistoryResponsePayload = (
  result: OnlineDictionaryResult,
): HistoryDictionaryResponsePayload => {
  const summaryDefinitions = asBulletList(result.summary.definitions, 5);
  const summarySynonyms = asBulletList(result.summary.synonyms, 3);
  const summaryExamples = asBulletList(result.summary.examples, 2);

  const sections: string[] = [
    `**Consulta Dicionários**`,
    `- **Termo**: ${result.term}`,
    `- **Fontes válidas**: ${result.sources_ok}/${result.sources_total}`,
    `- **Latência total**: ${result.elapsed_ms} ms`,
    "",
    `**Definições priorizadas**`,
    ...(summaryDefinitions.length > 0 ? summaryDefinitions : ["- Nenhuma definição consolidada."]),
  ];

  if (summarySynonyms.length > 0) {
    sections.push("", `**Sinônimos**`, ...summarySynonyms);
  }
  if (result.summary.etymology) {
    sections.push("", `**Etimologia**`, result.summary.etymology);
  }
  if (summaryExamples.length > 0) {
    sections.push("", `**Exemplos**`, ...summaryExamples);
  }

  sections.push(
    "",
    `**Fontes consultadas**`,
    "",
    `| Nome da Fonte | Score | Definições (resumo) |`,
    `| --- | ---: | --- |`,
    ...result.results.map((item) => {
      const sourceName = escapeMarkdownTableCell(item.source);
      const score = Number.isFinite(item.quality_score) ? item.quality_score.toFixed(2) : "-";
      const definitionsSummary = item.ok
        ? summarizeDefinitions(item.definitions, 3)
        : `Falha: ${escapeMarkdownTableCell(item.error || "nenhuma definição extraída")}`;
      return `| ${sourceName} | ${score} | ${definitionsSummary} |`;
    }),
  );

  return {
    querySummary: `Termo: ${result.term} | Fontes válidas: ${result.sources_ok}/${result.sources_total}`,
    markdown: sections.join("\n"),
  };
};
