import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useSystemConfirmation } from "@/components/SystemConfirmationProvider";
import LeftPanel from "@/features/ghost-writer/components/shell/LeftPanel";
import RightPanel from "@/features/ghost-writer/components/shell/RightPanel";
import HtmlEditor from "@/features/ghost-writer/components/editor/HtmlEditor";
import MobilePanelHeader from "@/features/ghost-writer/components/shell/MobilePanelHeader";
import LogsPanel from "@/features/ghost-writer/components/shell/LogsPanel";
import ConfigsPanel from "@/features/ghost-writer/components/config/ConfigsPanel";
import ParameterPanel from "@/features/ghost-writer/components/parameters/ParameterPanel";
import ParameterPanelContent from "@/features/ghost-writer/components/parameters/ParameterPanelContent";
import DesktopResizeHandle from "@/features/ghost-writer/components/shell/DesktopResizeHandle";
import { useTextStats } from "@/features/ghost-writer/hooks/useTextStats";
import { buttonsPrimaryBgClass, cardsBgClass, panelsBgClass } from "@/styles/backgroundColors";
import {
  BIBLIO_EXTERNA_DEFAULT_SYSTEM_PROMPT,
  CHAT_MODEL,
  CHAT_TEMPERATURE,
  CHAT_GPT5_VERBOSITY,
  CHAT_GPT5_EFFORT,
  CHAT_MAX_OUTPUT_TOKENS,
  CHAT_MAX_NUM_RESULTS,
  CHAT_SYSTEM_PROMPT,
  LLM_VECTOR_STORE_TRANSLATE_RAG,
} from "@/features/ghost-writer/services/openai";
import type { AiActionId, MacroActionId, MobilePanelId, ParameterPanelSection } from "@/features/ghost-writer/types";
import { getParameterPanelHeaderMeta, normalizeIdList } from "@/features/ghost-writer/config/metadata";
import { resolveSemanticActionId } from "@/features/ghost-writer/config/appRegistry";
import { DEFAULT_ACTION_SYSTEM_PROMPTS } from "@/features/ghost-writer/config/actionSystemPrompts";
import { AI_ACTIONS_LLM_SETTINGS_STORAGE_KEY, BIBLIO_EXTERNA_LLM_SETTINGS_STORAGE_KEY, CHAT_EDITOR_CONTEXT_MAX_CHARS, DEFAULT_BOOK_SEARCH_MAX_RESULTS, DEFAULT_LOG_FONT_SIZE_PX, DEFAULT_MAX_RESULTS_DOCX, DEFAULT_MINI_ARLINDO_TEXT_WINDOW, DESKTOP_CONTENT_EDGE_GUTTER_PX, DESKTOP_PANEL_SIZES_PX, GENERAL_SETTINGS_STORAGE_KEY, LLM_LOG_FONT_MAX, LLM_LOG_FONT_MIN, LLM_LOG_FONT_STEP, LLM_SETTINGS_STORAGE_KEY, NO_VECTOR_STORE_ID } from "@/features/ghost-writer/config/constants";
import { BOOK_SOURCE, DEFAULT_BOOK_SOURCE_ID, MACRO1_HIGHLIGHT_COLORS, TRANSLATE_LANGUAGE_OPTIONS, VECTOR_STORES_SOURCE } from "@/features/ghost-writer/config/options";
import useGhostWriterLayout from "@/features/ghost-writer/hooks/controllers/useGhostWriterLayout";
import useGhostWriterDocument from "@/features/ghost-writer/hooks/controllers/useGhostWriterDocument";
import useGhostWriterApps from "@/features/ghost-writer/hooks/controllers/useGhostWriterApps";
import useGhostWriterLlm from "@/features/ghost-writer/hooks/controllers/useGhostWriterLlm";
import useGhostWriterLlmLogs from "@/features/ghost-writer/hooks/controllers/useGhostWriterLlmLogs";
import { useGhostWriterDocumentState } from "@/features/ghost-writer/hooks/state/useDocumentState";
import { useGhostWriterAppsState } from "@/features/ghost-writer/hooks/state/useAppsState";
import { useGhostWriterLlmState } from "@/features/ghost-writer/hooks/state/useLlmState";
import useGhostWriterFeedback from "@/features/ghost-writer/hooks/controllers/useGhostWriterFeedback";
import { clampToMin, getDesktopMinimumContentWidthPx, getRightPanelWidthPx, type DesktopFixedPanelWidthsPx, type DesktopResizablePanelKey } from "@/features/ghost-writer/utils/layout/desktopLayoutPx";
const sidePanelClass = panelsBgClass;

