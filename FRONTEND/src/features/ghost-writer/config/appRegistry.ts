import { BookOpen, FileText, Languages, ListOrdered, PenLine, Repeat2, Search, type LucideIcon } from "lucide-react";
import type { ActionItemId, AiPanelScope, AppAlias, AppPanelScope, ParameterPanelSection, SemanticActionId } from "@/features/ghost-writer/types";

export type RegisteredActionKind = "document_macro" | "ai_action" | "backend_app";

export interface RegisteredActionItem {
  alias: AppAlias;
  semanticId: SemanticActionId;
  section: Exclude<ParameterPanelSection, "sources" | "applications">;
  kind: RegisteredActionKind;
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface LeftNavigationGroup {
  label: string;
  items: Array<{
    id: Exclude<ParameterPanelSection, "sources" | "applications">;
    title: string;
    description: string;
    icon: LucideIcon;
    section: Exclude<ParameterPanelSection, "sources" | "applications">;
  }>;
}

export const ACTION_REGISTRY = [
  { alias: "app1", semanticId: "macro1", section: "document", kind: "document_macro", title: "Highlight", description: "Destaca termos no documento.", icon: BookOpen },
  { alias: "app2", semanticId: "macro2", section: "document", kind: "document_macro", title: "Numerar lista", description: "Aplica numeracao manual a lista de itens.", icon: ListOrdered },
  { alias: "app3", semanticId: "dictionary", section: "actions", kind: "ai_action", title: "Definição", description: "Definição dicionarizada.", icon: BookOpen },
  { alias: "app4", semanticId: "synonyms", section: "actions", kind: "ai_action", title: "Sinonimia", description: "Lista de sinonimos.", icon: Repeat2 },
  { alias: "app5", semanticId: "antonyms", section: "actions", kind: "ai_action", title: "Antonimia", description: "Lista de antonimos.", icon: Repeat2 },
  { alias: "app6", semanticId: "etymology", section: "actions", kind: "ai_action", title: "Etimologia", description: "Etimologia do termo.", icon: Search },
  { alias: "app7", semanticId: "cognatos", section: "actions", kind: "ai_action", title: "Cognatos", description: "Cognatos do termo.", icon: Search },
  { alias: "app8", semanticId: "rewrite", section: "rewriting", kind: "ai_action", title: "Reescrever", description: "Melhora clareza e fluidez.", icon: PenLine },
  { alias: "app9", semanticId: "summarize", section: "rewriting", kind: "ai_action", title: "Resumir", description: "Síntese concisa.", icon: FileText },
  { alias: "app10", semanticId: "epigraph", section: "rewriting", kind: "ai_action", title: "Epígrafe", description: "Sugere epígrafe do termo.", icon: Search },
  { alias: "app11", semanticId: "translate", section: "translation", kind: "ai_action", title: "Traduzir", description: "Traduz para o idioma selecionado.", icon: Languages },
  { alias: "app12", semanticId: "dict_lookup", section: "translation", kind: "ai_action", title: "Dicionários", description: "Consulta dicionários técnicos.", icon: Search },
  { alias: "app13", semanticId: "analogies", section: "customized_prompts", kind: "ai_action", title: "Analogias", description: "Lista de Analogias.", icon: PenLine },
  { alias: "app14", semanticId: "comparisons", section: "customized_prompts", kind: "ai_action", title: "Comparações", description: "Lista de Comparações.", icon: PenLine },
  { alias: "app15", semanticId: "examples", section: "customized_prompts", kind: "ai_action", title: "Exemplos", description: "Lista de Exemplos.", icon: PenLine },
  { alias: "app16", semanticId: "counterpoints", section: "customized_prompts", kind: "ai_action", title: "Contrapontos", description: "Lista de Contrapontos.", icon: PenLine },
  { alias: "app17", semanticId: "neoparadigma", section: "customized_prompts", kind: "ai_action", title: "Neoparadigma", description: "Análise comparativa paradigmática.", icon: PenLine },
  { alias: "app18", semanticId: "ai_command", section: "customized_prompts", kind: "ai_action", title: "Comando IA", description: "Envia uma query livre para a LLM.", icon: PenLine },
  { alias: "app19", semanticId: "definologia", section: "secoes_verbete", kind: "backend_app", title: "Definologia", description: "Gera Definologia do verbete.", icon: BookOpen },
  { alias: "app20", semanticId: "sinonimologia", section: "secoes_verbete", kind: "backend_app", title: "Sinonimologia", description: "Gera Sinonimologia do verbete.", icon: Repeat2 },
  { alias: "app21", semanticId: "fatologia", section: "secoes_verbete", kind: "backend_app", title: "Fatologia", description: "Gera Fatologia do verbete.", icon: ListOrdered },
  { alias: "app22", semanticId: "frase_enfatica", section: "secoes_verbete", kind: "backend_app", title: "Frase Enfática", description: "Gera Frase Enfatica do verbete.", icon: PenLine },
  { alias: "app23", semanticId: "abre_tab_html", section: "tabela_verbete", kind: "backend_app", title: "Abre Tabela no Editor", description: "Carrega a tabela HTML no editor.", icon: FileText },
  { alias: "app24", semanticId: "abre_tabword", section: "tabela_verbete", kind: "backend_app", title: "Abre Tabela no Word", description: "Baixa a tabela DOCX e abre no Word.", icon: FileText },
  { alias: "app25", semanticId: "busca_livros", section: "lexical_search", kind: "backend_app", title: "Busca em Livros", description: "Busca termos nos livros de Waldo Vieira.", icon: Search },
  { alias: "app26", semanticId: "busca_verbetes", section: "lexical_search", kind: "backend_app", title: "Busca em Verbetes", description: "Busca termos nos verbetes em geral.", icon: Search },
  { alias: "app27", semanticId: "localiza_trechos", section: "lexical_search", kind: "backend_app", title: "Localiza Trechos", description: "Localiza trechos em toda a base lexica.", icon: Search },
  { alias: "app28", semanticId: "lexical_overview", section: "lexical_search", kind: "backend_app", title: "Lexical Overview", description: "Busca o termo em todos os livros.", icon: Search },
  { alias: "app29", semanticId: "busca_semantica", section: "semantic_search", kind: "backend_app", title: "Busca Semântica", description: "Busca semantica por similaridade.", icon: Search },
  { alias: "app30", semanticId: "semantic_overview", section: "semantic_search", kind: "backend_app", title: "Semantic Overview", description: "Busca em todas as bases semânticas.", icon: Search },
  { alias: "app31", semanticId: "biblio_livros", section: "bibliografia", kind: "backend_app", title: "Bibliografia de Livros", description: "Monta Bibliografia de obras Waldo Vieira.", icon: BookOpen },
  { alias: "app32", semanticId: "biblio_verbetes", section: "bibliografia", kind: "backend_app", title: "Bibliografia de Verbetes", description: "Monta Bibliografia de verbetes.", icon: Repeat2 },
  { alias: "app33", semanticId: "biblio_autores", section: "bibliografia", kind: "backend_app", title: "Bibliografia Autores", description: "Monta bibliografia de autores diversos.", icon: Search },
  { alias: "app34", semanticId: "biblio_externa", section: "bibliografia", kind: "backend_app", title: "Bibliografia Externa", description: "Busca referencias externas na internet.", icon: Search },
] as const satisfies readonly RegisteredActionItem[];

export const ACTION_ITEMS_BY_ALIAS = Object.fromEntries(
  ACTION_REGISTRY.map((item) => [item.alias, item]),
) as Record<AppAlias, RegisteredActionItem>;

export const ACTION_ITEMS_BY_SEMANTIC_ID = Object.fromEntries(
  ACTION_REGISTRY.map((item) => [item.semanticId, item]),
) as Record<SemanticActionId, RegisteredActionItem>;

export const ACTION_ALIASES_BY_SEMANTIC_ID = Object.fromEntries(
  ACTION_REGISTRY.map((item) => [item.semanticId, item.alias]),
) as Record<SemanticActionId, AppAlias>;

export const ACTION_ITEMS_BY_SECTION = ACTION_REGISTRY.reduce((acc, item) => {
  (acc[item.section] ??= []).push(item);
  return acc;
}, {} as Record<Exclude<ParameterPanelSection, "sources" | "applications">, RegisteredActionItem[]>);

const APP_ALIAS_PATTERN = /^app([1-9]|[12][0-9]|3[0-4])$/;

export const isAppAlias = (value: unknown): value is AppAlias =>
  typeof value === "string" && APP_ALIAS_PATTERN.test(value);

export const resolveActionItem = (id: ActionItemId | null | undefined): RegisteredActionItem | null => {
  if (!id) return null;
  if (isAppAlias(id)) return ACTION_ITEMS_BY_ALIAS[id] ?? null;
  return ACTION_ITEMS_BY_SEMANTIC_ID[id as SemanticActionId] ?? null;
};

export const resolveSemanticActionId = (id: ActionItemId | null | undefined): SemanticActionId | null =>
  resolveActionItem(id)?.semanticId ?? null;

export const resolveActionAlias = (id: ActionItemId | null | undefined): AppAlias | null =>
  resolveActionItem(id)?.alias ?? null;

export const getSectionItems = (section: ParameterPanelSection): RegisteredActionItem[] =>
  section === "sources" || section === "applications" ? [] : (ACTION_ITEMS_BY_SECTION[section] ?? []);

export const LEFT_NAVIGATION_GROUPS: LeftNavigationGroup[] = [
  {
    label: "Documentos",
    items: [{ id: "document", title: "Documento", description: "Novo, abrir e editar documento", icon: FileText, section: "document" }],
  },
  {
    label: "Ferramentas de Busca",
    items: [
      { id: "lexical_search", title: "Lexical Search", description: "Busca léxica nos livros e verbetes", icon: Search, section: "lexical_search" },
      { id: "semantic_search", title: "Semantic Search", description: "Busca por afinidade semântica", icon: Search, section: "semantic_search" },
      { id: "bibliografia", title: "Bibliografia", description: "Busca as referências bibliográficas", icon: FileText, section: "bibliografia" },
    ],
  },
  {
    label: "Lexicografia IA",
    items: [
      { id: "actions", title: "Termos & Conceitos", description: "Definir, Sinônimos, Etimologia, etc", icon: BookOpen, section: "actions" },
      { id: "rewriting", title: "Trechos & Parágrafos", description: "Reescrever, Resumir, Epígrafe", icon: FileText, section: "rewriting" },
      { id: "translation", title: "Tradução & Dicionário", description: "Traduzir texto e consultar termos", icon: Languages, section: "translation" },
      { id: "customized_prompts", title: "Customized Prompts", description: "Prompts customizados", icon: PenLine, section: "customized_prompts" },
    ],
  },
  {
    label: "Verbetografia IA",
    items: [
      { id: "secoes_verbete", title: "Seções do Verbete", description: "Escreve seções com auxílio da IA", icon: FileText, section: "secoes_verbete" },
      { id: "tabela_verbete", title: "Tabela Verbete", description: "Abre tabela Word e editor HTML", icon: FileText, section: "tabela_verbete" },
    ],
  },
  
];

export const AI_PANEL_SECTIONS: AiPanelScope[] = ["actions", "rewriting", "translation", "customized_prompts"];
export const APP_PANEL_SECTIONS: AppPanelScope[] = ["secoes_verbete", "tabela_verbete", "lexical_search", "semantic_search", "bibliografia"];
