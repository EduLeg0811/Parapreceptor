import AiActionParametersPanel from "@/features/ghost-writer/components/parameters/AiActionParametersPanel";
import { parameterActionMeta } from "@/features/ghost-writer/config/metadata";
import { resolveSemanticActionId } from "@/features/ghost-writer/config/appRegistry";
import { TRANSLATE_LANGUAGE_OPTIONS } from "@/features/ghost-writer/config/options";
import type { ActionItemId, AiActionId, AiPanelScope, RewritePromptType } from "@/features/ghost-writer/types";

const REWRITE_PROMPT_OPTIONS: Array<{ id: RewritePromptType; label: string }> = [
  { id: "correction", label: "1. Correção" },
  { id: "words", label: "2. Palavras" },
  { id: "construction", label: "3. Construção" },
];

interface AiActionsParameterSectionProps {
  section: AiPanelScope;
  actionId: ActionItemId | null;
  actionText: string;
  aiCommandQuery: string;
  translateLanguage: (typeof TRANSLATE_LANGUAGE_OPTIONS)[number]["value"];
  rewritePromptType: RewritePromptType;
  isLoading: boolean;
  hasDocumentOpen: boolean;
  onActionTextChange: (value: string) => void;
  onAiCommandQueryChange: (value: string) => void;
  onTranslateLanguageChange: (value: (typeof TRANSLATE_LANGUAGE_OPTIONS)[number]["value"]) => void;
  onRewritePromptTypeChange: (value: RewritePromptType) => void;
  onRetrieveSelectedText: () => void | Promise<void>;
  onApplyAction: (actionId: AiActionId) => void | Promise<void>;
}

const AiActionsParameterSection = ({
  actionId,
  actionText,
  aiCommandQuery,
  translateLanguage,
  rewritePromptType,
  isLoading,
  hasDocumentOpen,
  onActionTextChange,
  onAiCommandQueryChange,
  onTranslateLanguageChange,
  onRewritePromptTypeChange,
  onRetrieveSelectedText,
  onApplyAction,
}: AiActionsParameterSectionProps) => {
  const resolvedActionId = resolveSemanticActionId(actionId) as AiActionId | null;
  const shouldShowActionPanel = Boolean(resolvedActionId);

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        {shouldShowActionPanel && resolvedActionId ? (
          <AiActionParametersPanel
            title={parameterActionMeta[resolvedActionId].title}
            description={parameterActionMeta[resolvedActionId].description}
            actionText={actionText}
            onActionTextChange={onActionTextChange}
            queryText={resolvedActionId === "ai_command" ? aiCommandQuery : undefined}
            onQueryTextChange={resolvedActionId === "ai_command" ? onAiCommandQueryChange : undefined}
            onRetrieveSelectedText={() => void onRetrieveSelectedText()}
            onApply={() => {
              void onApplyAction(resolvedActionId);
            }}
            isLoading={isLoading}
            hasDocumentOpen={hasDocumentOpen}
            showLanguageSelect={resolvedActionId === "translate"}
            languageOptions={TRANSLATE_LANGUAGE_OPTIONS.map((option) => ({ ...option }))}
            selectedLanguage={translateLanguage}
            onSelectedLanguageChange={(value) => onTranslateLanguageChange(value as (typeof TRANSLATE_LANGUAGE_OPTIONS)[number]["value"])}
            beforeApplyContent={resolvedActionId === "rewrite" ? (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Abrangência da reescrita</p>
                <div className="grid grid-cols-1 gap-2">
                  {REWRITE_PROMPT_OPTIONS.map((option) => {
                    const selected = rewritePromptType === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onRewritePromptTypeChange(option.id)}
                        className={`w-32 h-9 items-center rounded-md border px-3 text-left text-xs font-medium transition ${
                          selected
                            ? "border-orange-300 bg-orange-100 text-orange-900 shadow-sm"
                            : "border-zinc-200 bg-white text-zinc-400 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-500"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : undefined}
            showApplyButton
            showConfigButton={false}
            onToggleConfig={undefined}
            isConfigOpen={false}
            showActionTextArea
            showPanelChrome={false}
          />
        ) : (
          <AiActionParametersPanel
            title=""
            description=""
            actionText={actionText}
            onActionTextChange={onActionTextChange}
            onRetrieveSelectedText={() => void onRetrieveSelectedText()}
            onApply={() => {}}
            isLoading={isLoading}
            hasDocumentOpen={hasDocumentOpen}
            showApplyButton={false}
            showConfigButton={false}
            isConfigOpen={false}
            showActionTextArea
            showPanelChrome={false}
          />
        )}
      </div>
    </div>
  );
};

export default AiActionsParameterSection;

