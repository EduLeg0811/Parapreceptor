import { buildHistorySearchCardsMarkdown, replaceHistorySearchInlineBreaks, type HistorySearchCardInput, type HistorySearchCardMetadata } from "@/features/ghost-writer/utils/history/historySearchCards";
import type { LexicalHistoryMatch, LexicalOverviewHistoryGroup, LexicalOverviewHistoryPayload, SemanticIndexOption, SemanticOverviewHistoryGroup, SemanticOverviewHistoryPayload } from "@/features/ghost-writer/types";
import { buildLexicalHistorySearchMetadata, buildSemanticHistorySearchMetadata } from "@/features/ghost-writer/utils/history/historySearch";

type HistorySearchResponsePayload = {
  markdown: string;
  querySummary: string;
};

type LexicalCitationLookupResult = {
  inputParagraph: string;
  matchedParagraph: string;
  book: string;
  title?: string;
  page: string;
  similarity: number;
  method: string;
  matchedRow?: string | number;
};

type LexicalOverviewResponsePayload = HistorySearchResponsePayload & {
  payload: LexicalOverviewHistoryPayload;
};

type SemanticOverviewResponsePayload = HistorySearchResponsePayload & {
  payload: SemanticOverviewHistoryPayload;
};

type SemanticSearchMatch = {
  book: string;
  index_id: string;
  index_label: string;
  row: number;
  text: string;
  metadata: Record<string, unknown>;
  score: number;
};

const normalizeParagraphs = (paragraphs: Array<string | null | undefined>): string[] =>
  paragraphs
    .map((paragraph) => (paragraph || "").trim())
    .filter(Boolean);

const buildHistorySearchCards = <TMatch>(
  matches: TMatch[],
  options: {
    getTextParagraphs: (match: TMatch) => Array<string | null | undefined>;
    getMetadata: (match: TMatch) => HistorySearchCardMetadata;
  },
): string => {
  const cards: HistorySearchCardInput[] = matches
    .map((match) => ({
      textParagraphs: normalizeParagraphs(options.getTextParagraphs(match)),
      metadata: options.getMetadata(match),
    }))
    .filter((item) => item.textParagraphs.length > 0);

  return buildHistorySearchCardsMarkdown(cards);
};

const truncateQuery = (query: string, maxLength: number): string =>
  query.length > maxLength ? `${query.slice(0, maxLength - 3)}...` : query;

const escapeMarkdownTableCell = (value: unknown): string =>
  String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();

const isQuestMatch = (match: LexicalHistoryMatch): boolean =>
  (match.book || "").trim().toUpperCase() === "QUEST";

const normalizeQuestAnswer = (value: string): string =>
  (value || "")
    .trim()
    .replace(/^(?:(?:\*{0,2})?W:(?:\*{0,2})?\s*)+/i, "")
    .trim();

const formatQuestMatchText = (match: LexicalHistoryMatch): string => {
  const rawText = (match.text || "").trim();
  if (!rawText) return rawText;

  const quest = (match.data?.quest || "").trim();
  const separatorIndex = rawText.indexOf("|");
  if (separatorIndex < 0) {
    const question = quest || rawText;
    return `**${question}**`;
  }

  const question = quest || rawText.slice(0, separatorIndex).trim();
  const answer = String(match.data?.answer || rawText.slice(separatorIndex + 1) || "").trim();
  const normalizedAnswer = normalizeQuestAnswer(answer);
  return `**${question}** | **W:** ${normalizedAnswer}`.trim();
};

const formatLexicalMatchText = (match: LexicalHistoryMatch): string => {
  const text = (match.text || "").trim();
  if (!text) return text;
  return isQuestMatch(match) ? formatQuestMatchText(match) : text;
};

export const buildLexicalSearchHistoryResponsePayload = (params: {
  book: string;
  term: string;
  totalFound: number;
  maxResults: number;
  matches: LexicalHistoryMatch[];
}): HistorySearchResponsePayload => {
  const { book, term, totalFound, maxResults, matches } = params;
  const markdown = buildHistorySearchCards(matches, {
    getTextParagraphs: (item) => {
      const text = replaceHistorySearchInlineBreaks(formatLexicalMatchText(item));
      const fallbackBody = Object.values(item.data || {}).filter(Boolean).join(" | ");
      return [text || fallbackBody];
    },
    getMetadata: (item) => buildLexicalHistorySearchMetadata(item, book),
  });
  const shownInfo = totalFound > maxResults ? ` | Exibidos: ${maxResults}` : "";
  const bookLabel = matches.find((match) => (match.bookName || "").trim())?.bookName
    || matches.find((match) => (match.book_label || "").trim())?.book_label
    || matches.find((match) => (match.data?.book_name || "").trim())?.data.book_name
    || book;

  return {
    markdown,
    querySummary: `Livro: ${bookLabel} | Termo: ${term} | Total: ${totalFound}${shownInfo}`,
  };
};

