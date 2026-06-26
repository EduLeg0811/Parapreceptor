import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { healthCheck } from "@/features/ghost-writer/api/backendApi";
import {
  buildAiCommandPrompt,
  buildAnalogiesPrompt,
  buildAnalogiesConsPrompt,
  buildAntonymsPrompt,
  buildAntonymsConsPrompt,
  buildChatPrompt,
  buildComparisonsPrompt,
  buildComparisonsConsPrompt,
  buildCounterpointsPrompt,
  buildCounterpointsConsPrompt,
  buildDictLookupPrompt,
  buildDictLookupConsPrompt,
  buildDefinePrompt,
  buildDefineConsPrompt,
  buildEtymologyPrompt,
  buildEtymologyConsPrompt,
  buildExamplesPrompt,
  buildExamplesConsPrompt,
  buildEpigraphConsPrompt,
  buildNeoparadigmaPrompt,
  buildNeoparadigmaConsPrompt,
  buildEpigraphPrompt,
  buildRewriteConsPrompt,
  buildRewritePrompt,
  buildSummarizeConsPrompt,
  buildSummarizePrompt,
  buildSynonymsPrompt,
  buildSynonymsConsPrompt,
  buildTranslatePrompt,
  buildTranslateConsPrompt,
  CHAT_GPT5_EFFORT,
  CHAT_GPT5_VERBOSITY,
  CHAT_MAX_NUM_RESULTS,
  CHAT_MAX_OUTPUT_TOKENS,
  CHAT_MODEL,
  CHAT_SYSTEM_PROMPT,
  LLM_VECTOR_STORE_TRANSLATE_RAG,
  CHAT_TEMPERATURE,
  executeLLM,
  uploadLlmSourceFiles,
  type ChatMessage,
  type UploadedLlmFile,
  buildCognatosPrompt,
  buildCognatosConsPrompt,
} from "@/features/ghost-writer/services/openai";
import type {
  AIResponse,
  AiActionId,
  BackendStatus,
  LlmLogEntry,
  MobilePanelId,
  ParameterPanelTarget,
  RewritePromptType,
  SelectOption,
} from "@/features/ghost-writer/types";
import {
  AI_ACTIONS_LLM_SETTINGS_STORAGE_KEY,
  BIBLIO_EXTERNA_LLM_SETTINGS_STORAGE_KEY,
  CHAT_EDITOR_CONTEXT_MAX_CHARS,
  GENERAL_SETTINGS_STORAGE_KEY,
  LLM_SETTINGS_STORAGE_KEY,
  NO_VECTOR_STORE_ID,
  READ_PERSISTED_CONFIG_FROM_LOCAL_STORAGE,
} from "@/features/ghost-writer/config/constants";
import { applySystemPromptOverride, getActionSystemPrompt, getConscienciografiaActionSystemPromptId, getTermsConceptsActionSystemPromptId, type ActionSystemPromptId } from "@/features/ghost-writer/config/actionSystemPrompts";
import { BOOK_SOURCE, VECTOR_STORES_SOURCE } from "@/features/ghost-writer/config/options";
import { getParameterPanelTargetByAiAction, getParameterPanelTargetByAiActionInSection, normalizeIdList } from "@/features/ghost-writer/config/metadata";
import { HtmlEditorControlApi } from "@/features/ghost-writer/services/htmlEditorControl";

interface ToastApi {
  error: (message: string) => void;
  info: (message: string) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
}

