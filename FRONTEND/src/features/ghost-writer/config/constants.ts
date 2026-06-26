export const NO_VECTOR_STORE_ID = "__none__";
export const SEMANTIC_TITLE_METADATA_KEYS = ["title", "titulo", "verbete", "tema", "cabecalho", "heading"] as const;
export const SEMANTIC_NUMBER_METADATA_KEYS = ["number", "numero", "paragraph_number", "index", "ordem", "id"] as const;
export const LLM_LOG_FONT_MIN = 0.5;
export const LLM_LOG_FONT_MAX = 1.0;
export const LLM_LOG_FONT_STEP = 0.05;
export const LLM_SETTINGS_STORAGE_KEY = "llm_settings_v1";
export const AI_ACTIONS_LLM_SETTINGS_STORAGE_KEY = "ai_actions_llm_settings_v1";
export const BIBLIO_EXTERNA_LLM_SETTINGS_STORAGE_KEY = "biblio_externa_llm_settings_v1";
export const GENERAL_SETTINGS_STORAGE_KEY = "general_settings_v1";
export const READ_PERSISTED_CONFIG_FROM_LOCAL_STORAGE = false;
export const DEFAULT_LOG_FONT_SIZE_PX = 9;
export const DEFAULT_LOG_LINE_HEIGHT_RATIO = 1.1;
export const DEFAULT_DOLLAR_TOKEN = 5.5;
export const CONFIG_PROMPT_ROWS = 5;
export const LLM_MODEL_OPTIONS = [
  { value: "gpt-5.5", label: "gpt-5.5" },
  { value: "gpt-5.4-nano", label: "gpt-5.4-nano" },
  { value: "gpt-5.4-mini", label: "gpt-5.4-mini" },
  { value: "gpt-5.4", label: "gpt-5.4" },
] as const;

export const DESKTOP_PANEL_SIZES_PX = {
  left: { default: 320, min: 150, max: 400 },
  parameter: { default: 320, min: 150, max: 400 },
  right: { default: 400, min: 150, max: 500 },
  json: { default: 350, min: 150, max: 500 },
  editor: { default: 400, min: 150, max: 500 },
} as const;
export const DESKTOP_RESIZE_HANDLE_WIDTH_PX = 8;
export const DESKTOP_CONTENT_EDGE_GUTTER_PX = 8;

interface DefaultDesktopPanelLayoutOptions {
  hasCenterPanel: boolean;
  hasJsonPanel: boolean;
  hasEditorPanel: boolean;
  containerWidthPx: number;
}

interface DefaultDesktopPanelLayout {
  left: number;
  parameter: number | null;
  right: number;
  json: number | null;
  editor: number | null;
}

export const getDefaultDesktopPanelLayout = ({
  hasCenterPanel,
  hasJsonPanel,
  hasEditorPanel,
  containerWidthPx,
}: DefaultDesktopPanelLayoutOptions): DefaultDesktopPanelLayout => {
  const left = DESKTOP_PANEL_SIZES_PX.left.default;
  const parameter = hasCenterPanel ? DESKTOP_PANEL_SIZES_PX.parameter.default : null;
  const json = hasJsonPanel ? DESKTOP_PANEL_SIZES_PX.json.default : null;
  const editor = hasEditorPanel ? DESKTOP_PANEL_SIZES_PX.editor.default : null;
  const occupiedWithoutRight = left + (parameter ?? 0) + (json ?? 0) + (editor ?? 0);
  const remainingWidth = Math.max(0, containerWidthPx - occupiedWithoutRight);
  const right = Math.max(DESKTOP_PANEL_SIZES_PX.right.default, remainingWidth);

  return {
    left,
    parameter,
    right,
    json,
    editor,
  };
};
export const DEFAULT_BOOK_SEARCH_MAX_RESULTS = 10;
export const DEFAULT_MINI_ARLINDO_TEXT_WINDOW = 3;
export const DEFAULT_MAX_RESULTS_DOCX = 200;
export const DEFAULT_SEMANTIC_MIN_SCORE = 0.25;
export const PDF_HEADER_SIGNATURE_RE = /enciclop(?:é|e)dia\s+da\s+conscienciologia/i;
export const CHAT_EDITOR_CONTEXT_MAX_CHARS = 10000;
export const MODEL_PRICING_BRL_PER_1M: Record<string, { input: number; cached_input: number; output: number }> = {
  "gpt-5.4-under-272k": { input: 13.75, cached_input: 1.375, output: 82.5 },
  "gpt-5.4-over-272k": { input: 13.75, cached_input: 1.375, output: 82.5 },
  "gpt-5.4-mini": { input: 4.125, cached_input: 0.4125, output: 24.75 },
  "gpt-5.4-nano": { input: 1.1, cached_input: 0.11, output: 6.875 },
};