export const buildLexicalCitationLookupHistoryResponsePayload = (params: {
  paragraphsCount: number;
  results: LexicalCitationLookupResult[];
}): HistorySearchResponsePayload => {
  const rows = params.results.map((item) => [
    escapeMarkdownTableCell(item.inputParagraph),
    escapeMarkdownTableCell(item.matchedParagraph || "N/D"),
    escapeMarkdownTableCell(item.book || "N/D"),
    escapeMarkdownTableCell(item.title || "N/D"),
    escapeMarkdownTableCell(item.page || "N/D"),
    escapeMarkdownTableCell(
      typeof item.similarity === "number" && Number.isFinite(item.similarity)
        ? item.similarity.toFixed(2)
        : "0.00",
    ),
    escapeMarkdownTableCell(item.method || "sem_match"),
  ]);

  const markdown = [
    "| Trecho Original | Trecho Achado | Fonte | Titulo | Pagina | Similaridade | Metodo |",
    "| --- | --- | --- | --- | --- | ---: | --- |",
    ...rows.map((columns) => `| ${columns.join(" | ")} |`),
  ].join("\n");

  return {
    markdown,
    querySummary: `Localiza Trechos | Paragrafos: ${params.paragraphsCount} | Localizados: ${params.results.length}`,
  };
};

export const buildLexicalOverviewGroupMarkdown = (group: Pick<LexicalOverviewHistoryGroup, "matches">): string => buildHistorySearchCardsFromCards(matchesToCards(group.matches));

const matchesToCards = (matches: LexicalHistoryMatch[]): HistorySearchCardInput[] =>
  matches
    .map((match) => ({
      textParagraphs: normalizeParagraphs([replaceHistorySearchInlineBreaks(formatLexicalMatchText(match)) || Object.values(match.data || {}).filter(Boolean).join(" | ")]),
      metadata: buildLexicalHistorySearchMetadata(match, match.book),
    }))
    .filter((item) => item.textParagraphs.length > 0);

const buildHistorySearchCardsFromCards = (cards: HistorySearchCardInput[]): string => buildHistorySearchCardsMarkdown(cards);

const buildLexicalOverviewFallbackContent = (payload: LexicalOverviewHistoryPayload): string =>
  payload.groups
    .map((group) => {
      const header = `## ${group.bookLabel} (${group.shownCount}/${group.totalFound})`;
      const body = buildLexicalOverviewGroupMarkdown(group);
      return [header, body].filter(Boolean).join("\n\n");
    })
    .filter(Boolean)
    .join("\n\n");

export const buildLexicalOverviewHistoryResponsePayload = (params: {
  term: string;
  limit: number;
  miniTextWindow?: number;
  sourceIds?: string[];
  totalBooks: number;
  totalFound: number;
  groups: LexicalOverviewHistoryGroup[];
}): LexicalOverviewResponsePayload => {
  const groups = params.groups.map((group) => ({
    ...group,
    matches: group.matches.map((match) => {
      const page = (match.pagina || "").trim();
      const text = formatLexicalMatchText(match);
      const textWithPage = text && page ? `${text} (p. ${page})` : text;
      return {
        ...match,
        text: textWithPage,
      };
    }),
  }));

  const payload: LexicalOverviewHistoryPayload = {
    kind: "lexical_overview",
    term: params.term,
    limit: params.limit,
    miniTextWindow: params.miniTextWindow,
    sourceIds: params.sourceIds,
    totalBooks: params.totalBooks,
    totalFound: params.totalFound,
    groups,
  };

  return {
    payload,
    markdown: buildLexicalOverviewFallbackContent(payload),
    querySummary: `Termo: ${params.term} | Total: ${params.totalFound} | Livros: ${params.totalBooks} | Limite por livro: ${params.limit}`,
  };
};

export const buildSemanticOverviewGroupMarkdown = (group: Pick<SemanticOverviewHistoryGroup, "matches">): string => buildHistorySearchCardsFromCards(
  group.matches
    .map((match) => ({
      textParagraphs: normalizeParagraphs([(match.text || "").trim()]),
      metadata: buildSemanticHistorySearchMetadata(match, match.index_label),
    }))
    .filter((item) => item.textParagraphs.length > 0),
);

