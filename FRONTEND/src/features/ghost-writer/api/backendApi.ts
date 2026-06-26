import type { LexicalOverviewHistoryPayload, SemanticOverviewHistoryPayload } from "@/features/ghost-writer/types";

export interface UploadedFileMeta {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  ext: string;
  createdAt: string;
  convertedFromPdf?: boolean;
  sourceExt?: string;
  sourceStoredName?: string;
  conversionError?: string;
}

import { getApiUrl } from "./config";

const apiUrl = (path: string): string => path;

const originalFetch = window.fetch;
const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let finalInput = input;
  if (typeof input === "string" && input.startsWith("/api/")) {
    finalInput = await getApiUrl(input);
  }
  return originalFetch(finalInput, init);
};

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function safeReadError(res: Response): Promise<string> {
  try {
    const text = (await res.text()).trim();
    if (!text) return `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(text) as { detail?: string };
      return parsed?.detail || text;
    } catch {
      return text;
    }
  } catch {
    return `HTTP ${res.status}`;
  }
}

async function fetchJsonWithRetry<T>(input: string, init: RequestInit, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(input, init);
      if (res.ok) return (await res.json()) as T;

      const message = await safeReadError(res);
      if (attempt < retries && RETRYABLE_STATUS.has(res.status)) {
        await wait(180 * (attempt + 1));
        continue;
      }
      throw new Error(message);
    } catch (err: unknown) {
      lastError = err;
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error && /failed to fetch|networkerror|load failed/i.test(err.message));
      if (attempt < retries && isNetworkError) {
        await wait(180 * (attempt + 1));
        continue;
      }
      break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Falha de rede ao comunicar com o backend.");
}

function filenameFromContentDisposition(value: string | null, fallback: string): string {
  const header = value || "";
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || fallback;
}

async function fetchBlobWithRetry(input: string, init: RequestInit, fallbackFilename: string, retries = 2): Promise<{ blob: Blob; filename: string }> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(input, init);
      if (res.ok) {
        return {
          blob: await res.blob(),
          filename: filenameFromContentDisposition(res.headers.get("content-disposition"), fallbackFilename),
        };
      }

      const message = await safeReadError(res);
      if (attempt < retries && RETRYABLE_STATUS.has(res.status)) {
        await wait(180 * (attempt + 1));
        continue;
      }
      throw new Error(message);
    } catch (err: unknown) {
      lastError = err;
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error && /failed to fetch|networkerror|load failed/i.test(err.message));
      if (attempt < retries && isNetworkError) {
        await wait(180 * (attempt + 1));
        continue;
      }
      break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Falha de rede ao comunicar com o backend.");
}

export async function uploadFileToServer(file: File): Promise<UploadedFileMeta> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(apiUrl("/api/files/upload"), { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createBlankDocOnServer(title = "novo-documento.docx"): Promise<UploadedFileMeta> {
  const res = await fetch(apiUrl("/api/files/create-blank"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchFileText(fileId: string): Promise<{ id: string; ext: string; text: string; html?: string; updatedAt: string }> {
  const res = await fetch(apiUrl(`/api/files/${encodeURIComponent(fileId)}/text?t=${Date.now()}`), { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchFileContentBuffer(fileId: string): Promise<ArrayBuffer> {
  const res = await fetch(apiUrl(`/api/files/${encodeURIComponent(fileId)}/content?t=${Date.now()}`), { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.arrayBuffer();
}

export async function saveFileText(fileId: string, payload: { text: string; html?: string }): Promise<{ ok: boolean; id: string; updatedAt: string }> {
  const res = await fetch(apiUrl(`/api/files/${encodeURIComponent(fileId)}/text`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function highlightFileTerm(fileId: string, term: string): Promise<{ ok: boolean; updated: boolean; matches: number; term: string; color: string }> {
  const res = await fetch(apiUrl(`/api/files/${encodeURIComponent(fileId)}/highlight`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ term }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function healthCheck(): Promise<{ ok: boolean; openaiConfigured: boolean }> {
  const res = await fetch(apiUrl("/api/health"));
  if (!res.ok) throw new Error("Backend indisponivel.");
  return res.json();
}

export async function insertRefBookMacro(book: string, mode: "bee" | "simples"): Promise<{ ok: boolean; result: string }> {
  const res = await fetch(apiUrl("/api/macros/insert-ref-book"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ book, mode }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function insertRefVerbeteApp(titles: string): Promise<{ ok: boolean; result: { ref_list: string; ref_biblio: string } }> {
  const res = await fetch(apiUrl("/api/apps/insert-ref-verbete"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titles }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function biblioGeralApp(payload: { author?: string; title?: string; year?: string; extra?: string; topK?: number }): Promise<{ ok: boolean; result: { query: { author: string; title: string; year: string; extra: string }; matches: string[]; markdown: string } }> {
  const res = await fetch(apiUrl("/api/apps/biblio-geral"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function biblioExternaApp(payload: {
  query?: string;
  author?: string;
  title?: string;
  year?: string;
  journal?: string;
  publisher?: string;
  identifier?: string;
  extra?: string;
  freeText?: string;
  topK?: number;
  llmModel?: string;
  llmTemperature?: number;
  llmMaxOutputTokens?: number;
  llmGpt5Verbosity?: string;
  llmGpt5Effort?: string;
  llmSystemPrompt?: string;
}): Promise<{ ok: boolean; result: { query: string; matches: string[]; markdown: string; score?: { score_percentual?: number; classificacao?: string }; llmLog?: { request?: unknown; response?: unknown } | null; llmLogs?: Array<{ request?: unknown; response?: unknown }> | null } }> {
  const res = await fetch(apiUrl("/api/apps/biblio-externa"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function randomPensataApp(): Promise<{ ok: boolean; result: { paragraph: string; page: string; paragraph_number: number; total_paragraphs: number; source: string } }> {
  const res = await fetch(apiUrl("/api/apps/random-pensata"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function openVerbetografiaTableApp(payload: { title?: string; specialty?: string }): Promise<UploadedFileMeta> {
  const res = await fetch(apiUrl("/api/apps/verbetografia/open-table"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function openVerbetografiaTableWordApp(payload: { title?: string; specialty?: string }): Promise<{
  ok: boolean;
  result: {
    id: string;
    originalName: string;
    storedName: string;
    path: string;
  };
}> {
  const res = await fetch(apiUrl("/api/apps/verbetografia/open-table-word"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listLexicalBooksApp(): Promise<{
  ok: boolean;
  result: {
    books: Array<string | {
      id: string;
      label: string;
      indexId?: string;
      fileStem?: string;
    }>;
  };
}> {
  return fetchJsonWithRetry(apiUrl("/api/apps/lexical/books"), { method: "GET", cache: "no-store" });
}

export async function searchLexicalBookApp(payload: {
  book: string;
  term: string;
  limit?: number;
  miniTextWindow?: number;
}): Promise<{
  ok: boolean;
  result: {
    book: string;
    term: string;
    total: number;
    matches: Array<{
      book: string;
      row: number;
      number: number | null;
      title: string;
      text: string;
      pagina: string;
      data: Record<string, string>;
    }>;
  };
}> {
  return fetchJsonWithRetry(apiUrl("/api/apps/lexical/search"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export async function searchLexicalOverviewApp(payload: {
  term: string;
  limit?: number;
  miniTextWindow?: number;
  sourceIds?: string[];
}): Promise<{
  ok: boolean;
  result: {
    term: string;
    limit: number;
    totalBooks: number;
    totalFound: number;
    groups: Array<{
      bookCode: string;
      bookLabel: string;
      fileStem: string;
      totalFound: number;
      shownCount: number;
      matches: Array<{
        book: string;
        row: number;
        number: number | null;
        title: string;
        text: string;
        pagina: string;
        data: Record<string, string>;
      }>;
    }>;
  };
}> {
  return fetchJsonWithRetry(apiUrl("/api/apps/lexical/overview"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export async function exportLexicalOverviewDocxApp(payload: {
  term: string;
  limit?: number;
  miniTextWindow?: number;
  maxResultsDocx?: number;
  sourceIds?: string[];
}): Promise<{ blob: Blob; filename: string }> {
  return fetchBlobWithRetry(apiUrl("/api/apps/lexical/overview/export-docx"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  }, "lexical-overview.docx");
}

export async function exportLexicalOverviewDocxFromPayloadApp(payload: LexicalOverviewHistoryPayload & {
  maxResultsDocx?: number;
}): Promise<{ blob: Blob; filename: string }> {
  return fetchBlobWithRetry(apiUrl("/api/apps/lexical/overview/export-docx-from-payload"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  }, "lexical-overview.docx");
}

export async function lookupLexicalCitationsApp(payload: {
  text: string;
  paginasAntes?: number;
  paginasDepois?: number;
}): Promise<{
  ok: boolean;
  result: {
    paragraphsCount: number;
    total: number;
    results: Array<{
      inputParagraph: string;
      matchedParagraph: string;
      book: string;
      title?: string;
      page: string;
      similarity: number;
      method: string;
      matchedRow?: string | number;
      matchedReference?: string | number;
    }>;
  };
}> {
  return fetchJsonWithRetry(apiUrl("/api/apps/lexical/citations/lookup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export async function searchVerbeteApp(payload: {
  author?: string;
  title?: string;
  area?: string;
  text?: string;
  limit?: number;
}): Promise<{
  ok: boolean;
  result: {
    query: {
      author: string;
      title: string;
      area: string;
      text: string;
    };
    total: number;
    matches: Array<{
      row: number;
      number: number | null;
      title: string;
      text: string;
      link: string;
      data: Record<string, string>;
    }>;
  };
}> {
  return fetchJsonWithRetry(apiUrl("/api/apps/lexical/verbetes/search"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export async function semanticSearchPensatasApp(payload: {
  indexId: string;
  query: string;
  limit?: number;
  minScore?: number | null;
  miniTextWindow?: number;
  useRagContext?: boolean;
  excludeLexicalDuplicates?: boolean;
  vectorStoreIds?: string[];
  ignoreBaseCalibration?: boolean;
}): Promise<{
  ok: boolean;
  result: {
    indexId: string;
    query: string;
    total: number;
    requestedMinScore: number | null;
    recommendedMinScore: number;
    minScore: number;
    ignoreBaseCalibration: boolean;
    lexicalFilteredCount: number;
    ragLlmLog?: {
      request?: unknown;
      response?: unknown;
      error?: string;
    } | null;
    ragContext: {
      usedRagContext: boolean;
      sourceQuery?: string;
      error?: string;
      vectorStoreIds: string[];
      keyTerms: string[];
      definitions: Array<{
        term: string;
        meaning: string;
      }>;
      relatedTerms: string[];
      disambiguatedQuery: string;
      references: string[];
    };
    matches: Array<{
      book: string;
      index_id: string;
      index_label: string;
      row: number;
      text: string;
      metadata: Record<string, unknown>;
      score: number;
      semantic_score?: number;
      alignment_score?: number;
    }>;
  };
}> {
  return fetchJsonWithRetry(apiUrl("/api/apps/semantic/search"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export async function searchSemanticOverviewApp(payload: {
  term: string;
  limit?: number;
  minScore?: number | null;
  miniTextWindow?: number;
  useRagContext?: boolean;
  excludeLexicalDuplicates?: boolean;
  vectorStoreIds?: string[];
  sourceIds?: string[];
  ignoreBaseCalibration?: boolean;
}): Promise<{
  ok: boolean;
  result: {
    term: string;
    limit: number;
    minScore: number | null;
    recommendedMinScoreMin: number;
    recommendedMinScoreMax: number;
    usesCalibratedMinScores: boolean;
    ignoreBaseCalibration: boolean;
    ragLlmLog?: {
      request?: unknown;
      response?: unknown;
      error?: string;
    } | null;
    ragContext: {
      usedRagContext: boolean;
      sourceQuery?: string;
      error?: string;
      vectorStoreIds: string[];
      keyTerms: string[];
      definitions: Array<{
        term: string;
        meaning: string;
      }>;
      relatedTerms: string[];
      disambiguatedQuery: string;
      references: string[];
    };
    totalIndexes: number;
    totalFound: number;
    lexicalFilteredCount: number;
    groups: Array<{
      indexId: string;
      indexLabel: string;
      totalFound: number;
      shownCount: number;
      matches: Array<{
        book: string;
        index_id: string;
        index_label: string;
        row: number;
        text: string;
        metadata: Record<string, unknown>;
        score: number;
      }>;
    }>;
  };
}> {
  return fetchJsonWithRetry(apiUrl("/api/apps/semantic/overview"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export async function exportSemanticOverviewDocxApp(payload: {
  term: string;
  limit?: number;
  minScore?: number | null;
  miniTextWindow?: number;
  useRagContext?: boolean;
  excludeLexicalDuplicates?: boolean;
  vectorStoreIds?: string[];
  sourceIds?: string[];
  ignoreBaseCalibration?: boolean;
  maxResultsDocx?: number;
}): Promise<{ blob: Blob; filename: string }> {
  return fetchBlobWithRetry(apiUrl("/api/apps/semantic/overview/export-docx"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  }, "semantic-overview.docx");
}

export async function exportSemanticOverviewDocxFromPayloadApp(payload: SemanticOverviewHistoryPayload & {
  maxResultsDocx?: number;
}): Promise<{ blob: Blob; filename: string }> {
  return fetchBlobWithRetry(apiUrl("/api/apps/semantic/overview/export-docx-from-payload"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  }, "semantic-overview.docx");
}

export interface SemanticOverviewProgressEvent {
  at: string;
  stage: string;
  indexId?: string;
  indexLabel?: string;
  position?: number;
  totalIndexes?: number;
  matchesFound?: number;
  totalMatchesAccumulated?: number;
  topScore?: number | null;
  note?: string;
}

export interface SemanticOverviewProgressSnapshot {
  searchType?: "semantic_search" | "semantic_overview" | "lexical_overview";
  status: "idle" | "running" | "completed" | "error";
  startedAt?: string | null;
  finishedAt?: string | null;
  updatedAt?: string | null;
  term?: string;
  limit?: number;
  minScore?: number | null;
  ignoreBaseCalibration?: boolean;
  usesCalibratedMinScores?: boolean;
  totalIndexes?: number;
  processedIndexes?: number;
  currentIndexPosition?: number;
  currentIndexId?: string;
  currentIndexLabel?: string;
  currentMatches?: number;
  totalMatchesAccumulated?: number;
  totalFound?: number;
  lexicalFilteredCount?: number;
  groupsCount?: number;
  topScore?: number | null;
  message?: string;
  error?: string | null;
  ragContext?: {
    usedRagContext: boolean;
    sourceQuery?: string;
    error?: string;
    vectorStoreIds: string[];
    keyTerms: string[];
    definitions: Array<{
      term: string;
      meaning: string;
    }>;
    relatedTerms: string[];
    disambiguatedQuery: string;
    references: string[];
  } | null;
  events: SemanticOverviewProgressEvent[];
}

export async function fetchSemanticSearchProgress(): Promise<{ ok: boolean; result: SemanticOverviewProgressSnapshot }> {
  return fetchJsonWithRetry(apiUrl("/api/apps/semantic/search/progress"), {
    method: "GET",
    cache: "no-store",
  });
}

export async function fetchSemanticOverviewProgress(): Promise<{ ok: boolean; result: SemanticOverviewProgressSnapshot }> {
  return fetchJsonWithRetry(apiUrl("/api/apps/semantic/overview/progress"), {
    method: "GET",
    cache: "no-store",
  });
}

export async function fetchLexicalOverviewProgress(): Promise<{ ok: boolean; result: SemanticOverviewProgressSnapshot }> {
  return fetchJsonWithRetry(apiUrl("/api/apps/lexical/overview/progress"), {
    method: "GET",
    cache: "no-store",
  });
}

export async function searchOnlineDictionaryApp(payload: {
  term: string;
}): Promise<{
  ok: boolean;
  result: {
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
    request_id: string;
  };
}> {
  return fetchJsonWithRetry(apiUrl("/api/apps/online-dictionary/search"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export async function listSemanticIndexesApp(): Promise<{
  ok: boolean;
  result: {
    indexes: Array<{
      id: string;
      label: string;
      sourceFile: string;
      sourceRows: number;
      model: string;
      dimensions: number;
      embeddingDtype: string;
      suggestedMinScore: number;
    }>;
  };
}> {
  return fetchJsonWithRetry(apiUrl("/api/apps/semantic/indexes"), {
    method: "GET",
    cache: "no-store",
  });
}