interface UseGhostWriterLlmParams {
  actionText: string;
  aiCommandQuery: string;
  translateLanguage: string;
  rewritePromptType: RewritePromptType;
  documentText: string;
  currentFileId: string;
  chatHistory: ChatMessage[];
  setChatHistory: Dispatch<SetStateAction<ChatMessage[]>>;
  chatPreviousResponseId: string | null;
  setChatPreviousResponseId: Dispatch<SetStateAction<string | null>>;
  responses: AIResponse[];
  setResponses: Dispatch<SetStateAction<AIResponse[]>>;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  backendStatus: BackendStatus;
  setBackendStatus: Dispatch<SetStateAction<BackendStatus>>;
  llmModel: string;
  setLlmModel: Dispatch<SetStateAction<string>>;
  llmTemperature: number;
  setLlmTemperature: Dispatch<SetStateAction<number>>;
  llmMaxOutputTokens: number;
  setLlmMaxOutputTokens: Dispatch<SetStateAction<number>>;
  llmMaxNumResults: number;
  setLlmMaxNumResults: Dispatch<SetStateAction<number>>;
  llmEditorContextMaxChars: number;
  setLlmEditorContextMaxChars: Dispatch<SetStateAction<number>>;
  llmVerbosity: string;
  setLlmVerbosity: Dispatch<SetStateAction<string>>;
  llmEffort: string;
  setLlmEffort: Dispatch<SetStateAction<string>>;
  llmSystemPrompt: string;
  setLlmSystemPrompt: Dispatch<SetStateAction<string>>;
  aiActionsLlmModel: string;
  setAiActionsLlmModel: Dispatch<SetStateAction<string>>;
  aiActionsLlmTemperature: number;
  setAiActionsLlmTemperature: Dispatch<SetStateAction<number>>;
  aiActionsLlmMaxOutputTokens: number;
  setAiActionsLlmMaxOutputTokens: Dispatch<SetStateAction<number>>;
  aiActionsLlmVerbosity: string;
  setAiActionsLlmVerbosity: Dispatch<SetStateAction<string>>;
  aiActionsLlmEffort: string;
  setAiActionsLlmEffort: Dispatch<SetStateAction<string>>;
  aiActionsLlmSystemPrompt: string;
  setAiActionsLlmSystemPrompt: Dispatch<SetStateAction<string>>;
  aiActionSystemPrompts: Partial<Record<ActionSystemPromptId, string>>;
  setAiActionSystemPrompts: Dispatch<SetStateAction<Partial<Record<ActionSystemPromptId, string>>>>;
  aiActionsSelectedVectorStoreIds: string[];
  setAiActionsSelectedVectorStoreIds: Dispatch<SetStateAction<string[]>>;
  aiActionsSelectedInputFileIds: string[];
  setAiActionsSelectedInputFileIds: Dispatch<SetStateAction<string[]>>;
  isTermsConceptsConscienciografiaEnabled: boolean;
  biblioExternaLlmModel: string;
  setBiblioExternaLlmModel: Dispatch<SetStateAction<string>>;
  biblioExternaLlmTemperature: number;
  setBiblioExternaLlmTemperature: Dispatch<SetStateAction<number>>;
  biblioExternaLlmMaxOutputTokens: number;
  setBiblioExternaLlmMaxOutputTokens: Dispatch<SetStateAction<number>>;
  biblioExternaLlmVerbosity: string;
  setBiblioExternaLlmVerbosity: Dispatch<SetStateAction<string>>;
  biblioExternaLlmEffort: string;
  setBiblioExternaLlmEffort: Dispatch<SetStateAction<string>>;
  biblioExternaLlmSystemPrompt: string;
  setBiblioExternaLlmSystemPrompt: Dispatch<SetStateAction<string>>;
  enableHistoryNumbering: boolean;
  setEnableHistoryNumbering: Dispatch<SetStateAction<boolean>>;
  enableHistoryReferences: boolean;
  setEnableHistoryReferences: Dispatch<SetStateAction<boolean>>;
  enableHistoryMetadata: boolean;
  setEnableHistoryMetadata: Dispatch<SetStateAction<boolean>>;
  enableHistoryHighlight: boolean;
  setEnableHistoryHighlight: Dispatch<SetStateAction<boolean>>;
  miniArlindoTextWindow: number;
  setMiniArlindoTextWindow: Dispatch<SetStateAction<number>>;
  maxResultsDocx: number;
  setMaxResultsDocx: Dispatch<SetStateAction<number>>;
  selectedBookSourceIds: string[];
  uploadedChatFiles: UploadedLlmFile[];
  setUploadedChatFiles: Dispatch<SetStateAction<UploadedLlmFile[]>>;
  setIsUploadingChatFiles: Dispatch<SetStateAction<boolean>>;
  includeEditorContextInLlm: boolean;
  setLlmLogs: Dispatch<SetStateAction<LlmLogEntry[]>>;
  setLlmSessionLogs: Dispatch<SetStateAction<LlmLogEntry[]>>;
  setParameterPanelTarget: Dispatch<SetStateAction<ParameterPanelTarget>>;
  isMobileView: boolean;
  setActiveMobilePanel: Dispatch<SetStateAction<MobilePanelId>>;
  getEditorApi: () => Promise<HtmlEditorControlApi | null>;
  toast: ToastApi;
}

interface LlmConfigRefValue {
  model: string;
  temperature: number;
  maxOutputTokens?: number;
  maxNumResults: number;
  editorContextMaxChars: number;
  gpt5Verbosity?: string;
  gpt5Effort?: string;
  systemPrompt?: string;
}

interface AiActionsLlmConfigRefValue {
  model: string;
  temperature: number;
  maxOutputTokens?: number;
  gpt5Verbosity?: string;
  gpt5Effort?: string;
  systemPrompt?: string;
  vectorStoreIds: string[];
  inputFileIds: string[];
}

const TRANSLATE_FIXED_VECTOR_STORE_IDS = [LLM_VECTOR_STORE_TRANSLATE_RAG.trim()].filter(Boolean);
const TERMS_CONCEPTS_WVBOOKS_VECTOR_STORE_IDS = ["vs_6912908250e4819197e23fe725e04fae"];
const HISTORY_HIGHLIGHT_OFF_RESPONSE_TYPES: AIResponse["type"][] = ["app_semantic_search", "app_semantic_overview"];
const REWRITE_PROMPT_TYPE_INSTRUCTIONS: Record<RewritePromptType, string> = {
  correction: "- apenas corrija a grafia das palavras e a gramática, para que fiquem corretas.",
  words: "- corrija a grafia das palavras e a gramática, para que fiquem corretas. Também avalie os termos e palavras utilizados, e decida se deve substituir por palavras ou termos mais adequados, a fim de melhorar a escrita ou mesmo a compreensão precisa do texto.",
  construction: "- reescreva completamente o texto, de maneira mais correta, adequada, clara e elegante, porém mantendo precisamente o sentido original.",
};

const appendRewritePromptTypeInstruction = (messages: ChatMessage[], rewritePromptType: RewritePromptType): ChatMessage[] => {
  const instruction = REWRITE_PROMPT_TYPE_INSTRUCTIONS[rewritePromptType];
  const nextMessages = [...messages];
  const systemIndex = nextMessages.findIndex((message) => message.role === "system");

  if (systemIndex >= 0) {
    nextMessages[systemIndex] = {
      ...nextMessages[systemIndex],
      content: `${nextMessages[systemIndex].content.trim()}\n${instruction}`,
    };
    return nextMessages;
  }

  return [{ role: "system", content: instruction }, ...nextMessages];
};

