import type { ActionItemId, AiActionId, AiPanelScope, AppPanelScope, MacroActionId, ParameterPanelHeaderMeta, ParameterPanelSection, ParameterPanelTarget } from "@/features/ghost-writer/types";
import {
  ACTION_REGISTRY,
  APP_PANEL_SECTIONS,
  resolveActionItem,
} from "@/features/ghost-writer/config/appRegistry";

const buildMetaRecord = <T extends ActionItemId>(ids: T[]): Record<T, { title: string; description: string }> =>
  Object.fromEntries(ids.map((id) => {
    const item = resolveActionItem(id);
    return [id, { title: item?.title ?? String(id), description: item?.description ?? "" }];
  })) as Record<T, { title: string; description: string }>;

export const parameterActionMeta = buildMetaRecord(ACTION_REGISTRY.filter((item) => item.kind === "ai_action").map((item) => item.semanticId as AiActionId));
export const parameterMacroMeta = buildMetaRecord(ACTION_REGISTRY.filter((item) => item.kind === "document_macro").map((item) => item.semanticId as MacroActionId));
export const parameterSemanticMeta = buildMetaRecord(ACTION_REGISTRY.map((item) => item.semanticId));

export const getParameterPanelTargetByAiAction = (id: AiActionId): ParameterPanelTarget => {
  const item = resolveActionItem(id);
  return item ? { section: item.section, id: item.semanticId } : null;
};

export const getParameterPanelTargetByAiActionInSection = (
  id: AiActionId,
  section: AiPanelScope,
): ParameterPanelTarget => ({ section, id });

const SECTION_HEADER_META: Record<ParameterPanelSection, ParameterPanelHeaderMeta> = {
  document: { title: "Documento", description: "Novo, abrir e editar documento" },
  sources: { title: "LLM Sources", description: "Vector stores e arquivos" },
  actions: { title: "Termos & Conceitos", description: "Definir, sinonimos, etimologia e cognatos" },
  rewriting: { title: "Trechos & Parágrafos", description: "Reescrever, resumir e criar epígrafe" },
  translation: { title: "Tradução & Dicionário", description: "Traduzir texto e consultar termos" },
  customized_prompts: { title: "Customized Prompts", description: "Painel de prompts customizados" },
  secoes_verbete: { title: "Seções do Verbete", description: "Escreve seções com auxilio da IA" },
  tabela_verbete: { title: "Tabela Verbete", description: "Abre tabela Word e editor HTML" },
  lexical_search: { title: "Lexical Search", description: "Busca léxica nos livros e verbetes" },
  semantic_search: { title: "Semantic Search", description: "Busca por afinidade semântica" },
  bibliografia: { title: "Bibliografia", description: "Busca as referencias bibliograficas" },
  applications: { title: "Aplicativos", description: "Cons-IA, Bibliomancia, Apps" },
};

export const getParameterPanelHeaderMeta = (target: ParameterPanelTarget): ParameterPanelHeaderMeta => {
  if (!target) return { title: "Parameters", description: "" };
  const item = resolveActionItem(target.id);
  if (item && APP_PANEL_SECTIONS.includes(item.section as AppPanelScope)) {
    return SECTION_HEADER_META[item.section];
  }
  return SECTION_HEADER_META[target.section] ?? { title: "Parameters", description: "" };
};

export const normalizeIdList = (values: string[] | undefined): string[] =>
  [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
