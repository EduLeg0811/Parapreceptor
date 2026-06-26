import { CheckedState } from "@radix-ui/react-checkbox";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useSystemConfirmation } from "@/components/SystemConfirmationProvider";
import type { UploadedLlmFile } from "@/features/ghost-writer/services/openai";
import AiAssistantConfigPanel from "@/features/ghost-writer/components/config/AiAssistantConfigPanel";
import UploadedFilesList from "@/features/ghost-writer/components/config/UploadedFilesList";
import { CONFIG_PROMPT_ROWS } from "@/features/ghost-writer/config/constants";

interface SourcesPanelProps {
  onUploadFiles: (files: File[]) => void;
  bookSources: Array<{ id: string; label: string }>;
  vectorStoreSources: Array<{ id: string; label: string }>;
  selectedBookSourceIds: string[];
  onToggleBookSource: (id: string, checked: boolean) => void;
  selectedChatSourceLabel: string;
  uploadedFiles: UploadedLlmFile[];
  onRemoveUploadedFile: (id: string) => void;
  isUploadingFiles?: boolean;
  llmModel: string;
  onLlmModelChange: (value: string) => void;
  llmTemperature: number;
  onLlmTemperatureChange: (value: number) => void;
  llmMaxOutputTokens: number;
  onLlmMaxOutputTokensChange: (value: number) => void;
  llmMaxNumResults: number;
  onLlmMaxNumResultsChange: (value: number) => void;
  llmEditorContextMaxChars: number;
  onLlmEditorContextMaxCharsChange: (value: number) => void;
  llmVerbosity: string;
  onLlmVerbosityChange: (value: string) => void;
  llmEffort: string;
  onLlmEffortChange: (value: string) => void;
  llmSystemPrompt: string;
  onLlmSystemPromptChange: (value: string) => void;
  includeEditorContextInLlm: boolean;
  onToggleIncludeEditorContextInLlm: () => void;
  canToggleIncludeEditorContextInLlm?: boolean;
  onResetAllConfig: () => void;
}

const SourcesPanel = ({
  onUploadFiles,
  bookSources,
  vectorStoreSources,
  selectedBookSourceIds,
  onToggleBookSource,
  selectedChatSourceLabel,
  uploadedFiles,
  onRemoveUploadedFile,
  isUploadingFiles = false,
  llmModel,
  onLlmModelChange,
  llmTemperature,
  onLlmTemperatureChange,
  llmMaxOutputTokens,
  onLlmMaxOutputTokensChange,
  llmMaxNumResults,
  onLlmMaxNumResultsChange,
  llmEditorContextMaxChars,
  onLlmEditorContextMaxCharsChange,
  llmVerbosity,
  onLlmVerbosityChange,
  llmEffort,
  onLlmEffortChange,
  llmSystemPrompt,
  onLlmSystemPromptChange,
  includeEditorContextInLlm,
  onToggleIncludeEditorContextInLlm,
  canToggleIncludeEditorContextInLlm = true,
  onResetAllConfig,
}: SourcesPanelProps) => {
  const { requestSystemConfirmation } = useSystemConfirmation();

  const renderSourceItem = (source: { id: string; label: string }) => {
    const checked = selectedBookSourceIds.includes(source.id);
    return (
      <label key={source.id} className="flex cursor-pointer items-start gap-2 px-1 py-1">
        <Checkbox checked={checked} onCheckedChange={(value: CheckedState) => onToggleBookSource(source.id, value === true)} />
        <span className="min-w-0 flex-1 text-left">
          <span className="block break-words text-[11px] font-medium text-foreground">{source.label}</span>
        </span>
      </label>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1" aria-label="Dados-Fontes">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Livros & Tratados</p>
            <div className="space-y-1">
              {bookSources.map(renderSourceItem)}
            </div>
          </div>

          <div className="py-1.5">
            <Separator />
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vector Stores</p>
            <div className="space-y-1">
              {vectorStoreSources.map(renderSourceItem)}
            </div>
          </div>

          <Separator />

          <AiAssistantConfigPanel
            llmModel={llmModel}
            onLlmModelChange={onLlmModelChange}
            llmTemperature={llmTemperature}
            onLlmTemperatureChange={onLlmTemperatureChange}
            llmMaxOutputTokens={llmMaxOutputTokens}
            onLlmMaxOutputTokensChange={onLlmMaxOutputTokensChange}
            llmVerbosity={llmVerbosity}
            onLlmVerbosityChange={onLlmVerbosityChange}
            llmEffort={llmEffort}
            onLlmEffortChange={onLlmEffortChange}
            selectedVectorStoreId=""
            onSelectedVectorStoreIdChange={() => {}}
            vectorStoreOptions={[]}
            onUploadFiles={onUploadFiles}
            uploadedFiles={uploadedFiles}
            onRemoveUploadedFile={onRemoveUploadedFile}
            isUploadingFiles={isUploadingFiles}
            fixedVectorStoreLabel={selectedChatSourceLabel}
            showUploadedFiles={false}
            includeEditorContextInLlm={includeEditorContextInLlm}
            onToggleIncludeEditorContextInLlm={onToggleIncludeEditorContextInLlm}
            canToggleIncludeEditorContextInLlm={canToggleIncludeEditorContextInLlm}
            extraContent={(
              <div className="space-y-1.5">
                <div className="flex items-center gap-0">
                  <Label className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Max Results</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={llmMaxNumResults}
                    onChange={(e) => onLlmMaxNumResultsChange(e.target.value ? Number(e.target.value) : 5)}
                    className="h-7 bg-white px-2.5 !text-[10px] md:!text-[10px]"
                  />
                </div>
                <div className="flex items-center gap-0">
                  <Label className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ctx Chars</Label>
                  <Input
                    type="number"
                    min="500"
                    value={llmEditorContextMaxChars}
                    onChange={(e) => onLlmEditorContextMaxCharsChange(e.target.value ? Number(e.target.value) : 10000)}
                    className="h-7 bg-white px-2.5 !text-[10px] md:!text-[10px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">System Prompt</Label>
                  <textarea
                    value={llmSystemPrompt}
                    onChange={(e) => onLlmSystemPromptChange(e.target.value)}
                    rows={CONFIG_PROMPT_ROWS}
                    className="w-full resize-none overflow-y-auto rounded-md border border-input bg-white px-2.5 py-1.5 text-[10px] text-foreground outline-none"
                  />
                </div>
              </div>
            )}
          />

          <Separator />

          <UploadedFilesList
            onUploadFiles={onUploadFiles}
            uploadedFiles={uploadedFiles}
            onRemoveUploadedFile={onRemoveUploadedFile}
            isUploadingFiles={isUploadingFiles}
          />

          <Separator />

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
        </div>
      </div>
    </div>
  );
};

export default SourcesPanel;

