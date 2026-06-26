import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { biblioExternaApp, biblioGeralApp, insertRefBookMacro, insertRefVerbeteApp, listLexicalBooksApp, listSemanticIndexesApp, lookupLexicalCitationsApp, openVerbetografiaTableApp, openVerbetografiaTableWordApp, randomPensataApp, searchLexicalBookApp, searchLexicalOverviewApp, searchSemanticOverviewApp, searchVerbeteApp, semanticSearchPensatasApp } from "@/features/ghost-writer/api/backendApi";
import { executeLLM, buildPensataAnalysisPrompt, buildVerbeteDefinologiaPrompt, buildVerbeteFatologiaPrompt, buildVerbeteFraseEnfaticaPrompt, buildVerbeteSinonimologiaPrompt } from "@/features/ghost-writer/services/openai";
import { applySystemPromptOverride, getActionSystemPrompt, type ActionSystemPromptId } from "@/features/ghost-writer/config/actionSystemPrompts";
import { NO_VECTOR_STORE_ID } from "@/features/ghost-writer/config/constants";
import { normalizeIdList } from "@/features/ghost-writer/config/metadata";
import { DEFAULT_BOOK_SOURCE_ID } from "@/features/ghost-writer/config/options";
import type { ActionItemId, AIResponse, AppPanelScope, LexicalBookOption, LlmLogEntry, ParameterPanelTarget, RefBookMode, SemanticActionId, SemanticIndexOption, SemanticSearchRagContext } from "@/features/ghost-writer/types";
import { resolveActionItem, resolveSemanticActionId } from "@/features/ghost-writer/config/appRegistry";
import { buildLexicalCitationLookupHistoryResponsePayload, buildLexicalOverviewHistoryResponsePayload, buildLexicalSearchHistoryResponsePayload, buildSemanticOverviewHistoryResponsePayload, buildSemanticSearchHistoryResponsePayload } from "@/features/ghost-writer/utils/history/historySearchResponses";
import { HtmlEditorControlApi } from "@/features/ghost-writer/services/htmlEditorControl";

interface ToastApi {
  error: (message: string) => void;
  info: (message: string) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
}

interface AiActionsLlmConfig {
  model: string;
  temperature: number;
  maxOutputTokens?: number;
  gpt5Verbosity?: string;
  gpt5Effort?: string;
  systemPrompt?: string;
  vectorStoreIds: string[];
  inputFileIds: string[];
}

interface UseGhostWriterAppsParams {
  actionText: string;
  setActionText: Dispatch<SetStateAction<string>>;
  selectedRefBook: string;
  setSelectedRefBook: Dispatch<SetStateAction<string>>;
  refBookMode: RefBookMode;
  refBookPages: string;
  verbeteInput: string;
  biblioGeralAuthor: string;
  biblioGeralTitle: string;
  setBiblioGeralTitle: Dispatch<SetStateAction<string>>;
  biblioGeralYear: string;
  biblioGeralExtra: string;
  biblioExternaAuthor: string;
  biblioExternaTitle: string;
  setBiblioExternaTitle: Dispatch<SetStateAction<string>>;
  biblioExternaYear: string;
  biblioExternaJournal: string;
  biblioExternaPublisher: string;
  biblioExternaIdentifier: string;
  biblioExternaExtra: string;
  biblioExternaFreeText: string;
  lexicalBooks: LexicalBookOption[];
  setLexicalBooks: Dispatch<SetStateAction<LexicalBookOption[]>>;
  selectedLexicalBook: string;
  setSelectedLexicalBook: Dispatch<SetStateAction<string>>;
  lexicalTerm: string;
  lexicalCitationText: string;
  lexicalMaxResults: number;
  selectedLexicalOverviewSourceIds: string[];
  miniArlindoTextWindow: number;
  semanticSearchQuery: string;
  semanticSearchMaxResults: number;
  semanticMinScore: number | null;
  semanticUseRagContext: boolean;
  semanticExcludeLexicalDuplicates: boolean;
  setSemanticSearchLastRagContext: Dispatch<SetStateAction<SemanticSearchRagContext | null>>;
  setSemanticOverviewLastRagContext: Dispatch<SetStateAction<SemanticSearchRagContext | null>>;
  semanticSearchIndexes: SemanticIndexOption[];
  setSemanticSearchIndexes: Dispatch<SetStateAction<SemanticIndexOption[]>>;
  selectedSemanticSearchIndexId: string;
  setSelectedSemanticSearchIndexId: Dispatch<SetStateAction<string>>;
  setIsLoadingSemanticSearchIndexes: Dispatch<SetStateAction<boolean>>;
  semanticOverviewTerm: string;
  semanticOverviewMaxResults: number;
  selectedSemanticOverviewSourceIds: string[];
  verbeteSearchAuthor: string;
  verbeteSearchTitle: string;
  verbeteSearchArea: string;
  verbeteSearchText: string;
  verbeteSearchMaxResults: number;
  verbetografiaTitle: string;
  setVerbetografiaTitle: Dispatch<SetStateAction<string>>;
  verbetografiaSpecialty: string;
  biblioExternaLlmModel: string;
  biblioExternaLlmTemperature: number;
  biblioExternaLlmMaxOutputTokens: number;
  biblioExternaLlmVerbosity: string;
  biblioExternaLlmEffort: string;
  biblioExternaLlmSystemPrompt: string;
  aiActionSystemPrompts: Partial<Record<ActionSystemPromptId, string>>;
  documentText: string;
  openAiReady: boolean;
  isLoading: boolean;
  includeEditorContextInLlm: boolean;
  llmEditorContextMaxChars: number;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setIsOpeningDocument: Dispatch<SetStateAction<boolean>>;
  setCurrentFileId: Dispatch<SetStateAction<string>>;
  setCurrentFileName: Dispatch<SetStateAction<string>>;
  setCurrentFileConvertedFromPdf: Dispatch<SetStateAction<boolean>>;
  setIsRunningInsertRefBook: Dispatch<SetStateAction<boolean>>;
  setIsRunningInsertRefVerbete: Dispatch<SetStateAction<boolean>>;
  setIsRunningBiblioGeral: Dispatch<SetStateAction<boolean>>;
  setIsRunningBiblioExterna: Dispatch<SetStateAction<boolean>>;
  setIsRunningLexicalSearch: Dispatch<SetStateAction<boolean>>;
  setIsRunningLexicalCitationLookup: Dispatch<SetStateAction<boolean>>;
  setIsRunningLexicalOverview: Dispatch<SetStateAction<boolean>>;
  setIsRunningSemanticSearch: Dispatch<SetStateAction<boolean>>;
  setIsRunningSemanticOverview: Dispatch<SetStateAction<boolean>>;
  setIsRunningVerbeteSearch: Dispatch<SetStateAction<boolean>>;
  setIsRunningVerbetografiaOpenTable: Dispatch<SetStateAction<boolean>>;
  setIsRunningVerbetografiaOpenTableWord: Dispatch<SetStateAction<boolean>>;
  setIsRunningVerbeteDefinologia: Dispatch<SetStateAction<boolean>>;
  setIsRunningVerbeteFraseEnfatica: Dispatch<SetStateAction<boolean>>;
  setIsRunningVerbeteSinonimologia: Dispatch<SetStateAction<boolean>>;
  setIsRunningVerbeteFatologia: Dispatch<SetStateAction<boolean>>;
  setLlmLogs: Dispatch<SetStateAction<LlmLogEntry[]>>;
  setLlmSessionLogs: Dispatch<SetStateAction<LlmLogEntry[]>>;
  setParameterPanelTarget: Dispatch<SetStateAction<ParameterPanelTarget>>;
  aiActionsLlmConfigRef: MutableRefObject<AiActionsLlmConfig>;
  aiActionsSelectedVectorStoreIds: string[];
  uploadedChatFiles: Array<{ id: string }>;
  getEditorApi: () => Promise<HtmlEditorControlApi | null>;
  backendNotReadyMessage: () => string;
  executeAiActionsLLMWithLog: (payload: Parameters<typeof executeLLM>[0]) => Promise<Awaited<ReturnType<typeof executeLLM>>>;
  executeLLMWithLog: (payload: Parameters<typeof executeLLM>[0]) => Promise<Awaited<ReturnType<typeof executeLLM>>>;
  addResponse: (type: AIResponse["type"], query: string, content: string, payload?: AIResponse["payload"]) => void;
  toast: ToastApi;
}