const normalizeVerbosity = (value: string | undefined): "low" | "medium" | "high" | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high") return normalized;
  return undefined;
};

const normalizeEffort = (value: string | undefined): "none" | "low" | "medium" | "high" | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "none" || normalized === "low" || normalized === "medium" || normalized === "high") return normalized;
  return undefined;
};

const useGhostWriterLlm = ({
  actionText,
  aiCommandQuery,
  translateLanguage,
  rewritePromptType,
  documentText,
  currentFileId,
  chatHistory,
  setChatHistory,
  chatPreviousResponseId,
  setChatPreviousResponseId,
  responses,
  setResponses,
  isLoading,
  setIsLoading,
  backendStatus,
  setBackendStatus,
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
  uploadedChatFiles,
  setUploadedChatFiles,
  setIsUploadingChatFiles,
  includeEditorContextInLlm,
  setLlmLogs,
  setLlmSessionLogs,
  setParameterPanelTarget,
  isMobileView,
  setActiveMobilePanel,
  getEditorApi,
  toast,
}: UseGhostWriterLlmParams) => {
  const llmConfigRef = useRef<LlmConfigRefValue>({
    model: CHAT_MODEL,
    temperature: CHAT_TEMPERATURE,
    maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS as number | undefined,
    maxNumResults: CHAT_MAX_NUM_RESULTS,
    editorContextMaxChars: CHAT_EDITOR_CONTEXT_MAX_CHARS,
    gpt5Verbosity: CHAT_GPT5_VERBOSITY as string | undefined,
    gpt5Effort: CHAT_GPT5_EFFORT as string | undefined,
    systemPrompt: CHAT_SYSTEM_PROMPT as string | undefined,
  });
  const aiActionsLlmConfigRef = useRef<AiActionsLlmConfigRefValue>({
    model: CHAT_MODEL,
    temperature: CHAT_TEMPERATURE,
    maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS as number | undefined,
    gpt5Verbosity: CHAT_GPT5_VERBOSITY as string | undefined,
    gpt5Effort: CHAT_GPT5_EFFORT as string | undefined,
    systemPrompt: CHAT_SYSTEM_PROMPT as string | undefined,
    vectorStoreIds: [],
    inputFileIds: [],
  });

  const openAiReady = backendStatus === "ready";

  const backendNotReadyMessage = useCallback(() => {
    if (backendStatus === "missing_openai_key") {
      return "Backend sem OPENAI_API_KEY. Configure no servidor.";
    }
    if (backendStatus === "unavailable") {
      return "Backend indisponivel em http://localhost:8787. Inicie o servidor.";
    }
    return "Backend ainda verificando disponibilidade.";
  }, [backendStatus]);

  const handleToggleChatSourcesPanel = useCallback(() => {
    setParameterPanelTarget((prev) => (prev?.section === "sources" ? null : { section: "sources", id: null }));
    if (isMobileView) setActiveMobilePanel("center");
  }, [isMobileView, setActiveMobilePanel, setParameterPanelTarget]);

  const aiActionVectorStoreOptions: SelectOption[] = useMemo(() => {
    const items: SelectOption[] = [...BOOK_SOURCE, ...VECTOR_STORES_SOURCE].map((item) => ({ id: item.id, label: item.label }));
    const translateRagId = TRANSLATE_FIXED_VECTOR_STORE_IDS[0] || "";
    const allItems = translateRagId ? [...items, { id: translateRagId, label: "Translate RAG" }] : items;
    const seen = new Set<string>();
    return allItems.filter((item) => {
      const id = item.id.trim();
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, []);

  const getGlobalVectorStoreIds = useCallback(() => {
    if (selectedBookSourceIds.includes(NO_VECTOR_STORE_ID)) return [];
    return [...new Set(selectedBookSourceIds.map((id) => id.trim()).filter(Boolean))];
  }, [selectedBookSourceIds]);

  const selectedChatSourceLabel = useMemo(() => {
    const normalizedIds = [...new Set(selectedBookSourceIds.map((id) => id.trim()).filter(Boolean))];
    if (normalizedIds.includes(NO_VECTOR_STORE_ID) || normalizedIds.length === 0) return "None";
    const sourceMap = new Map<string, string>(
      [...BOOK_SOURCE, ...VECTOR_STORES_SOURCE]
        .filter((item) => item.id !== NO_VECTOR_STORE_ID)
        .map((item) => [item.id, item.label]),
    );
    const labels = normalizedIds.map((id) => sourceMap.get(id) ?? id);
    return labels.join(", ");
  }, [selectedBookSourceIds]);

  useEffect(() => {
    llmConfigRef.current = {
      model: llmModel,
      temperature: llmTemperature,
      maxOutputTokens: llmMaxOutputTokens,
      maxNumResults: llmMaxNumResults,
      editorContextMaxChars: llmEditorContextMaxChars,
      gpt5Verbosity: llmVerbosity || undefined,
      gpt5Effort: llmEffort || undefined,
      systemPrompt: llmSystemPrompt.trim() || CHAT_SYSTEM_PROMPT,
    };
  }, [llmEditorContextMaxChars, llmEffort, llmMaxNumResults, llmMaxOutputTokens, llmModel, llmSystemPrompt, llmTemperature, llmVerbosity]);

  useEffect(() => {
    aiActionsLlmConfigRef.current = {
      model: aiActionsLlmModel,
      temperature: aiActionsLlmTemperature,
      maxOutputTokens: aiActionsLlmMaxOutputTokens,
      gpt5Verbosity: aiActionsLlmVerbosity || undefined,
      gpt5Effort: aiActionsLlmEffort || undefined,
      systemPrompt: aiActionsLlmSystemPrompt.trim() || CHAT_SYSTEM_PROMPT,
      vectorStoreIds: normalizeIdList(aiActionsSelectedVectorStoreIds),
      inputFileIds: normalizeIdList(aiActionsSelectedInputFileIds),
    };
  }, [aiActionsLlmEffort, aiActionsLlmMaxOutputTokens, aiActionsLlmModel, aiActionsLlmSystemPrompt, aiActionsLlmTemperature, aiActionsLlmVerbosity, aiActionsSelectedInputFileIds, aiActionsSelectedVectorStoreIds]);

  useEffect(() => {
    setAiActionsSelectedInputFileIds(normalizeIdList(uploadedChatFiles.map((file) => file.id)));
  }, [setAiActionsSelectedInputFileIds, uploadedChatFiles]);

  useEffect(() => {
    if (!READ_PERSISTED_CONFIG_FROM_LOCAL_STORAGE) return;
    try {
      const raw = window.localStorage.getItem(LLM_SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{
        model: string;
        temperature: number;
        maxOutputTokens: number;
        maxNumResults: number;
        editorContextMaxChars: number;
        gpt5Verbosity: string;
        gpt5Effort: string;
        systemPrompt: string;
      }>;
      if (typeof parsed.model === "string" && parsed.model.trim()) setLlmModel(parsed.model.trim());
      if (typeof parsed.temperature === "number" && Number.isFinite(parsed.temperature)) setLlmTemperature(Math.max(0, Math.min(parsed.temperature, 2)));
      if (typeof parsed.maxOutputTokens === "number" && Number.isFinite(parsed.maxOutputTokens)) setLlmMaxOutputTokens(Math.max(1, Math.floor(parsed.maxOutputTokens)));
      if (typeof parsed.maxNumResults === "number" && Number.isFinite(parsed.maxNumResults)) setLlmMaxNumResults(Math.max(1, Math.min(Math.floor(parsed.maxNumResults), 20)));
      if (typeof parsed.editorContextMaxChars === "number" && Number.isFinite(parsed.editorContextMaxChars)) setLlmEditorContextMaxChars(Math.max(500, Math.floor(parsed.editorContextMaxChars)));
      if (typeof parsed.gpt5Verbosity === "string") setLlmVerbosity(parsed.gpt5Verbosity);
      if (typeof parsed.gpt5Effort === "string") setLlmEffort(parsed.gpt5Effort);
    } catch {
      // Keep defaults on invalid storage.
    }
  }, [setLlmEditorContextMaxChars, setLlmEffort, setLlmMaxNumResults, setLlmMaxOutputTokens, setLlmModel, setLlmTemperature, setLlmVerbosity]);

  useEffect(() => {
    if (!READ_PERSISTED_CONFIG_FROM_LOCAL_STORAGE) return;
    try {
      const raw = window.localStorage.getItem(AI_ACTIONS_LLM_SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{
        model: string;
        temperature: number;
        maxOutputTokens: number;
        gpt5Verbosity: string;
        gpt5Effort: string;
        systemPrompt: string;
        actionSystemPrompts: Record<string, string>;
        vectorStoreIds: string[];
        inputFileIds: string[];
      }>;
      if (typeof parsed.model === "string" && parsed.model.trim()) setAiActionsLlmModel(parsed.model.trim());
      if (typeof parsed.temperature === "number" && Number.isFinite(parsed.temperature)) setAiActionsLlmTemperature(Math.max(0, Math.min(parsed.temperature, 2)));
      if (typeof parsed.maxOutputTokens === "number" && Number.isFinite(parsed.maxOutputTokens)) setAiActionsLlmMaxOutputTokens(Math.max(1, Math.floor(parsed.maxOutputTokens)));
      if (typeof parsed.gpt5Verbosity === "string") setAiActionsLlmVerbosity(parsed.gpt5Verbosity);
      if (typeof parsed.gpt5Effort === "string") setAiActionsLlmEffort(parsed.gpt5Effort);
      if (Array.isArray(parsed.vectorStoreIds)) setAiActionsSelectedVectorStoreIds(normalizeIdList(parsed.vectorStoreIds.filter((value): value is string => typeof value === "string")));
      if (Array.isArray(parsed.inputFileIds)) setAiActionsSelectedInputFileIds(normalizeIdList(parsed.inputFileIds.filter((value): value is string => typeof value === "string")));
    } catch {
      // Keep defaults on invalid storage.
    }
  }, [setAiActionsLlmEffort, setAiActionsLlmMaxOutputTokens, setAiActionsLlmModel, setAiActionsLlmTemperature, setAiActionsLlmVerbosity, setAiActionsSelectedInputFileIds, setAiActionsSelectedVectorStoreIds]);

  useEffect(() => {
    if (!READ_PERSISTED_CONFIG_FROM_LOCAL_STORAGE) return;
    try {
      const raw = window.localStorage.getItem(GENERAL_SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{
        enableHistoryNumbering: boolean;
        enableHistoryReferences: boolean;
        enableHistoryMetadata: boolean;
        enableHistoryHighlight: boolean;
        miniArlindoTextWindow: number;
        maxResultsDocx: number;
      }>;
      if (typeof parsed.enableHistoryNumbering === "boolean") setEnableHistoryNumbering(parsed.enableHistoryNumbering);
      if (typeof parsed.enableHistoryReferences === "boolean") setEnableHistoryReferences(parsed.enableHistoryReferences);
      if (typeof parsed.enableHistoryMetadata === "boolean") setEnableHistoryMetadata(parsed.enableHistoryMetadata);
      if (typeof parsed.enableHistoryHighlight === "boolean") setEnableHistoryHighlight(parsed.enableHistoryHighlight);
      if (typeof parsed.miniArlindoTextWindow === "number" && Number.isFinite(parsed.miniArlindoTextWindow)) setMiniArlindoTextWindow(Math.max(0, Math.min(20, Math.floor(parsed.miniArlindoTextWindow))));
      if (typeof parsed.maxResultsDocx === "number" && Number.isFinite(parsed.maxResultsDocx)) setMaxResultsDocx(Math.max(1, Math.min(5000, Math.floor(parsed.maxResultsDocx))));
    } catch {
      // Keep defaults on invalid storage.
    }
  }, [setEnableHistoryHighlight, setEnableHistoryMetadata, setEnableHistoryNumbering, setEnableHistoryReferences, setMiniArlindoTextWindow]);

  useEffect(() => {
    const safeTemperature = Number.isFinite(llmTemperature) ? Math.max(0, Math.min(llmTemperature, 2)) : CHAT_TEMPERATURE;
    const safeMaxOutputTokens = Number.isFinite(llmMaxOutputTokens) ? Math.max(1, Math.floor(llmMaxOutputTokens)) : (CHAT_MAX_OUTPUT_TOKENS ?? 1000);
    const safeMaxNumResults = Number.isFinite(llmMaxNumResults) ? Math.max(1, Math.min(Math.floor(llmMaxNumResults), 20)) : CHAT_MAX_NUM_RESULTS;
    const safeEditorContextMaxChars = Number.isFinite(llmEditorContextMaxChars) ? Math.max(500, Math.floor(llmEditorContextMaxChars)) : CHAT_EDITOR_CONTEXT_MAX_CHARS;
    window.localStorage.setItem(LLM_SETTINGS_STORAGE_KEY, JSON.stringify({
      model: llmModel,
      temperature: safeTemperature,
      maxOutputTokens: safeMaxOutputTokens,
      maxNumResults: safeMaxNumResults,
      editorContextMaxChars: safeEditorContextMaxChars,
      gpt5Verbosity: llmVerbosity,
      gpt5Effort: llmEffort,
    }));
  }, [llmEditorContextMaxChars, llmEffort, llmMaxNumResults, llmMaxOutputTokens, llmModel, llmSystemPrompt, llmTemperature, llmVerbosity]);

  useEffect(() => {
    window.localStorage.setItem(AI_ACTIONS_LLM_SETTINGS_STORAGE_KEY, JSON.stringify({
      model: aiActionsLlmModel,
      temperature: Number.isFinite(aiActionsLlmTemperature) ? Math.max(0, Math.min(aiActionsLlmTemperature, 2)) : CHAT_TEMPERATURE,
      maxOutputTokens: Number.isFinite(aiActionsLlmMaxOutputTokens) ? Math.max(1, Math.floor(aiActionsLlmMaxOutputTokens)) : (CHAT_MAX_OUTPUT_TOKENS ?? 1000),
      gpt5Verbosity: aiActionsLlmVerbosity,
      gpt5Effort: aiActionsLlmEffort,
      vectorStoreIds: normalizeIdList(aiActionsSelectedVectorStoreIds),
      inputFileIds: normalizeIdList(aiActionsSelectedInputFileIds),
    }));
  }, [aiActionSystemPrompts, aiActionsLlmEffort, aiActionsLlmMaxOutputTokens, aiActionsLlmModel, aiActionsLlmSystemPrompt, aiActionsLlmTemperature, aiActionsLlmVerbosity, aiActionsSelectedInputFileIds, aiActionsSelectedVectorStoreIds]);

  useEffect(() => {
    window.localStorage.setItem(GENERAL_SETTINGS_STORAGE_KEY, JSON.stringify({
      enableHistoryNumbering,
      enableHistoryReferences,
      enableHistoryMetadata,
      enableHistoryHighlight,
      miniArlindoTextWindow: Number.isFinite(miniArlindoTextWindow) ? Math.max(0, Math.min(20, Math.floor(miniArlindoTextWindow))) : 3,
      maxResultsDocx: Number.isFinite(maxResultsDocx) ? Math.max(1, Math.min(5000, Math.floor(maxResultsDocx))) : 200,
    }));
  }, [enableHistoryHighlight, enableHistoryMetadata, enableHistoryNumbering, enableHistoryReferences, maxResultsDocx, miniArlindoTextWindow]);

  useEffect(() => {
    if (!READ_PERSISTED_CONFIG_FROM_LOCAL_STORAGE) return;
    try {
      const raw = window.localStorage.getItem(BIBLIO_EXTERNA_LLM_SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{
        model: string;
        temperature: number;
        maxOutputTokens: number;
        gpt5Verbosity: string;
        gpt5Effort: string;
        systemPrompt: string;
      }>;
      if (typeof parsed.model === "string" && parsed.model.trim()) setBiblioExternaLlmModel(parsed.model.trim());
      if (typeof parsed.temperature === "number" && Number.isFinite(parsed.temperature)) setBiblioExternaLlmTemperature(Math.max(0, Math.min(parsed.temperature, 2)));
      if (typeof parsed.maxOutputTokens === "number" && Number.isFinite(parsed.maxOutputTokens)) setBiblioExternaLlmMaxOutputTokens(Math.max(1, Math.floor(parsed.maxOutputTokens)));
      if (typeof parsed.gpt5Verbosity === "string") setBiblioExternaLlmVerbosity(parsed.gpt5Verbosity);
      if (typeof parsed.gpt5Effort === "string") setBiblioExternaLlmEffort(parsed.gpt5Effort);
    } catch {
      // Keep defaults on invalid storage.
    }
  }, [setBiblioExternaLlmEffort, setBiblioExternaLlmMaxOutputTokens, setBiblioExternaLlmModel, setBiblioExternaLlmTemperature, setBiblioExternaLlmVerbosity]);

  useEffect(() => {
    window.localStorage.setItem(BIBLIO_EXTERNA_LLM_SETTINGS_STORAGE_KEY, JSON.stringify({
      model: biblioExternaLlmModel,
      temperature: Number.isFinite(biblioExternaLlmTemperature) ? Math.max(0, Math.min(biblioExternaLlmTemperature, 2)) : 0,
      maxOutputTokens: Number.isFinite(biblioExternaLlmMaxOutputTokens) ? Math.max(1, Math.floor(biblioExternaLlmMaxOutputTokens)) : 1000,
      gpt5Verbosity: biblioExternaLlmVerbosity,
      gpt5Effort: biblioExternaLlmEffort,
    }));
  }, [biblioExternaLlmEffort, biblioExternaLlmMaxOutputTokens, biblioExternaLlmModel, biblioExternaLlmSystemPrompt, biblioExternaLlmTemperature, biblioExternaLlmVerbosity]);

  useEffect(() => {
    const refreshHealth = () => {
      healthCheck()
        .then((result) => setBackendStatus(result.openaiConfigured ? "ready" : "missing_openai_key"))
        .catch(() => setBackendStatus("unavailable"));
    };
    refreshHealth();
    const intervalId = window.setInterval(refreshHealth, 15000);
    window.addEventListener("focus", refreshHealth);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshHealth);
    };
  }, [setBackendStatus]);

  const addResponse = useCallback((type: AIResponse["type"], query: string, content: string, payload?: AIResponse["payload"], isConscienciografia?: boolean) => {
    if (HISTORY_HIGHLIGHT_OFF_RESPONSE_TYPES.includes(type)) {
      setEnableHistoryHighlight(false);
    }
    setResponses((prev) => [{
      id: crypto.randomUUID(),
      type,
      query,
      content,
      payload,
      isConscienciografia,
      timestamp: new Date(),
    }, ...prev]);
  }, [setEnableHistoryHighlight, setResponses]);

  const executeLLMWithLog = useCallback(async (payload: Parameters<typeof executeLLM>[0]) => {
    const currentConfig = llmConfigRef.current;
    const mergedPayload: Parameters<typeof executeLLM>[0] = {
      ...payload,
      model: currentConfig.model,
      temperature: currentConfig.temperature,
      maxOutputTokens: currentConfig.maxOutputTokens,
      vectorMaxResults: payload.vectorMaxResults ?? currentConfig.maxNumResults,
      gpt5Verbosity: normalizeVerbosity(currentConfig.gpt5Verbosity),
      gpt5Effort: normalizeEffort(currentConfig.gpt5Effort),
      systemPrompt: currentConfig.systemPrompt,
    };
    const id = crypto.randomUUID();
    const at = new Date().toISOString();
    setLlmLogs([{ id, at, request: mergedPayload }]);
    setLlmSessionLogs((prev) => [...prev, { id, at, request: mergedPayload }]);
    try {
      const response = await executeLLM(mergedPayload);
      setLlmLogs((prev) => (prev[0]?.id === id ? [{ ...prev[0], response }] : prev));
      setLlmSessionLogs((prev) => prev.map((entry) => (entry.id === id ? { ...entry, response } : entry)));
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setLlmLogs((prev) => (prev[0]?.id === id ? [{ ...prev[0], error: message }] : prev));
      setLlmSessionLogs((prev) => prev.map((entry) => (entry.id === id ? { ...entry, error: message } : entry)));
      throw err;
    }
  }, [setLlmLogs, setLlmSessionLogs]);

  const executeAiActionsLLMWithLog = useCallback(async (payload: Parameters<typeof executeLLM>[0]) => {
    const currentConfig = aiActionsLlmConfigRef.current;
    const mergedPayload: Parameters<typeof executeLLM>[0] = {
      ...payload,
      model: payload.model ?? currentConfig.model,
      temperature: payload.temperature ?? currentConfig.temperature,
      maxOutputTokens: payload.maxOutputTokens ?? currentConfig.maxOutputTokens,
      gpt5Verbosity: payload.gpt5Verbosity ?? normalizeVerbosity(currentConfig.gpt5Verbosity),
      gpt5Effort: payload.gpt5Effort ?? normalizeEffort(currentConfig.gpt5Effort),
    };
    const id = crypto.randomUUID();
    const at = new Date().toISOString();
    setLlmLogs([{ id, at, request: mergedPayload }]);
    setLlmSessionLogs((prev) => [...prev, { id, at, request: mergedPayload }]);
    try {
      const response = await executeLLM(mergedPayload);
      setLlmLogs((prev) => (prev[0]?.id === id ? [{ ...prev[0], response }] : prev));
      setLlmSessionLogs((prev) => prev.map((entry) => (entry.id === id ? { ...entry, response } : entry)));
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setLlmLogs((prev) => (prev[0]?.id === id ? [{ ...prev[0], error: message }] : prev));
      setLlmSessionLogs((prev) => prev.map((entry) => (entry.id === id ? { ...entry, error: message } : entry)));
      throw err;
    }
  }, [setLlmLogs, setLlmSessionLogs]);

  const handleCleanLlmConversation = useCallback(() => {
    setChatHistory([]);
    setChatPreviousResponseId(null);
    toast.success("Nova conversa iniciada sem contexto anterior.");
  }, [setChatHistory, setChatPreviousResponseId, toast]);

  const handleUploadSourceFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setIsUploadingChatFiles(true);
    try {
      const uploaded = await uploadLlmSourceFiles(files);
      setUploadedChatFiles((prev) => {
        const next = [...prev];
        for (const file of uploaded) {
          if (next.some((item) => item.id === file.id)) continue;
          next.push(file);
        }
        return next;
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar arquivos para a OpenAI.");
    } finally {
      setIsUploadingChatFiles(false);
    }
  }, [setIsUploadingChatFiles, setUploadedChatFiles, toast]);

  const handleRemoveUploadedChatFile = useCallback((id: string) => {
    setUploadedChatFiles((prev) => prev.filter((file) => file.id !== id));
  }, [setUploadedChatFiles]);

  const handleAction = useCallback(async (type: AiActionId) => {
    const text = actionText.trim();
    const query = aiCommandQuery.trim();
    const currentConfig = aiActionsLlmConfigRef.current;
    const inputFileIds = normalizeIdList(uploadedChatFiles.map((file) => file.id));
    const vectorStoreIds = normalizeIdList(currentConfig.vectorStoreIds).filter((id) => id !== NO_VECTOR_STORE_ID);
    const isTermsConceptsAction = type === "dictionary" || type === "synonyms" || type === "antonyms" || type === "etymology" || type === "cognatos";

    if (type !== "ai_command" && !text) {
      toast.error("Selecione um trecho no documento ou escreva na caixa de texto.");
      return;
    }
    if (type === "ai_command" && !query) {
      toast.error("Informe a Query do Comando IA.");
      return;
    }
    if (!openAiReady) {
      toast.error(backendNotReadyMessage());
      return;
    }

    setIsLoading(true);
    try {
      let editorPlainTextContext = "";
      let editorContextTruncated = false;
      if (type === "ai_command" && currentFileId) {
        const editorApi = await getEditorApi();
        const latestEditorText = editorApi ? await editorApi.getDocumentText() : documentText;
        const normalizedEditorText = (latestEditorText || "").trim();
        editorContextTruncated = normalizedEditorText.length > llmEditorContextMaxChars;
        editorPlainTextContext = normalizedEditorText.slice(0, llmEditorContextMaxChars);
      }
      const promptMap = {
        synonyms: (value: string) => isTermsConceptsConscienciografiaEnabled ? buildSynonymsConsPrompt(value) : buildSynonymsPrompt(value),
        antonyms: (value: string) => isTermsConceptsConscienciografiaEnabled ? buildAntonymsConsPrompt(value) : buildAntonymsPrompt(value),
        etymology: (value: string) => isTermsConceptsConscienciografiaEnabled ? buildEtymologyConsPrompt(value) : buildEtymologyPrompt(value),
        dictionary: (value: string) => isTermsConceptsConscienciografiaEnabled ? buildDefineConsPrompt(value) : buildDefinePrompt(value),
        cognatos: (value: string) => isTermsConceptsConscienciografiaEnabled ? buildCognatosConsPrompt(value) : buildCognatosPrompt(value),
        epigraph: (value: string) => isTermsConceptsConscienciografiaEnabled ? buildEpigraphConsPrompt(value) : buildEpigraphPrompt(value),
        rewrite: (value: string) => isTermsConceptsConscienciografiaEnabled ? buildRewriteConsPrompt(value) : buildRewritePrompt(value),
        summarize: (value: string) => isTermsConceptsConscienciografiaEnabled ? buildSummarizeConsPrompt(value) : buildSummarizePrompt(value),
        translate: (value: string) => isTermsConceptsConscienciografiaEnabled ? buildTranslateConsPrompt(value, translateLanguage) : buildTranslatePrompt(value, translateLanguage),
        dict_lookup: (value: string) => isTermsConceptsConscienciografiaEnabled ? buildDictLookupConsPrompt(value) : buildDictLookupPrompt(value),
        ai_command: (value: string) => buildAiCommandPrompt(value, query),
        analogies: (value: string) => isTermsConceptsConscienciografiaEnabled ? buildAnalogiesConsPrompt(value) : buildAnalogiesPrompt(value),
        comparisons: (value: string) => isTermsConceptsConscienciografiaEnabled ? buildComparisonsConsPrompt(value) : buildComparisonsPrompt(value),
        examples: (value: string) => isTermsConceptsConscienciografiaEnabled ? buildExamplesConsPrompt(value) : buildExamplesPrompt(value),
        counterpoints: (value: string) => isTermsConceptsConscienciografiaEnabled ? buildCounterpointsConsPrompt(value) : buildCounterpointsPrompt(value),
        neoparadigma: (value: string) => isTermsConceptsConscienciografiaEnabled ? buildNeoparadigmaConsPrompt(value) : buildNeoparadigmaPrompt(value),
      };

      const effectivePromptId = type === "dictionary" || type === "synonyms" || type === "antonyms" || type === "etymology" || type === "cognatos" || type === "epigraph" || type === "rewrite" || type === "summarize" || type === "translate" || type === "dict_lookup" || type === "analogies" || type === "comparisons" || type === "examples" || type === "counterpoints" || type === "neoparadigma"
        ? getConscienciografiaActionSystemPromptId(type, isTermsConceptsConscienciografiaEnabled)
        : type;
      const specificSystemPrompt = getActionSystemPrompt(aiActionSystemPrompts, effectivePromptId);
      const messages = type === "rewrite"
        ? appendRewritePromptTypeInstruction(applySystemPromptOverride(promptMap[type](text), specificSystemPrompt), rewritePromptType)
        : applySystemPromptOverride(promptMap[type](text), specificSystemPrompt);
      if (type === "ai_command" && includeEditorContextInLlm && editorPlainTextContext.trim()) {
        const truncTag = editorContextTruncated ? " [TRUNCADO]" : "";
        messages.splice(1, 0, {
          role: "user",
          content:
            `Contexto adicional do documento aberto no editor HTML (texto plano)${truncTag}:\n\n` +
            `<<<EDITOR_HTML_TEXT>>>\n${editorPlainTextContext}\n<<<END_EDITOR_HTML_TEXT>>>`,
        });
      }
      const effectiveVectorStoreIds = vectorStoreIds;
      const effectiveInputFileIds = inputFileIds;
      const tools = type === "etymology" ? [{ type: "web_search" }] : undefined;
      const result = (await executeAiActionsLLMWithLog({
        messages,
        previousResponseId: undefined,
        vectorStoreIds: effectiveVectorStoreIds,
        inputFileIds: effectiveInputFileIds,
        model: currentConfig.model,
        temperature: currentConfig.temperature,
        maxOutputTokens: currentConfig.maxOutputTokens,
        gpt5Verbosity: normalizeVerbosity(currentConfig.gpt5Verbosity),
        gpt5Effort: normalizeEffort(currentConfig.gpt5Effort),
        tools,
      })).content;
      addResponse(
        type,
        type === "ai_command" ? query : text.slice(0, 80),
        result,
        undefined,
        isTermsConceptsConscienciografiaEnabled,
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro na chamada a IA.");
    } finally {
      setIsLoading(false);
    }
  }, [actionText, addResponse, aiActionSystemPrompts, aiCommandQuery, backendNotReadyMessage, currentFileId, documentText, executeAiActionsLLMWithLog, getEditorApi, includeEditorContextInLlm, isTermsConceptsConscienciografiaEnabled, llmEditorContextMaxChars, openAiReady, rewritePromptType, setIsLoading, toast, translateLanguage, uploadedChatFiles]);

  const handleOpenAiActionParameters = useCallback((type: AiActionId, sectionOverride?: "actions" | "rewriting" | "translation" | "customized_prompts") => {
    setParameterPanelTarget(
      sectionOverride
        ? getParameterPanelTargetByAiActionInSection(type, sectionOverride)
        : getParameterPanelTargetByAiAction(type),
    );
  }, [setParameterPanelTarget]);

  const handleOpenAiCommandPanel = useCallback(() => {
    setParameterPanelTarget({ section: "customized_prompts", id: "ai_command" });
  }, [setParameterPanelTarget]);

  const handleChat = useCallback(async (message: string) => {
    if (!openAiReady) {
      toast.error(backendNotReadyMessage());
      return;
    }
    setIsLoading(true);
    try {
      let editorPlainTextContext = "";
      let editorContextTruncated = false;
      if (currentFileId) {
        const editorApi = await getEditorApi();
        const latestEditorText = editorApi ? await editorApi.getDocumentText() : documentText;
        const normalizedEditorText = (latestEditorText || "").trim();
        editorContextTruncated = normalizedEditorText.length > llmEditorContextMaxChars;
        editorPlainTextContext = normalizedEditorText.slice(0, llmEditorContextMaxChars);
      }
      const messages = buildChatPrompt(message, chatHistory, editorPlainTextContext, editorContextTruncated, includeEditorContextInLlm);
      const llmResponse = await executeLLMWithLog({
        messages,
        previousResponseId: chatPreviousResponseId ?? undefined,
        vectorStoreIds: getGlobalVectorStoreIds(),
        inputFileIds: uploadedChatFiles.map((file) => file.id).filter(Boolean),
      });
      const result = llmResponse.content.trim();
      const nextResponseId = llmResponse.meta?.id;
      if (nextResponseId) setChatPreviousResponseId(nextResponseId);
      const finalContent = result || "Sem conteudo retornado pela IA.";
      setChatHistory((prev) => [...prev, { role: "user", content: message }, { role: "assistant", content: finalContent }]);
      addResponse("chat", message, finalContent);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao executar chat.";
      toast.error(msg);
      addResponse("chat", message, `Erro no chat: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, [addResponse, backendNotReadyMessage, chatHistory, chatPreviousResponseId, currentFileId, documentText, executeLLMWithLog, getEditorApi, getGlobalVectorStoreIds, includeEditorContextInLlm, llmEditorContextMaxChars, openAiReady, setChatHistory, setChatPreviousResponseId, setIsLoading, toast, uploadedChatFiles]);

  return {
    llmConfigRef,
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
    handleOpenAiActionParameters,
    handleOpenAiCommandPanel,
    handleChat,
  };
};

export default useGhostWriterLlm;

