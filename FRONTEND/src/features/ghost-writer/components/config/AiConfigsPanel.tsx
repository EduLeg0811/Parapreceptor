import { Label } from "@/components/ui/label";
import AiAssistantConfigPanel from "@/features/ghost-writer/components/config/AiAssistantConfigPanel";
import { useSystemConfirmation } from "@/components/SystemConfirmationProvider";
import { CONFIG_PROMPT_ROWS } from "@/features/ghost-writer/config/constants";
import { getActionSystemPrompt, getConscienciografiaActionSystemPromptId, type ActionSystemPromptId, type ConscienciografiaExtendedActionId } from "@/features/ghost-writer/config/actionSystemPrompts";
import { resolveSemanticActionId } from "@/features/ghost-writer/config/appRegistry";
import type { AiActionId, ParameterPanelTarget, SelectOption } from "@/features/ghost-writer/types";
import type { UploadedLlmFile } from "@/features/ghost-writer/services/openai";

interface AiConfigsPanelProps {
  parameterPanelTarget: ParameterPanelTarget;
  hasDocumentOpen: boolean;
  isTermsConceptsConscienciografiaEnabled: boolean;
  includeEditorContextInLlm: boolean;
  aiActionsLlmModel: string;
  aiActionsLlmTemperature: number;
  aiActionsLlmMaxOutputTokens: number;
  aiActionsLlmVerbosity: string;
  aiActionsLlmEffort: string;
  aiActionSystemPrompts: Partial<Record<ActionSystemPromptId, string>>;
  aiActionsSelectedVectorStoreId: string;
  aiActionVectorStoreOptions: SelectOption[];
  biblioExternaLlmModel: string;
  biblioExternaLlmTemperature: number;
  biblioExternaLlmMaxOutputTokens: number;
  biblioExternaLlmVerbosity: string;
  biblioExternaLlmEffort: string;
  biblioExternaLlmSystemPrompt: string;
  uploadedChatFiles: UploadedLlmFile[];
  isUploadingChatFiles: boolean;
  onAiActionsLlmModelChange: (value: string) => void;
  onAiActionsLlmTemperatureChange: (value: number) => void;
  onAiActionsLlmMaxOutputTokensChange: (value: number) => void;
  onAiActionsLlmVerbosityChange: (value: string) => void;
  onAiActionsLlmEffortChange: (value: string) => void;
  onAiActionSystemPromptChange: (actionId: ActionSystemPromptId, value: string) => void;
  onToggleIncludeEditorContextInLlm: () => void;
  onAiActionsSelectedVectorStoreIdChange: (value: string) => void;
  onBiblioExternaLlmModelChange: (value: string) => void;
  onBiblioExternaLlmTemperatureChange: (value: number) => void;
  onBiblioExternaLlmMaxOutputTokensChange: (value: number) => void;
  onBiblioExternaLlmVerbosityChange: (value: string) => void;
  onBiblioExternaLlmEffortChange: (value: string) => void;
  onBiblioExternaLlmSystemPromptChange: (value: string) => void;
  onUploadFiles: (files: File[]) => void | Promise<void>;
  onRemoveUploadedFile: (fileId: string) => void;
  onResetAllConfig: () => void;
}

const supportsConscienciografiaPrompt = (value: AiActionId | null): value is ConscienciografiaExtendedActionId =>
  value === "dictionary"
  || value === "synonyms"
  || value === "antonyms"
  || value === "etymology"
  || value === "cognatos"
  || value === "epigraph"
  || value === "rewrite"
  || value === "summarize"
  || value === "translate"
  || value === "dict_lookup"
  || value === "analogies"
  || value === "comparisons"
  || value === "examples"
  || value === "counterpoints"
  || value === "neoparadigma";

