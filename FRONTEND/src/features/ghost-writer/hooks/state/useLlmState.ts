import { useState } from "react";
import { BIBLIO_EXTERNA_DEFAULT_SYSTEM_PROMPT, CHAT_MAX_OUTPUT_TOKENS, CHAT_MAX_NUM_RESULTS, CHAT_MODEL, CHAT_SYSTEM_PROMPT, CHAT_TEMPERATURE, CHAT_GPT5_VERBOSITY, CHAT_GPT5_EFFORT, type ChatMessage, type UploadedLlmFile } from "@/features/ghost-writer/services/openai";
import type { AIResponse, BackendStatus, RewritePromptType } from "@/features/ghost-writer/types";
import { DEFAULT_ACTION_SYSTEM_PROMPTS, type ActionSystemPromptId } from "@/features/ghost-writer/config/actionSystemPrompts";
import { CHAT_EDITOR_CONTEXT_MAX_CHARS, DEFAULT_LOG_FONT_SIZE_PX, DEFAULT_MAX_RESULTS_DOCX, DEFAULT_MINI_ARLINDO_TEXT_WINDOW } from "@/features/ghost-writer/config/constants";
import { DEFAULT_BOOK_SOURCE_ID, TRANSLATE_LANGUAGE_OPTIONS } from "@/features/ghost-writer/config/options";
export const useGhostWriterLlmState = (llmLogFontDefault: number) => {
  const [responses, setResponses] = useState<AIResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionText, setActionText] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
  const [translateLanguage, setTranslateLanguage] = useState<(typeof TRANSLATE_LANGUAGE_OPTIONS)[number]["value"]>("Ingles");
  const [rewritePromptType, setRewritePromptType] = useState<RewritePromptType>("correction");
  const [aiCommandQuery, setAiCommandQuery] = useState("");
  const [llmModel, setLlmModel] = useState(CHAT_MODEL);
  const [llmTemperature, setLlmTemperature] = useState(CHAT_TEMPERATURE);
  const [llmMaxOutputTokens, setLlmMaxOutputTokens] = useState<number>(CHAT_MAX_OUTPUT_TOKENS ?? 1000);
  const [llmMaxNumResults, setLlmMaxNumResults] = useState<number>(CHAT_MAX_NUM_RESULTS);
  const [llmEditorContextMaxChars, setLlmEditorContextMaxChars] = useState<number>(CHAT_EDITOR_CONTEXT_MAX_CHARS);
  const [llmVerbosity, setLlmVerbosity] = useState(CHAT_GPT5_VERBOSITY ?? "");
  const [llmEffort, setLlmEffort] = useState(CHAT_GPT5_EFFORT ?? "");
  const [llmSystemPrompt, setLlmSystemPrompt] = useState(CHAT_SYSTEM_PROMPT ?? "");
  const [aiActionsLlmModel, setAiActionsLlmModel] = useState(CHAT_MODEL);
  const [aiActionsLlmTemperature, setAiActionsLlmTemperature] = useState(CHAT_TEMPERATURE);
  const [aiActionsLlmMaxOutputTokens, setAiActionsLlmMaxOutputTokens] = useState<number>(CHAT_MAX_OUTPUT_TOKENS ?? 1000);
  const [aiActionsLlmVerbosity, setAiActionsLlmVerbosity] = useState(CHAT_GPT5_VERBOSITY ?? "");
  const [aiActionsLlmEffort, setAiActionsLlmEffort] = useState(CHAT_GPT5_EFFORT ?? "");
  const [aiActionsLlmSystemPrompt, setAiActionsLlmSystemPrompt] = useState(CHAT_SYSTEM_PROMPT ?? "");
  const [aiActionSystemPrompts, setAiActionSystemPrompts] = useState<Partial<Record<ActionSystemPromptId, string>>>({ ...DEFAULT_ACTION_SYSTEM_PROMPTS });
  const [aiActionsSelectedVectorStoreIds, setAiActionsSelectedVectorStoreIds] = useState<string[]>([]);
  const [aiActionsSelectedInputFileIds, setAiActionsSelectedInputFileIds] = useState<string[]>([]);
  const [isTermsConceptsConscienciografiaEnabled, setIsTermsConceptsConscienciografiaEnabled] = useState(false);
  const [biblioExternaLlmModel, setBiblioExternaLlmModel] = useState(CHAT_MODEL);
  const [biblioExternaLlmTemperature, setBiblioExternaLlmTemperature] = useState<number>(0);
  const [biblioExternaLlmMaxOutputTokens, setBiblioExternaLlmMaxOutputTokens] = useState<number>(1000);
  const [biblioExternaLlmVerbosity, setBiblioExternaLlmVerbosity] = useState("low");
  const [biblioExternaLlmEffort, setBiblioExternaLlmEffort] = useState("none");
  const [biblioExternaLlmSystemPrompt, setBiblioExternaLlmSystemPrompt] = useState(BIBLIO_EXTERNA_DEFAULT_SYSTEM_PROMPT);
  const [chatPreviousResponseId, setChatPreviousResponseId] = useState<string | null>(null);
  const [llmLogs, setLlmLogs] = useState<Array<{ id: string; at: string; request: unknown; response?: unknown; error?: string }>>([]);
  const [llmSessionLogs, setLlmSessionLogs] = useState<Array<{ id: string; at: string; request: unknown; response?: unknown; error?: string }>>([]);
  const [llmLogFontScale, setLlmLogFontScale] = useState(llmLogFontDefault);
  const [enableHistoryNumbering, setEnableHistoryNumbering] = useState(true);
  const [enableHistoryReferences, setEnableHistoryReferences] = useState(false);
  const [enableHistoryMetadata, setEnableHistoryMetadata] = useState(false);
  const [enableHistoryHighlight, setEnableHistoryHighlight] = useState(true);
  const [miniArlindoTextWindow, setMiniArlindoTextWindow] = useState(DEFAULT_MINI_ARLINDO_TEXT_WINDOW);
  const [maxResultsDocx, setMaxResultsDocx] = useState(DEFAULT_MAX_RESULTS_DOCX);
  const [selectedBookSourceIds, setSelectedBookSourceIds] = useState<string[]>(() => (DEFAULT_BOOK_SOURCE_ID ? [DEFAULT_BOOK_SOURCE_ID] : []));
  const [uploadedChatFiles, setUploadedChatFiles] = useState<UploadedLlmFile[]>([]);
  const [isUploadingChatFiles, setIsUploadingChatFiles] = useState(false);
  const [includeEditorContextInLlm, setIncludeEditorContextInLlm] = useState(false);

  return {
    responses,
    setResponses,
    isLoading,
    setIsLoading,
    actionText,
    setActionText,
    chatHistory,
    setChatHistory,
    backendStatus,
    setBackendStatus,
    translateLanguage,
    setTranslateLanguage,
    rewritePromptType,
    setRewritePromptType,
    aiCommandQuery,
    setAiCommandQuery,
    llmModel,
    setLlmModel,
    llmTemperature,
    setLlmTemperature,
    llmMaxOutputTokens,
    setLlmMaxOutputTokens,
    llmMaxNumResults,
    setLlmMaxNumResults,
    llmEditorContextMaxChars,
    setLlmEditorContextMaxChars,
    llmVerbosity,
    setLlmVerbosity,
    llmEffort,
    setLlmEffort,
    llmSystemPrompt,
    setLlmSystemPrompt,
    aiActionsLlmModel,
    setAiActionsLlmModel,
    aiActionsLlmTemperature,
    setAiActionsLlmTemperature,
    aiActionsLlmMaxOutputTokens,
    setAiActionsLlmMaxOutputTokens,
    aiActionsLlmVerbosity,
    setAiActionsLlmVerbosity,
    aiActionsLlmEffort,
    setAiActionsLlmEffort,
    aiActionsLlmSystemPrompt,
    setAiActionsLlmSystemPrompt,
    aiActionSystemPrompts,
    setAiActionSystemPrompts,
    aiActionsSelectedVectorStoreIds,
    setAiActionsSelectedVectorStoreIds,
    aiActionsSelectedInputFileIds,
    setAiActionsSelectedInputFileIds,
    isTermsConceptsConscienciografiaEnabled,
    setIsTermsConceptsConscienciografiaEnabled,
    biblioExternaLlmModel,
    setBiblioExternaLlmModel,
    biblioExternaLlmTemperature,
    setBiblioExternaLlmTemperature,
    biblioExternaLlmMaxOutputTokens,
    setBiblioExternaLlmMaxOutputTokens,
    biblioExternaLlmVerbosity,
    setBiblioExternaLlmVerbosity,
    biblioExternaLlmEffort,
    setBiblioExternaLlmEffort,
    biblioExternaLlmSystemPrompt,
    setBiblioExternaLlmSystemPrompt,
    chatPreviousResponseId,
    setChatPreviousResponseId,
    llmLogs,
    setLlmLogs,
    llmSessionLogs,
    setLlmSessionLogs,
    llmLogFontScale,
    setLlmLogFontScale,
    enableHistoryNumbering,
    setEnableHistoryNumbering,
    enableHistoryReferences,
    setEnableHistoryReferences,
    enableHistoryMetadata,
    setEnableHistoryMetadata,
    enableHistoryHighlight,
    setEnableHistoryHighlight,
    miniArlindoTextWindow,
    setMiniArlindoTextWindow,
    maxResultsDocx,
    setMaxResultsDocx,
    selectedBookSourceIds,
    setSelectedBookSourceIds,
    uploadedChatFiles,
    setUploadedChatFiles,
    isUploadingChatFiles,
    setIsUploadingChatFiles,
    includeEditorContextInLlm,
    setIncludeEditorContextInLlm,
  };
};


