import type { AiActionId } from "@/features/ghost-writer/types";
import {
  buildAnalogiesPrompt,
  buildAnalogiesConsPrompt,
  buildAiCommandPrompt,
  buildAntonymsConsPrompt,
  buildAntonymsPrompt,
  buildCognatosConsPrompt,
  buildCognatosPrompt,
  buildComparisonsPrompt,
  buildComparisonsConsPrompt,
  buildCounterpointsPrompt,
  buildCounterpointsConsPrompt,
  buildDictLookupPrompt,
  buildDictLookupConsPrompt,
  buildDefineConsPrompt,
  buildDefinePrompt,
  buildEtymologyConsPrompt,
  buildEtymologyPrompt,
  buildExamplesPrompt,
  buildExamplesConsPrompt,
  buildEpigraphConsPrompt,
  buildEpigraphPrompt,
  buildNeoparadigmaPrompt,
  buildNeoparadigmaConsPrompt,
  buildRewriteConsPrompt,
  buildRewritePrompt,
  buildSummarizeConsPrompt,
  buildSummarizePrompt,
  buildSynonymsConsPrompt,
  buildSynonymsPrompt,
  buildTranslatePrompt,
  buildTranslateConsPrompt,
  buildVerbeteDefinologiaPrompt,
  buildVerbeteFatologiaPrompt,
  buildVerbeteFraseEnfaticaPrompt,
  buildVerbeteSinonimologiaPrompt,
  type ChatMessage,
} from "@/features/ghost-writer/services/openai";

export type TermsConceptsBasicActionId = "dictionary" | "synonyms" | "antonyms" | "etymology" | "cognatos";
export type TermsConceptsConsActionSystemPromptId = "dictionaryCons" | "synonymsCons" | "antonymsCons" | "etymologyCons" | "cognatosCons";
export type ConscienciografiaExtendedActionId =
  | TermsConceptsBasicActionId
  | "epigraph"
  | "rewrite"
  | "summarize"
  | "translate"
  | "dict_lookup"
  | "analogies"
  | "comparisons"
  | "examples"
  | "counterpoints"
  | "neoparadigma";
export type ConscienciografiaExtendedConsActionSystemPromptId =
  | TermsConceptsConsActionSystemPromptId
  | "epigraphCons"
  | "rewriteCons"
  | "summarizeCons"
  | "translateCons"
  | "dict_lookupCons"
  | "analogiesCons"
  | "comparisonsCons"
  | "examplesCons"
  | "counterpointsCons"
  | "neoparadigmaCons";
export type ActionSystemPromptId =
  | AiActionId
  | ConscienciografiaExtendedConsActionSystemPromptId
  | "definologia"
  | "sinonimologia"
  | "fatologia"
  | "frase_enfatica";

const getFirstSystemPrompt = (messages: ChatMessage[] | unknown): string => {
  if (!Array.isArray(messages)) return "";
  return messages.find((message) => message?.role === "system")?.content ?? "";
};

export const DEFAULT_ACTION_SYSTEM_PROMPTS: Record<ActionSystemPromptId, string> = {
  synonyms: getFirstSystemPrompt(buildSynonymsPrompt("texto")),
  synonymsCons: getFirstSystemPrompt(buildSynonymsConsPrompt("texto")),
  antonyms: getFirstSystemPrompt(buildAntonymsPrompt("texto")),
  antonymsCons: getFirstSystemPrompt(buildAntonymsConsPrompt("texto")),
  etymology: getFirstSystemPrompt(buildEtymologyPrompt("texto")),
  etymologyCons: getFirstSystemPrompt(buildEtymologyConsPrompt("texto")),
  dictionary: getFirstSystemPrompt(buildDefinePrompt("texto")),
  dictionaryCons: getFirstSystemPrompt(buildDefineConsPrompt("texto")),
  epigraph: getFirstSystemPrompt(buildEpigraphPrompt("texto")),
  epigraphCons: getFirstSystemPrompt(buildEpigraphConsPrompt("texto")),
  rewrite: getFirstSystemPrompt(buildRewritePrompt("texto")),
  rewriteCons: getFirstSystemPrompt(buildRewriteConsPrompt("texto")),
  summarize: getFirstSystemPrompt(buildSummarizePrompt("texto")),
  summarizeCons: getFirstSystemPrompt(buildSummarizeConsPrompt("texto")),
  translate: getFirstSystemPrompt(buildTranslatePrompt("texto", "Ingles")),
  translateCons: getFirstSystemPrompt(buildTranslateConsPrompt("texto", "Ingles")),
  dict_lookup: getFirstSystemPrompt(buildDictLookupPrompt("texto")),
  dict_lookupCons: getFirstSystemPrompt(buildDictLookupConsPrompt("texto")),
  ai_command: getFirstSystemPrompt(buildAiCommandPrompt("texto", "query")),
  analogies: getFirstSystemPrompt(buildAnalogiesPrompt("texto")),
  analogiesCons: getFirstSystemPrompt(buildAnalogiesConsPrompt("texto")),
  comparisons: getFirstSystemPrompt(buildComparisonsPrompt("texto")),
  comparisonsCons: getFirstSystemPrompt(buildComparisonsConsPrompt("texto")),
  examples: getFirstSystemPrompt(buildExamplesPrompt("texto")),
  examplesCons: getFirstSystemPrompt(buildExamplesConsPrompt("texto")),
  counterpoints: getFirstSystemPrompt(buildCounterpointsPrompt("texto")),
  counterpointsCons: getFirstSystemPrompt(buildCounterpointsConsPrompt("texto")),
  neoparadigma: getFirstSystemPrompt(buildNeoparadigmaPrompt("texto")),
  neoparadigmaCons: getFirstSystemPrompt(buildNeoparadigmaConsPrompt("texto")),
  cognatos: getFirstSystemPrompt(buildCognatosPrompt("texto")),
  cognatosCons: getFirstSystemPrompt(buildCognatosConsPrompt("texto")),
  definologia: getFirstSystemPrompt(buildVerbeteDefinologiaPrompt("titulo: exemplo | especialidade: exemplo")),
  sinonimologia: getFirstSystemPrompt(buildVerbeteSinonimologiaPrompt("titulo: exemplo | especialidade: exemplo")),
  fatologia: getFirstSystemPrompt(buildVerbeteFatologiaPrompt("titulo: exemplo | especialidade: exemplo")),
  frase_enfatica: getFirstSystemPrompt(buildVerbeteFraseEnfaticaPrompt("titulo: exemplo | especialidade: exemplo")),
};