const normalizeRefPages = (pages: string) => (
  pages
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ")
);

const createLlmLogEntry = (incomingLog: { request?: unknown; response?: unknown; error?: unknown } | null | undefined): LlmLogEntry | null => {
  if (!incomingLog) return null;
  if (incomingLog.request === undefined && incomingLog.response === undefined && incomingLog.error === undefined) return null;
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    request: incomingLog.request ?? {},
    response: incomingLog.response ?? {},
    error: typeof incomingLog.error === "string" ? incomingLog.error : undefined,
  };
};

const buildSemanticSearchEmptyMessage = ({
  minScore,
  requestedMinScore,
  recommendedMinScore,
  lexicalFilteredCount,
}: {
  minScore: number;
  requestedMinScore: number | null;
  recommendedMinScore: number;
  lexicalFilteredCount: number;
}) => {
  const details = [
    `Piso usado na busca: ${minScore.toFixed(2)}`,
    requestedMinScore === null ? `Piso calibrado conservador: ${recommendedMinScore.toFixed(2)}` : "",
    lexicalFilteredCount > 0 ? `Duplicados lexicos filtrados: ${lexicalFilteredCount}` : "",
  ].filter(Boolean);
  return `Nenhuma pensata semanticamente afim encontrada.${details.length > 0 ? ` ${details.join(" | ")}` : ""}`;
};

const buildSemanticOverviewEmptyMessage = ({
  minScore,
  recommendedMinScoreMin,
  recommendedMinScoreMax,
  lexicalFilteredCount,
}: {
  minScore: number;
  recommendedMinScoreMin: number;
  recommendedMinScoreMax: number;
  lexicalFilteredCount: number;
}) => {
  const details = [
    `Piso usado na busca: ${minScore.toFixed(2)}`,
    `Faixa calibrada conservadora: ${recommendedMinScoreMin.toFixed(2)}-${recommendedMinScoreMax.toFixed(2)}`,
    lexicalFilteredCount > 0 ? `Duplicados lexicos filtrados: ${lexicalFilteredCount}` : "",
  ].filter(Boolean);
  return `Nenhum resultado semanticamente afim encontrado.${details.length > 0 ? ` ${details.join(" | ")}` : ""}`;
};

const normalizeLexicalBookOptions = (books: Array<string | Partial<LexicalBookOption>> | undefined): LexicalBookOption[] => (
  (books ?? [])
    .map((item) => {
      if (typeof item === "string") {
        const id = item.trim();
        return id ? { id, label: id } : null;
      }
      const id = String(item?.id || "").trim();
      if (!id) return null;
      const label = String(item?.label || id).trim();
      return {
        id,
        label,
        indexId: typeof item?.indexId === "string" ? item.indexId : undefined,
        fileStem: typeof item?.fileStem === "string" ? item.fileStem : undefined,
      };
    })
    .filter((item) => item !== null) as LexicalBookOption[]
);

const buildVerbeteSearchMarkdown = (matches: Array<{
  title?: string;
  text?: string;
  number?: number | null;
  link?: string;
  data?: Record<string, unknown>;
}>) => matches
  .map((item) => {
    const row = item.data || {};
    const rowTitle = String(row.title || item.title || "").trim();
    const rowText = String(row.text || item.text || "").trim();
    const rowArea = String(row.area || "").trim();
    const rowAuthor = String(row.author || "").trim();
    const rowNumber = item.number != null ? String(item.number).trim() : "";
    const rowDate = String(row.date || "").trim();
    const rawRowLink = String(item.link || row.link || row.Link || "").trim();
    const rowLink = /^https?:\/\/\S+$/i.test(rawRowLink) ? rawRowLink : "";
    const titlePart = `${rowTitle || "s/titulo"}`;
    const areaPart = `${rowArea || "s/area"}`;
    const authorPart = `${rowAuthor || "s/autor"}`;
    const numberPart = `# ${rowNumber || "?"}`;
    const datePart = rowDate || "s/data";
    const definologiaPart = `${rowText || ""}`.trim();
    const linkPart = rowLink ? `[PDF](${rowLink})` : "";
    const headerLine = `**${titlePart}** (*${areaPart}*) ● *${authorPart}* ● ${numberPart} ● ${datePart}`;
    return [headerLine, definologiaPart, linkPart].filter(Boolean).join("\n");
  })
  .join("\n");

