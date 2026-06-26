export type AiPanelScope = "actions" | "rewriting" | "translation" | "customized_prompts";
export type AiActionId = "synonyms" | "antonyms" | "etymology" | "dictionary" | "epigraph" | "rewrite" | "summarize" | "cognatos" | "translate" | "dict_lookup" | "ai_command" | "analogies" | "comparisons" | "examples" | "counterpoints" | "neoparadigma";
export type RewritePromptType = "correction" | "words" | "construction";
export type MacroActionId = "macro1" | "macro2";
export type SemanticBackendAppId =
  | "definologia"
  | "sinonimologia"
  | "fatologia"
  | "frase_enfatica"
  | "abre_tab_html"
  | "abre_tabword"
  | "busca_livros"
  | "busca_verbetes"
  | "localiza_trechos"
  | "lexical_overview"
  | "busca_semantica"
  | "semantic_overview"
  | "biblio_livros"
  | "biblio_verbetes"
  | "biblio_autores"
  | "biblio_externa";
export type SemanticActionId = MacroActionId | AiActionId | SemanticBackendAppId;
export type AppAlias =
  | "app1" | "app2" | "app3" | "app4" | "app5" | "app6" | "app7" | "app8" | "app9" | "app10"
  | "app11" | "app12" | "app13" | "app14" | "app15" | "app16" | "app17" | "app18" | "app19" | "app20"
  | "app21" | "app22" | "app23" | "app24" | "app25" | "app26" | "app27" | "app28" | "app29" | "app30"
  | "app31" | "app32" | "app33" | "app34";
export type ActionItemId = SemanticActionId | AppAlias;
export type AppPanelScope = "secoes_verbete" | "tabela_verbete" | "lexical_search" | "semantic_search" | "bibliografia";
export type ParameterPanelSection = "document" | "sources" | AiPanelScope | AppPanelScope | "applications";
export type ParameterPanelTargetId = ActionItemId | null;
export type ParameterPanelTarget = { section: ParameterPanelSection; id: ParameterPanelTargetId } | null;
export type MobilePanelId = "left" | "center" | "right" | "editor" | "json";
export type LogPanelTabId = "search" | "llm";
export type ConfigPanelTabId = "general" | "sources" | "ia";
export type BackendStatus = "checking" | "ready" | "missing_openai_key" | "unavailable";
export type ParameterPanelHeaderMeta = { title: string; description: string };
export type SelectOption = { id: string; label: string };
export type LexicalBookOption = SelectOption & {
  indexId?: string;
  fileStem?: string;
};
export type Macro2SpacingMode = "normal_single" | "normal_double" | "nbsp_single" | "nbsp_double";
export type RefBookMode = "bee" | "simples";
export type SemanticIndexOption = {
  id: string;
  label: string;
  sourceFile: string;
  sourceRows: number;
  model: string;
  dimensions: number;
  embeddingDtype: string;
  suggestedMinScore: number;
};
export type SemanticSearchRagDefinition = {
  term: string;
  meaning: string;
};
export type SemanticSearchRagContext = {
  usedRagContext: boolean;
  sourceQuery?: string;
  error?: string;
  vectorStoreIds: string[];
  keyTerms: string[];
  definitions: SemanticSearchRagDefinition[];
  relatedTerms: string[];
  disambiguatedQuery: string;
  references: string[];
};
export type LlmLogEntry = {
  id: string;
  at: string;
  request: unknown;
  response?: unknown;
  error?: string;
};
export type GhostWriterActionState = {
  selectedRefBook: string;
};

export interface LexicalHistoryMatch {
  book: string;
  bookName?: string;
  book_label?: string;
  row: number;
  number: number | null;
  title: string;
  text: string;
  pagina: string;
  data: Record<string, string>;
}

export interface LexicalOverviewHistoryGroup {
  bookCode: string;
  bookLabel: string;
  fileStem: string;
  totalFound: number;
  shownCount: number;
  matches: LexicalHistoryMatch[];
}

export interface LexicalOverviewHistoryPayload {
  kind: "lexical_overview";
  term: string;
  limit: number;
  miniTextWindow?: number;
  sourceIds?: string[];
  totalBooks: number;
  totalFound: number;
  groups: LexicalOverviewHistoryGroup[];
}

export interface SemanticOverviewHistoryMatch {
  book: string;
  index_id: string;
  index_label: string;
  row: number;
  text: string;
  metadata: Record<string, unknown>;
  score: number;
}

export interface SemanticOverviewHistoryGroup {
  indexId: string;
  indexLabel: string;
  totalFound: number;
  shownCount: number;
  matches: SemanticOverviewHistoryMatch[];
}

export interface SemanticOverviewHistoryPayload {
  kind: "semantic_overview";
  term: string;
  limit: number;
  minScore: number;
  miniTextWindow?: number;
  useRagContext?: boolean;
  excludeLexicalDuplicates?: boolean;
  vectorStoreIds?: string[];
  sourceIds?: string[];
  ignoreBaseCalibration?: boolean;
  recommendedMinScoreMin: number;
  recommendedMinScoreMax: number;
  usesCalibratedMinScores: boolean;
  totalIndexes: number;
  totalFound: number;
  lexicalFilteredCount: number;
  groups: SemanticOverviewHistoryGroup[];
}

export type AIResponsePayload = LexicalOverviewHistoryPayload | SemanticOverviewHistoryPayload;

export interface AIResponse {
  id: string;
  type:
    | "synonyms"
    | "antonyms"
    | "etymology"
    | "dictionary"
    | "epigraph"
    | "rewrite"
    | "summarize"
    | "translate"
    | "dict_lookup"
    | "ai_command"
    | "analogies"
    | "comparisons"
    | "examples"
    | "counterpoints"
    | "neoparadigma"
    | "chat"
    | "cognatos"
    | "app_ref_book"
    | "app_ref_verbete_list"
    | "app_ref_verbete_biblio"
    | "app_biblio_geral"
    | "app_biblio_externa"
    | "app_random_pensata"
    | "app_book_search"
    | "app_lexical_citation_lookup"
    | "app_lexical_overview"
    | "app_semantic_search"
    | "app_semantic_overview"
    | "app_verbete_search"
    | "app_verbete_definologia"
    | "app_verbete_frase_enfatica"
    | "app_verbete_sinonimologia"
    | "app_verbete_fatologia";
  query: string;
  content: string;
  payload?: AIResponsePayload;
  isConscienciografia?: boolean;
  timestamp: Date;
}