const CONSCIENCIOGRAFIA_CONS_PROMPT_IDS: Record<ConscienciografiaExtendedActionId, ConscienciografiaExtendedConsActionSystemPromptId> = {
  dictionary: "dictionaryCons",
  synonyms: "synonymsCons",
  antonyms: "antonymsCons",
  etymology: "etymologyCons",
  cognatos: "cognatosCons",
  epigraph: "epigraphCons",
  rewrite: "rewriteCons",
  summarize: "summarizeCons",
  translate: "translateCons",
  dict_lookup: "dict_lookupCons",
  analogies: "analogiesCons",
  comparisons: "comparisonsCons",
  examples: "examplesCons",
  counterpoints: "counterpointsCons",
  neoparadigma: "neoparadigmaCons",
};

export const getConscienciografiaActionSystemPromptId = (
  actionId: ConscienciografiaExtendedActionId | null,
  isConscienciografiaEnabled: boolean,
): ActionSystemPromptId | null => {
  if (!actionId) return null;
  return isConscienciografiaEnabled ? CONSCIENCIOGRAFIA_CONS_PROMPT_IDS[actionId] : actionId;
};

export const getTermsConceptsActionSystemPromptId = (
  actionId: TermsConceptsBasicActionId | null,
  isConscienciografiaEnabled: boolean,
): ActionSystemPromptId | null => {
  return getConscienciografiaActionSystemPromptId(actionId, isConscienciografiaEnabled);
};

export const getActionSystemPrompt = (
  prompts: Partial<Record<ActionSystemPromptId, string>> | undefined,
  actionId: ActionSystemPromptId | null,
): string => {
  if (!actionId) return "";
  return prompts?.[actionId] ?? DEFAULT_ACTION_SYSTEM_PROMPTS[actionId] ?? "";
};

export const sanitizeStoredActionSystemPrompts = (value: unknown): Partial<Record<ActionSystemPromptId, string>> => {
  if (!value || typeof value !== "object") return {};

  const next: Partial<Record<ActionSystemPromptId, string>> = {};
  for (const actionId of Object.keys(DEFAULT_ACTION_SYSTEM_PROMPTS) as ActionSystemPromptId[]) {
    const prompt = (value as Record<string, unknown>)[actionId];
    if (typeof prompt === "string") next[actionId] = prompt;
  }
  return next;
};

export const applySystemPromptOverride = (messages: ChatMessage[], systemPrompt: string): ChatMessage[] => {
  const nextMessages = [...messages];
  const systemIndex = nextMessages.findIndex((message) => message.role === "system");

  if (!systemPrompt.trim()) {
    if (systemIndex >= 0) nextMessages.splice(systemIndex, 1);
    return nextMessages;
  }

  if (systemIndex >= 0) {
    nextMessages[systemIndex] = { ...nextMessages[systemIndex], content: systemPrompt };
    return nextMessages;
  }

  return [{ role: "system", content: systemPrompt }, ...nextMessages];
};