const useGhostWriterApps = ({
  actionText,
  setActionText,
  selectedRefBook,
  setSelectedRefBook,
  refBookMode,
  refBookPages,
  verbeteInput,
  biblioGeralAuthor,
  biblioGeralTitle,
  setBiblioGeralTitle,
  biblioGeralYear,
  biblioGeralExtra,
  biblioExternaAuthor,
  biblioExternaTitle,
  setBiblioExternaTitle,
  biblioExternaYear,
  biblioExternaJournal,
  biblioExternaPublisher,
  biblioExternaIdentifier,
  biblioExternaExtra,
  biblioExternaFreeText,
  lexicalBooks,
  setLexicalBooks,
  selectedLexicalBook,
  setSelectedLexicalBook,
  lexicalTerm,
  lexicalCitationText,
  lexicalMaxResults,
  selectedLexicalOverviewSourceIds,
  miniArlindoTextWindow,
  semanticSearchQuery,
  semanticSearchMaxResults,
  semanticMinScore,
  semanticUseRagContext,
  semanticExcludeLexicalDuplicates,
  setSemanticSearchLastRagContext,
  setSemanticOverviewLastRagContext,
  semanticSearchIndexes,
  setSemanticSearchIndexes,
  selectedSemanticSearchIndexId,
  setSelectedSemanticSearchIndexId,
  setIsLoadingSemanticSearchIndexes,
  semanticOverviewTerm,
  semanticOverviewMaxResults,
  selectedSemanticOverviewSourceIds,
  verbeteSearchAuthor,
  verbeteSearchTitle,
  verbeteSearchArea,
  verbeteSearchText,
  verbeteSearchMaxResults,
  verbetografiaTitle,
  setVerbetografiaTitle,
  verbetografiaSpecialty,
  biblioExternaLlmModel,
  biblioExternaLlmTemperature,
  biblioExternaLlmMaxOutputTokens,
  biblioExternaLlmVerbosity,
  biblioExternaLlmEffort,
  biblioExternaLlmSystemPrompt,
  aiActionSystemPrompts,
  documentText,
  openAiReady,
  isLoading,
  includeEditorContextInLlm,
  llmEditorContextMaxChars,
  setIsLoading,
  setIsOpeningDocument,
  setCurrentFileId,
  setCurrentFileName,
  setCurrentFileConvertedFromPdf,
  setIsRunningInsertRefBook,
  setIsRunningInsertRefVerbete,
  setIsRunningBiblioGeral,
  setIsRunningBiblioExterna,
  setIsRunningLexicalSearch,
  setIsRunningLexicalCitationLookup,
  setIsRunningLexicalOverview,
  setIsRunningSemanticSearch,
  setIsRunningSemanticOverview,
  setIsRunningVerbeteSearch,
  setIsRunningVerbetografiaOpenTable,
  setIsRunningVerbetografiaOpenTableWord,
  setIsRunningVerbeteDefinologia,
  setIsRunningVerbeteFraseEnfatica,
  setIsRunningVerbeteSinonimologia,
  setIsRunningVerbeteFatologia,
  setLlmLogs,
  setLlmSessionLogs,
  setParameterPanelTarget,
  aiActionsLlmConfigRef,
  aiActionsSelectedVectorStoreIds,
  uploadedChatFiles,
  getEditorApi,
  backendNotReadyMessage,
  executeAiActionsLLMWithLog,
  executeLLMWithLog,
  addResponse,
  toast,
}: UseGhostWriterAppsParams) => {
  const pushLlmLogEntry = useCallback((incomingLog: { request?: unknown; response?: unknown; error?: unknown } | null | undefined) => {
    const nextLog = createLlmLogEntry(incomingLog);
    if (!nextLog) return;
    setLlmLogs([nextLog]);
    setLlmSessionLogs((prev) => [...prev, nextLog]);
  }, [setLlmLogs, setLlmSessionLogs]);

  const handleSelectRefBook = useCallback((book: string) => {
    setSelectedRefBook(book);
  }, [setSelectedRefBook]);

  const handleRunInsertRefBook = useCallback(async () => {
    setIsRunningInsertRefBook(true);
    try {
      const rawResult = (await insertRefBookMacro(selectedRefBook, refBookMode)).result.trim();
      const pages = normalizeRefPages(refBookPages);
      const result = pages ? `${rawResult}; p. ${pages}.` : rawResult;
      if (result) {
        const selectedRefBookLabel = lexicalBooks.find((item) => item.id === selectedRefBook)?.label || selectedRefBook;
        addResponse("app_ref_book", `Livro: ${selectedRefBookLabel}${pages ? ` | p. ${pages}` : ""}`, result);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao executar Insert Ref Book.";
      toast.error(msg);
    } finally {
      setIsRunningInsertRefBook(false);
    }
  }, [addResponse, lexicalBooks, refBookMode, refBookPages, selectedRefBook, setIsRunningInsertRefBook, toast]);

  const handleRunInsertRefVerbete = useCallback(async () => {
    const raw = verbeteInput.trim();
    if (!raw) {
      toast.error("Informe ao menos um verbete.");
      return;
    }

    setIsRunningInsertRefVerbete(true);
    try {
      const data = await insertRefVerbeteApp(raw);
      const refList = (data.result.ref_list || "").trim();
      const refBiblio = (data.result.ref_biblio || "").trim();
      if (refList) addResponse("app_ref_verbete_list", `Verbetes: ${raw}`, refList);
      if (refBiblio) addResponse("app_ref_verbete_biblio", `Verbetes: ${raw}`, refBiblio);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao executar Insert Ref Verbete.";
      toast.error(msg);
    } finally {
      setIsRunningInsertRefVerbete(false);
    }
  }, [addResponse, setIsRunningInsertRefVerbete, toast, verbeteInput]);

  const handleRunBiblioGeral = useCallback(async () => {
    const author = biblioGeralAuthor.trim();
    const title = biblioGeralTitle.trim();
    const year = biblioGeralYear.trim();
    const extra = biblioGeralExtra.trim();
    if (!author && !title && !year && !extra) {
      toast.error("Informe ao menos um campo para buscar bibliografias.");
      return;
    }

    setIsRunningBiblioGeral(true);
    try {
      const data = await biblioGeralApp({ author, title, year, extra, topK: 10 });
      const markdown = (data.result.markdown || "").trim();
      if (markdown) {
        const queryParts = [
          author && `autor: ${author}`,
          title && `titulo: ${title}`,
          year && `ano: ${year}`,
          extra && `extra: ${extra}`,
        ].filter(Boolean);
        addResponse("app_biblio_geral", queryParts.join(" | "), markdown);
      }
      if (!data.result.matches?.length) {
        toast.info("Nenhuma bibliografia encontrada.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao executar Bibliografia Autores.";
      toast.error(msg);
    } finally {
      setIsRunningBiblioGeral(false);
    }
  }, [addResponse, biblioGeralAuthor, biblioGeralExtra, biblioGeralTitle, biblioGeralYear, setIsRunningBiblioGeral, toast]);

  const handleRunBiblioExterna = useCallback(async () => {
    const author = biblioExternaAuthor.trim();
    const title = biblioExternaTitle.trim();
    const year = biblioExternaYear.trim();
    const journal = biblioExternaJournal.trim();
    const publisher = biblioExternaPublisher.trim();
    const identifier = biblioExternaIdentifier.trim();
    const extra = biblioExternaExtra.trim();
    const freeText = biblioExternaFreeText.trim();
    if (!author && !title && !year && !journal && !publisher && !identifier && !extra && !freeText) {
      toast.error("Informe ao menos um campo para Bibliografia Externa.");
      return;
    }

    setIsRunningBiblioExterna(true);
    try {
      const data = freeText
        ? await biblioExternaApp({
          freeText,
          llmModel: biblioExternaLlmModel,
          llmTemperature: biblioExternaLlmTemperature,
          llmMaxOutputTokens: biblioExternaLlmMaxOutputTokens,
          llmGpt5Verbosity: biblioExternaLlmVerbosity,
          llmGpt5Effort: biblioExternaLlmEffort,
          llmSystemPrompt: biblioExternaLlmSystemPrompt.trim() || undefined,
        })
        : await biblioExternaApp({
          author,
          title,
          year,
          journal,
          publisher,
          identifier,
          extra,
          llmModel: biblioExternaLlmModel,
          llmTemperature: biblioExternaLlmTemperature,
          llmMaxOutputTokens: biblioExternaLlmMaxOutputTokens,
          llmGpt5Verbosity: biblioExternaLlmVerbosity,
          llmGpt5Effort: biblioExternaLlmEffort,
          llmSystemPrompt: biblioExternaLlmSystemPrompt.trim() || undefined,
        });
      const incomingLogs: Array<{ request?: unknown; response?: unknown; error?: unknown }> = Array.isArray(data.result.llmLogs)
        ? data.result.llmLogs
        : (data.result.llmLog ? [data.result.llmLog] : []);
      if (incomingLogs.length > 0) {
        pushLlmLogEntry(incomingLogs[incomingLogs.length - 1]);
      }
      const markdown = (data.result.markdown || "").trim();
      const scorePercentual = Number(data.result.score?.score_percentual ?? NaN);
      const classificacao = (data.result.score?.classificacao || "").trim();
      const scoreLine = Number.isFinite(scorePercentual)
        ? `Confiabilidade: **${scorePercentual.toFixed(2)}%**${classificacao ? ` (${classificacao})` : ""}`
        : "";
      const content = [scoreLine, markdown].filter(Boolean).join("\n\n");
      if (content) {
        const queryParts = freeText
          ? [`texto livre: ${freeText}`]
          : [
            author && `autor: ${author}`,
            title && `titulo: ${title}`,
            year && `ano: ${year}`,
            journal && `revista: ${journal}`,
            publisher && `editora: ${publisher}`,
            identifier && `doi/isbn: ${identifier}`,
            extra && `extra: ${extra}`,
          ].filter(Boolean);
        addResponse("app_biblio_externa", queryParts.join(" | "), content);
      }
      if (!data.result.matches?.length) {
        toast.info("Nenhuma bibliografia externa encontrada.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao executar Bibliografia Externa.";
      toast.error(msg);
    } finally {
      setIsRunningBiblioExterna(false);
    }
  }, [addResponse, biblioExternaAuthor, biblioExternaExtra, biblioExternaFreeText, biblioExternaIdentifier, biblioExternaJournal, biblioExternaLlmEffort, biblioExternaLlmMaxOutputTokens, biblioExternaLlmModel, biblioExternaLlmSystemPrompt, biblioExternaLlmTemperature, biblioExternaLlmVerbosity, biblioExternaPublisher, biblioExternaTitle, biblioExternaYear, pushLlmLogEntry, setIsRunningBiblioExterna, toast]);

  const ensureLexicalBooksLoaded = useCallback(async () => {
    if (lexicalBooks.length > 0) return lexicalBooks;
    try {
      const data = await listLexicalBooksApp();
      const books = normalizeLexicalBookOptions(data.result.books);
      setLexicalBooks(books);
      if (!books.some((item) => item.id === selectedLexicalBook)) {
        const preferred = books.find((item) => item.id === "LO");
        setSelectedLexicalBook(preferred?.id ?? books[0]?.id ?? "");
      }
      return books;
    } catch (err: unknown) {
      setLexicalBooks([]);
      setSelectedLexicalBook("LO");
      const msg = err instanceof Error ? err.message : "Falha ao carregar livros para Lexical Search.";
      toast.error(msg);
      return [];
    }
  }, [lexicalBooks, selectedLexicalBook, setLexicalBooks, setSelectedLexicalBook, toast]);

  const ensureSemanticIndexesLoaded = useCallback(async () => {
    if (semanticSearchIndexes.length > 0) return semanticSearchIndexes;
    setIsLoadingSemanticSearchIndexes(true);
    try {
      const data = await listSemanticIndexesApp();
      const indexes = data.result.indexes?.length ? data.result.indexes : [];
      setSemanticSearchIndexes(indexes);
      setSelectedSemanticSearchIndexId((prev) => {
        if (prev && indexes.some((item) => item.id === prev)) return prev;
        const preferred = indexes.find((item) => item.id.toUpperCase() === "LO");
        return preferred?.id ?? indexes[0]?.id ?? "";
      });
      return indexes;
    } catch (err: unknown) {
      setSemanticSearchIndexes([]);
      setSelectedSemanticSearchIndexId("");
      const msg = err instanceof Error ? err.message : "Falha ao carregar indices para Semantic Search.";
      toast.error(msg);
      return [];
    } finally {
      setIsLoadingSemanticSearchIndexes(false);
    }
  }, [semanticSearchIndexes, setIsLoadingSemanticSearchIndexes, setSemanticSearchIndexes, setSelectedSemanticSearchIndexId, toast]);

  const handleActionApps = useCallback((type: ActionItemId) => {
    const item = resolveActionItem(type);
    const semanticId = item?.semanticId as SemanticActionId | null;
    const section = item?.section as AppPanelScope | undefined;
    if (!item || !section) return;
    setParameterPanelTarget({ section, id: semanticId });
    if (semanticId === "biblio_autores" && !biblioGeralTitle.trim() && actionText.trim()) {
      setBiblioGeralTitle(actionText.trim());
    }
    if (semanticId === "biblio_externa" && !biblioExternaTitle.trim() && actionText.trim()) {
      setBiblioExternaTitle(actionText.trim());
    }
    if (semanticId === "busca_livros" || semanticId === "lexical_overview" || semanticId === "biblio_livros") {
      void ensureLexicalBooksLoaded();
    }
    if (semanticId === "busca_semantica" || semanticId === "semantic_overview") {
      void ensureSemanticIndexesLoaded();
    }
    if ((section === "tabela_verbete" || section === "secoes_verbete") && !verbetografiaTitle.trim() && actionText.trim()) {
      setVerbetografiaTitle(actionText.trim());
    }
  }, [actionText, biblioExternaTitle, biblioGeralTitle, ensureLexicalBooksLoaded, ensureSemanticIndexesLoaded, setBiblioExternaTitle, setBiblioGeralTitle, setParameterPanelTarget, setVerbetografiaTitle, verbetografiaTitle]);

  const handleOpenVerbetografiaTable = useCallback(async () => {
    setIsRunningVerbetografiaOpenTable(true);
    setIsOpeningDocument(true);
    try {
      const uploaded = await openVerbetografiaTableApp({
        title: verbetografiaTitle.trim(),
        specialty: verbetografiaSpecialty.trim(),
      });
      setActionText("");
      setCurrentFileId(uploaded.id);
      setCurrentFileName(uploaded.originalName || uploaded.storedName || "Tab_Verbete.docx");
      setCurrentFileConvertedFromPdf(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao abrir tabela de verbetografia.");
    } finally {
      setIsOpeningDocument(false);
      setIsRunningVerbetografiaOpenTable(false);
    }
  }, [setActionText, setCurrentFileConvertedFromPdf, setCurrentFileId, setCurrentFileName, setIsOpeningDocument, setIsRunningVerbetografiaOpenTable, toast, verbetografiaSpecialty, verbetografiaTitle]);

  const handleOpenVerbetografiaTableWord = useCallback(async () => {
    setIsRunningVerbetografiaOpenTableWord(true);
    try {
      await openVerbetografiaTableWordApp({
        title: verbetografiaTitle.trim(),
        specialty: verbetografiaSpecialty.trim(),
      });
      toast.success("Tabela verbete aberta no Word local.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao abrir tabela de verbetografia no Word.");
    } finally {
      setIsRunningVerbetografiaOpenTableWord(false);
    }
  }, [setIsRunningVerbetografiaOpenTableWord, toast, verbetografiaSpecialty, verbetografiaTitle]);

  const buildVerbetografiaQueryContext = useCallback(async () => {
    const currentConfig = aiActionsLlmConfigRef.current;
    const normalizedVectorStoreIds = normalizeIdList(currentConfig.vectorStoreIds);
    const hasExplicitNone = normalizedVectorStoreIds.includes(NO_VECTOR_STORE_ID);
    const vectorStoreIds = normalizedVectorStoreIds.filter((id) => id.startsWith("vs_"));
    const effectiveVectorStoreIds = hasExplicitNone
      ? []
      : vectorStoreIds.length > 0
        ? vectorStoreIds
        : [DEFAULT_BOOK_SOURCE_ID].filter(Boolean);
    const inputFileIds = normalizeIdList(uploadedChatFiles.map((file) => file.id));
    const editorApi = await getEditorApi();
    const latestEditorText = editorApi ? await editorApi.getDocumentText() : documentText;
    const normalizedEditorText = (latestEditorText || "").trim();
    const editorContextTruncated = normalizedEditorText.length > llmEditorContextMaxChars;
    const editorPlainTextContext = normalizedEditorText.slice(0, llmEditorContextMaxChars);
    return { vectorStoreIds: effectiveVectorStoreIds, inputFileIds, editorContextTruncated, editorPlainTextContext };
  }, [aiActionsLlmConfigRef, documentText, getEditorApi, llmEditorContextMaxChars, uploadedChatFiles]);

  const buildVerbetografiaActionLabel = useCallback((title: string, specialty: string) => (
    specialty ? `Título: ${title} | Especialidade: ${specialty}` : `Título: ${title}`
  ), []);

  const buildVerbetografiaActionQuery = useCallback((sectionLabel: string, title: string, specialty: string) => (
    specialty
      ? `Escreva uma ${sectionLabel} do tema do verbete com título: ${title} e especialidade: ${specialty}.`
      : `Escreva uma ${sectionLabel} do tema do verbete com título: ${title}.`
  ), []);

  const handleRunVerbeteDefinologia = useCallback(async () => {
    if (!openAiReady) {
      toast.error(backendNotReadyMessage());
      return;
    }
    const title = verbetografiaTitle.trim();
    const specialty = verbetografiaSpecialty.trim();
    if (!title) {
      toast.error("Informe o título do verbete.");
      return;
    }

    setIsRunningVerbeteDefinologia(true);
    try {
      const { vectorStoreIds, inputFileIds, editorContextTruncated, editorPlainTextContext } = await buildVerbetografiaQueryContext();
      const query = buildVerbetografiaActionQuery("Definologia", title, specialty);
      const messages = applySystemPromptOverride(
        buildVerbeteDefinologiaPrompt(query, editorPlainTextContext, editorContextTruncated, includeEditorContextInLlm),
        getActionSystemPrompt(aiActionSystemPrompts, "definologia"),
      );
      const result = (await executeAiActionsLLMWithLog({ messages, systemPrompt: "", vectorStoreIds, inputFileIds })).content.trim();
      addResponse("app_verbete_definologia", buildVerbetografiaActionLabel(title, specialty), result || "Sem conteudo retornado pela IA.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao executar Definologia.";
      toast.error(msg);
      addResponse("app_verbete_definologia", buildVerbetografiaActionLabel(verbetografiaTitle.trim(), verbetografiaSpecialty.trim()), `Erro na Definologia: ${msg}`);
    } finally {
      setIsRunningVerbeteDefinologia(false);
    }
  }, [addResponse, aiActionSystemPrompts, backendNotReadyMessage, buildVerbetografiaActionLabel, buildVerbetografiaActionQuery, buildVerbetografiaQueryContext, executeAiActionsLLMWithLog, includeEditorContextInLlm, openAiReady, setIsRunningVerbeteDefinologia, toast, verbetografiaSpecialty, verbetografiaTitle]);

  const handleRunVerbeteFraseEnfatica = useCallback(async () => {
    if (!openAiReady) {
      toast.error(backendNotReadyMessage());
      return;
    }
    const title = verbetografiaTitle.trim();
    const specialty = verbetografiaSpecialty.trim();
    if (!title) {
      toast.error("Informe o título do verbete.");
      return;
    }

    setIsRunningVerbeteFraseEnfatica(true);
    try {
      const { vectorStoreIds, inputFileIds, editorContextTruncated, editorPlainTextContext } = await buildVerbetografiaQueryContext();
      const query = buildVerbetografiaActionQuery("Frase Enfática", title, specialty);
      const messages = applySystemPromptOverride(
        buildVerbeteFraseEnfaticaPrompt(query, editorPlainTextContext, editorContextTruncated, includeEditorContextInLlm),
        getActionSystemPrompt(aiActionSystemPrompts, "frase_enfatica"),
      );
      const result = (await executeAiActionsLLMWithLog({ messages, systemPrompt: "", vectorStoreIds, inputFileIds })).content.trim();
      addResponse("app_verbete_frase_enfatica", buildVerbetografiaActionLabel(title, specialty), result || "Sem conteudo retornado pela IA.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao executar Frase Enfática.";
      toast.error(msg);
      addResponse("app_verbete_frase_enfatica", buildVerbetografiaActionLabel(verbetografiaTitle.trim(), verbetografiaSpecialty.trim()), `Erro na Frase Enfática: ${msg}`);
    } finally {
      setIsRunningVerbeteFraseEnfatica(false);
    }
  }, [addResponse, aiActionSystemPrompts, backendNotReadyMessage, buildVerbetografiaActionLabel, buildVerbetografiaActionQuery, buildVerbetografiaQueryContext, executeAiActionsLLMWithLog, includeEditorContextInLlm, openAiReady, setIsRunningVerbeteFraseEnfatica, toast, verbetografiaSpecialty, verbetografiaTitle]);

  const handleRunVerbeteSinonimologia = useCallback(async () => {
    if (!openAiReady) {
      toast.error(backendNotReadyMessage());
      return;
    }
    const title = verbetografiaTitle.trim();
    const specialty = verbetografiaSpecialty.trim();
    if (!title) {
      toast.error("Informe o título do verbete.");
      return;
    }

    setIsRunningVerbeteSinonimologia(true);
    try {
      const { vectorStoreIds, inputFileIds, editorContextTruncated, editorPlainTextContext } = await buildVerbetografiaQueryContext();
      const query = buildVerbetografiaActionQuery("Sinonimologia", title, specialty);
      const messages = applySystemPromptOverride(
        buildVerbeteSinonimologiaPrompt(query, editorPlainTextContext, editorContextTruncated, includeEditorContextInLlm),
        getActionSystemPrompt(aiActionSystemPrompts, "sinonimologia"),
      );
      const result = (await executeAiActionsLLMWithLog({ messages, systemPrompt: "", vectorStoreIds, inputFileIds })).content.trim();
      addResponse("app_verbete_sinonimologia", buildVerbetografiaActionLabel(title, specialty), result || "Sem conteudo retornado pela IA.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao executar Sinonimologia.";
      toast.error(msg);
      addResponse("app_verbete_sinonimologia", buildVerbetografiaActionLabel(verbetografiaTitle.trim(), verbetografiaSpecialty.trim()), `Erro na Sinonimologia: ${msg}`);
    } finally {
      setIsRunningVerbeteSinonimologia(false);
    }
  }, [addResponse, aiActionSystemPrompts, backendNotReadyMessage, buildVerbetografiaActionLabel, buildVerbetografiaActionQuery, buildVerbetografiaQueryContext, executeAiActionsLLMWithLog, includeEditorContextInLlm, openAiReady, setIsRunningVerbeteSinonimologia, toast, verbetografiaSpecialty, verbetografiaTitle]);

  const handleRunVerbeteFatologia = useCallback(async () => {
    if (!openAiReady) {
      toast.error(backendNotReadyMessage());
      return;
    }
    const title = verbetografiaTitle.trim();
    const specialty = verbetografiaSpecialty.trim();
    if (!title) {
      toast.error("Informe o título do verbete.");
      return;
    }

    setIsRunningVerbeteFatologia(true);
    try {
      const { vectorStoreIds, inputFileIds, editorContextTruncated, editorPlainTextContext } = await buildVerbetografiaQueryContext();
      const query = buildVerbetografiaActionQuery("Fatologia", title, specialty);
      const messages = applySystemPromptOverride(
        buildVerbeteFatologiaPrompt(query, editorPlainTextContext, editorContextTruncated, includeEditorContextInLlm),
        getActionSystemPrompt(aiActionSystemPrompts, "fatologia"),
      );
      const result = (await executeAiActionsLLMWithLog({ messages, systemPrompt: "", vectorStoreIds, inputFileIds })).content.trim();
      addResponse("app_verbete_fatologia", buildVerbetografiaActionLabel(title, specialty), result || "Sem conteudo retornado pela IA.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao executar Fatologia.";
      toast.error(msg);
      addResponse("app_verbete_fatologia", buildVerbetografiaActionLabel(verbetografiaTitle.trim(), verbetografiaSpecialty.trim()), `Erro na Fatologia: ${msg}`);
    } finally {
      setIsRunningVerbeteFatologia(false);
    }
  }, [addResponse, aiActionSystemPrompts, backendNotReadyMessage, buildVerbetografiaActionLabel, buildVerbetografiaActionQuery, buildVerbetografiaQueryContext, executeAiActionsLLMWithLog, includeEditorContextInLlm, openAiReady, setIsRunningVerbeteFatologia, toast, verbetografiaSpecialty, verbetografiaTitle]);

  const handleSelectVerbetografiaAction = useCallback((type: ActionItemId) => {
    const semanticId = resolveSemanticActionId(type);
    if (semanticId !== "definologia" && semanticId !== "frase_enfatica" && semanticId !== "sinonimologia" && semanticId !== "fatologia") return;
    setParameterPanelTarget({ section: "secoes_verbete", id: semanticId });
    if (!verbetografiaTitle.trim() && actionText.trim()) setVerbetografiaTitle(actionText.trim());
  }, [actionText, setParameterPanelTarget, setVerbetografiaTitle, verbetografiaTitle]);

  const handleRunLexicalSearch = useCallback(async () => {
    const book = selectedLexicalBook.trim();
    const term = lexicalTerm.trim();
    const maxResults = Math.max(1, Math.min(200, lexicalMaxResults || 1));
    if (!book) {
      toast.error("Selecione um livro para a busca.");
      return;
    }
    if (!term) {
      toast.error("Informe um termo para busca.");
      return;
    }

    setIsRunningLexicalSearch(true);
    try {
      const data = await searchLexicalBookApp({ book, term, limit: maxResults, miniTextWindow: miniArlindoTextWindow });
      const totalFound = Number(data.result.total || 0);
      const matches = (data.result.matches || []).slice(0, maxResults);
      if (matches.length <= 0) {
        toast.info("Nenhuma ocorrencia encontrada.");
        return;
      }
      const payload = buildLexicalSearchHistoryResponsePayload({ book, term, totalFound, maxResults, matches });
      addResponse("app_book_search", payload.querySummary, payload.markdown);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao executar Lexical Search.";
      toast.error(msg);
    } finally {
      setIsRunningLexicalSearch(false);
    }
  }, [addResponse, lexicalMaxResults, lexicalTerm, miniArlindoTextWindow, selectedLexicalBook, setIsRunningLexicalSearch, toast]);

  const handleRunLexicalOverview = useCallback(async () => {
    const term = lexicalTerm.trim();
    const limit = Math.max(1, Math.min(100, lexicalMaxResults || 1));
    const sourceIds = normalizeIdList(selectedLexicalOverviewSourceIds);
    if (!term) {
      toast.error("Informe um termo para busca.");
      return;
    }
    if (sourceIds.length <= 0) {
      toast.error("Selecione ao menos uma base para o Lexical Overview.");
      return;
    }

    setIsRunningLexicalOverview(true);
    try {
      const data = await searchLexicalOverviewApp({ term, limit, miniTextWindow: miniArlindoTextWindow, sourceIds });
      const totalBooks = Number(data.result.totalBooks || 0);
      const totalFound = Number(data.result.totalFound || 0);
      const groups = data.result.groups || [];
      if (groups.length <= 0 || totalFound <= 0) {
        toast.info("Nenhuma ocorrencia encontrada.");
        return;
      }
      const payload = buildLexicalOverviewHistoryResponsePayload({
        term,
        limit,
        miniTextWindow: miniArlindoTextWindow,
        sourceIds,
        totalBooks,
        totalFound,
        groups,
      });
      addResponse("app_lexical_overview", payload.querySummary, payload.markdown, payload.payload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao executar Lexical Overview.";
      toast.error(msg);
    } finally {
      setIsRunningLexicalOverview(false);
    }
  }, [addResponse, lexicalMaxResults, lexicalTerm, miniArlindoTextWindow, selectedLexicalOverviewSourceIds, setIsRunningLexicalOverview, toast]);

  const handleRunLexicalCitationLookup = useCallback(async () => {
    const text = lexicalCitationText.trim();
    if (!text) {
      toast.error("Informe ao menos um trecho para localizar.");
      return;
    }

    setIsRunningLexicalCitationLookup(true);
    try {
      const data = await lookupLexicalCitationsApp({
        text,
        paginasAntes: 2,
        paginasDepois: 3,
      });
      const results = Array.isArray(data.result.results) ? data.result.results : [];
      if (results.length <= 0) {
        toast.info("Nenhum trecho localizado.");
        return;
      }

      const payload = buildLexicalCitationLookupHistoryResponsePayload({
        paragraphsCount: Number(data.result.paragraphsCount || results.length),
        results,
      });
      addResponse("app_lexical_citation_lookup", payload.querySummary, payload.markdown);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao localizar trechos.";
      toast.error(msg);
    } finally {
      setIsRunningLexicalCitationLookup(false);
    }
  }, [addResponse, lexicalCitationText, setIsRunningLexicalCitationLookup, toast]);

  const handleRunSemanticSearch = useCallback(async () => {
    const indexId = selectedSemanticSearchIndexId.trim();
    const query = semanticSearchQuery.trim();
    const maxResults = Math.max(1, Math.min(50, semanticSearchMaxResults || 1));
    if (!indexId) {
      toast.error("Selecione uma base vetorial para o Semantic Search.");
      return;
    }
    if (!query) {
      toast.error("Informe uma query para o Semantic Search.");
      return;
    }

    setIsRunningSemanticSearch(true);
    try {
      const vectorStoreIds = normalizeIdList(aiActionsSelectedVectorStoreIds).filter((id) => id.startsWith("vs_"));
      const data = await semanticSearchPensatasApp({
        indexId,
        query,
        limit: maxResults,
        minScore: semanticMinScore ?? undefined,
        miniTextWindow: miniArlindoTextWindow,
        useRagContext: semanticUseRagContext,
        excludeLexicalDuplicates: semanticExcludeLexicalDuplicates,
        vectorStoreIds,
      });
      const totalFound = Number(data.result.total || 0);
      const requestedMinScore = typeof data.result.requestedMinScore === "number" ? data.result.requestedMinScore : null;
      const recommendedMinScore = Number(data.result.recommendedMinScore ?? 0);
      const minScore = Number(data.result.minScore || recommendedMinScore || 0);
      const lexicalFilteredCount = Number(data.result.lexicalFilteredCount || 0);
      setSemanticSearchLastRagContext(data.result.ragContext ?? null);
      pushLlmLogEntry(data.result.ragLlmLog);
      const matches = (data.result.matches || []).slice(0, maxResults);
      if (matches.length <= 0) {
        toast.info(buildSemanticSearchEmptyMessage({
          minScore,
          requestedMinScore,
          recommendedMinScore,
          lexicalFilteredCount,
        }));
        return;
      }
      const payload = buildSemanticSearchHistoryResponsePayload({
        selectedIndexId: indexId,
        indexes: semanticSearchIndexes,
        query,
        totalFound,
        requestedMinScore,
        recommendedMinScore,
        minScore,
        ignoreBaseCalibration: requestedMinScore !== null,
        lexicalFilteredCount,
        matches,
      });
      addResponse("app_semantic_search", payload.querySummary, payload.markdown);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao executar Semantic Search.";
      toast.error(msg);
    } finally {
      setIsRunningSemanticSearch(false);
    }
  }, [addResponse, aiActionsSelectedVectorStoreIds, miniArlindoTextWindow, pushLlmLogEntry, selectedSemanticSearchIndexId, semanticExcludeLexicalDuplicates, semanticMinScore, semanticSearchIndexes, semanticSearchMaxResults, semanticSearchQuery, semanticUseRagContext, setIsRunningSemanticSearch, setSemanticSearchLastRagContext, toast]);

  const handleRunSemanticOverview = useCallback(async () => {
    const term = semanticOverviewTerm.trim();
    const limit = Math.max(1, Math.min(100, semanticOverviewMaxResults || 1));
    const sourceIds = normalizeIdList(selectedSemanticOverviewSourceIds);
    if (!term) {
      toast.error("Informe um termo para busca.");
      return;
    }
    if (sourceIds.length <= 0) {
      toast.error("Selecione ao menos uma base para o Semantic Overview.");
      return;
    }

    setIsRunningSemanticOverview(true);
    try {
      const vectorStoreIds = normalizeIdList(aiActionsSelectedVectorStoreIds).filter((id) => id.startsWith("vs_"));
      const data = await searchSemanticOverviewApp({
        term,
        limit,
        minScore: semanticMinScore ?? undefined,
        miniTextWindow: miniArlindoTextWindow,
        useRagContext: semanticUseRagContext,
        excludeLexicalDuplicates: semanticExcludeLexicalDuplicates,
        vectorStoreIds,
        sourceIds,
      });
      const totalIndexes = Number(data.result.totalIndexes || 0);
      const totalFound = Number(data.result.totalFound || 0);
      const recommendedMinScoreMin = Number(data.result.recommendedMinScoreMin || 0);
      const recommendedMinScoreMax = Number(data.result.recommendedMinScoreMax || 0);
      const minScore = typeof data.result.minScore === "number" ? data.result.minScore : recommendedMinScoreMin;
      const usesCalibratedMinScores = Boolean(data.result.usesCalibratedMinScores);
      const lexicalFilteredCount = Number(data.result.lexicalFilteredCount || 0);
      setSemanticOverviewLastRagContext(data.result.ragContext ?? null);
      pushLlmLogEntry(data.result.ragLlmLog);
      const groups = data.result.groups || [];
      if (groups.length <= 0 || totalFound <= 0) {
        toast.info(buildSemanticOverviewEmptyMessage({
          minScore,
          recommendedMinScoreMin,
          recommendedMinScoreMax,
          lexicalFilteredCount,
        }));
        return;
      }
      const payload = buildSemanticOverviewHistoryResponsePayload({
        term,
        limit,
        minScore,
        miniTextWindow: miniArlindoTextWindow,
        useRagContext: semanticUseRagContext,
        excludeLexicalDuplicates: semanticExcludeLexicalDuplicates,
        vectorStoreIds,
        sourceIds,
        recommendedMinScoreMin,
        recommendedMinScoreMax,
        usesCalibratedMinScores,
        ignoreBaseCalibration: !usesCalibratedMinScores,
        totalIndexes,
        totalFound,
        lexicalFilteredCount,
        groups,
      });
      addResponse("app_semantic_overview", payload.querySummary, payload.markdown, payload.payload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao executar Semantic Overview.";
      toast.error(msg);
    } finally {
      setIsRunningSemanticOverview(false);
    }
  }, [addResponse, aiActionsSelectedVectorStoreIds, miniArlindoTextWindow, pushLlmLogEntry, selectedSemanticOverviewSourceIds, semanticExcludeLexicalDuplicates, semanticMinScore, semanticOverviewMaxResults, semanticOverviewTerm, semanticUseRagContext, setIsRunningSemanticOverview, setSemanticOverviewLastRagContext, toast]);

  const handleRunVerbeteSearch = useCallback(async () => {
    const author = verbeteSearchAuthor.trim();
    const title = verbeteSearchTitle.trim();
    const area = verbeteSearchArea.trim();
    const text = verbeteSearchText.trim();
    const maxResults = Math.max(1, Math.min(200, verbeteSearchMaxResults || 1));
    if (!author && !title && !area && !text) {
      toast.error("Preencha ao menos um campo para buscar em verbetes.");
      return;
    }

    setIsRunningVerbeteSearch(true);
    try {
      const data = await searchVerbeteApp({ author, title, area, text, limit: maxResults });
      const totalFound = Number(data.result.total || 0);
      const matches = (data.result.matches || []).slice(0, maxResults);
      if (matches.length <= 0) {
        toast.info("Nenhum verbete encontrado.");
        return;
      }
      const queryParts = [
        author && `Author: ${author}`,
        title && `Title: ${title}`,
        area && `Area: ${area}`,
        text && `Text: ${text}`,
      ].filter(Boolean);
      addResponse(
        "app_verbete_search",
        `${queryParts.join(" | ")} | Total: ${totalFound}${totalFound > maxResults ? ` | Exibidos: ${maxResults}` : ""}`,
        buildVerbeteSearchMarkdown(matches),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao executar Busca em Verbetes.";
      toast.error(msg);
    } finally {
      setIsRunningVerbeteSearch(false);
    }
  }, [addResponse, setIsRunningVerbeteSearch, toast, verbeteSearchArea, verbeteSearchAuthor, verbeteSearchMaxResults, verbeteSearchText, verbeteSearchTitle]);

  const handleRunRandomPensata = useCallback(async () => {
    if (isLoading) return;
    if (!openAiReady) {
      toast.error(backendNotReadyMessage());
      return;
    }
    setIsLoading(true);
    try {
      const data = await randomPensataApp();
      const result = data.result;
      const source = (result.source || "LO").trim();
      const page = (result.page || "").trim();
      const number = Number(result.paragraph_number || 0);
      const total = Number(result.total_paragraphs || 0);
      const paragraph = (result.paragraph || "").trim();
      const header = `Livro: ${source} | Paragrafo: ${number}${total > 0 ? `/${total}` : ""}${page ? ` | p. ${page}` : ""}`;
      const pensata = paragraph || "Paragrafo nao encontrado.";
      const analysisMessages = buildPensataAnalysisPrompt(pensata);
      const analysis = (await executeLLMWithLog({
        messages: analysisMessages,
        vectorStoreIds: ["vs_6912908250e4819197e23fe725e04fae"],
      })).content.trim();
      let cleanedAnalysis = analysis;
      // Remove duplicated leading labels like "Análise IA:", "Análise:", etc.
      cleanedAnalysis = cleanedAnalysis.replace(/^(\*?\*?An[áa]lise\s*(?:IA)?\s*:?\*?\*?\s*)+/i, "").trim();
      const content = cleanedAnalysis ? `${pensata}\n\n**Análise:** ${cleanedAnalysis}` : pensata;
      addResponse("app_random_pensata", header, content);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao executar Pensata do Dia.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [addResponse, backendNotReadyMessage, executeLLMWithLog, isLoading, openAiReady, setIsLoading, toast]);

  return {
    ensureLexicalBooksLoaded,
    ensureSemanticIndexesLoaded,
    handleActionApps,
    handleSelectRefBook,
    handleRunInsertRefBook,
    handleRunInsertRefVerbete,
    handleRunBiblioGeral,
    handleRunBiblioExterna,
    handleOpenVerbetografiaTable,
    handleOpenVerbetografiaTableWord,
    handleRunVerbeteDefinologia,
    handleRunVerbeteFraseEnfatica,
    handleRunVerbeteSinonimologia,
    handleRunVerbeteFatologia,
    handleSelectVerbetografiaAction,
    handleRunLexicalSearch,
    handleRunLexicalCitationLookup,
    handleRunLexicalOverview,
    handleRunSemanticSearch,
    handleRunSemanticOverview,
    handleRunVerbeteSearch,
    handleRunRandomPensata,
  };
};

export default useGhostWriterApps;