const AiConfigsPanel = ({
  parameterPanelTarget,
  hasDocumentOpen,
  isTermsConceptsConscienciografiaEnabled,
  includeEditorContextInLlm,
  aiActionsLlmModel,
  aiActionsLlmTemperature,
  aiActionsLlmMaxOutputTokens,
  aiActionsLlmVerbosity,
  aiActionsLlmEffort,
  aiActionSystemPrompts,
  aiActionsSelectedVectorStoreId,
  aiActionVectorStoreOptions,
  biblioExternaLlmModel,
  biblioExternaLlmTemperature,
  biblioExternaLlmMaxOutputTokens,
  biblioExternaLlmVerbosity,
  biblioExternaLlmEffort,
  biblioExternaLlmSystemPrompt,
  uploadedChatFiles,
  isUploadingChatFiles,
  onAiActionsLlmModelChange,
  onAiActionsLlmTemperatureChange,
  onAiActionsLlmMaxOutputTokensChange,
  onAiActionsLlmVerbosityChange,
  onAiActionsLlmEffortChange,
  onAiActionSystemPromptChange,
  onToggleIncludeEditorContextInLlm,
  onAiActionsSelectedVectorStoreIdChange,
  onBiblioExternaLlmModelChange,
  onBiblioExternaLlmTemperatureChange,
  onBiblioExternaLlmMaxOutputTokensChange,
  onBiblioExternaLlmVerbosityChange,
  onBiblioExternaLlmEffortChange,
  onBiblioExternaLlmSystemPromptChange,
  onUploadFiles,
  onRemoveUploadedFile,
  onResetAllConfig,
}: AiConfigsPanelProps) => {
  const { requestSystemConfirmation } = useSystemConfirmation();
  const aiActionSection = parameterPanelTarget?.section === "actions"
    || parameterPanelTarget?.section === "rewriting"
    || parameterPanelTarget?.section === "translation"
    || parameterPanelTarget?.section === "customized_prompts";
  const resolvedTargetId = resolveSemanticActionId(parameterPanelTarget?.id);
  const actionId = aiActionSection ? resolvedTargetId as AiActionId | null : null;
  const verbetografiaActionId =
    parameterPanelTarget?.section === "secoes_verbete"
    && (resolvedTargetId === "definologia" || resolvedTargetId === "sinonimologia" || resolvedTargetId === "fatologia" || resolvedTargetId === "frase_enfatica")
      ? resolvedTargetId
      : null;
  const isSemanticSearchConfig =
    parameterPanelTarget?.section === "semantic_search";
  const isBiblioExternaConfig =
    parameterPanelTarget?.section === "bibliografia" && resolvedTargetId === "biblio_externa";

  const promptId = actionId && supportsConscienciografiaPrompt(actionId)
    ? getConscienciografiaActionSystemPromptId(actionId, isTermsConceptsConscienciografiaEnabled)
    : (actionId as ActionSystemPromptId | null);
  const effectivePromptId = (verbetografiaActionId ?? promptId) as ActionSystemPromptId | null;
  const selectedActionSystemPrompt = effectivePromptId ? getActionSystemPrompt(aiActionSystemPrompts, effectivePromptId) : "";
  const canRender = Boolean(
    actionId
    || verbetografiaActionId
    || isSemanticSearchConfig
    || isBiblioExternaConfig,
  );

  if (!canRender) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Selecione uma ação com suporte a IA para editar as configurações.
      </div>
    );
  }

  return (
    <div className="scrollbar-thin h-full min-h-0 overflow-y-auto p-3">
      <AiAssistantConfigPanel
        llmModel={isBiblioExternaConfig ? biblioExternaLlmModel : aiActionsLlmModel}
        onLlmModelChange={isBiblioExternaConfig ? onBiblioExternaLlmModelChange : onAiActionsLlmModelChange}
        llmTemperature={isBiblioExternaConfig ? biblioExternaLlmTemperature : aiActionsLlmTemperature}
        onLlmTemperatureChange={isBiblioExternaConfig ? onBiblioExternaLlmTemperatureChange : onAiActionsLlmTemperatureChange}
        llmMaxOutputTokens={isBiblioExternaConfig ? biblioExternaLlmMaxOutputTokens : aiActionsLlmMaxOutputTokens}
        onLlmMaxOutputTokensChange={isBiblioExternaConfig ? onBiblioExternaLlmMaxOutputTokensChange : onAiActionsLlmMaxOutputTokensChange}
        llmVerbosity={isBiblioExternaConfig ? biblioExternaLlmVerbosity : aiActionsLlmVerbosity}
        onLlmVerbosityChange={isBiblioExternaConfig ? onBiblioExternaLlmVerbosityChange : onAiActionsLlmVerbosityChange}
        llmEffort={isBiblioExternaConfig ? biblioExternaLlmEffort : aiActionsLlmEffort}
        onLlmEffortChange={isBiblioExternaConfig ? onBiblioExternaLlmEffortChange : onAiActionsLlmEffortChange}
        selectedVectorStoreId={aiActionsSelectedVectorStoreId}
        onSelectedVectorStoreIdChange={onAiActionsSelectedVectorStoreIdChange}
        vectorStoreOptions={aiActionVectorStoreOptions}
        onUploadFiles={(files) => void onUploadFiles(files)}
        uploadedFiles={uploadedChatFiles}
        onRemoveUploadedFile={onRemoveUploadedFile}
        isUploadingFiles={isUploadingChatFiles}
        showVectorStore={!isBiblioExternaConfig}
        showUploadedFiles={!isBiblioExternaConfig}
        includeEditorContextInLlm={includeEditorContextInLlm}
        onToggleIncludeEditorContextInLlm={isBiblioExternaConfig ? undefined : onToggleIncludeEditorContextInLlm}
        canToggleIncludeEditorContextInLlm={hasDocumentOpen}
        extraContent={(
          <>
            {isSemanticSearchConfig ? (
              <div className="space-y-1.5">
                <Label className="w-36 shrink-0 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">RAG Conscienciologico</Label>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  O vector store selecionado aqui e o usado pelo RAG Conscienciologico em Busca Semantica e Semantic Overview.
                </p>
              </div>
            ) : null}
            {effectivePromptId ? (
              <div className="space-y-1.5">
                <Label className="w-36 shrink-0 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">System Prompt</Label>
                <textarea
                  value={selectedActionSystemPrompt}
                  onChange={(event) => onAiActionSystemPromptChange(effectivePromptId, event.target.value)}
                  rows={CONFIG_PROMPT_ROWS}
                  className="w-full rounded-md border border-input bg-white px-2.5 py-1.5 text-[10px] text-foreground outline-none resize-none overflow-y-auto"
                />
              </div>
            ) : null}
            {isBiblioExternaConfig ? (
              <div className="space-y-1.5">
                <Label className="w-36 shrink-0 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">System Prompt</Label>
                <textarea
                  value={biblioExternaLlmSystemPrompt}
                  onChange={(event) => onBiblioExternaLlmSystemPromptChange(event.target.value)}
                  rows={CONFIG_PROMPT_ROWS}
                  className="w-full rounded-md border border-input bg-white px-2.5 py-1.5 text-[10px] text-foreground outline-none resize-none overflow-y-auto"
                />
              </div>
            ) : null}
          </>
        )}
        footerContent={(
          <div className="flex justify-center">
            <button
              type="button"
              className="inline-flex h-8 items-center justify-center rounded-full border border-orange-200 bg-orange-50 px-4 text-center text-[10px] font-semibold text-orange-900 shadow-sm hover:bg-orange-100 hover:text-orange-950"
              onClick={async () => {
                const shouldReset = await requestSystemConfirmation({
                  title: "Reset Config Parameters",
                  description: "Reset all config parameters. Are you shure?",
                });
                if (!shouldReset) return;
                onResetAllConfig();
              }}
            >
              Reset Config Parameters
            </button>
          </div>
        )}
      />
    </div>
  );
};

export default AiConfigsPanel;