const Index = () => {
  const layoutContainerRef = useRef<HTMLDivElement | null>(null);
  const LLM_LOG_FONT_DEFAULT = Number((DEFAULT_LOG_FONT_SIZE_PX / 11).toFixed(2));
  const [desktopContainerWidthPx, setDesktopContainerWidthPx] = useState<number | null>(null);
  const [desktopFixedPanelWidthsPx, setDesktopFixedPanelWidthsPx] = useState<DesktopFixedPanelWidthsPx>({
    left: DESKTOP_PANEL_SIZES_PX.left.default,
    parameter: DESKTOP_PANEL_SIZES_PX.parameter.default,
    editor: DESKTOP_PANEL_SIZES_PX.editor.default,
    json: DESKTOP_PANEL_SIZES_PX.json.default,
  });
  const documentState = useGhostWriterDocumentState();
  const {
    documentText, setDocumentText, currentFileName, setCurrentFileName, currentFileConvertedFromPdf, setCurrentFileConvertedFromPdf, documentPageCount, setDocumentPageCount,
    documentParagraphCount, setDocumentParagraphCount, documentWordCount, setDocumentWordCount, documentSymbolCount, setDocumentSymbolCount, documentSymbolWithSpacesCount,
    setDocumentSymbolWithSpacesCount, currentFileId, setCurrentFileId, statsKey, setStatsKey, openedDocumentVersion, setOpenedDocumentVersion, editorContentHtml, setEditorContentHtml,
    isOpeningDocument, setIsOpeningDocument, htmlEditorControlApi, setHtmlEditorControlApi, isExportingDocx, setIsExportingDocx, isImportingDocument, setIsImportingDocument,
    selectedImportFileName, setSelectedImportFileName, macro1Term, setMacro1Term, macro1ColorId, setMacro1ColorId, macro1PredictedMatches, setMacro1PredictedMatches,
    isCountingMacro1Matches, setIsCountingMacro1Matches, macro2SpacingMode, setMacro2SpacingMode, saveTimerRef, fileInputRef, htmlEditorControlApiRef, currentFileIdRef, macro1CountRequestIdRef,
  } = documentState;
  const appState = useGhostWriterAppsState();
  const {
    selectedRefBook, setSelectedRefBook, refBookMode, setRefBookMode, refBookPages, setRefBookPages, isRunningInsertRefBook, setIsRunningInsertRefBook, verbeteInput, setVerbeteInput,
    isRunningInsertRefVerbete, setIsRunningInsertRefVerbete, biblioGeralAuthor, setBiblioGeralAuthor, biblioGeralTitle, setBiblioGeralTitle, biblioGeralYear, setBiblioGeralYear,
    biblioGeralExtra, setBiblioGeralExtra, isRunningBiblioGeral, setIsRunningBiblioGeral, biblioExternaAuthor, setBiblioExternaAuthor, biblioExternaTitle, setBiblioExternaTitle,
    biblioExternaYear, setBiblioExternaYear, biblioExternaJournal, setBiblioExternaJournal, biblioExternaPublisher, setBiblioExternaPublisher, biblioExternaIdentifier,
    setBiblioExternaIdentifier, biblioExternaExtra, setBiblioExternaExtra, biblioExternaFreeText, setBiblioExternaFreeText, isRunningBiblioExterna, setIsRunningBiblioExterna,
    lexicalBooks, setLexicalBooks, selectedLexicalBook, setSelectedLexicalBook, lexicalTerm, setLexicalTerm, lexicalCitationText, setLexicalCitationText, lexicalMaxResults, setLexicalMaxResults, isRunningLexicalSearch,
    setIsRunningLexicalSearch, isRunningLexicalCitationLookup, isRunningLexicalOverview, setIsRunningLexicalOverview, selectedLexicalOverviewSourceIds, setSelectedLexicalOverviewSourceIds, semanticSearchQuery, setSemanticSearchQuery, semanticSearchMaxResults, setSemanticSearchMaxResults, semanticMinScore, setSemanticMinScore, semanticMinScoreMode, setSemanticMinScoreMode, semanticUseRagContext, setSemanticUseRagContext, semanticExcludeLexicalDuplicates, setSemanticExcludeLexicalDuplicates, semanticOverviewLastRagContext, semanticSearchIndexes, setSemanticSearchIndexes,
    selectedSemanticSearchIndexId, setSelectedSemanticSearchIndexId, isLoadingSemanticSearchIndexes, setIsLoadingSemanticSearchIndexes, isRunningSemanticSearch, setIsRunningSemanticSearch,
    semanticOverviewTerm, setSemanticOverviewTerm, semanticOverviewMaxResults, setSemanticOverviewMaxResults, selectedSemanticOverviewSourceIds, setSelectedSemanticOverviewSourceIds, isRunningSemanticOverview, setIsRunningSemanticOverview,
    verbeteSearchAuthor, setVerbeteSearchAuthor, verbeteSearchTitle, setVerbeteSearchTitle, verbeteSearchArea, setVerbeteSearchArea, verbeteSearchText, setVerbeteSearchText,
    verbeteSearchMaxResults, setVerbeteSearchMaxResults, isRunningVerbeteSearch, setIsRunningVerbeteSearch, verbetografiaTitle, setVerbetografiaTitle,
    verbetografiaSpecialty, setVerbetografiaSpecialty, isRunningVerbetografiaOpenTable, setIsRunningVerbetografiaOpenTable, isRunningVerbetografiaOpenTableWord, setIsRunningVerbetografiaOpenTableWord, isRunningVerbeteDefinologia, setIsRunningVerbeteDefinologia,
    isRunningVerbeteFraseEnfatica, setIsRunningVerbeteFraseEnfatica, isRunningVerbeteSinonimologia, setIsRunningVerbeteSinonimologia, isRunningVerbeteFatologia, setIsRunningVerbeteFatologia,
  } = appState;
  const llmState = useGhostWriterLlmState(LLM_LOG_FONT_DEFAULT);
  const {
    responses, setResponses, isLoading, setIsLoading, actionText, setActionText, chatHistory, setChatHistory, backendStatus, setBackendStatus, translateLanguage, setTranslateLanguage,
    rewritePromptType, setRewritePromptType, aiCommandQuery, setAiCommandQuery, llmModel, setLlmModel, llmTemperature, setLlmTemperature, llmMaxOutputTokens, setLlmMaxOutputTokens, llmMaxNumResults, setLlmMaxNumResults,
    llmEditorContextMaxChars, setLlmEditorContextMaxChars, llmVerbosity, setLlmVerbosity, llmEffort, setLlmEffort, llmSystemPrompt, setLlmSystemPrompt, aiActionsLlmModel,
    setAiActionsLlmModel, aiActionsLlmTemperature, setAiActionsLlmTemperature, aiActionsLlmMaxOutputTokens, setAiActionsLlmMaxOutputTokens, aiActionsLlmVerbosity, setAiActionsLlmVerbosity,
    aiActionsLlmEffort, setAiActionsLlmEffort, aiActionsLlmSystemPrompt, setAiActionsLlmSystemPrompt, aiActionSystemPrompts, setAiActionSystemPrompts, aiActionsSelectedVectorStoreIds, setAiActionsSelectedVectorStoreIds,
    aiActionsSelectedInputFileIds, setAiActionsSelectedInputFileIds, isTermsConceptsConscienciografiaEnabled, setIsTermsConceptsConscienciografiaEnabled, biblioExternaLlmModel, setBiblioExternaLlmModel, biblioExternaLlmTemperature, setBiblioExternaLlmTemperature,
    biblioExternaLlmMaxOutputTokens, setBiblioExternaLlmMaxOutputTokens, biblioExternaLlmVerbosity, setBiblioExternaLlmVerbosity, biblioExternaLlmEffort, setBiblioExternaLlmEffort,
    biblioExternaLlmSystemPrompt, setBiblioExternaLlmSystemPrompt, chatPreviousResponseId, setChatPreviousResponseId, llmLogs, setLlmLogs, llmSessionLogs, setLlmSessionLogs,
    llmLogFontScale, setLlmLogFontScale, enableHistoryNumbering, setEnableHistoryNumbering, enableHistoryReferences, setEnableHistoryReferences, enableHistoryMetadata, setEnableHistoryMetadata, enableHistoryHighlight, setEnableHistoryHighlight, miniArlindoTextWindow, setMiniArlindoTextWindow, maxResultsDocx, setMaxResultsDocx, selectedBookSourceIds, setSelectedBookSourceIds,
    uploadedChatFiles, setUploadedChatFiles, isUploadingChatFiles, setIsUploadingChatFiles, includeEditorContextInLlm, setIncludeEditorContextInLlm,
  } = llmState;
  const { historyNotice, showHistoryNotice, toast } = useGhostWriterFeedback();
  const hasEditorPanel = Boolean(currentFileId) || isOpeningDocument;
  const { requestSystemConfirmation } = useSystemConfirmation();
  const requestDownloadBeforeClose = useCallback(() => requestSystemConfirmation({
    title: "Fechar editor",
    description: "Deseja baixar o arquivo antes de fechar o editor?",
  }), [requestSystemConfirmation]);
  const {
    parameterPanelTarget,
    setParameterPanelTarget,
    activeLogPanel,
    setActiveLogPanel,
    lastActiveLogPanel,
    activeConfigPanel,
    setActiveConfigPanel,
    lastActiveConfigPanel,
    isMobileView,
    activeMobilePanel,
    setActiveMobilePanel,
    isChatConfigOpen,
    hasCenterPanel,
    hasJsonPanel,
    mobilePanelOptions,
    showJsonPanel,
    showLeftPanel,
    showCenterPanel,
    showRightPanel,
    showEditorPanel,
  } = useGhostWriterLayout({ hasEditorPanel });
  const {
    handleDocumentPanelDrop,
    handleDocumentPanelFile,
    handleCreateBlankDocument,
    handleRefreshStats,
    handleRetrieveSelectedText,
    handleSelectAllContent,
    handleTriggerSave,
    getEditorApi,
    handleAppendHistoryToEditor,
    handleRunMacro2ManualNumbering,
    handleEditorControlApiReady,
    handleRunMacro1Highlight,
    handleClearMacro1Highlight,
    handleEditorContentChange,
    handleExportDocx,
    handleCloseEditorWithPrompt,
  } = useGhostWriterDocument({
    ...documentState,
    setActionText,
    setIsLoading,
    setParameterPanelTarget,
    responses,
    toast,
    requestDownloadBeforeClose,
  });

  const stats = useTextStats(
    documentText || actionText,
    statsKey,
    documentPageCount,
    documentParagraphCount,
    documentWordCount,
    documentSymbolCount,
    documentSymbolWithSpacesCount,
  );
  const {
    aiActionsLlmConfigRef,
    openAiReady,
    backendNotReadyMessage,
    handleToggleChatSourcesPanel,
    aiActionVectorStoreOptions,
    selectedChatSourceLabel,
    addResponse,
    executeLLMWithLog,
    executeAiActionsLLMWithLog,
    handleCleanLlmConversation,
    handleUploadSourceFiles,
    handleRemoveUploadedChatFile,
    handleAction,
    handleOpenAiActionParameters: baseHandleOpenAiActionParameters,
    handleOpenAiCommandPanel: baseHandleOpenAiCommandPanel,
    handleChat,
  } = useGhostWriterLlm({
    ...llmState,
    documentText,
    currentFileId,
    setParameterPanelTarget,
    isMobileView,
    setActiveMobilePanel,
    getEditorApi,
    toast,
  });
  const {
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
  } = useGhostWriterApps({
    ...appState,
    actionText,
    setActionText,
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
    miniArlindoTextWindow,
    setIsLoading,
    setIsOpeningDocument,
    setCurrentFileId,
    setCurrentFileName,
    setCurrentFileConvertedFromPdf,
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
  });

  const handleOpenVerbetografiaTableWithPrompt = useCallback(async () => {
    if (currentFileId) {
      const shouldDownloadCurrentEditorText = await requestSystemConfirmation({
        title: "Abrir tabela",
        description: "Deseja baixar o texto atual do editor HTML antes de abrir a tabela? O conteúdo atual será substituído.",
      });
      if (shouldDownloadCurrentEditorText) {
        await handleExportDocx();
      }
    }
    await handleOpenVerbetografiaTable();
  }, [currentFileId, handleExportDocx, handleOpenVerbetografiaTable, requestSystemConfirmation]);

  const handleImportSelectedTextToLexicalCitation = useCallback(async () => {
    const editorApi = await getEditorApi();
    if (!editorApi) {
      toast.error("API do editor indisponivel no momento.");
      return;
    }
    try {
      const selected = (await editorApi.getSelectedText()).trim();
      if (!selected) throw new Error("Nenhum texto selecionado no editor.");
      setLexicalCitationText(selected);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao obter selecao.");
    }
  }, [getEditorApi, setLexicalCitationText, toast]);

  const handleToggleLexicalOverviewSource = useCallback((id: string, checked: boolean) => {
    setSelectedLexicalOverviewSourceIds((prev) => checked ? [...new Set([...prev, id])] : prev.filter((value) => value !== id));
  }, [setSelectedLexicalOverviewSourceIds]);

  const handleToggleSemanticOverviewSource = useCallback((id: string, checked: boolean) => {
    setSelectedSemanticOverviewSourceIds((prev) => checked ? [...new Set([...prev, id])] : prev.filter((value) => value !== id));
  }, [setSelectedSemanticOverviewSourceIds]);

  const handleImportSelectedTextToCurrentInput = useCallback(async () => {
    const editorApi = await getEditorApi();
    if (!editorApi) {
      toast.error("API do editor indisponivel no momento.");
      return;
    }

    try {
      const selected = (await editorApi.getSelectedText()).trim();
      if (!selected) throw new Error("Nenhum texto selecionado no editor.");

      if (!parameterPanelTarget) {
        toast.error("Nenhuma caixa de entrada esta aberta no momento.");
        return;
      }

      const semanticTargetId = resolveSemanticActionId(parameterPanelTarget.id);

      switch (parameterPanelTarget.section) {
        case "actions":
        case "rewriting":
        case "translation":
        case "customized_prompts":
          setActionText(selected);
          return;
        case "lexical_search":
        case "semantic_search":
        case "bibliografia":
        case "secoes_verbete":
        case "tabela_verbete":
          switch (semanticTargetId) {
            case "busca_livros":
            case "lexical_overview":
              setLexicalTerm(selected);
              return;
            case "localiza_trechos":
              setLexicalCitationText(selected);
              return;
            case "busca_semantica":
            case "semantic_overview":
              setSemanticSearchQuery(selected);
              setSemanticOverviewTerm(selected);
              return;
            case "busca_verbetes":
              setVerbeteSearchText(selected);
              return;
            case "biblio_verbetes":
              setVerbeteInput(selected);
              return;
            default:
              toast.error("A tela atual nao possui uma caixa de entrada de texto compativel com a importacao.");
              return;
          }
        case "document":
          if (semanticTargetId === "macro1") {
            setMacro1Term(selected);
            return;
          }
          toast.error("A tela atual nao possui uma caixa de entrada de texto compativel com a importacao.");
          return;
        default:
          toast.error("A tela atual nao possui uma caixa de entrada de texto compativel com a importacao.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao obter selecao.");
    }
  }, [
    getEditorApi,
    parameterPanelTarget,
    setActionText,
    setLexicalCitationText,
    setLexicalTerm,
    setMacro1Term,
    setSemanticOverviewTerm,
    setSemanticSearchQuery,
    setVerbeteInput,
    setVerbeteSearchText,
    toast,
  ]);

  const focusMobilePanel = useCallback((panel: MobilePanelId) => {
    if (!isMobileView) return;
    setActiveMobilePanel(panel);
  }, [isMobileView, setActiveMobilePanel]);

  const handleOpenParameterSection = useCallback((section: ParameterPanelSection) => {
    setParameterPanelTarget({ section, id: null });
    focusMobilePanel("center");
  }, [focusMobilePanel, setParameterPanelTarget]);

  const handleOpenAiActionParameters = useCallback((type: AiActionId) => {
    baseHandleOpenAiActionParameters(type);
    focusMobilePanel("center");
  }, [baseHandleOpenAiActionParameters, focusMobilePanel]);

  const handleOpenAiCommandPanel = useCallback(() => {
    baseHandleOpenAiCommandPanel();
    focusMobilePanel("center");
  }, [baseHandleOpenAiCommandPanel, focusMobilePanel]);

  const handleToggleBookSource = useCallback((id: string, checked: boolean) => {
    setSelectedBookSourceIds((prev) => {
      if (checked) {
        if (id === NO_VECTOR_STORE_ID) return [NO_VECTOR_STORE_ID];
        return normalizeIdList([...prev.filter((value) => value !== NO_VECTOR_STORE_ID), id]);
      }

      return prev.filter((value) => value !== id);
    });
  }, [setSelectedBookSourceIds]);

  const handleToggleTermsConceptsConscienciografia = useCallback(() => {
    setIsTermsConceptsConscienciografiaEnabled((prev) => {
      const next = !prev;
      const wvBooksId = VECTOR_STORES_SOURCE.find((item) => item.label === "WVBooks")?.id ?? "";
      const translateRagId = LLM_VECTOR_STORE_TRANSLATE_RAG.trim();
      const nextVectorStoreIds =
        !next ? [NO_VECTOR_STORE_ID]
        : parameterPanelTarget?.section === "translation" && parameterPanelTarget.id === "translate"
          ? (translateRagId ? [translateRagId] : [])
          : (wvBooksId ? [wvBooksId] : []);
      setAiActionsSelectedVectorStoreIds(nextVectorStoreIds);
      return next;
    });
  }, [parameterPanelTarget, setAiActionsSelectedVectorStoreIds, setIsTermsConceptsConscienciografiaEnabled]);

  const handleSemanticUseRagContextChange = useCallback((value: boolean) => {
    setSemanticUseRagContext((prev) => {
      if (!prev && value && DEFAULT_BOOK_SOURCE_ID) {
        setAiActionsSelectedVectorStoreIds([DEFAULT_BOOK_SOURCE_ID]);
      }
      return value;
    });
  }, [setAiActionsSelectedVectorStoreIds, setSemanticUseRagContext]);

  const handleSemanticMinScoreChange = useCallback((value: number | null) => {
    setSemanticMinScoreMode("manual");
    setSemanticMinScore(value);
  }, [setSemanticMinScore, setSemanticMinScoreMode]);

  const handleSemanticMinScoreDefaultChange = useCallback((value: number | null) => {
    setSemanticMinScoreMode("auto");
    setSemanticMinScore(value);
  }, [setSemanticMinScore, setSemanticMinScoreMode]);

  const handleResetAllConfig = useCallback(() => {
    window.localStorage.removeItem(LLM_SETTINGS_STORAGE_KEY);
    window.localStorage.removeItem(AI_ACTIONS_LLM_SETTINGS_STORAGE_KEY);
    window.localStorage.removeItem(BIBLIO_EXTERNA_LLM_SETTINGS_STORAGE_KEY);
    window.localStorage.removeItem(GENERAL_SETTINGS_STORAGE_KEY);

    setLlmModel(CHAT_MODEL);
    setLlmTemperature(CHAT_TEMPERATURE);
    setLlmMaxOutputTokens(CHAT_MAX_OUTPUT_TOKENS ?? 1000);
    setLlmMaxNumResults(CHAT_MAX_NUM_RESULTS);
    setLlmEditorContextMaxChars(CHAT_EDITOR_CONTEXT_MAX_CHARS);
    setLlmVerbosity(CHAT_GPT5_VERBOSITY);
    setLlmEffort(CHAT_GPT5_EFFORT);
    setLlmSystemPrompt(CHAT_SYSTEM_PROMPT);

    setAiActionsLlmModel(CHAT_MODEL);
    setAiActionsLlmTemperature(CHAT_TEMPERATURE);
    setAiActionsLlmMaxOutputTokens(CHAT_MAX_OUTPUT_TOKENS ?? 1000);
    setAiActionsLlmVerbosity(CHAT_GPT5_VERBOSITY);
    setAiActionsLlmEffort(CHAT_GPT5_EFFORT);
    setAiActionsLlmSystemPrompt(CHAT_SYSTEM_PROMPT);
    setAiActionSystemPrompts({ ...DEFAULT_ACTION_SYSTEM_PROMPTS });
    setAiActionsSelectedVectorStoreIds([]);
    setAiActionsSelectedInputFileIds([]);
    setIsTermsConceptsConscienciografiaEnabled(false);
    setRewritePromptType("correction");

    setBiblioExternaLlmModel(CHAT_MODEL);
    setBiblioExternaLlmTemperature(0);
    setBiblioExternaLlmMaxOutputTokens(1000);
    setBiblioExternaLlmVerbosity("low");
    setBiblioExternaLlmEffort("none");
    setBiblioExternaLlmSystemPrompt(BIBLIO_EXTERNA_DEFAULT_SYSTEM_PROMPT);

    setEnableHistoryNumbering(true);
    setEnableHistoryReferences(false);
    setEnableHistoryMetadata(false);
    setEnableHistoryHighlight(true);
    setMiniArlindoTextWindow(DEFAULT_MINI_ARLINDO_TEXT_WINDOW);
    setMaxResultsDocx(DEFAULT_MAX_RESULTS_DOCX);
    setSelectedBookSourceIds(DEFAULT_BOOK_SOURCE_ID ? [DEFAULT_BOOK_SOURCE_ID] : []);
    setIncludeEditorContextInLlm(false);

    toast.success("Config parameters reset to defaults.");
  }, [setAiActionSystemPrompts, setAiActionsLlmEffort, setAiActionsLlmMaxOutputTokens, setAiActionsLlmModel, setAiActionsLlmSystemPrompt, setAiActionsLlmTemperature, setAiActionsLlmVerbosity, setAiActionsSelectedInputFileIds, setAiActionsSelectedVectorStoreIds, setBiblioExternaLlmEffort, setBiblioExternaLlmMaxOutputTokens, setBiblioExternaLlmModel, setBiblioExternaLlmSystemPrompt, setBiblioExternaLlmTemperature, setBiblioExternaLlmVerbosity, setEnableHistoryHighlight, setEnableHistoryMetadata, setEnableHistoryNumbering, setEnableHistoryReferences, setIncludeEditorContextInLlm, setIsTermsConceptsConscienciografiaEnabled, setLlmEditorContextMaxChars, setLlmEffort, setLlmMaxNumResults, setLlmMaxOutputTokens, setLlmModel, setLlmSystemPrompt, setLlmTemperature, setLlmVerbosity, setMaxResultsDocx, setMiniArlindoTextWindow, setRewritePromptType, setSelectedBookSourceIds, toast]);

  const handleActionMacros = useCallback(async (type: MacroActionId) => {
    setParameterPanelTarget((prev) => {
      if (prev?.section === "document" && prev.id === type) {
        return { section: "document", id: null };
      }
      return { section: "document", id: type };
    });
    if (type === "macro1") {
      const input = actionText.trim();
      if (!macro1Term.trim() && input) setMacro1Term(input);
    }
    focusMobilePanel("center");
  }, [actionText, focusMobilePanel, macro1Term, setMacro1Term, setParameterPanelTarget]);

  const isHistoryProcessing =
    isLoading || isRunningInsertRefBook || isRunningInsertRefVerbete || isRunningBiblioGeral || isRunningBiblioExterna || isRunningLexicalSearch || isRunningLexicalOverview || isRunningSemanticSearch || isRunningSemanticOverview || isRunningVerbeteSearch || isRunningVerbetografiaOpenTable || isRunningVerbetografiaOpenTableWord || isRunningVerbeteDefinologia || isRunningVerbeteFraseEnfatica || isRunningVerbeteSinonimologia || isRunningVerbeteFatologia;
  const parameterPanelHeaderMeta = parameterPanelTarget
    ? getParameterPanelHeaderMeta(parameterPanelTarget)
    : null;
  const lastHistoryResponseIdRef = useRef<string | null>(null);

  useEffect(() => {
    const element = layoutContainerRef.current;
    if (!element) return;

    const updateWidth = () => {
      const nextWidth = Math.max(1, Math.round(element.clientWidth));
      setDesktopContainerWidthPx(nextWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const latestResponseId = responses[0]?.id ?? null;
    if (!latestResponseId) {
      lastHistoryResponseIdRef.current = null;
      return;
    }
    if (latestResponseId !== lastHistoryResponseIdRef.current) {
      lastHistoryResponseIdRef.current = latestResponseId;
      focusMobilePanel("right");
    }
  }, [focusMobilePanel, responses]);

  const resizeDesktopFixedPanel = useCallback((panel: DesktopResizablePanelKey, deltaPx: number) => {
    setDesktopFixedPanelWidthsPx((prev) => ({
      ...prev,
      [panel]: clampToMin(prev[panel] + deltaPx, DESKTOP_PANEL_SIZES_PX[panel].min),
    }));
  }, []);

  const desktopRightWidthPx = useMemo(() => {
    if (desktopContainerWidthPx === null) return DESKTOP_PANEL_SIZES_PX.right.min;

    return getRightPanelWidthPx({
      containerWidthPx: desktopContainerWidthPx,
      leftWidthPx: desktopFixedPanelWidthsPx.left,
      parameterWidthPx: desktopFixedPanelWidthsPx.parameter,
      editorWidthPx: desktopFixedPanelWidthsPx.editor,
      jsonWidthPx: desktopFixedPanelWidthsPx.json,
      hasCenterPanel,
      hasEditorPanel,
      hasJsonPanel,
      rightMinPx: DESKTOP_PANEL_SIZES_PX.right.min,
    });
  }, [desktopContainerWidthPx, desktopFixedPanelWidthsPx, hasCenterPanel, hasEditorPanel, hasJsonPanel]);

  const desktopMinimumContentWidthPx = useMemo(() => getDesktopMinimumContentWidthPx({
    leftWidthPx: desktopFixedPanelWidthsPx.left,
    parameterWidthPx: desktopFixedPanelWidthsPx.parameter,
    editorWidthPx: desktopFixedPanelWidthsPx.editor,
    jsonWidthPx: desktopFixedPanelWidthsPx.json,
    hasCenterPanel,
    hasEditorPanel,
    hasJsonPanel,
    rightMinPx: DESKTOP_PANEL_SIZES_PX.right.min,
  }), [desktopFixedPanelWidthsPx, hasCenterPanel, hasEditorPanel, hasJsonPanel]);
  const {
    llmLogFontStyle,
    latestLlmMeta,
    latestInputTokens,
    latestCachedInputTokens,
    latestOutputTokens,
    latestTotalTokens,
    latestReasoningTokens,
    latestRagReferences,
    latestRagReferencesAllCalls,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    totalTokens,
    reasoningTokens,
    successfulCallsCount,
    errorCallsCount,
    effectiveModel,
    estimatedUsd,
    estimatedBrl,
    latestEstimatedUsd,
    latestEstimatedBrl,
  } = useGhostWriterLlmLogs({
    llmLogs,
    llmSessionLogs,
    llmModel,
    llmLogFontScale,
  });

  const leftPanelElement = (
    <LeftPanel
      onOpenParameterSection={handleOpenParameterSection}
      onOpenLogsPanel={(tab) => {
        setActiveConfigPanel(null);
        setActiveLogPanel((prev) => (prev === tab ? null : tab));
        focusMobilePanel("json");
      }}
      isLogsPanelOpen={Boolean(activeLogPanel)}
      activeLogsTab={activeLogPanel ?? lastActiveLogPanel}
      onOpenConfigsPanel={(tab) => {
        setActiveLogPanel(null);
        setActiveConfigPanel((prev) => (prev === tab ? null : tab));
        focusMobilePanel("json");
      }}
      isConfigsPanelOpen={Boolean(activeConfigPanel)}
      activeConfigsTab={activeConfigPanel ?? lastActiveConfigPanel}
      isLoading={isLoading}
    />
  );

  const parameterPanelElement = parameterPanelTarget ? (
    <ParameterPanel
      title={parameterPanelHeaderMeta?.title ?? "Parameters"}
      description={parameterPanelHeaderMeta?.description}
      onClose={() => setParameterPanelTarget(null)}
    >
      <ParameterPanelContent
        parameterPanelTarget={parameterPanelTarget}
        isLoading={isLoading}
        isTermsConceptsConscienciografiaEnabled={isTermsConceptsConscienciografiaEnabled}
        isUploadingChatFiles={isUploadingChatFiles}
        currentFileId={currentFileId}
        selectedImportFileName={selectedImportFileName}
        fileInputRef={fileInputRef}
        stats={stats}
        isOpeningDocument={isOpeningDocument}
        isImportingDocument={isImportingDocument}
        macro1Term={macro1Term}
        macro1ColorId={macro1ColorId}
        macro1PredictedMatches={macro1PredictedMatches}
        isCountingMacro1Matches={isCountingMacro1Matches}
        macro2SpacingMode={macro2SpacingMode}
        selectedBookSourceIds={selectedBookSourceIds}
        selectedChatSourceLabel={selectedChatSourceLabel}
        uploadedChatFiles={uploadedChatFiles}
        llmModel={llmModel}
        llmTemperature={llmTemperature}
        llmMaxOutputTokens={llmMaxOutputTokens}
        llmMaxNumResults={llmMaxNumResults}
        llmEditorContextMaxChars={llmEditorContextMaxChars}
        llmVerbosity={llmVerbosity}
        llmEffort={llmEffort}
        llmSystemPrompt={llmSystemPrompt}
        actionText={actionText}
        aiCommandQuery={aiCommandQuery}
        translateLanguage={translateLanguage}
        rewritePromptType={rewritePromptType}
        aiActionsSelectedVectorStoreIds={aiActionsSelectedVectorStoreIds}
        aiActionVectorStoreOptions={aiActionVectorStoreOptions}
        selectedRefBook={selectedRefBook}
        refBookMode={refBookMode}
        refBookPages={refBookPages}
        isRunningInsertRefBook={isRunningInsertRefBook}
        verbeteInput={verbeteInput}
        isRunningInsertRefVerbete={isRunningInsertRefVerbete}
        biblioGeralAuthor={biblioGeralAuthor}
        biblioGeralTitle={biblioGeralTitle}
        biblioGeralYear={biblioGeralYear}
        biblioGeralExtra={biblioGeralExtra}
        isRunningBiblioGeral={isRunningBiblioGeral}
        biblioExternaAuthor={biblioExternaAuthor}
        biblioExternaTitle={biblioExternaTitle}
        biblioExternaYear={biblioExternaYear}
        biblioExternaJournal={biblioExternaJournal}
        biblioExternaPublisher={biblioExternaPublisher}
        biblioExternaIdentifier={biblioExternaIdentifier}
        biblioExternaExtra={biblioExternaExtra}
        biblioExternaFreeText={biblioExternaFreeText}
        isRunningBiblioExterna={isRunningBiblioExterna}
        lexicalBooks={lexicalBooks}
        selectedLexicalBook={selectedLexicalBook}
        lexicalTerm={lexicalTerm}
        lexicalCitationText={lexicalCitationText}
        lexicalMaxResults={lexicalMaxResults}
        selectedLexicalOverviewSourceIds={selectedLexicalOverviewSourceIds}
        isRunningLexicalSearch={isRunningLexicalSearch}
        isRunningLexicalCitationLookup={isRunningLexicalCitationLookup}
        isRunningLexicalOverview={isRunningLexicalOverview}
        selectedSemanticSearchIndexId={selectedSemanticSearchIndexId}
        semanticSearchIndexes={semanticSearchIndexes}
        isLoadingSemanticSearchIndexes={isLoadingSemanticSearchIndexes}
        semanticSearchQuery={semanticSearchQuery}
        semanticSearchMaxResults={semanticSearchMaxResults}
        semanticMinScore={semanticMinScore}
        semanticMinScoreMode={semanticMinScoreMode}
        semanticUseRagContext={semanticUseRagContext}
        semanticExcludeLexicalDuplicates={semanticExcludeLexicalDuplicates}
        semanticOverviewLastRagContext={semanticOverviewLastRagContext}
        isRunningSemanticSearch={isRunningSemanticSearch}
        semanticOverviewTerm={semanticOverviewTerm}
        semanticOverviewMaxResults={semanticOverviewMaxResults}
        selectedSemanticOverviewSourceIds={selectedSemanticOverviewSourceIds}
        isRunningSemanticOverview={isRunningSemanticOverview}
        verbeteSearchAuthor={verbeteSearchAuthor}
        verbeteSearchTitle={verbeteSearchTitle}
        verbeteSearchArea={verbeteSearchArea}
        verbeteSearchText={verbeteSearchText}
        verbeteSearchMaxResults={verbeteSearchMaxResults}
        isRunningVerbeteSearch={isRunningVerbeteSearch}
        verbetografiaTitle={verbetografiaTitle}
        verbetografiaSpecialty={verbetografiaSpecialty}
        includeEditorContextInLlm={includeEditorContextInLlm}
        isRunningVerbetografiaOpenTable={isRunningVerbetografiaOpenTable}
        isRunningVerbetografiaOpenTableWord={isRunningVerbetografiaOpenTableWord}
        isRunningVerbeteDefinologia={isRunningVerbeteDefinologia}
        isRunningVerbeteFraseEnfatica={isRunningVerbeteFraseEnfatica}
        isRunningVerbeteSinonimologia={isRunningVerbeteSinonimologia}
        isRunningVerbeteFatologia={isRunningVerbeteFatologia}
        onToggleAiActionsConfig={() => {
          setActiveLogPanel(null);
          setActiveConfigPanel("ia");
          focusMobilePanel("json");
        }}
        onToggleTermsConceptsConscienciografia={handleToggleTermsConceptsConscienciografia}
        onCreateBlankDocument={handleCreateBlankDocument}
        onDocumentPanelFile={handleDocumentPanelFile}
        onDocumentPanelDrop={handleDocumentPanelDrop}
        onClearSelectedImportFileName={() => setSelectedImportFileName("")}
        onRefreshStats={handleRefreshStats}
        onOpenMacro={handleActionMacros}
        onMacro1TermChange={setMacro1Term}
        onMacro1ColorChange={setMacro1ColorId}
        onRunMacro1Highlight={handleRunMacro1Highlight}
        onClearMacro1Highlight={handleClearMacro1Highlight}
        onMacro2SpacingModeChange={setMacro2SpacingMode}
        onRunMacro2ManualNumbering={handleRunMacro2ManualNumbering}
        onToggleBookSource={handleToggleBookSource}
        onRemoveUploadedChatFile={handleRemoveUploadedChatFile}
        onLlmModelChange={setLlmModel}
        onLlmTemperatureChange={setLlmTemperature}
        onLlmMaxOutputTokensChange={setLlmMaxOutputTokens}
        onLlmMaxNumResultsChange={setLlmMaxNumResults}
        onLlmEditorContextMaxCharsChange={setLlmEditorContextMaxChars}
        onLlmVerbosityChange={setLlmVerbosity}
        onLlmEffortChange={setLlmEffort}
        onLlmSystemPromptChange={setLlmSystemPrompt}
        onResetAllConfig={handleResetAllConfig}
        onRunRandomPensata={handleRunRandomPensata}
        onOpenAiActionParameters={handleOpenAiActionParameters}
        onActionTextChange={setActionText}
        onAiCommandQueryChange={setAiCommandQuery}
        onTranslateLanguageChange={setTranslateLanguage}
        onRewritePromptTypeChange={setRewritePromptType}
        onRetrieveSelectedText={handleRetrieveSelectedText}
        onApplyAction={handleAction}
        onToggleIncludeEditorContextInLlm={() => {
          if (!currentFileId) return;
          setIncludeEditorContextInLlm((prev) => !prev);
        }}
        onUploadSourceFiles={handleUploadSourceFiles}
        onSelectRefBook={handleSelectRefBook}
        onRefBookModeChange={setRefBookMode}
        onRefBookPagesChange={setRefBookPages}
        onRunInsertRefBook={handleRunInsertRefBook}
        onVerbeteInputChange={setVerbeteInput}
        onRunInsertRefVerbete={handleRunInsertRefVerbete}
        onBiblioGeralAuthorChange={setBiblioGeralAuthor}
        onBiblioGeralTitleChange={setBiblioGeralTitle}
        onBiblioGeralYearChange={setBiblioGeralYear}
        onBiblioGeralExtraChange={setBiblioGeralExtra}
        onRunBiblioGeral={handleRunBiblioGeral}
        onBiblioExternaAuthorChange={setBiblioExternaAuthor}
        onBiblioExternaTitleChange={setBiblioExternaTitle}
        onBiblioExternaYearChange={setBiblioExternaYear}
        onBiblioExternaJournalChange={setBiblioExternaJournal}
        onBiblioExternaPublisherChange={setBiblioExternaPublisher}
        onBiblioExternaIdentifierChange={setBiblioExternaIdentifier}
        onBiblioExternaExtraChange={setBiblioExternaExtra}
        onBiblioExternaFreeTextChange={setBiblioExternaFreeText}
        onRunBiblioExterna={handleRunBiblioExterna}
        onToggleBiblioExternaConfig={() => {
          setActiveLogPanel(null);
          setActiveConfigPanel("ia");
          focusMobilePanel("json");
        }}
        onSelectedLexicalBookChange={setSelectedLexicalBook}
        onLexicalTermChange={setLexicalTerm}
        onLexicalCitationTextChange={setLexicalCitationText}
        onImportLexicalCitationText={handleImportSelectedTextToLexicalCitation}
        onLexicalMaxResultsChange={setLexicalMaxResults}
        onRunLexicalSearch={handleRunLexicalSearch}
        onRunLexicalCitationLookup={handleRunLexicalCitationLookup}
        onRunLexicalOverview={handleRunLexicalOverview}
        onToggleLexicalOverviewSource={handleToggleLexicalOverviewSource}
        onSelectedSemanticSearchIndexIdChange={setSelectedSemanticSearchIndexId}
        onSemanticSearchQueryChange={setSemanticSearchQuery}
        onSemanticSearchMaxResultsChange={setSemanticSearchMaxResults}
        onSemanticMinScoreChange={handleSemanticMinScoreChange}
        onSemanticMinScoreDefaultChange={handleSemanticMinScoreDefaultChange}
        onSemanticUseRagContextChange={handleSemanticUseRagContextChange}
        onSemanticExcludeLexicalDuplicatesChange={setSemanticExcludeLexicalDuplicates}
        onRunSemanticSearch={handleRunSemanticSearch}
        onSemanticOverviewTermChange={setSemanticOverviewTerm}
        onSemanticOverviewMaxResultsChange={setSemanticOverviewMaxResults}
        onRunSemanticOverview={handleRunSemanticOverview}
        onToggleSemanticOverviewSource={handleToggleSemanticOverviewSource}
        onVerbeteSearchAuthorChange={setVerbeteSearchAuthor}
        onVerbeteSearchTitleChange={setVerbeteSearchTitle}
        onVerbeteSearchAreaChange={setVerbeteSearchArea}
        onVerbeteSearchTextChange={setVerbeteSearchText}
        onVerbeteSearchMaxResultsChange={setVerbeteSearchMaxResults}
        onRunVerbeteSearch={handleRunVerbeteSearch}
        onRunVerbetografiaOpenTable={handleOpenVerbetografiaTableWithPrompt}
        onRunVerbetografiaOpenTableWord={handleOpenVerbetografiaTableWord}
        onRunVerbeteDefinologia={handleRunVerbeteDefinologia}
        onRunVerbeteFraseEnfatica={handleRunVerbeteFraseEnfatica}
        onRunVerbeteSinonimologia={handleRunVerbeteSinonimologia}
        onRunVerbeteFatologia={handleRunVerbeteFatologia}
        onSelectVerbetografiaAction={handleSelectVerbetografiaAction}
        onRunAppAction={handleActionApps}
        onVerbetografiaTitleChange={setVerbetografiaTitle}
        onVerbetografiaSpecialtyChange={setVerbetografiaSpecialty}
      />
    </ParameterPanel>
  ) : null;

  const rightPanelElement = (
    <RightPanel
      responses={responses}
      enableHistoryNumbering={enableHistoryNumbering}
      enableHistoryReferences={enableHistoryReferences}
      enableHistoryMetadata={enableHistoryMetadata}
      enableHistoryHighlight={enableHistoryHighlight}
      onToggleHistoryNumbering={() => setEnableHistoryNumbering((prev) => !prev)}
      onToggleHistoryReferences={() => setEnableHistoryReferences((prev) => !prev)}
      onToggleHistoryMetadata={() => setEnableHistoryMetadata((prev) => !prev)}
      onToggleHistoryHighlight={() => setEnableHistoryHighlight((prev) => !prev)}
      onClear={() => setResponses([])}
      onSendMessage={(message) => void handleChat(message)}
      onCleanConversation={handleCleanLlmConversation}
      onToggleChatConfig={() => {
        setActiveLogPanel(null);
        setActiveConfigPanel((prev) => (prev === "sources" ? null : "sources"));
        focusMobilePanel("json");
      }}
      isChatConfigOpen={isChatConfigOpen}
      onAppendToEditor={(html) => void handleAppendHistoryToEditor(html)}
      onNotify={showHistoryNotice}
      showAppendToEditor={Boolean(currentFileId)}
      isSending={isHistoryProcessing}
      historyNotice={historyNotice}
      includeEditorContextInLlm={includeEditorContextInLlm}
      canToggleIncludeEditorContextInLlm={Boolean(currentFileId)}
      maxResultsDocx={maxResultsDocx}
      onToggleIncludeEditorContextInLlm={() => {
        if (!currentFileId) return;
        setIncludeEditorContextInLlm((prev) => !prev);
      }}
      chatDisabled={!openAiReady}
      chatDisabledReason={backendStatus === "unavailable"
        ? "Backend indisponivel em http://localhost:8787."
        : backendStatus === "missing_openai_key"
          ? "Backend sem OPENAI_API_KEY."
          : backendStatus === "checking"
            ? "Verificando backend..."
            : undefined}
    />
  );

  const jsonPanelElement = (
    activeLogPanel ? (
      <LogsPanel
        activeTab={activeLogPanel ?? lastActiveLogPanel}
        onTabChange={setActiveLogPanel}
        onClose={() => setActiveLogPanel(null)}
        shouldPollSearch={isRunningSemanticSearch || isRunningSemanticOverview || isRunningLexicalOverview}
        activeSearchType={isRunningSemanticSearch ? "semantic_search" : isRunningSemanticOverview ? "semantic_overview" : isRunningLexicalOverview ? "lexical_overview" : null}
        llmLogs={llmLogs}
        llmSessionLogs={llmSessionLogs}
        llmLogFontScale={llmLogFontScale}
        llmLogFontStyle={llmLogFontStyle}
        llmLogFontDefault={LLM_LOG_FONT_DEFAULT}
        llmLogFontMin={LLM_LOG_FONT_MIN}
        llmLogFontMax={LLM_LOG_FONT_MAX}
        onDecreaseFont={() => setLlmLogFontScale((prev) => Math.max(LLM_LOG_FONT_MIN, Number((prev - LLM_LOG_FONT_STEP).toFixed(2))))}
        onIncreaseFont={() => setLlmLogFontScale((prev) => Math.min(LLM_LOG_FONT_MAX, Number((prev + LLM_LOG_FONT_STEP).toFixed(2))))}
        onResetFont={() => setLlmLogFontScale(LLM_LOG_FONT_DEFAULT)}
        onClearLogs={() => {
          setLlmLogs([]);
          setLlmSessionLogs([]);
        }}
        effectiveModel={effectiveModel}
        latestLlmMeta={latestLlmMeta}
        latestInputTokens={latestInputTokens}
        latestCachedInputTokens={latestCachedInputTokens}
        latestOutputTokens={latestOutputTokens}
        latestTotalTokens={latestTotalTokens}
        latestReasoningTokens={latestReasoningTokens}
        latestRagReferences={latestRagReferences}
        latestEstimatedBrl={latestEstimatedBrl}
        latestEstimatedUsd={latestEstimatedUsd}
        inputTokens={inputTokens}
        cachedInputTokens={cachedInputTokens}
        outputTokens={outputTokens}
        totalTokens={totalTokens}
        reasoningTokens={reasoningTokens}
        latestRagReferencesAllCalls={latestRagReferencesAllCalls}
        estimatedBrl={estimatedBrl}
        estimatedUsd={estimatedUsd}
        successfulCallsCount={successfulCallsCount}
        errorCallsCount={errorCallsCount}
      />
    ) : activeConfigPanel ? (
      <ConfigsPanel
        activeTab={activeConfigPanel ?? lastActiveConfigPanel}
        onTabChange={setActiveConfigPanel}
        onClose={() => setActiveConfigPanel(null)}
        parameterPanelTarget={parameterPanelTarget}
        selectedBookSourceIds={selectedBookSourceIds}
        selectedChatSourceLabel={selectedChatSourceLabel}
        uploadedChatFiles={uploadedChatFiles}
        isUploadingChatFiles={isUploadingChatFiles}
        llmModel={llmModel}
        llmTemperature={llmTemperature}
        llmMaxOutputTokens={llmMaxOutputTokens}
        llmMaxNumResults={llmMaxNumResults}
        llmEditorContextMaxChars={llmEditorContextMaxChars}
        llmVerbosity={llmVerbosity}
        llmEffort={llmEffort}
        llmSystemPrompt={llmSystemPrompt}
        includeEditorContextInLlm={includeEditorContextInLlm}
        currentFileId={currentFileId}
        aiActionsLlmModel={aiActionsLlmModel}
        aiActionsLlmTemperature={aiActionsLlmTemperature}
        aiActionsLlmMaxOutputTokens={aiActionsLlmMaxOutputTokens}
        aiActionsLlmVerbosity={aiActionsLlmVerbosity}
        aiActionsLlmEffort={aiActionsLlmEffort}
        aiActionSystemPrompts={aiActionSystemPrompts}
        aiActionsSelectedVectorStoreId={aiActionsSelectedVectorStoreIds[0] ?? ""}
        aiActionVectorStoreOptions={aiActionVectorStoreOptions}
        biblioExternaLlmModel={biblioExternaLlmModel}
        biblioExternaLlmTemperature={biblioExternaLlmTemperature}
        biblioExternaLlmMaxOutputTokens={biblioExternaLlmMaxOutputTokens}
        biblioExternaLlmVerbosity={biblioExternaLlmVerbosity}
        biblioExternaLlmEffort={biblioExternaLlmEffort}
        biblioExternaLlmSystemPrompt={biblioExternaLlmSystemPrompt}
        isTermsConceptsConscienciografiaEnabled={isTermsConceptsConscienciografiaEnabled}
        miniArlindoTextWindow={miniArlindoTextWindow}
        maxResultsDocx={maxResultsDocx}
        onToggleBookSource={handleToggleBookSource}
        onRemoveUploadedChatFile={handleRemoveUploadedChatFile}
        onLlmModelChange={setLlmModel}
        onLlmTemperatureChange={setLlmTemperature}
        onLlmMaxOutputTokensChange={setLlmMaxOutputTokens}
        onLlmMaxNumResultsChange={setLlmMaxNumResults}
        onLlmEditorContextMaxCharsChange={setLlmEditorContextMaxChars}
        onLlmVerbosityChange={setLlmVerbosity}
        onLlmEffortChange={setLlmEffort}
        onLlmSystemPromptChange={setLlmSystemPrompt}
        onResetAllConfig={handleResetAllConfig}
        onToggleIncludeEditorContextInLlm={() => {
          if (!currentFileId) return;
          setIncludeEditorContextInLlm((prev) => !prev);
        }}
        onUploadSourceFiles={handleUploadSourceFiles}
        onAiActionsLlmModelChange={setAiActionsLlmModel}
        onAiActionsLlmTemperatureChange={setAiActionsLlmTemperature}
        onAiActionsLlmMaxOutputTokensChange={setAiActionsLlmMaxOutputTokens}
        onAiActionsLlmVerbosityChange={setAiActionsLlmVerbosity}
        onAiActionsLlmEffortChange={setAiActionsLlmEffort}
        onAiActionSystemPromptChange={(actionId, value) => {
          setAiActionSystemPrompts((prev) => ({ ...prev, [actionId]: value }));
        }}
        onAiActionsSelectedVectorStoreIdChange={(value) => {
          setAiActionsSelectedVectorStoreIds(value ? [value] : []);
        }}
        onBiblioExternaLlmModelChange={setBiblioExternaLlmModel}
        onBiblioExternaLlmTemperatureChange={setBiblioExternaLlmTemperature}
        onBiblioExternaLlmMaxOutputTokensChange={setBiblioExternaLlmMaxOutputTokens}
        onBiblioExternaLlmVerbosityChange={setBiblioExternaLlmVerbosity}
        onBiblioExternaLlmEffortChange={setBiblioExternaLlmEffort}
        onBiblioExternaLlmSystemPromptChange={setBiblioExternaLlmSystemPrompt}
        onMiniArlindoTextWindowChange={(value) => {
          setMiniArlindoTextWindow(Number.isFinite(value) ? Math.max(0, Math.min(20, Math.floor(value))) : DEFAULT_MINI_ARLINDO_TEXT_WINDOW);
        }}
        onMaxResultsDocxChange={(value) => {
          setMaxResultsDocx(Number.isFinite(value) ? Math.max(1, Math.min(5000, Math.floor(value))) : DEFAULT_MAX_RESULTS_DOCX);
        }}
      />
    ) : null
  );

  const editorPanelElement = (
    <main className={`relative h-full min-w-0 ${panelsBgClass}`}>
      <HtmlEditor
        contentHtml={editorContentHtml}
        documentVersion={openedDocumentVersion}
        onControlApiReady={handleEditorControlApiReady}
        onContentChange={handleEditorContentChange}
        onExportDocx={() => void handleExportDocx()}
        isExportingDocx={isExportingDocx}
        includeEditorContextInLlm={includeEditorContextInLlm}
        canToggleIncludeEditorContextInLlm={Boolean(currentFileId)}
        onToggleIncludeEditorContextInLlm={() => {
          if (!currentFileId) return;
          setIncludeEditorContextInLlm((prev) => !prev);
        }}
        onImportSelectedText={() => void handleImportSelectedTextToCurrentInput()}
        onCloseEditor={() => void handleCloseEditorWithPrompt()}
      />
      {isOpeningDocument && (
        <div className={`absolute inset-0 z-10 flex items-center justify-center ${panelsBgClass}`}>
          <div className={`inline-flex items-center gap-2 rounded-full border border-border ${cardsBgClass} ${buttonsPrimaryBgClass} px-4 py-2 text-sm font-semibold text-foreground shadow-sm`}>
            <Loader2 className={`h-4 w-4 animate-spin text-primary ${buttonsPrimaryBgClass}`} />
            <span>Abrindo documento...</span>
          </div>
        </div>
      )}
    </main>
  );

  const getPanelStyle = (widthPx: number): CSSProperties => ({
    width: `${widthPx}px`,
    minWidth: `${widthPx}px`,
    flex: "0 0 auto",
  });

  const renderPanelContainer = (children: ReactNode, className: string, style?: CSSProperties) => (
    <div className={`${className} overflow-hidden`} style={style}>
      {children}
    </div>
  );

  return (
    <div ref={layoutContainerRef} className="h-screen w-screen overflow-hidden bg-background">
      {isMobileView ? (
        <div className="flex h-full min-h-0 flex-col">
          <MobilePanelHeader
            activeMobilePanel={activeMobilePanel}
            options={mobilePanelOptions}
            onSelectPanel={(panelId) => {
              setActiveMobilePanel(panelId);
            }}
          />
          <div className="min-h-0 flex-1">
            {showLeftPanel && renderPanelContainer(leftPanelElement, "h-full min-h-0 bg-card")}
            {showCenterPanel && parameterPanelElement && renderPanelContainer(parameterPanelElement, `h-full min-h-0 ${sidePanelClass}`)}
            {showRightPanel && renderPanelContainer(rightPanelElement, `h-full min-h-0 ${sidePanelClass}`)}
            {showEditorPanel && renderPanelContainer(editorPanelElement, "h-full min-h-0")}
            {showJsonPanel && renderPanelContainer(jsonPanelElement, `h-full min-h-0 ${sidePanelClass}`)}
          </div>
        </div>
      ) : desktopContainerWidthPx !== null ? (
        <div className="flex h-full min-h-0 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full min-h-0" style={{ minWidth: `${desktopMinimumContentWidthPx}px` }}>
            {renderPanelContainer(leftPanelElement, "min-h-0 shrink-0 border-r border-border bg-card", getPanelStyle(desktopFixedPanelWidthsPx.left))}
            <DesktopResizeHandle onResizeDelta={(deltaPx) => resizeDesktopFixedPanel("left", deltaPx)} />

            {hasCenterPanel && parameterPanelElement && (
              <>
                {renderPanelContainer(parameterPanelElement, `min-h-0 shrink-0 border-r border-border ${sidePanelClass}`, getPanelStyle(desktopFixedPanelWidthsPx.parameter))}
                <DesktopResizeHandle onResizeDelta={(deltaPx) => resizeDesktopFixedPanel("parameter", deltaPx)} />
              </>
            )}

            {renderPanelContainer(rightPanelElement, `min-h-0 shrink-0 border-l border-border ${sidePanelClass}`, getPanelStyle(desktopRightWidthPx))}

            {hasEditorPanel && (
              <>
                <DesktopResizeHandle onResizeDelta={(deltaPx) => resizeDesktopFixedPanel("editor", -deltaPx)} />
                {renderPanelContainer(editorPanelElement, `min-h-0 shrink-0 ${panelsBgClass}`, getPanelStyle(desktopFixedPanelWidthsPx.editor))}
              </>
            )}

            {hasJsonPanel && (
              <>
                <DesktopResizeHandle onResizeDelta={(deltaPx) => resizeDesktopFixedPanel("json", -deltaPx)} />
                {renderPanelContainer(jsonPanelElement, `min-h-0 shrink-0 border-l border-border ${sidePanelClass}`, getPanelStyle(desktopFixedPanelWidthsPx.json))}
              </>
            )}

            <div className="shrink-0" style={{ width: `${DESKTOP_CONTENT_EDGE_GUTTER_PX}px` }} aria-hidden="true" />

          </div>
        </div>
      ) : null}

    </div>
  );
};

export default Index;
