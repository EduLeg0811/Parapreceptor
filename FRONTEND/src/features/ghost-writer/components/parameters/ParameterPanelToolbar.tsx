import { Settings } from "lucide-react";
import NavigationSelectionButton from "@/features/ghost-writer/components/common/NavigationSelectionButton";
import { AI_PANEL_SECTIONS, APP_PANEL_SECTIONS, getSectionItems, resolveActionItem } from "@/features/ghost-writer/config/appRegistry";
import type { ActionItemId, AiActionId, ParameterPanelTarget } from "@/features/ghost-writer/types";

type NonNullParameterPanelTarget = Exclude<ParameterPanelTarget, null>;

interface ParameterPanelToolbarProps {
  parameterPanelTarget: NonNullParameterPanelTarget;
  isLoading: boolean;
  isTermsConceptsConscienciografiaEnabled: boolean;
  onToggleAiActionsConfig: () => void;
  onToggleTermsConceptsConscienciografia: () => void;
  onOpenAiActionParameters: (id: AiActionId) => void;
  onSelectVerbetografiaAction: (id: ActionItemId) => void | Promise<void>;
  onRunAppAction: (id: ActionItemId) => void | Promise<void>;
}

const ParameterPanelToolbar = ({
  parameterPanelTarget,
  isLoading,
  isTermsConceptsConscienciografiaEnabled,
  onToggleAiActionsConfig,
  onToggleTermsConceptsConscienciografia,
  onOpenAiActionParameters,
  onSelectVerbetografiaAction,
  onRunAppAction,
}: ParameterPanelToolbarProps) => {
  const section = parameterPanelTarget.section;
  const currentItem = resolveActionItem(parameterPanelTarget.id);
  const isAiActionSection = AI_PANEL_SECTIONS.includes(section as never);
  const isAppActionSection = APP_PANEL_SECTIONS.includes(section as never);
  const showToolbar = isAiActionSection || isAppActionSection;

  if (!showToolbar) return null;

  const supportsAiConfig =
    isAiActionSection
    || section === "secoes_verbete"
    || section === "semantic_search";
  const showTermsConceptsConscienciografiaPill = isAiActionSection;

  const aiConfigButton = supportsAiConfig ? (
    <button
      type="button"
      onClick={onToggleAiActionsConfig}
      title="Configurações IA"
      aria-label="Configurações IA"
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground shadow-sm transition hover:bg-zinc-50 hover:text-foreground"
    >
      <Settings className="h-4 w-4" />
    </button>
  ) : null;

  const footerActions = supportsAiConfig ? (
    <div className="mt-8 flex items-center justify-end gap-2">
      {showTermsConceptsConscienciografiaPill ? (
        <button
          type="button"
          onClick={onToggleTermsConceptsConscienciografia}
          title={isTermsConceptsConscienciografiaEnabled ? "Desativar modo Conscienciografia" : "Ativar modo Conscienciografia: interpreta termos e conceitos com base na Conscienciologia"}
          aria-pressed={isTermsConceptsConscienciografiaEnabled}
          className={`inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-xs font-semibold transition ${
            isTermsConceptsConscienciografiaEnabled
              ? "border-orange-300 bg-orange-100 text-orange-900 shadow-sm"
              : "border-zinc-200 bg-white text-zinc-400 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-500"
          }`}
        >
          Conscienciografia
        </button>
      ) : null}
      {aiConfigButton}
    </div>
  ) : null;

  return (
    <div className="border-b border-border p-3">
      <div className="grid grid-cols-1 gap-2">
        <div className="space-y-1.5">
          {getSectionItems(section).map((item) => (
            <NavigationSelectionButton
              key={item.alias}
              icon={item.icon}
              title={item.title}
              description={item.description}
              ariaLabel={item.title}
              selected={currentItem?.semanticId === item.semanticId}
              onClick={() => {
                if (item.kind === "ai_action") {
                  onOpenAiActionParameters(item.semanticId as AiActionId);
                  return;
                }
                if (item.section === "secoes_verbete") {
                  void onSelectVerbetografiaAction(item.semanticId);
                  return;
                }
                void onRunAppAction(item.semanticId);
              }}
              disabled={isLoading}
            />
          ))}
        </div>
        {footerActions}
      </div>
    </div>
  );
};

export default ParameterPanelToolbar;