export const resolveSemanticSearchIndexLabel = (params: {
  matches: SemanticSearchMatch[];
  selectedIndexId: string;
  indexes: SemanticIndexOption[];
}): string =>
  params.matches[0]?.index_label?.trim() ||
  params.indexes.find((item) => item.id === params.selectedIndexId)?.label ||
  params.selectedIndexId;

export const buildSemanticSearchHistoryResponsePayload = (params: {
  selectedIndexId: string;
  indexes: SemanticIndexOption[];
  query: string;
  totalFound: number;
  requestedMinScore: number | null;
  recommendedMinScore: number;
  minScore: number;
  ignoreBaseCalibration?: boolean;
  lexicalFilteredCount: number;
  matches: SemanticSearchMatch[];
}): HistorySearchResponsePayload => {
  const { selectedIndexId, indexes, query, matches, totalFound, requestedMinScore, recommendedMinScore, minScore, ignoreBaseCalibration, lexicalFilteredCount } = params;
  const indexLabel = resolveSemanticSearchIndexLabel({ matches, selectedIndexId, indexes });
  const markdown = buildHistorySearchCards(matches, {
    getTextParagraphs: (item) => [(item.text || "").trim()],
    getMetadata: (item) => buildSemanticHistorySearchMetadata(item, indexLabel),
  });
  const lexicalInfo = lexicalFilteredCount > 0 ? ` | Duplicados lexicos filtrados: ${lexicalFilteredCount}` : "";
  const calibrationInfo = ignoreBaseCalibration
    ? ` | Piso calibrado conservador ignorado: ${recommendedMinScore.toFixed(2)}`
    : requestedMinScore === null
      ? ` | Piso calibrado conservador: ${recommendedMinScore.toFixed(2)}`
      : "";

  return {
    markdown,
    querySummary: `Base: ${indexLabel} | Consulta: ${truncateQuery(query, 120)} | Total semantic: ${totalFound} | Piso usado na busca: ${minScore.toFixed(2)}${calibrationInfo}${lexicalInfo}`,
  };
};

export const buildSemanticOverviewHistoryResponsePayload = (params: {
  term: string;
  limit: number;
  minScore: number;
  miniTextWindow?: number;
  useRagContext?: boolean;
  excludeLexicalDuplicates?: boolean;
  vectorStoreIds?: string[];
  sourceIds?: string[];
  recommendedMinScoreMin: number;
  recommendedMinScoreMax: number;
  usesCalibratedMinScores: boolean;
  ignoreBaseCalibration?: boolean;
  totalIndexes: number;
  totalFound: number;
  lexicalFilteredCount: number;
  groups: SemanticOverviewHistoryGroup[];
}): SemanticOverviewResponsePayload => {
  const payload: SemanticOverviewHistoryPayload = {
    kind: "semantic_overview",
    term: params.term,
    limit: params.limit,
    minScore: params.minScore,
    miniTextWindow: params.miniTextWindow,
    useRagContext: params.useRagContext,
    excludeLexicalDuplicates: params.excludeLexicalDuplicates,
    vectorStoreIds: params.vectorStoreIds,
    sourceIds: params.sourceIds,
    ignoreBaseCalibration: params.ignoreBaseCalibration,
    recommendedMinScoreMin: params.recommendedMinScoreMin,
    recommendedMinScoreMax: params.recommendedMinScoreMax,
    usesCalibratedMinScores: params.usesCalibratedMinScores,
    totalIndexes: params.totalIndexes,
    totalFound: params.totalFound,
    lexicalFilteredCount: params.lexicalFilteredCount,
    groups: params.groups,
  };

  const markdown = payload.groups
    .map((group) => {
      const header = `## ${group.indexLabel} (${group.shownCount}/${group.totalFound})`;
      const body = buildSemanticOverviewGroupMarkdown(group);
      return [header, body].filter(Boolean).join("\n\n");
    })
    .filter(Boolean)
    .join("\n\n");

  return {
    payload,
    markdown,
    querySummary: `Termo: ${params.term} | Total semantic: ${params.totalFound} | Bases analisadas: ${params.totalIndexes} | Piso usado na busca: ${params.minScore.toFixed(2)} | Faixa calibrada conservadora: ${params.recommendedMinScoreMin.toFixed(2)}-${params.recommendedMinScoreMax.toFixed(2)}${params.ignoreBaseCalibration ? " | Piso calibrado conservador ignorado" : ""} | Limite global: ${params.limit}${params.lexicalFilteredCount > 0 ? ` | Duplicados lexicos filtrados: ${params.lexicalFilteredCount}` : ""}`,
  };
};

